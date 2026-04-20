from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Sequence

import pandas as pd

from ..execution.order import Order
from ..execution.paper import PaperBroker
from ..features.pipeline import compute_features
from ..features.regime import classify_regime
from ..risk.guards import RiskGuards
from ..risk.portfolio import OpenPosition, Portfolio
from ..risk.sizer import position_size, stop_distance_pct, units_for_notional
from ..strategy.base import AbstractStrategy, Signal, StrategyContext
from ..strategy.router import select_strategy
from .metrics import TradeStats, summarize


@dataclass
class BacktestTrade:
    symbol: str
    setup: str
    side: str
    entry_ts: datetime
    exit_ts: datetime
    entry_px: float
    exit_px: float
    stop_px: float
    target_px: float
    qty: float
    pnl: float
    r_multiple: float
    regime: str
    reason: str  # "target" | "stop" | "end_of_data"


@dataclass
class BacktestResult:
    trades: list[BacktestTrade] = field(default_factory=list)
    equity_curve: list[tuple[datetime, float]] = field(default_factory=list)
    stats: TradeStats | None = None
    per_setup_stats: dict[str, TradeStats] = field(default_factory=dict)
    final_equity: float = 0.0


def _hit(bar: pd.Series, side: str, stop: float, target: float) -> tuple[bool, str, float]:
    """Return (closed, reason, exit_px). Assumes worst-case order: stop first if tie."""
    if side == "long":
        if bar["low"] <= stop:
            return True, "stop", stop
        if bar["high"] >= target:
            return True, "target", target
    else:
        if bar["high"] >= stop:
            return True, "stop", stop
        if bar["low"] <= target:
            return True, "target", target
    return False, "", 0.0


def run_backtest(
    df_raw: pd.DataFrame,
    symbol: str,
    timeframe: str,
    venue: str,
    strategies: Sequence[AbstractStrategy],
    broker: PaperBroker,
    guards: RiskGuards,
    risk_pct: float,
    warmup: int = 60,
) -> BacktestResult:
    df = compute_features(df_raw)
    ctx = StrategyContext(venue=venue, symbol=symbol, timeframe=timeframe)
    portfolio = Portfolio(equity=broker.equity())
    result = BacktestResult()

    i = warmup
    while i < len(df) - 1:
        window = df.iloc[: i + 1]
        regime = classify_regime(window)
        strat = select_strategy(regime, list(strategies))
        if strat is None:
            i += 1
            continue

        signal = strat.generate_signal(window, ctx)
        if signal is None:
            i += 1
            continue

        decision = guards.check(signal, portfolio, now=signal.ts)
        if not decision.accepted:
            i += 1
            continue

        # Enter on next bar's open (event-driven).
        next_bar = df.iloc[i + 1]
        entry_ref = float(next_bar["open"])

        sd_pct = stop_distance_pct(entry_ref, signal.stop)
        notional = position_size(broker.equity(), risk_pct, sd_pct)
        qty = units_for_notional(notional, entry_ref)

        entry_order = Order(
            venue=venue,
            symbol=symbol,
            side=signal.side,
            qty=qty,
            order_type="market",
            stop_px=signal.stop,
            target_px=signal.target,
            setup=signal.setup,
            ts=next_bar["ts"].to_pydatetime()
            if hasattr(next_bar["ts"], "to_pydatetime")
            else next_bar["ts"],
        )
        entry_fill = broker.submit(entry_order, entry_ref)

        position = OpenPosition(
            symbol=symbol,
            venue=venue,
            side=signal.side,
            qty=qty,
            entry_px=entry_fill.fill_px,
            stop_px=signal.stop,
            target_px=signal.target,
            entry_ts=entry_fill.fill_ts,
            setup=signal.setup,
        )
        portfolio.open_positions.append(position)

        # Walk forward until stop or target.
        j = i + 1
        closed = False
        while j < len(df):
            bar = df.iloc[j]
            hit, reason, exit_px = _hit(bar, signal.side, signal.stop, signal.target)
            if hit:
                # Exit fill at exit_px with slippage via paper broker.
                exit_order = Order(
                    venue=venue,
                    symbol=symbol,
                    side="short" if signal.side == "long" else "long",
                    qty=qty,
                    order_type="market",
                    ts=bar["ts"].to_pydatetime() if hasattr(bar["ts"], "to_pydatetime") else bar["ts"],
                )
                exit_fill = broker.submit(exit_order, exit_px)

                if signal.side == "long":
                    pnl = (exit_fill.fill_px - entry_fill.fill_px) * qty
                else:
                    pnl = (entry_fill.fill_px - exit_fill.fill_px) * qty

                broker.apply_pnl(pnl)

                risk_per_unit = abs(entry_fill.fill_px - signal.stop)
                r_mult = pnl / (risk_per_unit * qty) if risk_per_unit > 0 and qty > 0 else 0.0

                trade = BacktestTrade(
                    symbol=symbol,
                    setup=signal.setup,
                    side=signal.side,
                    entry_ts=position.entry_ts,
                    exit_ts=exit_fill.fill_ts,
                    entry_px=entry_fill.fill_px,
                    exit_px=exit_fill.fill_px,
                    stop_px=signal.stop,
                    target_px=signal.target,
                    qty=qty,
                    pnl=pnl,
                    r_multiple=r_mult,
                    regime=regime.value,
                    reason=reason,
                )
                result.trades.append(trade)
                portfolio.closed_trades.append(
                    {
                        "pnl": pnl,
                        "exit_ts": exit_fill.fill_ts,
                        "risk_pct": risk_pct,
                        "setup": signal.setup,
                    }
                )
                portfolio.open_positions.remove(position)
                portfolio.equity = broker.equity()
                result.equity_curve.append((exit_fill.fill_ts, broker.equity()))
                i = j
                closed = True
                break
            j += 1

        if not closed:
            # End-of-data unrealized — mark exit at last close for bookkeeping.
            last_bar = df.iloc[-1]
            last_px = float(last_bar["close"])
            if signal.side == "long":
                pnl = (last_px - entry_fill.fill_px) * qty
            else:
                pnl = (entry_fill.fill_px - last_px) * qty
            risk_per_unit = abs(entry_fill.fill_px - signal.stop)
            r_mult = pnl / (risk_per_unit * qty) if risk_per_unit > 0 and qty > 0 else 0.0
            result.trades.append(
                BacktestTrade(
                    symbol=symbol,
                    setup=signal.setup,
                    side=signal.side,
                    entry_ts=position.entry_ts,
                    exit_ts=last_bar["ts"].to_pydatetime()
                    if hasattr(last_bar["ts"], "to_pydatetime")
                    else last_bar["ts"],
                    entry_px=entry_fill.fill_px,
                    exit_px=last_px,
                    stop_px=signal.stop,
                    target_px=signal.target,
                    qty=qty,
                    pnl=pnl,
                    r_multiple=r_mult,
                    regime=regime.value,
                    reason="end_of_data",
                )
            )
            break

        i += 1

    r_mults = [t.r_multiple for t in result.trades]
    pnls = [t.pnl for t in result.trades]
    eq = [p[1] for p in result.equity_curve]
    result.stats = summarize(r_mults, pnls, eq)
    result.final_equity = broker.equity()

    per_setup = {}
    setups = {t.setup for t in result.trades}
    for s in setups:
        s_trades = [t for t in result.trades if t.setup == s]
        per_setup[s] = summarize(
            [t.r_multiple for t in s_trades],
            [t.pnl for t in s_trades],
            [],
        )
    result.per_setup_stats = per_setup
    return result
