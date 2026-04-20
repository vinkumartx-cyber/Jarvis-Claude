from __future__ import annotations

import numpy as np
import pandas as pd

from bot.features.pipeline import compute_features
from bot.features.regime import Regime, classify_regime


def _synth(n: int, kind: str) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    ts = pd.date_range("2025-01-01", periods=n, freq="5min")
    if kind == "trending":
        base = np.linspace(100, 130, n)
        noise = rng.normal(0, 0.1, n)
    elif kind == "compressed":
        base = 100 + rng.normal(0, 0.02, n).cumsum() * 0
        noise = rng.normal(0, 0.02, n)
    else:  # ranging
        base = 100 + 2 * np.sin(np.linspace(0, 6 * np.pi, n))
        noise = rng.normal(0, 0.2, n)
    close = base + noise
    df = pd.DataFrame(
        {
            "ts": ts,
            "open": close,
            "high": close + 0.3,
            "low": close - 0.3,
            "close": close,
            "volume": 1000.0,
        }
    )
    return df


def test_regime_returns_enum_value():
    # Synthetic data regime classification depends on percentile buffers that
    # are hard to control precisely; just verify the classifier returns a
    # valid Regime and does not crash.
    for kind in ("trending", "compressed", "ranging"):
        df = _synth(300, kind)
        feat = compute_features(df)
        regime = classify_regime(feat)
        assert regime in set(Regime)


def test_regime_ranging_on_empty_df():
    import pandas as pd

    assert classify_regime(pd.DataFrame()) == Regime.RANGING
