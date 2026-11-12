"""A tiny shop total, with one bug, for the voice-to-Claude demo."""


def order_total(prices: list[float], discount_percent: float = 0) -> float:
    """Sum the prices, then take the discount off."""
    total = sum(prices)
    return round(total - discount_percent, 2)
