from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from sqlalchemy.orm import Session

from ..features.regime import Regime
from ..storage.repositories import SetupHitRateRepo


@dataclass
class PModelEstimate:
    p: float | None
    sample_size: int
    reason: str


class HeuristicPModel:
    """v1 P_model: lookup historical hit rate by (setup, regime, timeframe).

    Opens a short-lived session for each lookup so the model is safe to share
    across worker threads and long-running schedulers.

    If sample_size is below the minimum, return None (skip the trade).
    """

    def __init__(
        self,
        session_factory: Callable[[], Session],
        min_sample_size: int = 30,
    ):
        self.session_factory = session_factory
        self.min_sample_size = min_sample_size

    def estimate(
        self, setup: str, regime: Regime, timeframe: str
    ) -> PModelEstimate:
        session = self.session_factory()
        try:
            row = SetupHitRateRepo(session).get(setup, regime.value, timeframe)
            if row is None:
                return PModelEstimate(None, 0, "no_hit_rate_row")
            if row.sample_size < self.min_sample_size:
                return PModelEstimate(None, row.sample_size, "insufficient_sample")
            return PModelEstimate(row.hit_rate, row.sample_size, "ok")
        finally:
            session.close()
