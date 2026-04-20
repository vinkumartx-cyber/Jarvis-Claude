from __future__ import annotations

from enum import Enum

import numpy as np
import pandas as pd


class BOS(str, Enum):
    NONE = "none"
    UP = "up"
    DOWN = "down"


def swing_highs(high: pd.Series, lookback: int = 3) -> pd.Series:
    """Bool series: True where high[i] is the max over [i-lookback, i+lookback]."""
    w = 2 * lookback + 1
    rolled = high.rolling(window=w, center=True).max()
    return (high == rolled) & high.notna()


def swing_lows(low: pd.Series, lookback: int = 3) -> pd.Series:
    w = 2 * lookback + 1
    rolled = low.rolling(window=w, center=True).min()
    return (low == rolled) & low.notna()


def break_of_structure(df: pd.DataFrame, lookback: int = 3) -> BOS:
    """Classify BOS direction using the most recent confirmed swings."""
    if len(df) < 2 * lookback + 2:
        return BOS.NONE
    highs_mask = swing_highs(df["high"], lookback)
    lows_mask = swing_lows(df["low"], lookback)
    last_close = float(df["close"].iloc[-1])
    last_swing_high = df.loc[highs_mask.fillna(False), "high"]
    last_swing_low = df.loc[lows_mask.fillna(False), "low"]
    if not last_swing_high.empty and last_close > float(last_swing_high.iloc[-1]):
        return BOS.UP
    if not last_swing_low.empty and last_close < float(last_swing_low.iloc[-1]):
        return BOS.DOWN
    return BOS.NONE


def last_swing_low(df: pd.DataFrame, lookback: int = 3) -> float | None:
    mask = swing_lows(df["low"], lookback).fillna(False)
    vals = df.loc[mask, "low"]
    if vals.empty:
        return None
    return float(vals.iloc[-1])


def last_swing_high(df: pd.DataFrame, lookback: int = 3) -> float | None:
    mask = swing_highs(df["high"], lookback).fillna(False)
    vals = df.loc[mask, "high"]
    if vals.empty:
        return None
    return float(vals.iloc[-1])
