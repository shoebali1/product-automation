import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.enums import JobStatus, SourceStatus
from app.models.scraping import (
    NormalizedProductSource as NormalizedProductSourceModel,
    RawScrapedProduct,
    ScrapingJob,
    ScrapingSource,
)
from app.schemas.product_source import NormalizedProductSource
from app.scraping.errors import ScrapingError
from app.scraping.orchestrator import ProductScrapingOrchestrator, ScrapeOutcome

NORMALIZED_SOURCE_SCHEMA_VERSION = "1.1-rich-options"


@dataclass(frozen=True, slots=True)
class SourceProcessingResult:
    source_id: UUID
    status: SourceStatus
    cache_hit: bool = False
    retryable: bool = False
    error: str | None = None


class SourceProcessor:
    def __init__(
        self,
        orchestrator: ProductScrapingOrchestrator,
        *,
        cache_ttl: timedelta = timedelta(hours=24),
        maximum_attempts: int = 3,
    ) -> None:
        self.orchestrator = orchestrator
        self.cache_ttl = cache_ttl
        self.maximum_attempts = maximum_attempts

    def process(
        self,
        session: Session,
        source_id: UUID,
        *,
        force_refresh: bool = False,
    ) -> SourceProcessingResult:
        source = session.get(ScrapingSource, source_id)
        if source is None:
            raise LookupError(f"Scraping source {source_id} was not found")
        if source.status == SourceStatus.COMPLETED:
            return SourceProcessingResult(source_id=source.id, status=source.status)
        if source.attempts >= self.maximum_attempts:
            return SourceProcessingResult(
                source_id=source.id,
                status=SourceStatus.FAILED,
                error="Maximum source attempts reached",
            )

        now = datetime.now(UTC)
        source.status = SourceStatus.PROCESSING
        source.started_at = source.started_at or now
        source.error = None
        source.attempts += 1
        source.job.status = JobStatus.SCRAPING
        source.job.started_at = source.job.started_at or now
        session.commit()

        try:
            cached = None if force_refresh else self._find_cached_source(session, source)
            if cached is not None:
                normalized = self._clone_cached_source(source, cached)
                self._persist_success(session, source, normalized, outcome=None)
                result = SourceProcessingResult(
                    source_id=source.id,
                    status=SourceStatus.COMPLETED,
                    cache_hit=True,
                )
            else:
                outcome = self.orchestrator.scrape(source.url)
                self._persist_success(session, source, outcome.source, outcome=outcome)
                result = SourceProcessingResult(
                    source_id=source.id,
                    status=SourceStatus.COMPLETED,
                )
        except Exception as exc:
            retryable = isinstance(exc, ScrapingError) and exc.retryable
            self._persist_failure(session, source, _safe_error(exc))
            result = SourceProcessingResult(
                source_id=source.id,
                status=SourceStatus.FAILED,
                retryable=retryable and source.attempts < self.maximum_attempts,
                error=_safe_error(exc),
            )

        self._refresh_job(session, source.job_id)
        return result

    def _find_cached_source(
        self, session: Session, source: ScrapingSource
    ) -> NormalizedProductSourceModel | None:
        cutoff = datetime.now(UTC) - self.cache_ttl
        statement: Select[tuple[NormalizedProductSourceModel]] = (
            select(NormalizedProductSourceModel)
            .join(ScrapingSource, NormalizedProductSourceModel.source_id == ScrapingSource.id)
            .where(
                ScrapingSource.normalized_url_hash == source.normalized_url_hash,
                ScrapingSource.id != source.id,
                ScrapingSource.status == SourceStatus.COMPLETED,
                NormalizedProductSourceModel.created_at >= cutoff,
                NormalizedProductSourceModel.schema_version == NORMALIZED_SOURCE_SCHEMA_VERSION,
            )
            .order_by(NormalizedProductSourceModel.created_at.desc())
            .limit(1)
        )
        return session.scalar(statement)

    @staticmethod
    def _clone_cached_source(
        source: ScrapingSource, cached: NormalizedProductSourceModel
    ) -> NormalizedProductSource:
        values = dict(cached.product_data)
        values.update(
            source_url=source.normalized_url,
            domain=source.domain,
            extraction_method="cache",
            scraped_at=datetime.now(UTC),
        )
        return NormalizedProductSource.model_validate(values)

    @staticmethod
    def _persist_success(
        session: Session,
        source: ScrapingSource,
        normalized: NormalizedProductSource,
        *,
        outcome: ScrapeOutcome | None,
    ) -> None:
        payload = normalized.model_dump(mode="json")
        raw_json_ld = payload.get("raw_json_ld", {})
        extracted_data = {key: value for key, value in payload.items() if key != "raw_json_ld"}
        content_hash = (
            hashlib.sha256(outcome.fetch.html.encode("utf-8")).hexdigest() if outcome else None
        )
        source.raw_product = RawScrapedProduct(
            extracted_data=extracted_data,
            raw_json_ld=raw_json_ld,
            content_hash=content_hash,
        )
        source.normalized_product = NormalizedProductSourceModel(
            schema_version=NORMALIZED_SOURCE_SCHEMA_VERSION,
            product_data=payload,
        )
        source.status = SourceStatus.COMPLETED
        source.http_status = outcome.fetch.status_code if outcome else 200
        source.extraction_method = normalized.extraction_method
        source.completed_at = datetime.now(UTC)
        source.error = None
        session.commit()

    @staticmethod
    def _persist_failure(session: Session, source: ScrapingSource, error: str) -> None:
        source.status = SourceStatus.FAILED
        source.error = error
        source.completed_at = datetime.now(UTC)
        session.commit()

    @staticmethod
    def _refresh_job(session: Session, job_id: UUID) -> None:
        job = session.get(ScrapingJob, job_id)
        if job is None:
            return
        counts = dict(
            session.execute(
                select(ScrapingSource.status, func.count(ScrapingSource.id))
                .where(ScrapingSource.job_id == job_id)
                .group_by(ScrapingSource.status)
            ).all()
        )
        successful = int(counts.get(SourceStatus.COMPLETED, 0))
        failed = int(counts.get(SourceStatus.FAILED, 0))
        job.successful_urls = successful
        job.failed_urls = failed
        if successful + failed >= job.total_urls:
            job.status = JobStatus.SCRAPED if successful else JobStatus.FAILED
            job.completed_at = datetime.now(UTC)
            job.error_summary = (
                f"{failed} source{'s' if failed != 1 else ''} could not be processed."
                if failed
                else None
            )
        else:
            job.status = JobStatus.SCRAPING
        session.commit()


def _safe_error(error: Exception) -> str:
    if isinstance(error, ScrapingError):
        message = str(error) or error.__class__.__name__
    else:
        message = "Unexpected source processing error"
    return message[:1000]
