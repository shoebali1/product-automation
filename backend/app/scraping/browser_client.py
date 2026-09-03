import inspect
from typing import Any
from urllib.parse import urlsplit

from app.scraping.errors import PermanentScrapingError, TransientScrapingError
from app.scraping.scrapling_client import (
    FetchResult,
    _parse_content_length,
    _response_bytes,
    _response_html,
)
from app.scraping.url_safety import UnsafeURLError, validate_public_url


class BrowserUnavailableError(PermanentScrapingError):
    pass


class ScraplingBrowserClient:
    """Dynamic browser fallback with pre-navigation SSRF request interception."""

    def __init__(
        self,
        *,
        timeout_seconds: float = 30,
        max_response_bytes: int = 5 * 1024 * 1024,
        fetcher: Any | None = None,
    ) -> None:
        if fetcher is None:
            try:
                from scrapling.fetchers import DynamicFetcher
            except ImportError:
                from scrapling.fetchers import PlayWrightFetcher as DynamicFetcher

            fetcher = DynamicFetcher()
        self.fetcher = fetcher
        self.timeout_seconds = timeout_seconds
        self.max_response_bytes = max_response_bytes

    def fetch(self, url: str) -> FetchResult:
        safe_url = validate_public_url(url)
        fetch_method = self.fetcher.fetch
        parameters = inspect.signature(fetch_method).parameters
        if "page_setup" not in parameters and "page_action" not in parameters:
            raise BrowserUnavailableError(
                "Installed Scrapling version cannot secure browser navigation; upgrade Scrapling"
            )

        def secure_page(page: Any) -> None:
            def guard_request(route: Any) -> None:
                request_url = str(route.request.url)
                if urlsplit(request_url).scheme in {"data", "blob"}:
                    route.continue_()
                    return
                try:
                    validate_public_url(request_url)
                except UnsafeURLError:
                    route.abort()
                else:
                    route.continue_()

            page.route("**/*", guard_request)
            return page

        try:
            options = {
                "headless": True,
                "disable_resources": True,
                "network_idle": False,
                "timeout": int(self.timeout_seconds * 1000),
                "page_setup" if "page_setup" in parameters else "page_action": secure_page,
            }
            response = fetch_method(safe_url, **options)
        except BrowserUnavailableError:
            raise
        except Exception as exc:
            raise TransientScrapingError("Browser rendering failed") from exc

        final_url = validate_public_url(str(response.url))
        status = int(response.status)
        if status >= 400:
            error_type = TransientScrapingError if status >= 500 or status == 429 else PermanentScrapingError
            raise error_type(f"Browser-rendered page returned HTTP {status}")
        headers = {str(key).lower(): str(value) for key, value in response.headers.items()}
        content_length = _parse_content_length(headers.get("content-length"))
        body = _response_bytes(response.body)
        if (content_length is not None and content_length > self.max_response_bytes) or len(
            body
        ) > self.max_response_bytes:
            raise PermanentScrapingError("Browser-rendered product page is too large")
        return FetchResult(
            final_url=final_url,
            html=_response_html(response.body),
            status_code=status,
            response_size=len(body),
            extraction_method="scrapling_browser",
        )
