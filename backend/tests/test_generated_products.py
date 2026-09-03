from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.enums import ConflictStatus, JobStatus, SourceStatus
from app.models.generated_product import GeneratedProduct, GeneratedProductHighlight
from app.models.research import ProductConflict
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingJob, ScrapingSource
from app.publishing import PublishResult
from app.schemas.generated_product import GeneratedProductData, Highlight
from app.schemas.generated_product_api import (
    ConflictResolutionAction,
    ConflictResolutionRequest,
    UpdateGeneratedProductRequest,
)
from app.schemas.product_source import NormalizedProductSource
from app.scraping.url_safety import normalized_url_hash
from app.services.generated_products import (
    ProductStateError,
    ProductVersionConflictError,
    approve_generated_product,
    ProductPublishError,
    publish_generated_product,
    resolve_product_conflict,
    update_generated_product,
)


class RecordingPublisher:
    def __init__(self, *, external_id: str = "catalog-123", error: Exception | None = None):
        self.external_id = external_id
        self.error = error
        self.calls: list[str] = []

    def publish(self, product, *, idempotency_key: str) -> PublishResult:
        self.calls.append(idempotency_key)
        if self.error:
            raise self.error
        return PublishResult(external_id=self.external_id)


def setup_product(session: Session, *, with_conflict: bool = False):
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
            brand="Acme",
            specifications={"Capacity": "10 ml"},
            extraction_method="test",
            scraped_at=datetime.now(UTC),
        ).model_dump(mode="json")
    )
    data = GeneratedProductData(
        product_title="Acme Widget",
        slug="acme-widget",
        business_product_title="Acme Widget",
        brand="Acme",
        highlights=[Highlight(name="Brand", value="Acme")],
        warnings=["1 factual conflict requires review."] if with_conflict else [],
        overall_confidence=Decimal("0.4"),
    )
    product = GeneratedProduct(
        job=job,
        status=JobStatus.REVIEW_REQUIRED if with_conflict else JobStatus.DRAFT,
        version=1,
        product_data=data.model_dump(mode="json"),
        overall_confidence=0.4,
        warnings=data.warnings,
    )
    product.highlights = [GeneratedProductHighlight(name="Brand", value="Acme", position=0)]
    session.add_all([source, product])
    conflict = None
    if with_conflict:
        conflict = ProductConflict(
            job=job,
            field_path="specifications.Capacity",
            values=[
                {"value": "10 ml", "source_ids": [str(source.id)]},
                {"value": "15 ml", "source_ids": ["another-source"]},
            ],
            status=ConflictStatus.OPEN,
            requires_review=True,
        )
        session.add(conflict)
    session.commit()
    return job, product, conflict


def test_updates_draft_with_optimistic_version_and_syncs_children() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        _, product, _ = setup_product(session)
        existing = GeneratedProductData.model_validate(product.product_data)
        updated_data = existing.model_copy(
            update={"highlights": [Highlight(name="Product", value="Widget")]}
        )
        updated = update_generated_product(
            session,
            product.id,
            UpdateGeneratedProductRequest(version=1, product_data=updated_data),
        )
        assert updated.version == 2
        assert updated.highlights[0].name == "Product"
        with pytest.raises(ProductVersionConflictError):
            update_generated_product(
                session,
                product.id,
                UpdateGeneratedProductRequest(version=1, product_data=updated_data),
            )


def test_conflict_resolution_updates_field_and_allows_approval() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job, product, conflict = setup_product(session, with_conflict=True)
        with pytest.raises(ProductStateError, match="conflicts"):
            approve_generated_product(session, product.id)

        resolved = resolve_product_conflict(
            session,
            product.id,
            conflict.id,
            ConflictResolutionRequest(
                action=ConflictResolutionAction.ACCEPT_VALUE,
                value="10 ml",
            ),
        )
        assert resolved.status == ConflictStatus.RESOLVED
        assert product.product_data["specifications"]["Capacity"] == "10 ml"
        assert product.product_data["conflicts"] == []

        approved = approve_generated_product(session, product.id)
        assert approved.status == JobStatus.APPROVED
        assert job.status == JobStatus.APPROVED


def test_superseded_draft_cannot_be_edited() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job, first, _ = setup_product(session)
        first_data = GeneratedProductData.model_validate(first.product_data)
        newer = GeneratedProduct(
            job=job,
            status=JobStatus.DRAFT,
            version=2,
            product_data=first_data.model_dump(mode="json"),
            overall_confidence=0.4,
            warnings=[],
        )
        session.add(newer)
        session.commit()
        with pytest.raises(ProductVersionConflictError, match="superseded"):
            update_generated_product(
                session,
                first.id,
                UpdateGeneratedProductRequest(version=1, product_data=first_data),
            )


def test_publish_requires_approval_and_is_idempotent() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        job, product, _ = setup_product(session)
        publisher = RecordingPublisher()
        with pytest.raises(ProductStateError, match="approved"):
            publish_generated_product(session, product.id, publisher)

        approve_generated_product(session, product.id)
        published = publish_generated_product(session, product.id, publisher)
        repeated = publish_generated_product(session, product.id, publisher)

        assert published.status == JobStatus.PUBLISHED
        assert repeated.published_external_id == "catalog-123"
        assert job.status == JobStatus.PUBLISHED
        assert len(publisher.calls) == 1
        assert publisher.calls[0] == f"{product.id}:1"


def test_publish_adapter_failure_leaves_product_approved() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        _, product, _ = setup_product(session)
        approve_generated_product(session, product.id)

        with pytest.raises(ProductPublishError, match="remains approved"):
            publish_generated_product(
                session,
                product.id,
                RecordingPublisher(error=RuntimeError("remote unavailable")),
            )

        assert product.status == JobStatus.APPROVED
        assert product.published_external_id is None
