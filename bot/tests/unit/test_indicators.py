from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from bot.features.indicators import (
    atr,
    bollinger,
    ema,
    rsi,
    rolling_percentile,
    true_range,
)


def _price_df(closes: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "open": closes,
            "high": [c * 1.01 for c in closes],
            "low": [c * 0.99 for c in closes],
            "close": closes,
            "volume": [1.0] * len(closes),
        }
    )


def test_ema_monotonic_uptrend():
    closes = [float(i) for i in range(1, 51)]
    e = ema(pd.Series(closes), 10)
    assert e.iloc[-1] > e.iloc[0]
    assert e.iloc[-1] < closes[-1]  # EMA lags price


def test_true_range_matches_manual():
    df = pd.DataFrame(
        {
            "open": [10, 11, 12],
            "high": [11, 13, 14],
            "low": [9, 10, 11],
            "close": [10.5, 12, 13],
        }
    )
    tr = true_range(df)
    # First TR: just high-low = 2 (no prev close).
    # TR[1] = max(|13-10|, |13-10.5|, |10-10.5|) = 3
    # TR[2] = max(|14-11|, |14-12|, |11-12|) = 3
    assert tr.iloc[1] == pytest.approx(3.0)
    assert tr.iloc[2] == pytest.approx(3.0)


def test_atr_positive_on_trending_data():
    closes = [100 + i for i in range(100)]
    df = _price_df(closes)
    a = atr(df, 14)
    assert (a.dropna() > 0).all()


def test_rsi_oversold_on_falling_series():
    closes = [100 - i * 0.5 for i in range(30)]
    df = _price_df(closes)
    r = rsi(df["close"], 14)
    assert r.iloc[-1] < 40  # falling series -> low RSI


def test_rsi_overbought_on_rising_series():
    closes = [100 + i * 0.5 for i in range(30)]
    df = _price_df(closes)
    r = rsi(df["close"], 14)
    assert r.iloc[-1] > 60


def test_bollinger_bands_encompass_price():
    closes = [100 + np.sin(i / 5) for i in range(60)]
    df = _price_df(closes)
    lower, mid, upper = bollinger(df["close"], 20, 2.0)
    ok = (df["close"] <= upper) & (df["close"] >= lower)
    # Most (>80%) should be inside 2-sigma band.
    assert ok.iloc[20:].mean() > 0.8


def test_rolling_percentile_last_value_is_max():
    s = pd.Series([1, 2, 3, 4, 10])
    p = rolling_percentile(s, window=5)
    assert p.iloc[-1] == pytest.approx(1.0)
