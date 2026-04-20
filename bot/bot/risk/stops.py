from __future__ import annotations

from typing import Literal

Side = Literal["long", "short"]


def atr_stop(entry: float, atr: float, k: float, side: Side) -> float:
    if atr <= 0:
        raise ValueError("atr must be positive")
    if k <= 0:
        raise ValueError("k must be positive")
    if side == "long":
        return entry - k * atr
    if side == "short":
        return entry + k * atr
    raise ValueError(f"unknown side: {side}")


def rr_from(entry: float, stop: float, target: float, side: Side) -> float:
    if side == "long":
        risk = entry - stop
        reward = target - entry
    elif side == "short":
        risk = stop - entry
        reward = entry - target
    else:
        raise ValueError(f"unknown side: {side}")
    if risk <= 0:
        raise ValueError("risk must be positive (stop on wrong side of entry)")
    return reward / risk


def min_stop_distance_ok(entry: float, stop: float, atr: float, k_min: float = 0.75) -> bool:
    return abs(entry - stop) >= k_min * atr
