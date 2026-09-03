import pytest

from app.scraping.errors import PermanentScrapingError
from app.scraping.orchestrator import ProductScrapingOrchestrator
from app.scraping.scrapling_client import FetchResult


class FakeClient:
    def __init__(self, html: str, method: str) -> None:
        self.result = FetchResult(
            final_url="https://example.com/product",
            html=html,
            status_code=200,
            response_size=len(html),
            extraction_method=method,
        )
        self.calls = 0

    def fetch(self, _url: str) -> FetchResult:
        self.calls += 1
        return self.result


RICH_HTML = """
<html><head><script type="application/ld+json">{
  "@type":"Product", "name":"Acme Widget", "description":"Detailed widget description",
  "sku":"W-1", "brand":{"name":"Acme"}, "image":"https://example.com/a.jpg",
  "offers":{"price":"10", "priceCurrency":"USD"},
  "additionalProperty":[{"name":"Material", "value":"Silicone"}]
}</script></head><body><main><h1>Acme Widget</h1></main></body></html>
"""
THIN_HTML = "<html><body><main><h1>Acme Widget</h1></main></body></html>"
EMPTY_HTML = "<html><body><main>Loading...</main></body></html>"


def test_does_not_launch_browser_when_http_extraction_is_sufficient() -> None:
    http, browser = FakeClient(RICH_HTML, "http"), FakeClient(RICH_HTML, "browser")
    outcome = ProductScrapingOrchestrator(http, browser_client=browser).scrape(
        "https://example.com/product"
    )
    assert outcome.source.product_title == "Acme Widget"
    assert browser.calls == 0


def test_browser_replaces_thin_http_result_when_it_improves_coverage() -> None:
    http, browser = FakeClient(THIN_HTML, "http"), FakeClient(RICH_HTML, "browser")
    outcome = ProductScrapingOrchestrator(http, browser_client=browser).scrape(
        "https://example.com/product"
    )
    assert outcome.fetch.extraction_method == "browser"
    assert outcome.source.sku == "W-1"


def test_unusable_page_without_browser_fails() -> None:
    with pytest.raises(PermanentScrapingError, match="No usable product data"):
        ProductScrapingOrchestrator(FakeClient(EMPTY_HTML, "http")).scrape(
            "https://example.com/product"
        )
