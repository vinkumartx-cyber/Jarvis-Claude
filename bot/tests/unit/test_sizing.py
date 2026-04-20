from __future__ import annotations

import pytest

from bot.risk.sizer import (
    InvalidSizingError,
    polymarket_size,
    position_size,
    stop_distance_pct,
    units_for_notional,
)


def test_sizing_matches_post_formula():
    # User's post: Account $10k, Risk 1%, Stop 0.5% -> $20,000 position.
    # size = (10000 * 0.01) / 0.005 = 20000
    assert position_size(10_000, 0.01, 0.005) == pytest.approx(20_000)


def test_sizing_matches_post_second_example():
    # Account $10k, Risk 1%, Stop 0.5% example but with different numbers.
    assert position_size(10_000, 0.02, 0.01) == pytest.approx(20_000)


def test_sizing_rejects_zero_stop():
    with pytest.raises(InvalidSizingError):
        position_size(10_000, 0.01, 0)


def test_sizing_rejects_bad_risk_pct():
    with pytest.raises(InvalidSizingError):
        position_size(10_000, 0, 0.01)
    with pytest.raises(InvalidSizingError):
        position_size(10_000, 1.0, 0.01)


def test_sizing_rejects_non_positive_equity():
    with pytest.raises(InvalidSizingError):
        position_size(0, 0.01, 0.01)


def test_stop_distance_pct():
    assert stop_distance_pct(100, 99) == pytest.approx(0.01)
    assert stop_distance_pct(100, 101) == pytest.approx(0.01)


def test_units_for_notional():
    assert units_for_notional(20_000, 50_000) == pytest.approx(0.4)


def test_polymarket_size():
    # 1% risk on $10k, entry 0.55, stop 0.50 -> delta $0.05 -> 2000 units
    assert polymarket_size(10_000, 0.01, 0.55, 0.50) == pytest.approx(2_000)


def test_polymarket_size_rejects_zero_delta():
    with pytest.raises(InvalidSizingError):
        polymarket_size(10_000, 0.01, 0.55, 0.55)
