from typing import Any
from uuid import UUID

from pydantic import TypeAdapter
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.enums import JobStatus, SourceStatus
from app.models.research import ProductConflict, ProductSourceEvidence
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingJob, ScrapingSource
from app.products.comparison import ResearchComparison, compare_sources
from app.schemas.product_source import NormalizedProductSource

JSON_VALUE_ADAPTER = TypeAdapter(Any)


class NoUsableSourcesError(ValueError):
    pass


def finalize_research(session: Session, job_id: UUID) -> ResearchComparison:
    job = session.get(ScrapingJob, job_id)
    if job is None:
        raise LookupError(f"Scraping job {job_id} was not found")

    rows = session.execute(
        select(ScrapingSource.id, NormalizedProductSourceModel.product_data)
        .join(
            NormalizedProductSourceModel,
            NormalizedProductSourceModel.source_id == ScrapingSource.id,
        )
        .where(
            ScrapingSource.job_id == job_id,
            ScrapingSource.status == SourceStatus.COMPLETED,
        )
    ).all()
    sources = [
        (str(source_id), NormalizedProductSource.model_validate(product_data))
        for source_id, product_data in rows
    ]
    if not sources:
        job.status = JobStatus.FAILED
        job.error_summary = "No source produced usable normalized product data."
        session.commit()
        raise NoUsableSourcesError(job.error_summary)

    comparison = compare_sources(sources)
    session.execute(delete(ProductSourceEvidence).where(ProductSourceEvidence.job_id == job_id))
    session.execute(delete(ProductConflict).where(ProductConflict.job_id == job_id))

    for field in comparison.evidence.values():
        session.add(
            ProductSourceEvidence(
                job_id=job_id,
                field_path=field.field_path,
                value=_json_value(field.selected_value),
                confidence=field.confidence,
                confidence_score=field.confidence_score,
                source_ids=sorted(
                    {source_id for candidate in field.values for source_id in candidate.source_ids}
                ),
                rationale=_evidence_rationale(field.confidence.value, field.values),
            )
        )
    for conflict in comparison.conflicts:
        session.add(
            ProductConflict(
                job_id=job_id,
                field_path=conflict.field_path,
                values=[candidate.model_dump(mode="json") for candidate in conflict.values],
                requires_review=conflict.requires_review,
            )
        )
    job.status = JobStatus.SCRAPED
    job.error_summary = None
    session.commit()
    return comparison


def _evidence_rationale(confidence: str, values) -> str:
    support = len({source_id for candidate in values for source_id in candidate.source_ids})
    return f"{confidence} confidence from {support} source{'s' if support != 1 else ''}."


def _json_value(value: Any) -> Any:
    """Convert Decimal and other supported Python values for a SQL JSON column."""
    return JSON_VALUE_ADAPTER.dump_python(value, mode="json")
