from __future__ import annotations

from ..features.regime import Regime
from .base import AbstractStrategy


def select_strategy(
    regime: Regime, registry: list[AbstractStrategy]
) -> AbstractStrategy | None:
    for s in registry:
        if s.suitable(regime):
            return s
    return None
