# Monte Carlo Findings & Follow-Up Implementation Plan

## What we ran

- 50 paths, each a **6-year synthetic BTC/USDT 5m history** (630,720 bars per path)
- Different RNG seeds (1000..1049) → 50 independent regime-switch sequences
- Full engine: features → regime → strategy router → risk guards → paper fills (5 bps slippage, 7 bps taker commission) → SQLite persistence
- Parallelized across 12 worker processes, total runtime 13.8 min
- Output: `bot/reports/mc_50x6y.json`, log at `bot/reports/mc_50x6y.log`

## What we learned

### Aggregate distribution across 50 runs

| Metric | mean | median | std | p5 | p95 | min | max |
|---|---|---|---|---|---|---|---|
| Expectancy (E) | **+0.343** | +0.341 | 0.029 | +0.292 | +0.393 | +0.288 | +0.411 |
| Win rate (W) | 54.4% | 54.3% | 1.2% | 52.5% | 56.5% | 52.1% | 57.0% |
| Avg R | 1.47 | 1.47 | 0.01 | 1.44 | 1.48 | 1.44 | 1.48 |
| Profit factor | 1.87 | 1.79 | 0.26 | 1.54 | 2.46 | 1.51 | 2.59 |
| **Max drawdown** | **78.0%** | 77.3% | 8.5% | 62.8% | 91.1% | 62.2% | 94.8% |
| Trades per run | 10,995 | 10,961 | 418 | 10,256 | 11,728 | 10,093 | 11,949 |

- **100% of runs** ended positive expectancy and profitable.
- **0 blown-up accounts** (after applying the engine fixes listed below).
- **No single run had max DD under 62%.** This is catastrophic — even with provably positive expectancy, you would emotionally tap out of an 80% drawdown long before the rebound.

### Per-setup breakdown (averaged across 50 runs)

| Setup | Avg trades | E | W | R | Verdict |
|---|---|---|---|---|---|
| **Momentum** | 9,295 | **+0.404** | 56.5% | 1.49 | Workhorse. Carries the system. |
| **Breakout** | 1,336 | **+0.374** | 51.4% | 1.67 | Profitable, rarer. |
| **Mean reversion** | 365 | **−0.743** | **13.2%** | 0.95 | **Bleeds money in every run.** |

### Key findings

1. **Mean reversion has negative expectancy.** At 13% win rate and R=0.95, each mean-reversion trade loses 0.74R on average. Across 50 runs × 365 trades/run, this setup is a persistent drag. **Must be disabled or redesigned.**

2. **Drawdowns are the real risk, not ruin.** Positive expectancy does not save you from 78% median drawdown. The system survives on paper because we let it compound freely; in live trading the operator (or a prime broker) would force-close long before that.

3. **Engine fixes during MC surfaced three severe bugs** in the original v1:
   - **O(n²) slicing** — the original `df.iloc[:i+1]` copy-on-every-bar made 6-year runs infeasible. Fixed with a 200-bar trailing window.
   - **Naive next-bar-open fills** — filling entries at next bar's open (instead of at signal price) caused gap-slippage blowups: stop placed against `signal.entry` was invalid relative to the actual fill price. Fixed with a 0.5% max-gap filter + fill at signal price.
   - **Unbounded leverage** — tight ATR stops produced `stop_distance_pct = 0.15%`, creating `risk_pct × equity / 0.0015 = 6.7× leverage`, whose 7 bps taker commission alone exceeded the edge. Fixed with a 5× leverage cap in `position_size`.
   - **Equity could go negative** — broker now clamps loss so realized PnL ≥ −equity (liquidation semantics).

4. **Returns are mathematically real but practically meaningless.** 11,000 trades × 0.34R × 1% risk compounded = median +6.7M%, mean +8B%. Real markets cap this via (a) position-depth liquidity, (b) operator intervention on drawdowns, (c) the operator not being able to execute 11k trades without paying realistic slippage/fees. **The useful takeaway is per-trade expectancy and drawdown, not compounded return.**

5. **Sample sizes are huge.** Each 6y run books ~10k+ trades; the per-run E std of 0.029 means the estimates are tight. The MC is mostly characterizing **path-dependence of the drawdown**, not uncertainty in the mean edge.

6. **Synthetic ≠ real.** My generator uses uniformly-random regime selection from an 8-regime pool with GARCH-lite vol persistence. Real BTC 2020-2026 had specific autocorrelation (2021 bull run, 2022 crash, 2024 halving rally) that this doesn't reproduce. **The MC validates the engine and the math, not the real-world edge.**

## Follow-up plan

Ordered by priority, each item independently shippable.

### Phase A — Make the MC findings actionable (fastest wins)

**A1. Disable mean reversion by default in `config.yaml`.**
- File: `bot/config.yaml` — `strategies.mean_reversion.enabled: false`
- Keep the strategy code; toggle it behind a config flag. Post-launch we can re-enable if the rules are redesigned.
- Reason: 50/50 runs show negative expectancy. Leaving it enabled burns real money.

