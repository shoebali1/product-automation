from datetime import UTC, datetime
from decimal import Decimal
from time import perf_counter
from typing import Protocol
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.product_generator import GenerationResult, ProductGenerationError
from app.ai.prompts import PRODUCT_ANALYSIS_PROMPT_VERSION
from app.core.config import settings
from app.models.ai_generation_log import AIGenerationLog
from app.models.enums import ConflictStatus, GenerationStatus, JobStatus, SourceStatus
from app.models.generated_product import GeneratedProduct
from app.models.research import ProductConflict
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingJob, ScrapingSource
from app.products.comparison import compare_sources
from app.schemas.product_source import NormalizedProductSource
from app.services.generated_products import sync_product_children
from app.services.surginatal import enrich_with_surginatal


class ProductGenerator(Protocol):
    model: str

    def generate(self, sources, comparison) -> GenerationResult: ...


def generate_product_draft(
    session: Session,
    job_id: UUID,
    generator: ProductGenerator,
) -> GeneratedProduct:
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
        (str(source_id), NormalizedProductSource.model_validate(payload))
        for source_id, payload in rows
    ]
    if not sources:
        raise ProductGenerationError("No normalized sources are available for generation")

    previous_status = job.status
    job.status = JobStatus.ANALYZING
    generation_log = AIGenerationLog(
        job_id=job_id,
        model=generator.model,
        prompt_version=PRODUCT_ANALYSIS_PROMPT_VERSION,
        status=GenerationStatus.PENDING,
    )
    session.add(generation_log)
    session.commit()

    started = perf_counter()
    try:
        comparison = compare_sources(sources)
        result = generator.generate([source for _, source in sources], comparison)
        product = _persist_generated_product(session, job, result)
        elapsed_ms = round((perf_counter() - started) * 1000)
        generation_log.product_id = product.id
        generation_log.model = result.model
        generation_log.input_tokens = result.usage.input_tokens
        generation_log.output_tokens = result.usage.output_tokens
        generation_log.estimated_cost = _estimated_cost(
            result.usage.input_tokens,
            result.usage.output_tokens,
            result.input_cost_per_million,
            result.output_cost_per_million,
        )
        generation_log.processing_time_ms = elapsed_ms
        generation_log.status = GenerationStatus.COMPLETED
        generation_log.error = None
        session.commit()
        return product
    except Exception as exc:
        generation_log.status = GenerationStatus.FAILED
        generation_log.processing_time_ms = round((perf_counter() - started) * 1000)
        generation_log.error = safe_generation_error(exc)
        # A provider timeout or invalid response is retryable after configuration changes.
        # Restore the prior ready state so the UI never leaves the job stuck in ANALYZING.
        job.status = previous_status
        job.error_summary = safe_generation_error(exc)
        session.commit()
        raise


def _persist_generated_product(
    session: Session,
    job: ScrapingJob,
    result: GenerationResult,
) -> GeneratedProduct:
    product_data = enrich_with_surginatal(result.product)

    # Automatically resolve job's conflict records in DB since AI analyzed & resolved them
    conflicts = list(
        session.scalars(select(ProductConflict).where(ProductConflict.job_id == job.id))
    )
    for conflict in conflicts:
        conflict.status = ConflictStatus.RESOLVED
        conflict.requires_review = False
        conflict.resolution = {
            "action": "ai_resolve",
            "resolved_at": datetime.now(UTC).isoformat(),
            "note": "Resolved automatically by AI model using multi-source evidence and Surginatal master taxonomy",
        }

    current_version = session.scalar(
        select(func.max(GeneratedProduct.version)).where(GeneratedProduct.job_id == job.id)
    )
    requires_review = any(
        c.get("status") == "OPEN" and c.get("requires_review") for c in product_data.conflicts
    )
    status = JobStatus.REVIEW_REQUIRED if requires_review else JobStatus.DRAFT
    product = GeneratedProduct(
        job_id=job.id,
        status=status,
        version=(current_version or 0) + 1,
        product_data=product_data.model_dump(mode="json"),
        overall_confidence=float(product_data.overall_confidence),
        warnings=product_data.warnings,
    )
    sync_product_children(product, product_data)
    session.add(product)
    job.status = status
    job.error_summary = None
    session.flush()
    return product


def _estimated_cost(
    input_tokens: int | None,
    output_tokens: int | None,
    input_rate: Decimal | None = None,
    output_rate: Decimal | None = None,
) -> Decimal | None:
    if input_tokens is None and output_tokens is None:
        return None
    effective_input_rate = input_rate if input_rate is not None else settings.openai_input_cost_per_million
    effective_output_rate = output_rate if output_rate is not None else settings.openai_output_cost_per_million
    input_cost = Decimal(input_tokens or 0) * effective_input_rate
    output_cost = Decimal(output_tokens or 0) * effective_output_rate
    return (input_cost + output_cost) / Decimal(1_000_000)


def safe_generation_error(error: Exception) -> str:
    if isinstance(error, (ProductGenerationError, ValueError)):
        return (str(error) or error.__class__.__name__)[:1000]
    return "Unexpected AI generation error"
