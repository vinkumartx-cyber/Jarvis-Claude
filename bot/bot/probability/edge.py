from __future__ import annotations


def compute_edge(p_model: float, p_market: float) -> float:
    return p_model - p_market


def passes_threshold(edge: float, threshold: float) -> bool:
    return edge > threshold
