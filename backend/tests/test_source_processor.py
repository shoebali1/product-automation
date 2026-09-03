from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.enums import JobStatus, SourceStatus
from app.models.scraping import ScrapingJob, ScrapingSource
from app.scraping.errors import PermanentScrapingError
from app.scraping.orchestrator import ProductScrapingOrchestrator
from app.scraping.scrapling_client import FetchResult
from app.scraping.url_safety import normalized_url_hash
from app.services.source_processor import SourceProcessor

RICH_HTML = """
<html><head><script type="application/ld+json">{
  "@type":"Product", "name":"Acme Widget", "description":"Detailed description",
  "sku":"W-1", "additionalProperty":[{"name":"Material", "value":"Silicone"}]
}</script></head><body><main><h1>Acme Widget</h1></main></body></html>
"""


class URLClient:
    def __init__(self, failing_urls: set[str] | None = None) -> None:
        self.failing_urls = failing_urls or set()
        self.calls = 0

    def fetch(self, url: str) -> FetchResult:
        self.calls += 1
        if url in self.failing_urls:
            raise PermanentScrapingError("Product page returned HTTP 404")
        return FetchResult(url, RICH_HTML, 200, len(RICH_HTML), "test_http")


def source(job: ScrapingJob, url: str) -> ScrapingSource:
    return ScrapingSource(
        job=job,
        url=url,
        normalized_url=url,
        normalized_url_hash=normalized_url_hash(url),
        domain="example.com",
    )


def test_persists_success_and_keeps_partial_job_alive() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    client = URLClient({"https://example.com/missing"})
    processor = SourceProcessor(ProductScrapingOrchestrator(client))
    with Session(engine) as session:
        job = ScrapingJob(total_urls=2)
        good = source(job, "https://example.com/good")
        missing = source(job, "https://example.com/missing")
        session.add_all([job, good, missing])
        session.commit()

        good_result = processor.process(session, good.id)
        assert good_result.status == SourceStatus.COMPLETED
        assert good.raw_product is not None
        assert good.normalized_product is not None
        assert job.status == JobStatus.SCRAPING

        failed_result = processor.process(session, missing.id)
        assert failed_result.status == SourceStatus.FAILED
        assert failed_result.retryable is False
        assert job.status == JobStatus.SCRAPED
        assert job.successful_urls == 1
        assert job.failed_urls == 1
        assert job.error_summary == "1 source could not be processed."


def test_reuses_recent_cached_normalized_source() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    client = URLClient()
    processor = SourceProcessor(ProductScrapingOrchestrator(client))
    with Session(engine) as session:
        first_job = ScrapingJob(total_urls=1)
        first = source(first_job, "https://example.com/product")
        session.add(first)
        session.commit()
        processor.process(session, first.id)

        second_job = ScrapingJob(total_urls=1)
        second = source(second_job, "https://example.com/product")
        session.add(second)
        session.commit()
        result = processor.process(session, second.id)

        assert result.cache_hit is True
        assert client.calls == 1
        assert second.normalized_product.product_data["product_title"] == "Acme Widget"
        assert second.extraction_method == "cache"
