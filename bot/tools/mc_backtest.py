"""Monte Carlo driver: N seeds x 6y backtest -> distribution of stats.

Each run generates a fresh 6-year synthetic price series with a different
seed, runs the full backtest pipeline (features, regime, strategy router,
risk guards, paper broker with slippage), and records per-run summary
stats. Aggregates into distribution of expectancy, win rate, R, profit
factor, max drawdown, final equity, and trade count.

Usage:
    PYTHONPATH=. python tools/mc_backtest.py --runs 50 --bars 630720 --seed0 1000
"""
from __future__ import annotations

import argparse
import json
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path
from statistics import mean, median, pstdev

from bot.backtest.engine import run_backtest
from bot.config import PaperExecutionConfig, RiskConfig
from bot.execution.paper import PaperBroker
from bot.risk.guards import RiskGuards
from bot.strategy.breakout import BreakoutStrategy
from bot.strategy.mean_reversion import MeanReversionStrategy
from bot.strategy.momentum import MomentumStrategy

from tools.gen_synth_history import generate


def run_one(seed: int, n_bars: int, risk_pct: float, starting_equity: float) -> dict:
    df = generate(n_bars=n_bars, seed=seed)
    df = df[["ts", "open", "high", "low", "close", "volume"]]
    broker = PaperBroker(starting_equity, PaperExecutionConfig())
    guards = RiskGuards(RiskConfig(risk_pct=risk_pct))
    result = run_backtest(
        df,
        symbol="BTC/USDT",
        timeframe="5m",
        venue="mc",
        strategies=[MomentumStrategy(), MeanReversionStrategy(), BreakoutStrategy()],
        broker=broker,
        guards=guards,
        risk_pct=risk_pct,
    )
    stats = result.stats
    per_setup = {
        setup: {
            "n": s.sample_size,
            "E": s.expectancy,
            "W": s.win_rate,
            "R": s.avg_r,
            "PF": s.profit_factor,
        }
        for setup, s in result.per_setup_stats.items()
    }
    return {
        "seed": seed,
        "trades": stats.sample_size if stats else 0,
        "expectancy": stats.expectancy if stats else 0.0,
        "win_rate": stats.win_rate if stats else 0.0,
        "avg_r": stats.avg_r if stats else 0.0,
        "profit_factor": stats.profit_factor if stats else 0.0,
        "max_drawdown": stats.max_drawdown if stats else 0.0,
        "final_equity": result.final_equity,
        "return_pct": (result.final_equity / starting_equity - 1.0) if starting_equity else 0.0,
        "blown_up": result.final_equity <= 0,
        "per_setup": per_setup,
    }


def summarize(runs: list[dict]) -> dict:
    def col(name: str) -> list[float]:
        return [r[name] for r in runs]

    def stats(vals: list[float]) -> dict:
        if not vals:
            return {}
        svals = sorted(vals)
        return {
            "mean": mean(vals),
            "median": median(vals),
            "std": pstdev(vals) if len(vals) > 1 else 0.0,
            "p5": svals[max(0, int(0.05 * len(svals)) - 1)],
            "p25": svals[max(0, int(0.25 * len(svals)) - 1)],
            "p75": svals[min(len(svals) - 1, int(0.75 * len(svals)))],
            "p95": svals[min(len(svals) - 1, int(0.95 * len(svals)))],
            "min": min(vals),
            "max": max(vals),
        }

    return {
        "n_runs": len(runs),
        "blown_up_count": sum(1 for r in runs if r["blown_up"]),
        "positive_expectancy_rate": sum(1 for r in runs if r["expectancy"] > 0) / len(runs) if runs else 0,
        "profitable_run_rate": sum(1 for r in runs if r["return_pct"] > 0) / len(runs) if runs else 0,
        "expectancy": stats(col("expectancy")),
        "win_rate": stats(col("win_rate")),
        "avg_r": stats(col("avg_r")),
        "profit_factor": stats([r["profit_factor"] for r in runs if r["profit_factor"] != float("inf")]),
        "max_drawdown": stats(col("max_drawdown")),
        "return_pct": stats(col("return_pct")),
        "trades": stats(col("trades")),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=50)
    parser.add_argument("--bars", type=int, default=630_720, help="bars per run (default 6y of 5m)")
    parser.add_argument("--seed0", type=int, default=1000)
    parser.add_argument("--risk-pct", type=float, default=0.01)
    parser.add_argument("--equity", type=float, default=10_000.0)
    parser.add_argument("--out", default="bot/reports/mc_summary.json")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    print(f"running {args.runs} MC paths, {args.bars} bars each, risk={args.risk_pct}, workers={args.workers}")
    runs: list[dict] = []
    t_start = time.time()
    seeds = [args.seed0 + i for i in range(args.runs)]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_one, s, args.bars, args.risk_pct, args.equity): s
            for s in seeds
        }
        for idx, fut in enumerate(as_completed(futures), start=1):
            seed = futures[fut]
            r = fut.result()
            runs.append(r)
            print(
                f"  [{idx:3d}/{args.runs}] seed={seed:5d}  "
                f"trades={r['trades']:4d}  E={r['expectancy']:+.3f}  "
                f"W={r['win_rate']:.2%}  R={r['avg_r']:.2f}  "
                f"DD={r['max_drawdown']:.2%}  ret={r['return_pct']:+.2%}",
                flush=True,
            )

    total_dt = time.time() - t_start
    summary = summarize(runs)
    summary["total_runtime_sec"] = total_dt
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"runs": runs, "summary": summary}, indent=2))
    print(f"\nTotal runtime: {total_dt:.1f}s  ({total_dt/max(1,len(runs)):.1f}s/run)")
    print(f"Wrote {out}")
    print()
    print("=" * 70)
    print("DISTRIBUTION SUMMARY")
    print("=" * 70)
    print(f"Runs: {summary['n_runs']}   Blown-up: {summary['blown_up_count']}")
    print(f"Positive-expectancy rate: {summary['positive_expectancy_rate']:.2%}")
    print(f"Profitable (ret>0) rate:  {summary['profitable_run_rate']:.2%}")
    print()
    for metric in ("expectancy", "win_rate", "avg_r", "profit_factor", "max_drawdown", "return_pct", "trades"):
        s = summary[metric]
        if not s:
            continue
        print(f"{metric:<15}  mean={s['mean']:+.4f}  median={s['median']:+.4f}  std={s['std']:.4f}  "
              f"p5={s['p5']:+.4f}  p95={s['p95']:+.4f}  min={s['min']:+.4f}  max={s['max']:+.4f}")


if __name__ == "__main__":
    main()
