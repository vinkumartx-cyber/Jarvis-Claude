from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .engine import BacktestResult


_HTML_TEMPLATE = """<!doctype html>
<html><head><meta charset="utf-8"><title>Backtest Report</title>
<style>
 body{{font-family:-apple-system,system-ui,sans-serif;max-width:960px;margin:2em auto;padding:0 1em;color:#222}}
 h1,h2{{border-bottom:1px solid #ddd;padding-bottom:.25em}}
 table{{border-collapse:collapse;width:100%;margin:1em 0;font-size:14px}}
 th,td{{border:1px solid #e1e1e1;padding:6px 10px;text-align:right}}
 th{{background:#f5f5f5;text-align:left}}
 .pos{{color:#0a7d0a}}
 .neg{{color:#c12121}}
 pre{{background:#f8f8f8;padding:10px;overflow-x:auto;font-size:12px}}
</style></head><body>
<h1>Backtest Report</h1>
<h2>Summary</h2>
<table>
 <tr><th>Metric</th><th>Value</th></tr>
 <tr><td>Trades</td><td>{n}</td></tr>
 <tr><td>Expectancy (E)</td><td class="{ecls}">{e:.4f}</td></tr>
 <tr><td>Win rate (W)</td><td>{w:.2%}</td></tr>
 <tr><td>Average R (R)</td><td>{r:.2f}</td></tr>
 <tr><td>Profit factor</td><td>{pf:.2f}</td></tr>
 <tr><td>Max drawdown</td><td>{dd:.2%}</td></tr>
 <tr><td>Final equity</td><td>{fe:,.2f}</td></tr>
</table>
<h2>Per-setup breakdown</h2>
{per_setup_table}
<h2>Trade log (first 50)</h2>
<pre>{trades}</pre>
</body></html>
"""


def _per_setup_table(result: BacktestResult) -> str:
    if not result.per_setup_stats:
        return "<p><em>No trades booked.</em></p>"
    rows = [
        "<table><tr><th>Setup</th><th>N</th><th>E</th><th>W</th><th>R</th><th>PF</th></tr>"
    ]
    for name, s in result.per_setup_stats.items():
        rows.append(
            f"<tr><th>{name}</th>"
            f"<td>{s.sample_size}</td>"
            f"<td>{s.expectancy:.4f}</td>"
            f"<td>{s.win_rate:.2%}</td>"
            f"<td>{s.avg_r:.2f}</td>"
            f"<td>{s.profit_factor:.2f}</td></tr>"
        )
    rows.append("</table>")
    return "\n".join(rows)


def render_html(result: BacktestResult, out_path: Path | str) -> Path:
    stats = result.stats
    trades_sample = [
        {
            "entry_ts": t.entry_ts.isoformat(),
            "exit_ts": t.exit_ts.isoformat(),
            "setup": t.setup,
            "side": t.side,
            "entry_px": round(t.entry_px, 4),
            "exit_px": round(t.exit_px, 4),
            "r": round(t.r_multiple, 3),
            "pnl": round(t.pnl, 2),
            "reason": t.reason,
        }
        for t in result.trades[:50]
    ]
    html = _HTML_TEMPLATE.format(
        n=stats.sample_size if stats else 0,
        e=stats.expectancy if stats else 0,
        ecls="pos" if stats and stats.expectancy > 0 else "neg",
        w=stats.win_rate if stats else 0,
        r=stats.avg_r if stats else 0,
        pf=stats.profit_factor if stats else 0,
        dd=stats.max_drawdown if stats else 0,
        fe=result.final_equity,
        per_setup_table=_per_setup_table(result),
        trades=json.dumps(trades_sample, indent=2),
    )
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html)
    return p


def result_to_dict(result: BacktestResult) -> dict:
    return {
        "final_equity": result.final_equity,
        "stats": asdict(result.stats) if result.stats else None,
        "per_setup_stats": {k: asdict(v) for k, v in result.per_setup_stats.items()},
        "trade_count": len(result.trades),
    }
