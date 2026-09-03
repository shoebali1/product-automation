import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from app.scraping.errors import PermanentScrapingError, TransientScrapingError
from app.scraping.url_safety import validate_public_url

TRANSIENT_STATUSES = {408, 409, 425, 429, 500, 502, 503, 504}
REDIRECT_STATUSES = {301, 302, 303, 307, 308}

# tldextract 5.x falls back to its package directory on Windows. A stale lock there
# prevents Scrapling from making any request, so keep its cache in application runtime data.
TLDEXTRACT_CACHE_DIR = Path(__file__).resolve().parents[3] / ".runtime" / "tldextract"
os.environ.setdefault("TLDEXTRACT_CACHE", str(TLDEXTRACT_CACHE_DIR))


@dataclass(frozen=True, slots=True)
class FetchResult:
    final_url: str
    html: str
    status_code: int
    response_size: int
    extraction_method: str = "scrapling_http"


class ScraplingClient:
    """Small security boundary around Scrapling's inexpensive HTTP fetcher."""

    def __init__(
        self,
        *,
        timeout_seconds: float = 15,
        max_response_bytes: int = 5 * 1024 * 1024,
        max_redirects: int = 5,
        fetcher: Any | None = None,
    ) -> None:
        if fetcher is None:
            from scrapling.fetchers import Fetcher

            fetcher = Fetcher()
        self.fetcher = fetcher
        self.timeout_seconds = timeout_seconds
        self.max_response_bytes = max_response_bytes
        self.max_redirects = max_redirects

    def fetch(self, url: str) -> FetchResult:
        current_url = validate_public_url(url)
        for redirect_count in range(self.max_redirects + 1):
            try:
                response = self.fetcher.get(
                    current_url,
                    follow_redirects=False,
                    timeout=self.timeout_seconds,
                )
            except Exception as exc:
                raise TransientScrapingError(_request_failure_message(exc)) from exc

            status = int(response.status)
            headers = {str(key).lower(): str(value) for key, value in response.headers.items()}
            if status in REDIRECT_STATUSES:
                location = headers.get("location")
                if not location:
                    raise PermanentScrapingError("Redirect response did not provide a location")
                if redirect_count >= self.max_redirects:
                    raise PermanentScrapingError("Product page exceeded the redirect limit")
                current_url = validate_public_url(urljoin(current_url, location))
                continue

            if status in TRANSIENT_STATUSES:
                raise TransientScrapingError(f"Product page returned HTTP {status}")
            if status >= 400:
                raise PermanentScrapingError(f"Product page returned HTTP {status}")

            content_length = _parse_content_length(headers.get("content-length"))
            if content_length is not None and content_length > self.max_response_bytes:
                raise PermanentScrapingError("Product page response is too large")

            body = _response_bytes(response.body)
            if len(body) > self.max_response_bytes:
                raise PermanentScrapingError("Product page response is too large")
            content_type = headers.get("content-type", "text/html").lower()
            if "html" not in content_type and "xhtml" not in content_type:
                raise PermanentScrapingError("Product URL did not return an HTML page")

            return FetchResult(
                final_url=current_url,
                html=_response_html(response.body),
                status_code=status,
                response_size=len(body),
            )

        raise PermanentScrapingError("Product page exceeded the redirect limit")


def _parse_content_length(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def _response_bytes(body: Any) -> bytes:
    if isinstance(body, str):
        return body.encode("utf-8")
    return bytes(body)


def _response_html(body: Any) -> str:
    if isinstance(body, str):
        return body
    return bytes(body).decode("utf-8", errors="replace")


def _request_failure_message(error: Exception) -> str:
    error_type = error.__class__.__name__
    error_module = error.__class__.__module__
    if error_type == "Timeout" and error_module.startswith("filelock"):
        return "Scraper domain cache lock timed out"
    return f"Product page request failed ({error_type})"
