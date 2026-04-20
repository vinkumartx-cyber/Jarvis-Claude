from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ..config import RiskConfig
from ..strategy.base import Signal
from .portfolio import Portfolio
from .stops import rr_from


@dataclass
class GuardDecision:
    accepted: bool
    reason: str | None = None

    @classmethod
    def accept(cls) -> "GuardDecision":
        return cls(True, None)

    @classmethod
    def reject(cls, reason: str) -> "GuardDecision":
        return cls(False, reason)


class RiskGuards:
    def __init__(self, cfg: RiskConfig):
        self.cfg = cfg

    def check(self, signal: Signal, portfolio: Portfolio, now: datetime) -> GuardDecision:
        # 1. rr_floor
        try:
            rr = rr_from(signal.entry, signal.stop, signal.target, signal.side)
        except ValueError as exc:
            return GuardDecision.reject(f"invalid_stop: {exc}")
        if rr < self.cfg.rr_floor:
            return GuardDecision.reject(f"rr_below_floor:{rr:.2f}")

        # 2. max_concurrent_positions
        if len(portfolio.open_positions) >= self.cfg.max_positions:
            return GuardDecision.reject("max_positions_reached")

        # 3. daily_loss_kill_switch
        if portfolio.equity > 0:
            today_pnl = portfolio.today_realized_pnl(now)
            if today_pnl <= -self.cfg.daily_loss_limit_pct * portfolio.equity:
                return GuardDecision.reject("daily_loss_kill_switch")

        # 4. per-symbol duplicate guard (avoid stacking on same market)
        for p in portfolio.open_positions:
            if p.symbol == signal.symbol and p.venue == signal.venue:
                return GuardDecision.reject("position_already_open_on_symbol")

        return GuardDecision.accept()

    def post_loss_risk_cap(self, portfolio: Portfolio, configured_risk_pct: float) -> float:
        """After a losing trade, cap next trade's risk_pct to the loser's size.

        Prevents martingale sizing. Returns the effective risk_pct to use.
        """
        last = portfolio.last_trade()
        if last is None or last.get("pnl", 0) >= 0:
            return configured_risk_pct
        prior_risk = last.get("risk_pct", configured_risk_pct)
        return min(configured_risk_pct, prior_risk)
