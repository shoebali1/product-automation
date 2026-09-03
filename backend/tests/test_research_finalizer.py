from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.enums import JobStatus, SourceStatus
from app.models.research import ProductConflict, ProductSourceEvidence
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingJob, ScrapingSource
from app.schemas.common import Pricing
from app.schemas.product_source import NormalizedProductSource
from app.scraping.url_safety import normalized_url_hash
from app.services.research_finalizer import finalize_research


def normalized(url: str, capacity: str) -> dict:
    return NormalizedProductSource(
        source_url=url,
        domain="example.com",
        product_title="Acme Widget",
        brand="Acme",
        specifications={"Capacity": capacity},
        pricing=Pricing(mrp=Decimal("266.10"), currency="INR"),
        extraction_method="test",
        scraped_at=datetime.now(UTC),
    ).model_dump(mode="json")


def add_source(session: Session, job: ScrapingJob, url: str, capacity: str) -> None:
    source = ScrapingSource(
        job=job,
        url=url,
        normalized_url=url,
        normalized_url_hash=normalized_url_hash(url),
        domain="example.com",
        status=SourceStatus.COMPLETED,
    )
    source.normalized_product = NormalizedProductSourceModel(
        product_data=normalized(url, capacity)
    )
    session.add(source)


def test_finalizer_persists_evidence_and_conflicts_idempotently() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job = ScrapingJob(total_urls=2, successful_urls=2, status=JobStatus.SCRAPED)
        add_source(session, job, "https://example.com/a", "10 ml")
        add_source(session, job, "https://example.com/b", "15 ml")
        session.commit()

        result = finalize_research(session, job.id)
        finalize_research(session, job.id)

        evidence = list(session.scalars(select(ProductSourceEvidence)))
        conflicts = list(session.scalars(select(ProductConflict)))
        assert result.evidence["brand"].selected_value == "Acme"
        assert len([item for item in evidence if item.field_path == "brand"]) == 1
        assert next(item for item in evidence if item.field_path == "pricing.mrp").value == "266.10"
        assert len(conflicts) == 1
        assert conflicts[0].field_path == "specifications.Capacity"
        assert conflicts[0].requires_review is True
