from __future__ import annotations

import numpy as np
import pandas as pd


def ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def rsi(close: pd.Series, length: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / length, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / length, adjust=False).mean()
    # Standard RSI behavior on edge cases:
    #   avg_loss == 0 and avg_gain > 0 -> 100 (pure uptrend)
    #   both zero -> 50 (flat)
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    # Where avg_loss is 0, force 100 if there was any gain else 50.
    no_loss = avg_loss == 0
    out = out.where(~no_loss, other=100.0)
    return out.fillna(50.0)


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    hl = df["high"] - df["low"]
    hc = (df["high"] - prev_close).abs()
    lc = (df["low"] - prev_close).abs()
    return pd.concat([hl, hc, lc], axis=1).max(axis=1)


def atr(df: pd.DataFrame, length: int = 14) -> pd.Series:
    tr = true_range(df)
    return tr.ewm(alpha=1 / length, adjust=False).mean()


def bollinger(
    close: pd.Series, length: int = 20, stdev: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    mid = close.rolling(length).mean()
    sd = close.rolling(length).std(ddof=0)
    upper = mid + stdev * sd
    lower = mid - stdev * sd
    return lower, mid, upper


def bollinger_width(
    close: pd.Series, length: int = 20, stdev: float = 2.0
) -> pd.Series:
    lower, mid, upper = bollinger(close, length, stdev)
    return (upper - lower) / mid


def realized_vol(close: pd.Series, length: int = 20) -> pd.Series:
    returns = np.log(close / close.shift(1))
    return returns.rolling(length).std(ddof=0)


def rolling_percentile(series: pd.Series, window: int = 500) -> pd.Series:
    def pct(a: np.ndarray) -> float:
        last = a[-1]
        return float((a <= last).sum() / len(a))

    min_p = min(window, max(20, window // 10))
    return series.rolling(window, min_periods=min_p).apply(pct, raw=True)
