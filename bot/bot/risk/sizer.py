from __future__ import annotations


class InvalidSizingError(ValueError):
    pass


def position_size(
    equity: float,
    risk_pct: float,
    stop_distance_pct: float,
    max_leverage: float = 5.0,
) -> float:
    """Return notional position size.

    size = (equity * risk_pct) / stop_distance_pct

    Capped at max_leverage * equity. Very tight stops (e.g. stop_distance < 0.2%)
    otherwise produce highly leveraged positions whose slippage + commission
    overwhelms the intended 1R risk budget. Most spot crypto retail accounts
    are 1x; 5x is a conservative default for paper modeling.
    """
    if equity <= 0:
        raise InvalidSizingError("equity must be positive")
    if not 0 < risk_pct < 1:
        raise InvalidSizingError("risk_pct must be in (0, 1)")
    if stop_distance_pct <= 0:
        raise InvalidSizingError("stop_distance_pct must be > 0")
    raw = (equity * risk_pct) / stop_distance_pct
    return min(raw, max_leverage * equity)


def stop_distance_pct(entry: float, stop: float) -> float:
    if entry <= 0:
        raise InvalidSizingError("entry must be positive")
    return abs(entry - stop) / entry


def units_for_notional(notional: float, price: float) -> float:
    if price <= 0:
        raise InvalidSizingError("price must be positive")
    return notional / price


def polymarket_size(equity: float, risk_pct: float, entry: float, stop: float) -> float:
    """For Polymarket YES/NO (prices in dollars in [0,1]):

    units = (equity * risk_pct) / |entry - stop|
    """
    if equity <= 0:
        raise InvalidSizingError("equity must be positive")
    if not 0 < risk_pct < 1:
        raise InvalidSizingError("risk_pct must be in (0, 1)")
    delta = abs(entry - stop)
    if delta <= 0:
        raise InvalidSizingError("stop distance must be > 0")
    return (equity * risk_pct) / delta
