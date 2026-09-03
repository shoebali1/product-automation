import socket

import pytest

from app.scraping.url_safety import (
    UnsafeURLError,
    normalize_url,
    normalized_url_hash,
    validate_public_url,
)


def resolver_for(*addresses: str):
    def resolve(_host: str, port: int):
        return [(socket.AF_INET6 if ":" in address else socket.AF_INET, 1, 6, "", (address, port)) for address in addresses]

    return resolve


def test_normalize_url_removes_tracking_and_fragment() -> None:
    result = normalize_url(
        " HTTPS://Example.COM:443/product/1?sku=12&utm_source=test&colour=blue#reviews "
    )
    assert result == "https://example.com/product/1?sku=12&colour=blue"


def test_normalize_url_preserves_product_parameters_and_removes_default_port() -> None:
    assert normalize_url("http://example.com:80/item?size=12&pack=5") == (
        "http://example.com/item?size=12&pack=5"
    )


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com/product",
        "http://user:password@example.com/product",
        "http://localhost/product",
        "http://127.0.0.1/product",
        "http://169.254.169.254/latest/meta-data",
        "http://[::1]/product",
    ],
)
def test_rejects_unsafe_urls(url: str) -> None:
    with pytest.raises(UnsafeURLError):
        validate_public_url(url, resolver=resolver_for("93.184.216.34"))


def test_rejects_domain_when_any_dns_answer_is_private() -> None:
    with pytest.raises(UnsafeURLError):
        validate_public_url(
            "https://example.com/product",
            resolver=resolver_for("93.184.216.34", "10.0.0.8"),
        )


def test_accepts_domain_with_public_addresses() -> None:
    assert validate_public_url(
        "https://example.com/product", resolver=resolver_for("93.184.216.34")
    ) == "https://example.com/product"


def test_normalized_url_hash_is_stable() -> None:
    normalized = normalize_url("https://EXAMPLE.com/item?utm_source=x&sku=1")
    assert normalized_url_hash(normalized) == normalized_url_hash("https://example.com/item?sku=1")

