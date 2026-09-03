import hashlib
import ipaddress
import socket
from collections.abc import Callable, Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_PARAMETERS = frozenset(
    {
        "fbclid",
        "gclid",
        "msclkid",
        "utm_campaign",
        "utm_content",
        "utm_medium",
        "utm_source",
        "utm_term",
    }
)


class UnsafeURLError(ValueError):
    """Raised when a URL is invalid or may access a non-public network destination."""


Resolver = Callable[[str, int], Iterable[tuple]]


def normalize_url(value: str) -> str:
    """Normalize a product URL without changing product-identifying parameters."""
    raw_value = value.strip()
    try:
        parsed = urlsplit(raw_value)
        port = parsed.port
    except ValueError as exc:
        raise UnsafeURLError("URL contains an invalid port or host") from exc

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"}:
        raise UnsafeURLError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise UnsafeURLError("URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise UnsafeURLError("Credentials are not allowed in product URLs")

    try:
        hostname = parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
    except UnicodeError as exc:
        raise UnsafeURLError("URL contains an invalid hostname") from exc

    if not hostname:
        raise UnsafeURLError("URL must include a hostname")

    host_for_netloc = f"[{hostname}]" if ":" in hostname else hostname
    if port is None or (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        netloc = host_for_netloc
    else:
        netloc = f"{host_for_netloc}:{port}"

    query_items = [
        (key, item_value)
        for key, item_value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in TRACKING_PARAMETERS
    ]
    path = parsed.path or "/"
    return urlunsplit((scheme, netloc, path, urlencode(query_items, doseq=True), ""))


def normalized_url_hash(normalized_url: str) -> str:
    return hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()


def validate_public_url(value: str, resolver: Resolver = socket.getaddrinfo) -> str:
    """Normalize a URL and ensure every currently resolved address is public.

    Call this immediately before each request and again for every redirect target.
    """
    normalized = normalize_url(value)
    parsed = urlsplit(normalized)
    assert parsed.hostname is not None  # guaranteed by normalize_url

    hostname = parsed.hostname
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise UnsafeURLError("Localhost destinations are not allowed")

    literal_ip = _parse_ip(hostname)
    if literal_ip is not None:
        _require_public_ip(literal_ip)
        return normalized

    try:
        answers = list(resolver(hostname, parsed.port or _default_port(parsed.scheme)))
    except OSError as exc:
        raise UnsafeURLError("Hostname could not be resolved") from exc

    addresses = {_address_from_answer(answer) for answer in answers}
    addresses.discard(None)
    if not addresses:
        raise UnsafeURLError("Hostname did not resolve to an address")
    for address in addresses:
        _require_public_ip(ipaddress.ip_address(address))
    return normalized


def _default_port(scheme: str) -> int:
    return 443 if scheme == "https" else 80


def _parse_ip(hostname: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    try:
        return ipaddress.ip_address(hostname)
    except ValueError:
        return None


def _require_public_ip(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    mapped_address = getattr(address, "ipv4_mapped", None)
    candidate = mapped_address or address
    if not candidate.is_global:
        raise UnsafeURLError("URL resolves to a non-public network address")


def _address_from_answer(answer: tuple) -> str | None:
    if len(answer) < 5 or not answer[4]:
        return None
    return str(answer[4][0])
