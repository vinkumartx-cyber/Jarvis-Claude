from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from bot.config import RiskConfig
from bot.features.regime import Regime
from bot.risk.guards import RiskGuards
from bot.risk.portfolio import OpenPosition, Portfolio
from bot.strategy.base import Signal


def _signal(entry=100.0, stop=99.0, target=102.0, side="long") -> Signal:
    return Signal(
        ts=datetime.utcnow(),
        venue="binance",
        symbol="BTC/USDT",
        timeframe="5m",
        setup="momentum",
        regime=Regime.TRENDING,
        side=side,
        entry=entry,
        stop=stop,
        target=target,
    )


def _cfg(**overrides) -> RiskConfig:
    d = dict(
        risk_pct=0.01,
        k_atr=1.5,
        daily_loss_limit_pct=0.02,
        max_positions=3,
        rr_floor=1.5,
        correlation_cap=0.7,
    )
    d.update(overrides)
    return RiskConfig(**d)


def test_guards_accept_happy_path():
    g = RiskGuards(_cfg())
    sig = _signal(entry=100, stop=99, target=102)  # RR=2.0
    pf = Portfolio(equity=10_000)
    assert g.check(sig, pf, now=datetime.utcnow()).accepted is True


def test_guards_reject_below_rr_floor():
    g = RiskGuards(_cfg(rr_floor=2.0))
    sig = _signal(entry=100, stop=99, target=101)  # RR=1.0
    pf = Portfolio(equity=10_000)
    decision = g.check(sig, pf, now=datetime.utcnow())
    assert decision.accepted is False
    assert "rr_below_floor" in (decision.reason or "")


def test_guards_reject_max_positions():
    g = RiskGuards(_cfg(max_positions=1))
    sig = _signal()
    pf = Portfolio(
        equity=10_000,
        open_positions=[
            OpenPosition(
                symbol="ETH/USDT",
                venue="binance",
                side="long",
                qty=1,
                entry_px=100,
                stop_px=99,
                target_px=102,
                entry_ts=datetime.utcnow(),
                setup="momentum",
            )
        ],
    )
    assert g.check(sig, pf, now=datetime.utcnow()).accepted is False


def test_guards_reject_daily_loss_kill_switch():
    g = RiskGuards(_cfg(daily_loss_limit_pct=0.02))
    sig = _signal()
    now = datetime(2026, 4, 20, 12, 0, 0)
    pf = Portfolio(
        equity=10_000,
        closed_trades=[{"pnl": -250, "exit_ts": now - timedelta(hours=1)}],
    )
    assert g.check(sig, pf, now=now).accepted is False


def test_guards_reject_duplicate_symbol():
    g = RiskGuards(_cfg())
    sig = _signal()
    pf = Portfolio(
        equity=10_000,
        open_positions=[
            OpenPosition(
                symbol="BTC/USDT",
                venue="binance",
                side="long",
                qty=1,
                entry_px=100,
                stop_px=99,
                target_px=102,
                entry_ts=datetime.utcnow(),
                setup="momentum",
            )
        ],
    )
    assert g.check(sig, pf, now=datetime.utcnow()).accepted is False


def test_post_loss_risk_cap_reduces_after_loss():
    g = RiskGuards(_cfg(risk_pct=0.02))
    pf = Portfolio(equity=9_000, closed_trades=[{"pnl": -100, "risk_pct": 0.005}])
    assert g.post_loss_risk_cap(pf, 0.02) == pytest.approx(0.005)


def test_post_loss_risk_cap_unchanged_after_win():
    g = RiskGuards(_cfg())
    pf = Portfolio(equity=10_100, closed_trades=[{"pnl": 100, "risk_pct": 0.01}])
    assert g.post_loss_risk_cap(pf, 0.02) == pytest.approx(0.02)
