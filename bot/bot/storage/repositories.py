from __future__ import annotations

from datetime import datetime
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import EquityPoint, MarketSnapshot, SetupHitRate, Signal, Trade


class MarketSnapshotRepo:
    def __init__(self, session: Session):
        self.session = session

    def upsert_bars(
        self,
        venue: str,
        symbol: str,
        timeframe: str,
        bars: Iterable[tuple[datetime, float, float, float, float, float | None]],
    ) -> int:
        count = 0
        for ts, o, h, l, c, v in bars:
            existing = self.session.scalar(
                select(MarketSnapshot).where(
                    MarketSnapshot.venue == venue,
                    MarketSnapshot.symbol == symbol,
                    MarketSnapshot.timeframe == timeframe,
                    MarketSnapshot.ts_open == ts,
                )
            )
            if existing is None:
                self.session.add(
                    MarketSnapshot(
                        venue=venue,
                        symbol=symbol,
                        timeframe=timeframe,
                        ts_open=ts,
                        open=o,
                        high=h,
                        low=l,
                        close=c,
                        volume=v,
                    )
                )
                count += 1
            else:
                existing.open = o
                existing.high = h
                existing.low = l
                existing.close = c
                existing.volume = v
        return count

    def load_bars(
        self,
        venue: str,
        symbol: str,
        timeframe: str,
        since: datetime | None = None,
    ) -> list[MarketSnapshot]:
        stmt = select(MarketSnapshot).where(
            MarketSnapshot.venue == venue,
            MarketSnapshot.symbol == symbol,
            MarketSnapshot.timeframe == timeframe,
        )
        if since is not None:
            stmt = stmt.where(MarketSnapshot.ts_open >= since)
        stmt = stmt.order_by(MarketSnapshot.ts_open.asc())
        return list(self.session.scalars(stmt))


class SignalRepo:
    def __init__(self, session: Session):
        self.session = session

    def add(self, signal: Signal) -> Signal:
        self.session.add(signal)
        self.session.flush()
        return signal


class TradeRepo:
    def __init__(self, session: Session):
        self.session = session

    def add(self, trade: Trade) -> Trade:
        self.session.add(trade)
        self.session.flush()
        return trade

    def today_realized_pnl(self, day_start_utc: datetime) -> float:
        rows = self.session.scalars(
            select(Trade).where(
                Trade.exit_ts.is_not(None), Trade.exit_ts >= day_start_utc
            )
        )
        return float(sum((t.pnl or 0.0) for t in rows))

    def last_closed(self) -> Trade | None:
        return self.session.scalar(
            select(Trade)
            .where(Trade.status == "closed")
            .order_by(Trade.exit_ts.desc())
            .limit(1)
        )


class EquityRepo:
    def __init__(self, session: Session):
        self.session = session

    def append(self, point: EquityPoint) -> EquityPoint:
        self.session.add(point)
        self.session.flush()
        return point


class SetupHitRateRepo:
    def __init__(self, session: Session):
        self.session = session

    def get(
        self, setup: str, regime: str, timeframe: str
    ) -> SetupHitRate | None:
        return self.session.scalar(
            select(SetupHitRate).where(
                SetupHitRate.setup == setup,
                SetupHitRate.regime == regime,
                SetupHitRate.timeframe == timeframe,
            )
        )

    def upsert(
        self,
        setup: str,
        regime: str,
        timeframe: str,
        hit_rate: float,
        sample_size: int,
        updated_at: datetime,
    ) -> SetupHitRate:
        row = self.get(setup, regime, timeframe)
        if row is None:
            row = SetupHitRate(
                setup=setup,
                regime=regime,
                timeframe=timeframe,
                hit_rate=hit_rate,
                sample_size=sample_size,
                updated_at=updated_at,
            )
            self.session.add(row)
        else:
            row.hit_rate = hit_rate
            row.sample_size = sample_size
            row.updated_at = updated_at
        self.session.flush()
        return row
