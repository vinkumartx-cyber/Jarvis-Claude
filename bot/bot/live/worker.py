from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ..data.base import DataFeed
from ..execution.order import Order
from ..execution.paper import PaperBroker
from ..features.pipeline import compute_features
from ..features.regime import classify_regime
from ..logging_setup import get_logger
from ..probability.edge import compute_edge, passes_threshold
from ..probability.p_market import p_market_from_rr
from ..probability.p_model import HeuristicPModel
from ..risk.guards import RiskGuards
from ..risk.portfolio import OpenPosition, Portfolio
from ..risk.sizer import position_size, stop_distance_pct, units_for_notional
from ..risk.stops import rr_from
from ..storage.models import EquityPoint, Signal as SignalRow, Trade
from ..storage.repositories import EquityRepo, SignalRepo, TradeRepo
from ..strategy.base import AbstractStrategy, StrategyContext
from ..strategy.router import select_strategy


log = get_logger(__name__)


@dataclass
class WorkerConfig:
    venue: str
    symbol: str
    timeframe: str
    risk_pct: float
    edge_threshold: float
    ohlcv_limit: int = 500


class SymbolWorker:
    def __init__(
        self,
        cfg: WorkerConfig,
        feed: DataFeed,
        strategies: list[AbstractStrategy],
        broker: PaperBroker,
        guards: RiskGuards,
        p_model: HeuristicPModel,
        portfolio: Portfolio,
        session_factory,
    ):
        self.cfg = cfg
        self.feed = feed
        self.strategies = strategies
        self.broker = broker
        self.guards = guards
        self.p_model = p_model
        self.portfolio = portfolio
        self.session_factory = session_factory

    def tick(self, now: datetime | None = None) -> None:
        now = now or datetime.utcnow()
        df_raw = self.feed.get_ohlcv(
            self.cfg.symbol, self.cfg.timeframe, limit=self.cfg.ohlcv_limit
        )
        if len(df_raw) < 60:
            return
        df = compute_features(df_raw)
        regime = classify_regime(df)
        strat = select_strategy(regime, self.strategies)

        ctx = StrategyContext(
            venue=self.cfg.venue, symbol=self.cfg.symbol, timeframe=self.cfg.timeframe
        )

        session = self.session_factory()
        try:
            if strat is None:
                log.info(
                    "no_suitable_strategy",
                    symbol=self.cfg.symbol,
                    tf=self.cfg.timeframe,
                    regime=regime.value,
                )
                return

            signal = strat.generate_signal(df, ctx)
            if signal is None:
                return

            # Probability gate.
            rr = rr_from(signal.entry, signal.stop, signal.target, signal.side)
            pm = self.p_model.estimate(signal.setup, regime, self.cfg.timeframe)
            if pm.p is None:
                self._persist_signal(
                    session, signal, regime, pm_p=None, edge=None, accepted=False,
                    reject_reason=f"p_model_{pm.reason}",
                )
                session.commit()
                return
            p_market = p_market_from_rr(rr)
            edge = compute_edge(pm.p, p_market)
            if not passes_threshold(edge, self.cfg.edge_threshold):
                self._persist_signal(
                    session, signal, regime, pm_p=pm.p, edge=edge, accepted=False,
                    reject_reason="edge_below_threshold",
                    p_market=p_market,
                )
                session.commit()
                return

            # Risk guards.
            decision = self.guards.check(signal, self.portfolio, now)
            if not decision.accepted:
                self._persist_signal(
                    session, signal, regime, pm_p=pm.p, edge=edge, accepted=False,
                    reject_reason=decision.reason or "guard_rejected",
                    p_market=p_market,
                )
                session.commit()
                return

            # Size and submit.
            sd_pct = stop_distance_pct(signal.entry, signal.stop)
            effective_risk = self.guards.post_loss_risk_cap(
                self.portfolio, self.cfg.risk_pct
            )
            notional = position_size(self.broker.equity(), effective_risk, sd_pct)
            qty = units_for_notional(notional, signal.entry)

            signal_row = self._persist_signal(
                session, signal, regime, pm_p=pm.p, edge=edge,
                accepted=True, reject_reason=None, p_market=p_market,
            )
            session.flush()

            order = Order(
                venue=self.cfg.venue,
                symbol=self.cfg.symbol,
                side=signal.side,
                qty=qty,
                order_type="market",
                stop_px=signal.stop,
                target_px=signal.target,
                setup=signal.setup,
                signal_id=signal_row.id,
                ts=now,
            )
            fill = self.broker.submit(order, signal.entry)

            trade = Trade(
                signal_id=signal_row.id,
                venue=self.cfg.venue,
                symbol=self.cfg.symbol,
                setup=signal.setup,
                side=signal.side,
                qty=qty,
                entry_px=fill.fill_px,
                entry_ts=fill.fill_ts,
                slippage_paid=fill.slippage_paid,
                commission_paid=fill.commission_paid,
                status="open",
            )
            TradeRepo(session).add(trade)

            self.portfolio.open_positions.append(
                OpenPosition(
                    symbol=self.cfg.symbol,
                    venue=self.cfg.venue,
                    side=signal.side,
                    qty=qty,
                    entry_px=fill.fill_px,
                    stop_px=signal.stop,
                    target_px=signal.target,
                    entry_ts=fill.fill_ts,
                    setup=signal.setup,
                    signal_id=signal_row.id,
                )
            )
            self.portfolio.equity = self.broker.equity()

            EquityRepo(session).append(
                EquityPoint(
                    ts=now,
                    equity=self.broker.equity(),
                    realized_pnl_day=self.portfolio.today_realized_pnl(now),
                    open_positions_count=len(self.portfolio.open_positions),
                )
            )
            session.commit()
            log.info(
                "trade_opened",
                symbol=self.cfg.symbol,
                setup=signal.setup,
                side=signal.side,
                qty=qty,
                entry=fill.fill_px,
                edge=edge,
            )
        finally:
            session.close()

    @staticmethod
    def _persist_signal(
        session,
        signal,
        regime,
        pm_p: float | None,
        edge: float | None,
        accepted: bool,
        reject_reason: str | None,
        p_market: float | None = None,
    ) -> SignalRow:
        row = SignalRow(
            ts=signal.ts,
            venue=signal.venue,
            symbol=signal.symbol,
            timeframe=signal.timeframe,
            setup=signal.setup,
            regime=regime.value,
            side=signal.side,
            p_model=pm_p,
            p_market=p_market,
            edge=edge,
            entry_px=signal.entry,
            stop_px=signal.stop,
            target_px=signal.target,
            accepted=accepted,
            reject_reason=reject_reason,
        )
        SignalRepo(session).add(row)
        return row
