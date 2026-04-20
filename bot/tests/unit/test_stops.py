from __future__ import annotations

import pytest

from bot.risk.stops import atr_stop, min_stop_distance_ok, rr_from


def test_atr_stop_long_below_entry():
    assert atr_stop(100, atr=2.0, k=1.5, side="long") == pytest.approx(97.0)


def test_atr_stop_short_above_entry():
    assert atr_stop(100, atr=2.0, k=1.5, side="short") == pytest.approx(103.0)


def test_atr_stop_rejects_bad_args():
    with pytest.raises(ValueError):
        atr_stop(100, atr=0, k=1.5, side="long")
    with pytest.raises(ValueError):
        atr_stop(100, atr=2, k=0, side="long")
    with pytest.raises(ValueError):
        atr_stop(100, atr=2, k=1, side="sideways")  # type: ignore[arg-type]


def test_rr_from_long():
    # entry 100, stop 98, target 104 -> risk=2, reward=4, RR=2.0
    assert rr_from(100, 98, 104, "long") == pytest.approx(2.0)


def test_rr_from_short():
    assert rr_from(100, 102, 94, "short") == pytest.approx(3.0)


def test_rr_from_rejects_stop_on_wrong_side():
    with pytest.raises(ValueError):
        rr_from(100, 101, 105, "long")


def test_min_stop_distance():
    assert min_stop_distance_ok(100, 98, atr=2.0, k_min=0.75) is True
    assert min_stop_distance_ok(100, 99.9, atr=2.0, k_min=0.75) is False
