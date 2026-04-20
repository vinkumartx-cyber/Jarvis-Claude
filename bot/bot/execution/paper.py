from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ..config import PaperExecutionConfig
from .broker import Broker
from .order import Fill, Order


@dataclass
class PaperVenueConfig:
    slippage_bps: float = 5.0         # crypto
    slippage_cents: float = 0.01      # polymarket (absolute)
    maker_bps: float = 2.0
    taker_bps: float = 7.0
    is_polymarket: bool = False


class PaperBroker(Broker):
    """Simulated broker.

    submit(order, reference_price) fills at reference_price adjusted for slippage
    in the adverse direction and applies commission as a bps cost on notional.
    Equity tracks fills at mark-to-market entry.
    """

    def __init__(self, starting_equity: float, paper_cfg: PaperExecutionConfig):
        self._equity = starting_equity
        self._paper_cfg = paper_cfg

    def equity(self) -> float:
        return self._equity

    def apply_pnl(self, pnl: float) -> None:
        self._equity += pnl

    def _venue_config(self, venue: str) -> PaperVenueConfig:
        if venue == "polymarket":
            return PaperVenueConfig(
                slippage_cents=self._paper_cfg.slippage_cents_poly,
                maker_bps=self._paper_cfg.maker_bps,
                taker_bps=self._paper_cfg.taker_bps,
                is_polymarket=True,
            )
        return PaperVenueConfig(
            slippage_bps=self._paper_cfg.slippage_bps_crypto,
            maker_bps=self._paper_cfg.maker_bps,
            taker_bps=self._paper_cfg.taker_bps,
            is_polymarket=False,
        )

    def submit(self, order: Order, reference_price: float) -> Fill:
        if reference_price <= 0:
            raise ValueError("reference_price must be positive")
        vcfg = self._venue_config(order.venue)
        sign = 1 if order.side == "long" else -1

        # Slippage is paid adversely: buys fill higher, sells fill lower.
        if vcfg.is_polymarket:
            slip_abs = vcfg.slippage_cents
            fill_px = reference_price + sign * slip_abs
            fill_px = max(min(fill_px, 1.0), 0.0)
            slippage_paid = abs(slip_abs) * order.qty
        else:
            slip_rel = vcfg.slippage_bps / 10_000.0
            fill_px = reference_price * (1.0 + sign * slip_rel)
            slippage_paid = abs(fill_px - reference_price) * order.qty

        notional = fill_px * order.qty
        commission_paid = notional * (vcfg.taker_bps / 10_000.0)

        # Entry commissions are immediately realized as equity cost.
        self._equity -= commission_paid

        ts = order.ts or datetime.utcnow()
        return Fill(
            order=order,
            fill_px=fill_px,
            fill_ts=ts,
            slippage_paid=slippage_paid,
            commission_paid=commission_paid,
        )
