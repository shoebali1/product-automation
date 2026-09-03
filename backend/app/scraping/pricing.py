import re
from decimal import Decimal, InvalidOperation

CURRENCY_MARKERS = {
    "₹": "INR",
    "rs": "INR",
    "inr": "INR",
    "$": "USD",
    "usd": "USD",
    "€": "EUR",
    "eur": "EUR",
    "£": "GBP",
    "gbp": "GBP",
}
NUMBER_PATTERN = re.compile(r"(?<!\d)(\d{1,3}(?:[,.]\d{3})*(?:[.,]\d{1,2})?|\d+)(?!\d)")


def parse_price(value: object) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            parsed = Decimal(str(value))
        except InvalidOperation:
            return None
        return parsed if parsed >= 0 else None

    text = str(value).strip()
    match = NUMBER_PATTERN.search(text)
    if not match:
        return None
    number = match.group(1)
    if "," in number and "." in number:
        number = number.replace(",", "")
    elif number.count(",") == 1 and len(number.rsplit(",", 1)[1]) <= 2:
        number = number.replace(",", ".")
    else:
        number = number.replace(",", "")
    try:
        parsed = Decimal(number)
    except InvalidOperation:
        return None
    return parsed if parsed >= 0 else None


def detect_currency(*values: object) -> str | None:
    text = " ".join(str(value).lower() for value in values if value is not None)
    for marker, code in CURRENCY_MARKERS.items():
        if marker in text:
            return code
    return None

