from __future__ import annotations


def p_market_from_rr(rr: float) -> float:
    """Crypto: a trade with reward:risk = R prices an implied win rate of 1/(1+R)."""
    if rr <= 0:
        raise ValueError("rr must be positive")
    return 1.0 / (1.0 + rr)


def p_market_from_yes_mid(yes_mid: float, side_is_yes: bool = True) -> float:
    """Polymarket: the YES midprice in [0,1] is the market-implied P(YES resolves)."""
    if not 0.0 <= yes_mid <= 1.0:
        raise ValueError("yes_mid must be within [0, 1]")
    return yes_mid if side_is_yes else 1.0 - yes_mid
