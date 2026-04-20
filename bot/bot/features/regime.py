from __future__ import annotations

from enum import Enum

import pandas as pd


class Regime(str, Enum):
    TRENDING = "trending"
    RANGING = "ranging"
    COMPRESSED = "compressed"


def classify_regime(
    df_features: pd.DataFrame,
    atr_pct_col: str = "atr_pct",
    bbwidth_pct_col: str = "bbwidth_pct",
    ema20_col: str = "ema20",
    ema50_col: str = "ema50",
    trending_atr_pct: float = 0.60,
    trending_ema_spread: float = 0.003,
    compressed_bbwidth_pct: float = 0.20,
) -> Regime:
    """Classify the current bar's regime.

    df_features must contain the referenced columns; uses the last row only.
    """
    if len(df_features) == 0:
        return Regime.RANGING
    row = df_features.iloc[-1]
    if pd.isna(row.get(atr_pct_col)) or pd.isna(row.get(bbwidth_pct_col)):
        return Regime.RANGING
    atr_pct = float(row[atr_pct_col])
    bbwidth_pct = float(row[bbwidth_pct_col])
    close = float(row["close"])
    ema_spread = abs(float(row[ema20_col]) - float(row[ema50_col])) / close

    if bbwidth_pct < compressed_bbwidth_pct:
        return Regime.COMPRESSED
    if atr_pct > trending_atr_pct and ema_spread > trending_ema_spread:
        return Regime.TRENDING
    return Regime.RANGING
