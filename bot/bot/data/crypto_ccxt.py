from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from .base import DataFeed, OHLCV_COLUMNS, empty_ohlcv


class CryptoFeed(DataFeed):
    """ccxt-backed crypto feed. Thin wrapper; network calls are lazy."""

    def __init__(self, venue: str = "binance", client=None):
        self.venue = venue
        self._client = client

    def _get_client(self):
        if self._client is not None:
            return self._client
        import ccxt  # type: ignore[import-not-found]

        cls = getattr(ccxt, self.venue)
        self._client = cls({"enableRateLimit": True})
        return self._client

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 500,
        since: datetime | None = None,
    ) -> pd.DataFrame:
        client = self._get_client()
        since_ms = (
            int(since.replace(tzinfo=timezone.utc).timestamp() * 1000)
            if since
            else None
        )
        rows = client.fetch_ohlcv(symbol, timeframe=timeframe, since=since_ms, limit=limit)
        if not rows:
            return empty_ohlcv()
        df = pd.DataFrame(rows, columns=["ts_ms", "open", "high", "low", "close", "volume"])
        df["ts"] = pd.to_datetime(df["ts_ms"], unit="ms", utc=True).dt.tz_convert(None)
        return df[OHLCV_COLUMNS].reset_index(drop=True)
