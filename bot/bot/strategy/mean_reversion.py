from __future__ import annotations

import pandas as pd

from ..features.regime import Regime
from ..features.structure import last_swing_high, last_swing_low
from .base import AbstractStrategy, Signal, StrategyContext


class MeanReversionStrategy(AbstractStrategy):
    name = "mean_reversion"
    suitable_regimes = {Regime.RANGING}

    def __init__(
        self,
        rsi_oversold: float = 30.0,
        rsi_overbought: float = 70.0,
        rr_floor: float = 1.5,
    ):
        self.rsi_oversold = rsi_oversold
        self.rsi_overbought = rsi_overbought
        self.rr_floor = rr_floor

    def generate_signal(
        self, df: pd.DataFrame, ctx: StrategyContext
    ) -> Signal | None:
        if len(df) < 60:
            return None
        last = df.iloc[-1]
        prev = df.iloc[-2]
        atr = float(last["atr"])
        if atr <= 0 or pd.isna(atr):
            return None

        bb_lower = float(last["bb_lower"])
        bb_upper = float(last["bb_upper"])
        bb_mid = float(last["bb_mid"])
        rsi = float(last["rsi"])
        prev_close = float(prev["close"])
        close = float(last["close"])

        # Long setup: prev bar closed below lower band with oversold RSI,
        # current bar snaps back inside the band.
        if (
            prev_close < float(prev["bb_lower"])
            and float(prev["rsi"]) < self.rsi_oversold
            and close > bb_lower
        ):
            swing = last_swing_low(df)
            if swing is None:
                return None
            entry = close
            stop = swing - 0.5 * atr
            if stop >= entry:
                return None
            target = bb_mid
            rr = (target - entry) / (entry - stop)
            if rr < self.rr_floor:
                return None
            side = "long"
            return Signal(
                ts=last["ts"].to_pydatetime() if hasattr(last["ts"], "to_pydatetime") else last["ts"],
                venue=ctx.venue,
                symbol=ctx.symbol,
                timeframe=ctx.timeframe,
                setup=self.name,
                regime=Regime.RANGING,
                side=side,
                entry=entry,
                stop=stop,
                target=target,
                metadata={"atr": atr, "rsi": rsi, "rr": rr},
            )

        # Short setup: mirror for above upper band.
        if (
            prev_close > float(prev["bb_upper"])
            and float(prev["rsi"]) > self.rsi_overbought
            and close < bb_upper
        ):
            swing = last_swing_high(df)
            if swing is None:
                return None
            entry = close
            stop = swing + 0.5 * atr
            if stop <= entry:
                return None
            target = bb_mid
            rr = (entry - target) / (stop - entry)
            if rr < self.rr_floor:
                return None
            return Signal(
                ts=last["ts"].to_pydatetime() if hasattr(last["ts"], "to_pydatetime") else last["ts"],
                venue=ctx.venue,
                symbol=ctx.symbol,
                timeframe=ctx.timeframe,
                setup=self.name,
                regime=Regime.RANGING,
                side="short",
                entry=entry,
                stop=stop,
                target=target,
                metadata={"atr": atr, "rsi": rsi, "rr": rr},
            )

        return None
