from __future__ import annotations

from datetime import datetime
from typing import Iterable

import pandas as pd

from ..storage.models import MarketSnapshot
from ..storage.repositories import MarketSnapshotRepo
from .base import OHLCV_COLUMNS


def df_to_bar_tuples(
    df: pd.DataFrame,
) -> Iterable[tuple[datetime, float, float, float, float, float | None]]:
    for row in df.itertuples(index=False):
        yield (
            row.ts.to_pydatetime() if hasattr(row.ts, "to_pydatetime") else row.ts,
            float(row.open),
            float(row.high),
            float(row.low),
            float(row.close),
            float(row.volume) if row.volume is not None else None,
        )


def snapshots_to_df(snaps: list[MarketSnapshot]) -> pd.DataFrame:
    if not snaps:
        return pd.DataFrame(columns=OHLCV_COLUMNS)
    return pd.DataFrame(
        [
            {
                "ts": s.ts_open,
                "open": s.open,
                "high": s.high,
                "low": s.low,
                "close": s.close,
                "volume": s.volume,
            }
            for s in snaps
        ]
    )


def cache_ohlcv(
    repo: MarketSnapshotRepo,
    venue: str,
    symbol: str,
    timeframe: str,
    df: pd.DataFrame,
) -> int:
    return repo.upsert_bars(venue, symbol, timeframe, df_to_bar_tuples(df))
