from dataclasses import dataclass

import pytest

from app.scraping.browser_client import ScraplingBrowserClient


@dataclass
class FakeResponse:
    url: str = "https://example.com/product"
    status: int = 200
    headers: dict[str, str] = None
    body: str = "<html><body>Rendered product</body></html>"

    def __post_init__(self) -> None:
        self.headers = self.headers or {"Content-Type": "text/html"}

    @property
    def text(self) -> str:
        return self.body


class FakePage:
    def __init__(self) -> None:
        self.routes = []

    def route(self, pattern, callback) -> None:
        self.routes.append((pattern, callback))


class LegacyFetcher:
    def __init__(self) -> None:
        self.options = None
        self.page = FakePage()

    def fetch(
        self,
        url,
        *,
        headless,
        disable_resources,
        network_idle,
        timeout,
        page_action,
    ):
        self.options = {
            "url": url,
            "headless": headless,
            "disable_resources": disable_resources,
            "network_idle": network_idle,
            "timeout": timeout,
        }
        assert page_action(self.page) is self.page
        return FakeResponse(url=url)


@pytest.fixture(autouse=True)
def public_url_validation(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.scraping.browser_client.validate_public_url", lambda value: value
    )


def test_supports_legacy_scrapling_page_action_and_string_body() -> None:
    fetcher = LegacyFetcher()
    result = ScraplingBrowserClient(fetcher=fetcher).fetch("https://example.com/product")

    assert result.status_code == 200
    assert result.response_size == len(FakeResponse().body.encode())
    assert result.html == FakeResponse().body
    assert result.extraction_method == "scrapling_browser"
    assert fetcher.options["timeout"] == 30_000
    assert fetcher.page.routes[0][0] == "**/*"
