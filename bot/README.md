# Jarvis Trading Bot

Probability-based, paper-trading bot for **crypto (5-15m)** and **Polymarket**. Built
around the methodology in the project brief: expectancy-first, ATR-scaled stops,
volatility-regime-filtered setups, and risk rules enforced in code — not willpower.

> **v1 is paper-only.** Live broker adapters exist as stubs that refuse to submit
> orders unless `LIVE_TRADING=true`. Do not flip that until the validation
> report in Phase 6 shows positive expectancy over 100+ trades.

## What this bot actually does

1. Pulls OHLCV (ccxt for crypto, midprice polling for Polymarket).
2. Computes features (ATR, EMA, RSI, Bollinger, percentiles, structure).
3. Classifies the current regime as `TRENDING`, `RANGING`, or `COMPRESSED`.
4. Routes to the one strategy suited to that regime (momentum / mean reversion / breakout).
5. Estimates `P_model` (heuristic hit-rate lookup, seeded by backtest).
6. Computes `P_market` from reward:risk (crypto) or YES midprice (Polymarket).
7. Opens a trade **only if** `edge = P_model − P_market > threshold` (default 5%).
8. Sizes with `size = (equity × risk_pct) / stop_distance_pct`.
9. Rejects the trade in guards if it would violate daily-loss, max-positions,
   RR floor, duplicate-symbol, or post-loss risk-cap rules.

## Core formulas (as specified in the brief)

| Concept | Formula | File |
|---|---|---|
| Expectancy | `E = W · R − (1 − W)` | `bot/backtest/metrics.py` |
| Position size | `size = (equity × risk%) / stop_distance%` | `bot/risk/sizer.py` |
| ATR stop | `stop = entry ± k · ATR(14)` | `bot/risk/stops.py` |
| Edge | `edge = P_model − P_market` | `bot/probability/edge.py` |
| P_market (crypto) | `1 / (1 + RR)` | `bot/probability/p_market.py` |
| P_market (Polymarket) | `yes_mid` (or `1 − yes_mid` for NO) | `bot/probability/p_market.py` |

## Layout

```
bot/
├── config.yaml, .env.example, requirements.txt
├── run_paper.py, run_backtest.py
└── bot/
    ├── config.py, logging_setup.py
    ├── data/        # feeds (ccxt, Polymarket) + SQLite cache
    ├── features/    # indicators, structure, regime, pipeline
    ├── strategy/    # momentum, mean_reversion, breakout, router
    ├── probability/ # p_model, p_market, edge, calibration
    ├── risk/        # sizer, stops, guards, portfolio
    ├── execution/   # PaperBroker, Broker ABC, live stubs (disabled)
    ├── backtest/    # engine, metrics, HTML report
    ├── live/        # APScheduler, SymbolWorker, runner
    └── storage/     # SQLAlchemy models, repositories
```

## Quickstart

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env           # defaults are safe — LIVE_TRADING=false

# Sanity check
PYTHONPATH=. python -c "from bot.config import load_config; print(load_config()[0])"

# Run unit + integration tests
PYTHONPATH=. python -m pytest

# Backtest on ccxt data (needs internet), seeds setup_hit_rates
PYTHONPATH=. python run_backtest.py --source binance --symbol BTC/USDT --timeframe 5m --limit 2000

# Launch the live paper loop (blocks; APScheduler fires at bar close)
PYTHONPATH=. python run_paper.py
```

## Configuration

Edit `config.yaml`. The defaults map to the brief:

- `risk.risk_pct: 0.01`, `risk.k_atr: 1.5`, `risk.rr_floor: 1.5`
- `risk.daily_loss_limit_pct: 0.02` (hard kill-switch)
- `probability.edge_threshold: 0.05`, `probability.min_sample_size: 30`
- `markets.crypto.symbols: [BTC/USDT, ETH/USDT, SOL/USDT]` @ 5m/15m

Secrets (API keys, `LIVE_TRADING` flag) live in `.env` and are loaded via
`pydantic-settings`.

## Risk guards (hard rejects before broker submit)

Defined in `bot/risk/guards.py`:

- `rr_below_floor` — target/stop RR < `rr_floor` (1.5 by default)
- `max_positions_reached` — currently 3
- `daily_loss_kill_switch` — realized PnL today ≤ −2% equity → reject until UTC midnight
- `position_already_open_on_symbol` — no stacking
- `post_loss_risk_cap` — next trade's risk_pct can't exceed the last loser's (anti-martingale)

## Live broker stubs

`bot/execution/crypto_live.py` and `bot/execution/polymarket_live.py` exist but
`submit()` raises `NotImplementedError` in v1. Wiring them up is Phase 7 work.

## Testing

```
tests/
├── unit/       (sizing, expectancy, indicators, paper broker, guards, edge, stops, regime)
└── integration/ (end-to-end backtest smoke)
```

`pytest` from the `bot/` directory runs everything; all 57 current tests pass
without network access.

## Phasing reference

See `/root/.claude/plans/i-wan-to-build-rustling-lagoon.md` for the full
implementation plan and the Phase 6/7 roadmap (validation + deploy).

## Reality check

This is a **system to execute a small edge repeatably**, not a money printer.
Do not point it at real capital until:

1. `run_backtest.py` yields positive expectancy on out-of-sample data with
   slippage and commissions applied.
2. 100+ live paper trades validate the backtest (Brier score + reliability plot
   in Phase 6).
3. The guard-rejection audit trail in the `signals` table looks sane.
