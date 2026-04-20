from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

import pandas as pd


OHLCV_COLUMNS = ["ts", "open", "high", "low", "close", "volume"]


class DataFeed(ABC):
    venue: str

    @abstractmethod
    def get_ohlcv(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 500,
        since: datetime | None = None,
    ) -> pd.DataFrame:
        """Return a DataFrame with columns [ts, open, high, low, close, volume].

        `ts` is UTC datetime64[ns] indexed 0..N-1 (not set as index), ascending.
        """


def empty_ohlcv() -> pd.DataFrame:
    return pd.DataFrame(columns=OHLCV_COLUMNS).astype(
        {
            "open": "float64",
            "high": "float64",
            "low": "float64",
            "close": "float64",
            "volume": "float64",
        }
    )
