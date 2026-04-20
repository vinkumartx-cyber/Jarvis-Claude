from __future__ import annotations

import pytest

from bot.backtest.metrics import expectancy, profit_factor, max_drawdown


@pytest.mark.parametrize(
    "w,r,expected",
    [
        # User's post example 1: 80% win rate but lose 3x more than win.
        # E = 0.8 * (1/3) - 0.2 = 0.2667 - 0.2 = 0.0667 WAIT — the user says
        # "you're losing money". That only holds if avg loss = 3 * avg win,
        # meaning R = 1/3 (reward:risk). Let's verify E = 0.8*(1/3) - 0.2 = 0.0667
        # is barely positive per the formula. Post uses a rhetorical framing; the
        # formula returns what the formula returns. Assert mechanical correctness.
        (0.80, 1 / 3, 0.80 * (1 / 3) - 0.20),
        # User's post example 2: 45% win rate, winners 2x losers -> profitable.
        (0.45, 2.0, 0.45 * 2.0 - 0.55),
        # Boundary: 50/50 with RR=1 is zero expectancy.
        (0.5, 1.0, 0.0),
        # 100% wins.
        (1.0, 2.0, 2.0),
        # 0% wins.
        (0.0, 5.0, -1.0),
    ],
)
def test_expectancy_formula(w: float, r: float, expected: float):
    assert expectancy(w, r) == pytest.approx(expected)


def test_expectancy_user_post_example_2_is_positive():
    # The post says: "You win 45%, winners 2x larger -> You're profitable"
    assert expectancy(0.45, 2.0) > 0


def test_expectancy_rejects_bad_win_rate():
    with pytest.raises(ValueError):
        expectancy(-0.1, 1.0)
    with pytest.raises(ValueError):
        expectancy(1.1, 1.0)


def test_profit_factor():
    assert profit_factor([100, -50, 200, -75]) == pytest.approx((100 + 200) / (50 + 75))


def test_profit_factor_no_losses():
    import math
    assert math.isinf(profit_factor([100, 50]))


def test_max_drawdown():
    eq = [100, 110, 105, 90, 95, 120]
    # peak 110 -> low 90 -> DD = 20/110
    assert max_drawdown(eq) == pytest.approx(20 / 110)


def test_max_drawdown_monotonic_up():
    assert max_drawdown([100, 110, 120]) == 0.0
