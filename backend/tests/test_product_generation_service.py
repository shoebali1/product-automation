from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.ai.product_generator import GenerationResult, GenerationUsage, ProductGenerationError
from app.db.base import Base
from app.models.ai_generation_log import AIGenerationLog
from app.models.enums import GenerationStatus, JobStatus, SourceStatus
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingJob, ScrapingSource
from app.schemas.generated_product import GeneratedProductData, Highlight
from app.schemas.product_source import NormalizedProductSource
from app.scraping.url_safety import normalized_url_hash
from app.services.product_generation import generate_product_draft


class FakeGenerator:
    model = "gpt-5.6-sol"

    def generate(self, _sources, _comparison) -> GenerationResult:
        product = GeneratedProductData(
            product_title="Acme Widget W-1",
            slug="acme-widget-w-1",
            business_product_title="Acme Widget W-1",
            brand="Acme",
            sku="W-1",
            highlights=[Highlight(name="Brand", value="Acme")],
            warnings=["Manual review requested"],
            overall_confidence=Decimal("0.4"),
        )
        return GenerationResult(product, GenerationUsage(1000, 500), self.model)


class FailingGenerator:
    model = "broken-model"

    def generate(self, _sources, _comparison):
        raise ProductGenerationError("Provider request timed out")


def test_persists_generated_draft_and_ai_audit_log() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job = ScrapingJob(total_urls=1, successful_urls=1, status=JobStatus.SCRAPED)
        url = "https://example.com/product"
        source = ScrapingSource(
            job=job,
            url=url,
            normalized_url=url,
            normalized_url_hash=normalized_url_hash(url),
            domain="example.com",
            status=SourceStatus.COMPLETED,
        )
        source.normalized_product = NormalizedProductSourceModel(
            product_data=NormalizedProductSource(
                source_url=url,
                domain="example.com",
                product_title="Acme Widget W-1",
                brand="Acme",
                sku="W-1",
                extraction_method="test",
                scraped_at=datetime.now(UTC),
            ).model_dump(mode="json")
        )
        session.add(source)
        session.commit()

        product = generate_product_draft(session, job.id, FakeGenerator())
        log = session.scalar(select(AIGenerationLog))

        assert product.status == JobStatus.REVIEW_REQUIRED
        assert product.version == 1
        assert product.highlights[0].name == "Brand"
        assert job.status == JobStatus.REVIEW_REQUIRED
        assert log is not None
        assert log.status == GenerationStatus.COMPLETED
        assert log.product_id == product.id
        assert log.input_tokens == 1000
        assert log.output_tokens == 500
        assert log.estimated_cost == Decimal("0.014000")


def test_generation_failure_restores_retryable_job_state() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job = ScrapingJob(total_urls=1, successful_urls=1, status=JobStatus.SCRAPED)
        url = "https://example.com/product"
        source = ScrapingSource(
            job=job,
            url=url,
            normalized_url=url,
            normalized_url_hash=normalized_url_hash(url),
            domain="example.com",
            status=SourceStatus.COMPLETED,
        )
        source.normalized_product = NormalizedProductSourceModel(
            product_data=NormalizedProductSource(
                source_url=url,
                domain="example.com",
                product_title="Acme Widget",
                description="A supported description.",
                extraction_method="test",
                scraped_at=datetime.now(UTC),
            ).model_dump(mode="json")
        )
        session.add(source)
        session.commit()

        with pytest.raises(ProductGenerationError, match="Provider request timed out"):
            generate_product_draft(session, job.id, FailingGenerator())

        log = session.scalar(select(AIGenerationLog))
        assert job.status == JobStatus.SCRAPED
        assert job.error_summary == "Provider request timed out"
        assert log.status == GenerationStatus.FAILED
