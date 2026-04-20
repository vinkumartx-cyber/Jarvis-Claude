from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol


@dataclass
class PolyQuote:
    ts: datetime
    condition_id: str
    yes_token_id: str
    yes_mid: float


class PolymarketClientLike(Protocol):
    def get_midpoint(self, token_id: str) -> dict: ...


class PolymarketFeed:
    """Polymarket CLOB client wrapper.

    v1: lazy import of py_clob_client. Tests inject a fake client.
    """

    venue: str = "polymarket"

    def __init__(self, client: PolymarketClientLike | None = None):
        self._client = client

    def _get_client(self) -> PolymarketClientLike:
        if self._client is not None:
            return self._client
        # Lazy import so tests don't require the dependency.
        from py_clob_client.client import ClobClient  # type: ignore[import-not-found]

        self._client = ClobClient(host="https://clob.polymarket.com", chain_id=137)
        return self._client

    def get_midpoint(self, yes_token_id: str) -> float:
        resp = self._get_client().get_midpoint(yes_token_id)
        return float(resp["mid"])

    def snapshot(self, condition_id: str, yes_token_id: str) -> PolyQuote:
        mid = self.get_midpoint(yes_token_id)
        return PolyQuote(
            ts=datetime.now(tz=timezone.utc).replace(tzinfo=None),
            condition_id=condition_id,
            yes_token_id=yes_token_id,
            yes_mid=mid,
        )
