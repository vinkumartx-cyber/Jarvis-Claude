from __future__ import annotations

import os

from .broker import Broker
from .order import Fill, Order


class CryptoLiveBroker(Broker):
    """Live crypto broker via ccxt. Disabled unless LIVE_TRADING=true.

    v1 stub — intentionally raises to prevent accidental real-money trades.
    """

    def __init__(self, venue: str):
        self.venue = venue
        if os.getenv("LIVE_TRADING", "false").lower() != "true":
            return

    def submit(self, order: Order, reference_price: float) -> Fill:
        raise NotImplementedError("live crypto trading disabled in v1")

    def equity(self) -> float:
        raise NotImplementedError("live crypto trading disabled in v1")
