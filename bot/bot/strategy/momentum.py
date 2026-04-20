from __future__ import annotations

import pandas as pd

from ..features.regime import Regime
from ..features.structure import BOS, break_of_structure
from .base import AbstractStrategy, Signal, StrategyContext


class MomentumStrategy(AbstractStrategy):
    name = "momentum"
    suitable_regimes = {Regime.TRENDING}

    def __init__(self, k_atr: float = 1.5, rr: float = 2.0, expansion_mult: float = 1.5):
        self.k_atr = k_atr
        self.rr = rr
        self.expansion_mult = expansion_mult

    def generate_signal(
        self, df: pd.DataFrame, ctx: StrategyContext
    ) -> Signal | None:
        if len(df) < 60:
            return None
        last = df.iloc[-1]
        atr = float(last["atr"])
        if atr <= 0 or pd.isna(atr):
            return None

        bar_range = float(last["high"]) - float(last["low"])
        if bar_range < self.expansion_mult * atr:
            return None

        bos = break_of_structure(df.iloc[:-0] if False else df)
        if bos == BOS.NONE:
            return None

        close = float(last["close"])
        high = float(last["high"])
        low = float(last["low"])
        close_position = (close - low) / bar_range if bar_range > 0 else 0.5

        if bos == BOS.UP:
            if close_position < 0.75:
                return None
            entry = close
            stop = entry - self.k_atr * atr
            target = entry + self.rr * (entry - stop)
            side = "long"
        else:
            if close_position > 0.25:
                return None
            entry = close
            stop = entry + self.k_atr * atr
            target = entry - self.rr * (stop - entry)
            side = "short"

        return Signal(
            ts=last["ts"].to_pydatetime() if hasattr(last["ts"], "to_pydatetime") else last["ts"],
            venue=ctx.venue,
            symbol=ctx.symbol,
            timeframe=ctx.timeframe,
            setup=self.name,
            regime=Regime.TRENDING,
            side=side,
            entry=entry,
            stop=stop,
            target=target,
            metadata={"atr": atr, "bos": bos.value, "bar_range": bar_range},
        )
