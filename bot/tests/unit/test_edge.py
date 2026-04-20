from __future__ import annotations

import pytest

from bot.probability.edge import compute_edge, passes_threshold
from bot.probability.p_market import p_market_from_rr, p_market_from_yes_mid


def test_p_market_from_rr_2_1():
    # A 2:1 trade prices in ~33.3% implied win rate.
    assert p_market_from_rr(2.0) == pytest.approx(1 / 3)


def test_p_market_from_rr_1_1():
    assert p_market_from_rr(1.0) == pytest.approx(0.5)


def test_p_market_from_rr_rejects_non_positive():
    with pytest.raises(ValueError):
        p_market_from_rr(0)
    with pytest.raises(ValueError):
        p_market_from_rr(-1)


def test_p_market_yes_and_no():
    assert p_market_from_yes_mid(0.6, side_is_yes=True) == pytest.approx(0.6)
    assert p_market_from_yes_mid(0.6, side_is_yes=False) == pytest.approx(0.4)


def test_p_market_yes_mid_bounds():
    with pytest.raises(ValueError):
        p_market_from_yes_mid(-0.01)
    with pytest.raises(ValueError):
        p_market_from_yes_mid(1.01)


def test_compute_edge_and_threshold():
    # Post example: "60% chance of working but priced like 45%" -> edge=15%.
    edge = compute_edge(0.60, 0.45)
    assert edge == pytest.approx(0.15)
    assert passes_threshold(edge, 0.05)
    assert not passes_threshold(edge, 0.20)
