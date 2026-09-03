from decimal import Decimal

import pytest

from app.scraping.pricing import detect_currency, parse_price


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("₹1,249.50", Decimal("1249.50")),
        ("EUR 10,50", Decimal("10.50")),
        (199, Decimal("199")),
        (None, None),
        ("Contact for price", None),
    ],
)
def test_parse_price(raw, expected) -> None:
    assert parse_price(raw) == expected


def test_detect_currency() -> None:
    assert detect_currency("MRP Rs. 499") == "INR"
    assert detect_currency("USD 12") == "USD"
    assert detect_currency("12.00") is None

