from __future__ import annotations

from typing import Callable

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger


def _cron_for_timeframe(timeframe: str) -> CronTrigger:
    if timeframe == "5m":
        return CronTrigger(minute="0,5,10,15,20,25,30,35,40,45,50,55", second=5)
    if timeframe == "15m":
        return CronTrigger(minute="0,15,30,45", second=5)
    if timeframe == "1h":
        return CronTrigger(minute=0, second=5)
    raise ValueError(f"unsupported timeframe: {timeframe}")


def build_scheduler(jobs: list[tuple[str, Callable[[], None], str]]) -> BlockingScheduler:
    """jobs: [(job_id, callable, timeframe)]"""
    scheduler = BlockingScheduler(timezone="UTC")
    for job_id, fn, tf in jobs:
        scheduler.add_job(
            fn, trigger=_cron_for_timeframe(tf), id=job_id, misfire_grace_time=30
        )
    return scheduler
