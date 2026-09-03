from collections.abc import Callable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import JobStatus, SourceStatus
from app.models.scraping import ScrapingJob, ScrapingSource
from app.schemas.research_job import (
    CreateResearchJobRequest,
    ResearchJobDetail,
    ResearchSourceSummary,
)
from app.scraping.url_safety import normalized_url_hash, validate_public_url

URLValidator = Callable[[str], str]


def create_research_job(
    session: Session,
    request: CreateResearchJobRequest,
    *,
    validator: URLValidator = validate_public_url,
) -> ScrapingJob:
    unique_urls: dict[str, tuple[str, str]] = {}
    for submitted_url in request.urls:
        normalized = validator(str(submitted_url))
        url_hash = normalized_url_hash(normalized)
        unique_urls.setdefault(url_hash, (str(submitted_url), normalized))

    job = ScrapingJob(total_urls=len(unique_urls))
    for url_hash, (submitted, normalized) in unique_urls.items():
        from urllib.parse import urlsplit

        job.sources.append(
            ScrapingSource(
                url=submitted,
                normalized_url=normalized,
                normalized_url_hash=url_hash,
                domain=(urlsplit(normalized).hostname or "").lower(),
            )
        )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def get_research_job(session: Session, job_id: UUID) -> ScrapingJob | None:
    return session.scalar(
        select(ScrapingJob)
        .options(
            selectinload(ScrapingJob.sources),
            selectinload(ScrapingJob.generated_products),
        )
        .where(ScrapingJob.id == job_id)
    )


def to_job_detail(job: ScrapingJob) -> ResearchJobDetail:
    latest_product = max(job.generated_products, key=lambda product: product.version, default=None)
    return ResearchJobDetail(
        id=job.id,
        status=job.status,
        total_urls=job.total_urls,
        successful_urls=job.successful_urls,
        failed_urls=job.failed_urls,
        error_summary=job.error_summary,
        latest_product_id=latest_product.id if latest_product else None,
        sources=[to_source_summary(source) for source in job.sources],
    )


def to_source_summary(source: ScrapingSource) -> ResearchSourceSummary:
    return ResearchSourceSummary(
        id=source.id,
        url=source.url,
        domain=source.domain,
        status=source.status,
        http_status=source.http_status,
        extraction_method=source.extraction_method,
        attempts=source.attempts,
        error=source.error,
    )


def prepare_source_retry(job: ScrapingJob, source: ScrapingSource) -> None:
    """Reset a manually retried source so it receives a fresh attempt budget."""
    source.status = SourceStatus.PENDING
    source.error = None
    source.http_status = None
    source.extraction_method = None
    source.attempts = 0
    source.started_at = None
    source.completed_at = None
    job.status = JobStatus.SCRAPING
    job.completed_at = None
    job.error_summary = None
