from datetime import timedelta
from uuid import UUID

from celery import chord
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.scraping import ScrapingSource
from app.scraping.browser_client import ScraplingBrowserClient
from app.scraping.orchestrator import ProductScrapingOrchestrator
from app.scraping.scrapling_client import ScraplingClient
from app.services.source_processor import SourceProcessor
from app.services.research_finalizer import NoUsableSourcesError, finalize_research
from app.workers.celery_app import celery_app


def build_source_processor() -> SourceProcessor:
    browser_client = ScraplingBrowserClient() if settings.browser_fallback_enabled else None
    orchestrator = ProductScrapingOrchestrator(
        ScraplingClient(),
        browser_client=browser_client,
    )
    return SourceProcessor(
        orchestrator,
        cache_ttl=timedelta(hours=settings.scraping_cache_hours),
        maximum_attempts=settings.scraping_max_attempts,
    )


@celery_app.task(name="product_research.start_scraping_job")
def start_scraping_job(job_id: str, force_refresh: bool = False) -> dict[str, int | str]:
    with SessionLocal() as session:
        source_ids = list(
            session.scalars(
                select(ScrapingSource.id).where(ScrapingSource.job_id == UUID(job_id))
            )
        )
    if not source_ids:
        return {"job_id": job_id, "sources": 0}
    header = [scrape_source.s(str(source_id), force_refresh) for source_id in source_ids]
    chord(header)(finalize_scraping_job.s(job_id))
    return {"job_id": job_id, "sources": len(source_ids)}


@celery_app.task(bind=True, name="product_research.scrape_source", max_retries=3)
def scrape_source(self, source_id: str, force_refresh: bool = False) -> dict[str, str | bool | None]:
    with SessionLocal() as session:
        result = build_source_processor().process(
            session,
            UUID(source_id),
            force_refresh=force_refresh,
        )
    if result.retryable:
        countdown = min(60, 2 ** (self.request.retries + 1))
        raise self.retry(countdown=countdown)
    return {
        "source_id": source_id,
        "status": result.status.value,
        "cache_hit": result.cache_hit,
        "error": result.error,
    }


@celery_app.task(name="product_research.finalize_scraping_job")
def finalize_scraping_job(_results: list[dict], job_id: str) -> dict[str, str]:
    with SessionLocal() as session:
        SourceProcessor._refresh_job(session, UUID(job_id))
        try:
            finalize_research(session, UUID(job_id))
        except NoUsableSourcesError as exc:
            # Individual source failures are already persisted. An all-failed job is an
            # expected terminal result, not an unexpected Celery task crash.
            return {"job_id": job_id, "status": "failed", "error": str(exc)}
    return {"job_id": job_id, "status": "research_finalized"}
