from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AccountConfig(BaseModel):
    starting_equity: float = 10_000.0
    currency: str = "USD"


class RiskConfig(BaseModel):
    risk_pct: float = Field(default=0.01, ge=0.0001, le=0.05)
    k_atr: float = Field(default=1.5, gt=0)
    daily_loss_limit_pct: float = Field(default=0.02, gt=0)
    max_positions: int = Field(default=3, ge=1)
    rr_floor: float = Field(default=1.5, gt=0)
    correlation_cap: float = Field(default=0.7, ge=0, le=1)


class ProbabilityConfig(BaseModel):
    edge_threshold: float = 0.05
    min_sample_size: int = 30


class StrategyToggle(BaseModel):
    enabled: bool = True


class StrategiesConfig(BaseModel):
    momentum: StrategyToggle = StrategyToggle()
    mean_reversion: StrategyToggle = StrategyToggle()
    breakout: StrategyToggle = StrategyToggle()


class CryptoMarketConfig(BaseModel):
    venue: str = "binance"
    symbols: list[str] = Field(default_factory=lambda: ["BTC/USDT"])
    timeframes: list[str] = Field(default_factory=lambda: ["5m", "15m"])


class PolymarketMarketConfig(BaseModel):
    markets: list[str] = Field(default_factory=list)
    poll_seconds: int = 60


class MarketsConfig(BaseModel):
    crypto: CryptoMarketConfig = CryptoMarketConfig()
    polymarket: PolymarketMarketConfig = PolymarketMarketConfig()


class PaperExecutionConfig(BaseModel):
    slippage_bps_crypto: float = 5.0
    slippage_cents_poly: float = 0.01
    maker_bps: float = 2.0
    taker_bps: float = 7.0


class ExecutionConfig(BaseModel):
    paper: PaperExecutionConfig = PaperExecutionConfig()


class AppConfig(BaseModel):
    account: AccountConfig = AccountConfig()
    risk: RiskConfig = RiskConfig()
    probability: ProbabilityConfig = ProbabilityConfig()
    strategies: StrategiesConfig = StrategiesConfig()
    markets: MarketsConfig = MarketsConfig()
    execution: ExecutionConfig = ExecutionConfig()


class Secrets(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    live_trading: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    database_url: str = "sqlite:///./bot/data.db"

    binance_api_key: str | None = None
    binance_api_secret: str | None = None

    polymarket_private_key: str | None = None
    polymarket_funder_address: str | None = None


def _default_config_path() -> Path:
    return Path(__file__).resolve().parent.parent / "config.yaml"


def load_app_config(path: Path | str | None = None) -> AppConfig:
    p = Path(path) if path else _default_config_path()
    if not p.exists():
        return AppConfig()
    raw = yaml.safe_load(p.read_text()) or {}
    return AppConfig.model_validate(raw)


@lru_cache(maxsize=1)
def load_config() -> tuple[AppConfig, Secrets]:
    return load_app_config(), Secrets()
