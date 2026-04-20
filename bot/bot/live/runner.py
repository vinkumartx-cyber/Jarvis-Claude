from __future__ import annotations

from ..config import AppConfig, Secrets
from ..data.crypto_ccxt import CryptoFeed
from ..execution.paper import PaperBroker
from ..logging_setup import get_logger
from ..probability.p_model import HeuristicPModel
from ..risk.guards import RiskGuards
from ..risk.portfolio import Portfolio
from ..storage.db import make_engine, make_session_factory, init_db
from ..strategy.breakout import BreakoutStrategy
from ..strategy.mean_reversion import MeanReversionStrategy
from ..strategy.momentum import MomentumStrategy
from .scheduler import build_scheduler
from .worker import SymbolWorker, WorkerConfig


log = get_logger(__name__)


def _build_strategies(cfg: AppConfig) -> list:
    strategies = []
    if cfg.strategies.momentum.enabled:
        strategies.append(MomentumStrategy(k_atr=cfg.risk.k_atr))
    if cfg.strategies.mean_reversion.enabled:
        strategies.append(MeanReversionStrategy(rr_floor=cfg.risk.rr_floor))
    if cfg.strategies.breakout.enabled:
        strategies.append(BreakoutStrategy())
    return strategies


def build_runner(cfg: AppConfig, secrets: Secrets):
    engine = make_engine(secrets.database_url)
    init_db(engine)
    session_factory = make_session_factory(engine)

    strategies = _build_strategies(cfg)
    broker = PaperBroker(cfg.account.starting_equity, cfg.execution.paper)
    guards = RiskGuards(cfg.risk)
    portfolio = Portfolio(equity=cfg.account.starting_equity)
    crypto_feed = CryptoFeed(venue=cfg.markets.crypto.venue)

    p_model = HeuristicPModel(
        session_factory, min_sample_size=cfg.probability.min_sample_size
    )

    workers: list[tuple[SymbolWorker, str]] = []
    for symbol in cfg.markets.crypto.symbols:
        for tf in cfg.markets.crypto.timeframes:
            wcfg = WorkerConfig(
                venue=cfg.markets.crypto.venue,
                symbol=symbol,
                timeframe=tf,
                risk_pct=cfg.risk.risk_pct,
                edge_threshold=cfg.probability.edge_threshold,
            )
            worker = SymbolWorker(
                cfg=wcfg,
                feed=crypto_feed,
                strategies=strategies,
                broker=broker,
                guards=guards,
                p_model=p_model,
                portfolio=portfolio,
                session_factory=session_factory,
            )
            workers.append((worker, tf))

    def _job_for(worker: SymbolWorker):
        def _run():
            try:
                worker.tick()
            except Exception:
                log.exception("worker_tick_failed", symbol=worker.cfg.symbol)

        return _run

    jobs = [
        (f"{w.cfg.symbol.replace('/', '_')}_{tf}", _job_for(w), tf)
        for w, tf in workers
    ]
    scheduler = build_scheduler(jobs)
    return scheduler, workers


def run_forever(cfg: AppConfig, secrets: Secrets) -> None:
    scheduler, workers = build_runner(cfg, secrets)
    log.info("starting_live_paper_loop", worker_count=len(workers))
    scheduler.start()
