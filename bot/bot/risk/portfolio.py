from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class OpenPosition:
    symbol: str
    venue: str
    side: str
    qty: float
    entry_px: float
    stop_px: float
    target_px: float
    entry_ts: datetime
    setup: str
    signal_id: int | None = None


@dataclass
class Portfolio:
    equity: float
    open_positions: list[OpenPosition] = field(default_factory=list)
    closed_trades: list[dict] = field(default_factory=list)

    def today_realized_pnl(self, now: datetime | None = None) -> float:
        now = now or datetime.now(tz=timezone.utc).replace(tzinfo=None)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return sum(
            t["pnl"]
            for t in self.closed_trades
            if t.get("exit_ts") is not None and t["exit_ts"] >= day_start
        )

    def last_trade(self) -> dict | None:
        return self.closed_trades[-1] if self.closed_trades else None