**A2. Add a trailing-equity kill switch to `RiskGuards`.**
- New guard: `trailing_drawdown_kill_switch(portfolio, threshold=0.20)` — reject all new orders if equity ≤ (1 − threshold) × peak equity since go-live.
- Default 20%. MC shows 78% median DD without this; with it, we stop trading after a 20% DD and preserve the account.
- File: `bot/risk/guards.py`; track `peak_equity` on `Portfolio`.

**A3. Add a per-run report generator.**
- Per-setup hit-rate, expectancy, and drawdown chart.
- Enables Phase 6 validation from the main plan.
- File: extend `bot/backtest/report.py`.

### Phase B — Rebuild mean reversion

Current rules are rigid (prev bar closes beyond BB ± 2σ + RSI oversold + current bar snaps back into band). Only fires in 365 trades / 630k bars = 0.06% of the time, and fires only after extreme moves where the snap-back is statistically unlikely.

**B1. Relax entry criteria.** Specific options to backtest:
- Require only RSI < 30 without the BB-band touch.
- Trigger on 3+ consecutive red bars below EMA20 instead of 1 bar outside BB.
- Add a volume-compression filter (low volume = more likely to mean-revert).

**B2. A/B test each variant in the MC framework.** Re-run 50 paths per variant, compare E/W/R/trade-count. Only promote a variant if it shows E > 0 on the out-of-sample half.

**B3. If none clear the bar, delete the strategy.** Don't ship negative-expectancy code.

### Phase C — Validate against real market data (required before live capital)

**C1. Fetch real historical data.** Run on a machine with internet: `run_backtest.py --source binance --symbol BTC/USDT --timeframe 5m --limit 630000`. Requires internet.

**C2. Re-run MC across real data subsets.** Instead of seed-randomized synthetic, use **walk-forward validation**: 6-month train windows, 3-month validation windows, rolling across 2020-2026.

**C3. Compare synthetic-MC stats vs real-data stats.** If real shows materially worse expectancy, the synthetic generator is too easy and the engine's apparent edge is an artifact of uniform regime sampling.

**C4. Expand to ETH/USDT, SOL/USDT.** Same rules must generalize across at least 3 majors before going live on any.

### Phase D — Make the MC findings drive live behavior

**D1. Seed `setup_hit_rates` from MC aggregates.**
- The MC produces clean per-setup hit rates. Populate `setup_hit_rates` with the **out-of-sample half** (seeds 1025-1049) so live `P_model` has a prior that wasn't used for rule design.
- CLI: extend `tools/mc_backtest.py` with `--seed-hit-rates` flag.

**D2. Per-setup edge thresholds.**
- Currently edge_threshold is a single global value (0.05). But momentum's `p_model=0.56` and breakout's `p_model=0.51` imply very different margin-over-market levels are normal.
- Add per-setup thresholds in config: `probability.edge_threshold_by_setup: {momentum: 0.08, breakout: 0.05, mean_reversion: 0.15}`.

**D3. Adaptive leverage cap.**
- MC shows that 5× leverage cap kicks in often when stops are tight. In live trading, exchange leverage limits will be more/less. Config: `risk.max_leverage: 5.0`, exposed via `PositionSize` call.

### Phase E — Post-launch observability

**E1. Equity-curve endpoint on the existing Next.js app.** Add a `/trading` route that reads `equity_curve`, `trades`, `signals` from SQLite (or a Postgres mirror) and renders expectancy, DD, trade count. This is the single biggest behavioral lever: seeing drawdown in real time makes operator panic less likely.

**E2. Weekly MC refresh.** Cron job that re-runs MC on the latest 30 days of real data + seeds `setup_hit_rates`. Keeps `P_model` fresh.

**E3. Trade-level Brier calibration report.** After each closed trade, log (`p_model`, `outcome_win`) → compute Brier score and reliability plot weekly. Phase 6 of the main plan.

## Critical files to modify (ranked)

1. `bot/config.yaml` — disable mean_reversion
2. `bot/risk/guards.py` — add `trailing_drawdown_kill_switch`, extend `Portfolio` with `peak_equity`
3. `bot/strategy/mean_reversion.py` — either rebuild or delete
4. `bot/risk/sizer.py` — make `max_leverage` a config-driven parameter
5. `bot/probability/edge.py` — support per-setup thresholds
6. `bot/backtest/report.py` — per-setup metrics in the HTML report
7. `tools/mc_backtest.py` — add `--seed-hit-rates` and walk-forward mode

## Reality check

The MC validated:
- The math (expectancy, sizing, ATR stops, edge gate) is internally consistent.
- The plumbing (feed → features → regime → strategy → guards → broker → storage) runs end-to-end at scale.
- Mean reversion as currently rule'd is a bleed.
- Drawdowns are the real enemy, not ruin.

The MC did **not** validate:
- That the system has a real edge on actual BTC/ETH/SOL 5m data.
- That live slippage (beyond 5 bps) doesn't destroy the edge.
- That a human operator would actually sit through an 80% drawdown rather than pull the plug.

Do not flip `LIVE_TRADING=true` until Phase C produces a real-data validation report showing positive expectancy with real slippage and commissions across ≥3 symbols.
