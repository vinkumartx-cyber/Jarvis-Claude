from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

Side = Literal["long", "short"]
OrderType = Literal["market", "limit"]


@dataclass
class Order:
    venue: str
    symbol: str
    side: Side
    qty: float
    order_type: OrderType = "market"
    limit_px: float | None = None
    stop_px: float | None = None
    target_px: float | None = None
    setup: str | None = None
    signal_id: int | None = None
    ts: datetime | None = None


@dataclass
class Fill:
    order: Order
    fill_px: float
    fill_ts: datetime
    slippage_paid: float
    commission_paid: float
