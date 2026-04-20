from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from bot.backtest.engine import run_backtest
from bot.backtest.report import render_html, result_to_dict
from bot.config import load_config
from bot.data.crypto_ccxt import CryptoFeed
from bot.execution.paper import PaperBroker
from bot.logging_setup import configure_logging, get_logger
from bot.risk.guards import RiskGuards
from bot.storage.db import init_db, make_engine, make_session_factory
from bot.storage.models import BacktestRun
from bot.storage.repositories import SetupHitRateRepo
from bot.strategy.breakout import BreakoutStrategy
from bot.strategy.mean_reversion import MeanReversionStrategy
from bot.strategy.momentum import MomentumStrategy


log = get_logger(__name__)


def _load_ohlcv(
    source: str,
    symbol: str,
    timeframe: str,
    since: datetime | None,
    limit: int,
) -> pd.DataFrame:
    if source.endswith(".csv"):
        df = pd.read_csv(source, parse_dates=["ts"])
        return df
    feed = CryptoFeed(venue=source)
    return feed.get_ohlcv(symbol, timeframe, limit=limit, since=since)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="binance", help="ccxt venue or path to CSV")
    parser.add_argument("--symbol", default="BTC/USDT")
    parser.add_argument("--timeframe", default="5m")
    parser.add_argument("--limit", type=int, default=2000)
    parser.add_argument("--since", default=None, help="ISO8601 UTC")
    parser.add_argument("--out", default="bot/reports/backtest.html")
    parser.add_argument("--seed-hit-rates", action="store_true", default=True)
    args = parser.parse_args()

    app_cfg, secrets = load_config()
    configure_logging(secrets.log_level)

    since = (
        datetime.fromisoformat(args.since).replace(tzinfo=timezone.utc).replace(tzinfo=None)
        if args.since
        else None
    )
    df = _load_ohlcv(args.source, args.symbol, args.timeframe, since, args.limit)
    if len(df) < 120:
        log.error("not_enough_data", n=len(df))
        return 2

    strategies = [
        MomentumStrategy(k_atr=app_cfg.risk.k_atr),
        MeanReversionStrategy(rr_floor=app_cfg.risk.rr_floor),
        BreakoutStrategy(),
    ]
    broker = PaperBroker(app_cfg.account.starting_equity, app_cfg.execution.paper)
    guards = RiskGuards(app_cfg.risk)

    result = run_backtest(
        df_raw=df,
        symbol=args.symbol,
        timeframe=args.timeframe,
        venue="binance" if not args.source.endswith(".csv") else "csv",
        strategies=strategies,
        broker=broker,
        guards=guards,
        risk_pct=app_cfg.risk.risk_pct,
    )

    out_path = render_html(result, args.out)
    log.info(
        "backtest_complete",
        trades=len(result.trades),
        final_equity=result.final_equity,
        report=str(out_path),
    )
    print(f"Report: {out_path}")
    print(f"Trades: {len(result.trades)}")
    if result.stats:
        print(
            f"E={result.stats.expectancy:.4f}  W={result.stats.win_rate:.2%}  "
            f"R={result.stats.avg_r:.2f}  PF={result.stats.profit_factor:.2f}"
        )

    # Seed setup_hit_rates table for live p_model lookups.
    if args.seed_hit_rates:
        engine = make_engine(secrets.database_url)
        init_db(engine)
        session_factory = make_session_factory(engine)
        with session_factory() as session:
            repo = SetupHitRateRepo(session)
            for setup, stats in result.per_setup_stats.items():
                for regime in ("trending", "ranging", "compressed"):
                    wins = sum(1 for t in result.trades if t.setup == setup and t.regime == regime and t.r_multiple > 0)
                    total = sum(1 for t in result.trades if t.setup == setup and t.regime == regime)
                    if total == 0:
                        continue
                    repo.upsert(
                        setup=setup,
                        regime=regime,
                        timeframe=args.timeframe,
                        hit_rate=wins / total,
                        sample_size=total,
                        updated_at=datetime.utcnow(),
                    )
            session.add(
                BacktestRun(
                    started_at=datetime.utcnow(),
                    finished_at=datetime.utcnow(),
                    params_json=str(vars(args)),
                    metrics_json=str(result_to_dict(result)),
                    report_path=str(out_path),
                )
            )
            session.commit()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
