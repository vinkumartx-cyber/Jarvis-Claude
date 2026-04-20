from __future__ import annotations

from abc import ABC, abstractmethod

from .order import Fill, Order


class Broker(ABC):
    @abstractmethod
    def submit(self, order: Order, reference_price: float) -> Fill: ...

    @abstractmethod
    def equity(self) -> float: ...
