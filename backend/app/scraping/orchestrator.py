from dataclasses import dataclass
from typing import Protocol

from app.schemas.product_source import NormalizedProductSource
from app.scraping.errors import PermanentScrapingError, ScrapingError
from app.scraping.extractor import ProductExtractor
from app.scraping.scrapling_client import FetchResult


class FetchClient(Protocol):
    def fetch(self, url: str) -> FetchResult: ...


@dataclass(frozen=True, slots=True)
class ScrapeOutcome:
    source: NormalizedProductSource
    fetch: FetchResult
    warnings: tuple[str, ...] = ()


class ProductScrapingOrchestrator:
    def __init__(
        self,
        http_client: FetchClient,
        *,
        browser_client: FetchClient | None = None,
        extractor: ProductExtractor | None = None,
    ) -> None:
        self.http_client = http_client
        self.browser_client = browser_client
        self.extractor = extractor or ProductExtractor()

    def scrape(self, url: str) -> ScrapeOutcome:
        http_fetch = self.http_client.fetch(url)
        source = self.extractor.extract(
            http_fetch.html,
            http_fetch.final_url,
            method=http_fetch.extraction_method,
        )
        if not needs_browser_fallback(source):
            return ScrapeOutcome(source=source, fetch=http_fetch)

        if self.browser_client is None:
            if not is_usable_product(source):
                raise PermanentScrapingError("No usable product data was found")
            return ScrapeOutcome(
                source=source,
                fetch=http_fetch,
                warnings=("Important content may require browser rendering",),
            )

        try:
            browser_fetch = self.browser_client.fetch(http_fetch.final_url)
            browser_source = self.extractor.extract(
                browser_fetch.html,
                browser_fetch.final_url,
                method=browser_fetch.extraction_method,
            )
        except ScrapingError as exc:
            if not is_usable_product(source):
                raise
            return ScrapeOutcome(
                source=source,
                fetch=http_fetch,
                warnings=(f"Browser fallback unavailable: {exc}",),
            )

        selected = browser_source if extraction_score(browser_source) > extraction_score(source) else source
        selected_fetch = browser_fetch if selected is browser_source else http_fetch
        if not is_usable_product(selected):
            raise PermanentScrapingError("No usable product data was found")
        return ScrapeOutcome(source=selected, fetch=selected_fetch)


def extraction_score(source: NormalizedProductSource) -> int:
    return sum(
        (
            3 if source.product_title else 0,
            2 if source.description else 0,
            2 if source.specifications else 0,
            1 if source.brand else 0,
            1 if source.sku or source.product_code or source.mpn else 0,
            1 if source.images else 0,
            1 if source.pricing.sale_price is not None else 0,
            1 if source.features else 0,
        )
    )


def needs_browser_fallback(source: NormalizedProductSource) -> bool:
    return not source.product_title or extraction_score(source) < 6


def is_usable_product(source: NormalizedProductSource) -> bool:
    return bool(source.product_title and (source.description or source.specifications or source.sku))

