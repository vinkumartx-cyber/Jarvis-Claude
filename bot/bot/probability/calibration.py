from __future__ import annotations

from typing import Sequence


def brier_score(predictions: Sequence[float], outcomes: Sequence[int]) -> float:
    if len(predictions) != len(outcomes):
        raise ValueError("length mismatch")
    if not predictions:
        return 0.0
    return sum((p - o) ** 2 for p, o in zip(predictions, outcomes)) / len(predictions)


def reliability_bins(
    predictions: Sequence[float], outcomes: Sequence[int], n_bins: int = 10
) -> list[tuple[float, float, int]]:
    """Return [(mean_pred, mean_outcome, count)] per bin."""
    if len(predictions) != len(outcomes):
        raise ValueError("length mismatch")
    buckets: list[list[tuple[float, int]]] = [[] for _ in range(n_bins)]
    for p, o in zip(predictions, outcomes):
        idx = min(int(p * n_bins), n_bins - 1)
        buckets[idx].append((p, o))
    out = []
    for b in buckets:
        if not b:
            continue
        mp = sum(x[0] for x in b) / len(b)
        mo = sum(x[1] for x in b) / len(b)
        out.append((mp, mo, len(b)))
    return out
