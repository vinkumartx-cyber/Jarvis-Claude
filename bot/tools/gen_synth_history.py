"""Generate realistic synthetic OHLCV history for backtest validation.

Produces a CSV at bot/tests/fixtures/btcusdt_5m_synth.csv with regime
switches (trends, ranges, breakouts from compression), GARCH-like
volatility clustering, and lognormal volume.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def generate(n_bars: int = 5000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    ts = pd.date_range("2024-01-01", periods=n_bars, freq="5min")

    # Regime schedule: (length_pct, drift_per_bar, sigma, regime_label)
    regimes = [
        (0.10, 0.0, 0.0005, "compressed_1"),   # tight compression
        (0.20, 0.0008, 0.0025, "uptrend_1"),   # strong uptrend
        (0.05, 0.0, 0.006, "breakout_reversal"),
        (0.20, 0.0, 0.004, "range_1"),         # choppy range
        (0.05, 0.0, 0.0005, "compressed_2"),
        (0.15, -0.0009, 0.0030, "downtrend"),
        (0.15, 0.0, 0.0035, "range_2"),
        (0.10, 0.0006, 0.0022, "uptrend_2"),
    ]
    lengths = [max(1, int(n_bars * w)) for w, *_ in regimes]
    # Pad/trim to hit exactly n_bars.
    diff = n_bars - sum(lengths)
    lengths[-1] += diff

    price = 45_000.0
    closes: list[float] = []
    regime_labels: list[str] = []

    # Simple GARCH-lite volatility clustering: sigma walks around regime sigma.
    current_sigma = regimes[0][2]
    for (_, drift, sigma, label), length in zip(regimes, lengths):
        for _ in range(length):
            # Volatility persistence.
            current_sigma = 0.92 * current_sigma + 0.08 * sigma + rng.normal(0, sigma * 0.05)
            current_sigma = max(current_sigma, sigma * 0.3)
            shock = rng.normal(drift, current_sigma)
            price = max(1.0, price * (1 + shock))
            closes.append(price)
            regime_labels.append(label)

    closes_arr = np.array(closes)

    # Build OHLC from close: intra-bar range proportional to volatility.
    intrabar_range = np.abs(rng.normal(0, 0.0008, n_bars)) * closes_arr + 0.5
    opens = np.concatenate([[closes_arr[0]], closes_arr[:-1]])
    bar_high = np.maximum(opens, closes_arr) + intrabar_range * rng.uniform(0.3, 1.0, n_bars)
    bar_low = np.minimum(opens, closes_arr) - intrabar_range * rng.uniform(0.3, 1.0, n_bars)

    # Volume clusters with volatility.
    vol_scale = np.abs(np.diff(closes_arr, prepend=closes_arr[0])) / closes_arr
    volume = rng.lognormal(mean=6.5, sigma=0.4, size=n_bars) * (1 + vol_scale * 200)

    return pd.DataFrame(
        {
            "ts": ts,
            "open": opens,
            "high": bar_high,
            "low": bar_low,
            "close": closes_arr,
            "volume": volume,
            "regime": regime_labels,
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--out", default="tests/fixtures/btcusdt_5m_synth.csv"
    )
    args = parser.parse_args()
    df = generate(args.n, args.seed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # The CSV source path in run_backtest.py only needs ts + OHLCV cols.
    df[["ts", "open", "high", "low", "close", "volume"]].to_csv(out, index=False)
    print(f"wrote {len(df)} bars to {out}")
    print(f"price range: {df['close'].min():.2f} .. {df['close'].max():.2f}")
    print(df["regime"].value_counts().to_string())


if __name__ == "__main__":
    main()
