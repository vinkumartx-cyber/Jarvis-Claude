from __future__ import annotations

import os

from .broker import Broker
from .order import Fill, Order


class PolymarketLiveBroker(Broker):
    """Live Polymarket broker via py-clob-client. Disabled unless LIVE_TRADING=true."""

    def __init__(self):
        if os.getenv("LIVE_TRADING", "false").lower() != "true":
            return

    def submit(self, order: Order, reference_price: float) -> Fill:
        raise NotImplementedError("live polymarket trading disabled in v1")

    def equity(self) -> float:
        raise NotImplementedError("live polymarket trading disabled in v1")
