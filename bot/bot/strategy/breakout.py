from __future__ import annotations

import pandas as pd

from ..features.regime import Regime
from .base import AbstractStrategy, Signal, StrategyContext


class BreakoutStrategy(AbstractStrategy):
    name = "breakout"
    suitable_regimes = {Regime.COMPRESSED}

    def __init__(
        self,
        squeeze_bars: int = 6,
        squeeze_pct: float = 0.20,
        vol_mult: float = 1.5,
        rr: float = 2.0,
    ):
        self.squeeze_bars = squeeze_bars
        self.squeeze_pct = squeeze_pct
        self.vol_mult = vol_mult
        self.rr = rr

    def generate_signal(
        self, df: pd.DataFrame, ctx: StrategyContext
    ) -> Signal | None:
        if len(df) < 60:
            return None
        last = df.iloc[-1]
        atr = float(last["atr"])
        if atr <= 0 or pd.isna(atr):
            return None

        recent_bbwidth_pct = df["bbwidth_pct"].tail(self.squeeze_bars + 1).iloc[:-1]
        if recent_bbwidth_pct.isna().any():
            return None
        if not (recent_bbwidth_pct < self.squeeze_pct).all():
            return None

        close = float(last["close"])
        bb_lower = float(last["bb_lower"])
        bb_upper = float(last["bb_upper"])
        vol = float(last["volume"]) if not pd.isna(last["volume"]) else 0.0
        vol_mean = float(last["vol_mean20"]) if not pd.isna(last["vol_mean20"]) else 0.0
        if vol_mean <= 0 or vol < self.vol_mult * vol_mean:
            return None

        if close > bb_upper:
            entry = close
            stop = bb_lower
            if stop >= entry:
                return None
            target = entry + self.rr * (entry - stop)
            side = "long"
        elif close < bb_lower:
            entry = close
            stop = bb_upper
            if stop <= entry:
                return None
            target = entry - self.rr * (stop - entry)
            side = "short"
        else:
            return None

        return Signal(
            ts=last["ts"].to_pydatetime() if hasattr(last["ts"], "to_pydatetime") else last["ts"],
            venue=ctx.venue,
            symbol=ctx.symbol,
            timeframe=ctx.timeframe,
            setup=self.name,
            regime=Regime.COMPRESSED,
            side=side,
            entry=entry,
            stop=stop,
            target=target,
            metadata={"atr": atr, "vol_ratio": vol / vol_mean if vol_mean else None},
        )
