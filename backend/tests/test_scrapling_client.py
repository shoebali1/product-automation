import os
from dataclasses import dataclass
from pathlib import Path

import pytest

from app.scraping.errors import PermanentScrapingError, TransientScrapingError
from app.scraping.scrapling_client import ScraplingClient, TLDEXTRACT_CACHE_DIR


@dataclass
class FakeResponse:
    status: int
    headers: dict[str, str]
    body: bytes | str = b"<html>ok</html>"

    @property
    def text(self) -> str:
        return self.body if isinstance(self.body, str) else self.body.decode()


class FakeFetcher:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = iter(responses)
        self.requested_urls: list[str] = []
        self.requested_options: list[dict] = []

    def get(self, url: str, **kwargs):
        self.requested_urls.append(url)
        self.requested_options.append(kwargs)
        return next(self.responses)


class FailingFetcher:
    def get(self, _url: str, **_kwargs):
        raise ConnectionError("private diagnostic details")


@pytest.fixture(autouse=True)
def public_url_validation(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.scraping.scrapling_client.validate_public_url", lambda value: value
    )


def test_fetches_html_with_manual_redirect_validation() -> None:
    fetcher = FakeFetcher(
        [
            FakeResponse(302, {"Location": "/final"}),
            FakeResponse(200, {"Content-Type": "text/html"}),
        ]
    )
    result = ScraplingClient(fetcher=fetcher).fetch("https://example.com/start")
    assert result.final_url == "https://example.com/final"
    assert fetcher.requested_urls == ["https://example.com/start", "https://example.com/final"]
    assert all("retries" not in options for options in fetcher.requested_options)


def test_rejects_oversized_response() -> None:
    fetcher = FakeFetcher([FakeResponse(200, {"Content-Type": "text/html"}, b"12345")])
    with pytest.raises(PermanentScrapingError, match="too large"):
        ScraplingClient(fetcher=fetcher, max_response_bytes=4).fetch("https://example.com")


def test_accepts_string_response_body_from_scrapling() -> None:
    fetcher = FakeFetcher([FakeResponse(200, {"Content-Type": "text/html"}, "<html>ok</html>")])
    result = ScraplingClient(fetcher=fetcher).fetch("https://example.com")
    assert result.response_size == len("<html>ok</html>".encode())
    assert result.html == "<html>ok</html>"


def test_marks_retryable_status_as_transient() -> None:
    fetcher = FakeFetcher([FakeResponse(503, {"Content-Type": "text/html"})])
    with pytest.raises(TransientScrapingError):
        ScraplingClient(fetcher=fetcher).fetch("https://example.com")


def test_marks_not_found_as_permanent() -> None:
    fetcher = FakeFetcher([FakeResponse(404, {"Content-Type": "text/html"})])
    with pytest.raises(PermanentScrapingError):
        ScraplingClient(fetcher=fetcher).fetch("https://example.com")


def test_uses_project_runtime_for_tldextract_cache() -> None:
    assert Path(os.environ["TLDEXTRACT_CACHE"]) == TLDEXTRACT_CACHE_DIR
    assert TLDEXTRACT_CACHE_DIR.name == "tldextract"
    assert TLDEXTRACT_CACHE_DIR.parent.name == ".runtime"


def test_request_failure_preserves_safe_exception_type() -> None:
    with pytest.raises(TransientScrapingError, match=r"failed \(ConnectionError\)"):
        ScraplingClient(fetcher=FailingFetcher()).fetch("https://example.com")
