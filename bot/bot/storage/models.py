from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "venue", "symbol", "timeframe", "ts_open", name="uq_market_snapshot"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    venue: Mapped[str] = mapped_column(String(32))
    symbol: Mapped[str] = mapped_column(String(64))
    timeframe: Mapped[str] = mapped_column(String(8))
    ts_open: Mapped[datetime] = mapped_column(DateTime)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime)
    venue: Mapped[str] = mapped_column(String(32))
    symbol: Mapped[str] = mapped_column(String(64))
    timeframe: Mapped[str] = mapped_column(String(8))
    setup: Mapped[str] = mapped_column(String(32))
    regime: Mapped[str] = mapped_column(String(16))
    side: Mapped[str] = mapped_column(String(8))
    p_model: Mapped[float | None] = mapped_column(Float, nullable=True)
    p_market: Mapped[float | None] = mapped_column(Float, nullable=True)
    edge: Mapped[float | None] = mapped_column(Float, nullable=True)
    entry_px: Mapped[float] = mapped_column(Float)
    stop_px: Mapped[float] = mapped_column(Float)
    target_px: Mapped[float] = mapped_column(Float)
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    reject_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    signal_id: Mapped[int | None] = mapped_column(
        ForeignKey("signals.id"), nullable=True
    )
    venue: Mapped[str] = mapped_column(String(32))
    symbol: Mapped[str] = mapped_column(String(64))
    setup: Mapped[str] = mapped_column(String(32))
    side: Mapped[str] = mapped_column(String(8))
    qty: Mapped[float] = mapped_column(Float)
    entry_px: Mapped[float] = mapped_column(Float)
    exit_px: Mapped[float | None] = mapped_column(Float, nullable=True)
    entry_ts: Mapped[datetime] = mapped_column(DateTime)
    exit_ts: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    pnl_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    r_multiple: Mapped[float | None] = mapped_column(Float, nullable=True)
    slippage_paid: Mapped[float] = mapped_column(Float, default=0.0)
    commission_paid: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16), default="open")


class EquityPoint(Base):
    __tablename__ = "equity_curve"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime)
    equity: Mapped[float] = mapped_column(Float)
    realized_pnl_day: Mapped[float] = mapped_column(Float, default=0.0)
    open_positions_count: Mapped[int] = mapped_column(Integer, default=0)


class SetupHitRate(Base):
    __tablename__ = "setup_hit_rates"
    __table_args__ = (
        UniqueConstraint(
            "setup", "regime", "timeframe", name="uq_setup_hit_rate"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    setup: Mapped[str] = mapped_column(String(32))
    regime: Mapped[str] = mapped_column(String(16))
    timeframe: Mapped[str] = mapped_column(String(8))
    hit_rate: Mapped[float] = mapped_column(Float)
    sample_size: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    params_json: Mapped[str] = mapped_column(Text)
    metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_path: Mapped[str | None] = mapped_column(String(256), nullable=True)
