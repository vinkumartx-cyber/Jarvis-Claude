from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

import pandas as pd

from ..features.regime import Regime

Side = Literal["long", "short"]


@dataclass
class Signal:
    ts: datetime
    venue: str
    symbol: str
    timeframe: str
    setup: str
    regime: Regime
    side: Side
    entry: float
    stop: float
    target: float
    p_model: float | None = None
    p_market: float | None = None
    edge: float | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class StrategyContext:
    venue: str
    symbol: str
    timeframe: str


class AbstractStrategy(ABC):
    name: str
    suitable_regimes: set[Regime]

    @abstractmethod
    def generate_signal(
        self, df: pd.DataFrame, ctx: StrategyContext
    ) -> Signal | None: ...

    def suitable(self, regime: Regime) -> bool:
        return regime in self.suitable_regimes
