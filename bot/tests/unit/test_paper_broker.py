from __future__ import annotations

from datetime import datetime

import pytest

from bot.config import PaperExecutionConfig
from bot.execution.order import Order
from bot.execution.paper import PaperBroker


def _cfg() -> PaperExecutionConfig:
    return PaperExecutionConfig(
        slippage_bps_crypto=5.0,
        slippage_cents_poly=0.01,
        maker_bps=2.0,
        taker_bps=7.0,
    )


def test_paper_broker_long_fills_above_reference_on_crypto():
    broker = PaperBroker(10_000, _cfg())
    order = Order(venue="binance", symbol="BTC/USDT", side="long", qty=0.1)
    fill = broker.submit(order, 50_000.0)
    # 5 bps slippage -> 50_000 * 1.0005 = 50_025
    assert fill.fill_px == pytest.approx(50_025.0)
    # Commission = 7 bps * notional = 50_025 * 0.1 * 0.0007
    assert fill.commission_paid == pytest.approx(50_025.0 * 0.1 * 0.0007)


def test_paper_broker_short_fills_below_reference_on_crypto():
    broker = PaperBroker(10_000, _cfg())
    order = Order(venue="binance", symbol="BTC/USDT", side="short", qty=0.1)
    fill = broker.submit(order, 50_000.0)
    assert fill.fill_px == pytest.approx(49_975.0)


def test_paper_broker_polymarket_slippage_is_cents():
    broker = PaperBroker(10_000, _cfg())
    order = Order(venue="polymarket", symbol="cond1", side="long", qty=100)
    fill = broker.submit(order, 0.55)
    assert fill.fill_px == pytest.approx(0.56)


def test_paper_broker_polymarket_clamps_to_dollar():
    broker = PaperBroker(10_000, _cfg())
    order = Order(venue="polymarket", symbol="cond1", side="long", qty=10)
    fill = broker.submit(order, 0.999)
    assert fill.fill_px == pytest.approx(1.0)


def test_paper_broker_commission_reduces_equity():
    broker = PaperBroker(10_000, _cfg())
    start = broker.equity()
    order = Order(venue="binance", symbol="BTC/USDT", side="long", qty=0.1)
    broker.submit(order, 50_000.0)
    assert broker.equity() < start


def test_paper_broker_apply_pnl():
    broker = PaperBroker(10_000, _cfg())
    broker.apply_pnl(123.45)
    assert broker.equity() == pytest.approx(10_123.45)


def test_paper_broker_rejects_non_positive_reference():
    broker = PaperBroker(10_000, _cfg())
    order = Order(venue="binance", symbol="BTC/USDT", side="long", qty=0.1, ts=datetime.utcnow())
    with pytest.raises(ValueError):
        broker.submit(order, 0)
