from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from bot.backtest.engine import run_backtest
from bot.backtest.report import render_html
from bot.config import PaperExecutionConfig, RiskConfig
from bot.execution.paper import PaperBroker
from bot.risk.guards import RiskGuards
from bot.strategy.breakout import BreakoutStrategy
from bot.strategy.mean_reversion import MeanReversionStrategy
from bot.strategy.momentum import MomentumStrategy


def _fixture_bars(n: int = 1000) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    ts = pd.date_range("2025-01-01", periods=n, freq="5min")
    # Regime shifts: compressed -> trending up -> ranging -> trending down.
    segments = [
        (n // 4, 0.005, 0.0),      # compressed low-vol
        (n // 4, 0.5, 0.3),        # strong uptrend
        (n // 4, 0.0, 0.8),        # ranging high-vol
        (n - 3 * (n // 4), -0.4, 0.3),  # downtrend
    ]
    closes = [100.0]
    for length, drift, vol in segments:
        incs = rng.normal(drift, max(vol, 0.01), length)
        for x in incs:
            closes.append(max(1.0, closes[-1] + x))
    closes = closes[:n]
    closes = np.array(closes)
    highs = closes + np.abs(rng.normal(0, 0.3, n))
    lows = closes - np.abs(rng.normal(0, 0.3, n))
    opens = np.concatenate([[closes[0]], closes[:-1]])
    volume = rng.lognormal(mean=6, sigma=0.5, size=n)
    return pd.DataFrame(
        {
            "ts": ts,
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "volume": volume,
        }
    )


@pytest.mark.integration
def test_backtest_runs_end_to_end(tmp_path: Path):
    df = _fixture_bars(1000)

    paper_cfg = PaperExecutionConfig(
        slippage_bps_crypto=5.0,
        slippage_cents_poly=0.01,
        maker_bps=2.0,
        taker_bps=7.0,
    )
    broker = PaperBroker(10_000, paper_cfg)
    risk_cfg = RiskConfig(
        risk_pct=0.01,
        k_atr=1.5,
        daily_loss_limit_pct=0.02,
        max_positions=3,
        rr_floor=1.5,
        correlation_cap=0.7,
    )
    guards = RiskGuards(risk_cfg)

    result = run_backtest(
        df_raw=df,
        symbol="BTC/USDT",
        timeframe="5m",
        venue="csv",
        strategies=[
            MomentumStrategy(k_atr=1.5),
            MeanReversionStrategy(rr_floor=1.5),
            BreakoutStrategy(),
        ],
        broker=broker,
        guards=guards,
        risk_pct=0.01,
    )

    # Structural assertions — we don't require profitability on synthetic data.
    assert result.stats is not None
    assert result.final_equity > 0
    # Report renders.
    report_path = render_html(result, tmp_path / "report.html")
    assert report_path.exists()
    html = report_path.read_text()
    assert "Backtest Report" in html
