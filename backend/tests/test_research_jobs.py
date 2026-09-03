from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.enums import JobStatus, SourceStatus
from app.models.scraping import ScrapingJob, ScrapingSource
from app.schemas.research_job import CreateResearchJobRequest
from app.scraping.url_safety import normalize_url
from app.services.research_jobs import (
    create_research_job,
    get_research_job,
    prepare_source_retry,
    to_job_detail,
)


def test_create_job_removes_duplicate_normalized_urls() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    request = CreateResearchJobRequest(
        urls=[
            "https://example.com/product?sku=1&utm_source=campaign",
            "https://EXAMPLE.com/product?sku=1",
            "https://example.com/product?sku=2",
        ]
    )
    with Session(engine) as session:
        job = create_research_job(session, request, validator=normalize_url)
        loaded = get_research_job(session, job.id)
        assert loaded is not None
        detail = to_job_detail(loaded)
        assert detail.total_urls == 2
        assert len(detail.sources) == 2
        assert {source.attempts for source in detail.sources} == {0}


def test_manual_retry_resets_source_budget_and_reactivates_job() -> None:
    completed_at = datetime.now(UTC)
    job = ScrapingJob(
        total_urls=1,
        failed_urls=1,
        status=JobStatus.FAILED,
        completed_at=completed_at,
        error_summary="No source produced usable normalized product data.",
    )
    source = ScrapingSource(
        job=job,
        url="https://example.com/product",
        normalized_url="https://example.com/product",
        normalized_url_hash="a" * 64,
        domain="example.com",
        status=SourceStatus.FAILED,
        attempts=3,
        error="Product page request failed",
        http_status=500,
        extraction_method="scrapling_http",
        started_at=completed_at,
        completed_at=completed_at,
    )

    prepare_source_retry(job, source)

    assert source.status == SourceStatus.PENDING
    assert source.attempts == 0
    assert source.error is None
    assert source.http_status is None
    assert source.extraction_method is None
    assert source.started_at is None
    assert source.completed_at is None
    assert job.status == JobStatus.SCRAPING
    assert job.completed_at is None
    assert job.error_summary is None
