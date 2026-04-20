from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass
class TradeStats:
    expectancy: float
    win_rate: float
    avg_r: float
    sample_size: int
    profit_factor: float
    variance: float
    sharpe: float
    max_drawdown: float


def expectancy(win_rate: float, r: float) -> float:
    """E = W * R - (1 - W)."""
    if not 0.0 <= win_rate <= 1.0:
        raise ValueError("win_rate must be in [0,1]")
    return win_rate * r - (1.0 - win_rate)


def profit_factor(pnls: Sequence[float]) -> float:
    gains = sum(p for p in pnls if p > 0)
    losses = -sum(p for p in pnls if p < 0)
    if losses == 0:
        return float("inf") if gains > 0 else 0.0
    return gains / losses


def max_drawdown(equity_curve: Sequence[float]) -> float:
    if not equity_curve:
        return 0.0
    peak = equity_curve[0]
    max_dd = 0.0
    for v in equity_curve:
        if v > peak:
            peak = v
        dd = (peak - v) / peak if peak > 0 else 0.0
        if dd > max_dd:
            max_dd = dd
    return max_dd


def sharpe(returns: Sequence[float], periods_per_year: int = 365 * 24 * 12) -> float:
    """Annualized Sharpe assuming 5-minute bars by default. Pass the actual
    periods-per-year for your timeframe for an accurate number."""
    n = len(returns)
    if n < 2:
        return 0.0
    mean = sum(returns) / n
    var = sum((r - mean) ** 2 for r in returns) / (n - 1)
    std = math.sqrt(var)
    if std == 0:
        return 0.0
    return (mean / std) * math.sqrt(periods_per_year)


def summarize(r_multiples: Sequence[float], pnls: Sequence[float], equity_curve: Sequence[float]) -> TradeStats:
    n = len(r_multiples)
    if n == 0:
        return TradeStats(0, 0, 0, 0, 0, 0, 0, 0)
    wins = [r for r in r_multiples if r > 0]
    losses = [r for r in r_multiples if r <= 0]
    win_rate = len(wins) / n
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = -sum(losses) / len(losses) if losses else 0.0
    r = avg_win / avg_loss if avg_loss > 0 else 0.0
    e = expectancy(win_rate, r)
    mean = sum(r_multiples) / n
    var = sum((x - mean) ** 2 for x in r_multiples) / (n - 1) if n > 1 else 0.0
    return TradeStats(
        expectancy=e,
        win_rate=win_rate,
        avg_r=r,
        sample_size=n,
        profit_factor=profit_factor(pnls),
        variance=var,
        sharpe=sharpe([e / c if c else 0 for e, c in zip(pnls, equity_curve or [1] * len(pnls))])
        if equity_curve
        else 0.0,
        max_drawdown=max_drawdown(equity_curve) if equity_curve else 0.0,
    )
