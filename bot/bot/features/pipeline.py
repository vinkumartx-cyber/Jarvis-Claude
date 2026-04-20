from __future__ import annotations

import pandas as pd

from . import indicators as ind


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with all derived features attached."""
    out = df.copy()
    out["atr"] = ind.atr(out, 14)
    out["ema20"] = ind.ema(out["close"], 20)
    out["ema50"] = ind.ema(out["close"], 50)
    out["rsi"] = ind.rsi(out["close"], 14)
    lower, mid, upper = ind.bollinger(out["close"], 20, 2.0)
    out["bb_lower"] = lower
    out["bb_mid"] = mid
    out["bb_upper"] = upper
    out["bb_width"] = (upper - lower) / mid
    out["atr_pct"] = ind.rolling_percentile(out["atr"], 500)
    out["bbwidth_pct"] = ind.rolling_percentile(out["bb_width"], 500)
    out["vol_mean20"] = out["volume"].rolling(20).mean()
    return out
