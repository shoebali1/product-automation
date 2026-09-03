from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ai.validator import factual_support_errors
from app.models.enums import ConflictStatus, JobStatus, SourceStatus
from app.models.generated_product import (
    GeneratedProduct,
    GeneratedProductHighlight,
    GeneratedProductImage,
    GeneratedProductPack,
    GeneratedProductVariation,
)
from app.models.research import ProductConflict
from app.models.scraping import NormalizedProductSource as NormalizedProductSourceModel
from app.models.scraping import ScrapingSource
from app.publishing import Publisher
from app.products.quality import build_product_quality_context
from app.schemas.generated_product import GeneratedProductData
from app.schemas.generated_product_api import (
    ConflictResolutionAction,
    ConflictResolutionRequest,
    GeneratedProductDetail,
    GeneratedProductListItem,
    ProductConflictDetail,
    UpdateGeneratedProductRequest,
)
from app.schemas.product_source import NormalizedProductSource


class ProductNotFoundError(LookupError):
    pass


class ProductStateError(ValueError):
    pass


class ProductVersionConflictError(ProductStateError):
    pass


class ProductValidationError(ProductStateError):
    pass


class ProductPublishError(ProductStateError):
    pass


def list_generated_products(
    session: Session, status: JobStatus | None = None
) -> list[GeneratedProductListItem]:
    stmt = select(GeneratedProduct).order_by(GeneratedProduct.updated_at.desc())
    if status is not None:
        stmt = stmt.where(GeneratedProduct.status == status)

    products = list(session.scalars(stmt))
    items = []
    for p in products:
        data = p.product_data or {}
        pricing = data.get("pricing") or {}
        images = data.get("images") or []
        thumbnail = next((img.get("url") for img in images if isinstance(img, dict) and img.get("url")), None)
        items.append(
            GeneratedProductListItem(
                id=p.id,
                job_id=p.job_id,
                status=p.status,
                version=p.version,
                published_external_id=p.published_external_id,
                product_title=data.get("product_title") or "Untitled Product",
                brand=data.get("brand"),
                category=data.get("category"),
                sku=data.get("sku"),
                mrp=pricing.get("mrp"),
                sale_price=pricing.get("sale_price"),
                currency=pricing.get("currency") or "INR",
                thumbnail_url=thumbnail,
                overall_confidence=float(p.overall_confidence or 0.0),
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return items


def get_generated_product(session: Session, product_id: UUID) -> GeneratedProduct | None:
    return session.scalar(
        select(GeneratedProduct)
        .options(
            selectinload(GeneratedProduct.highlights),
            selectinload(GeneratedProduct.images),
            selectinload(GeneratedProduct.variations),
            selectinload(GeneratedProduct.packs),
        )
        .where(GeneratedProduct.id == product_id)
    )


def to_product_detail(product: GeneratedProduct, session: Session) -> GeneratedProductDetail:
    product_data = GeneratedProductData.model_validate(product.product_data)
    sources = list(
        session.scalars(
            select(ScrapingSource).where(
                ScrapingSource.job_id == product.job_id,
                ScrapingSource.status == SourceStatus.COMPLETED,
            )
        )
    )
    conflicts = list(
        session.scalars(select(ProductConflict).where(ProductConflict.job_id == product.job_id))
    )
    return GeneratedProductDetail(
        id=product.id,
        job_id=product.job_id,
        status=product.status,
        version=product.version,
        published_external_id=product.published_external_id,
        product_data=product_data,
        quality_context=build_product_quality_context(
            product_data, product.status, sources, conflicts
        ),
    )


def update_generated_product(
    session: Session,
    product_id: UUID,
    request: UpdateGeneratedProductRequest,
) -> GeneratedProduct:
    product = get_generated_product(session, product_id)
    if product is None:
        raise ProductNotFoundError("Generated product was not found")
    if product.status in {JobStatus.APPROVED, JobStatus.PUBLISHED}:
        raise ProductStateError("Approved or published products cannot be edited")
    _require_latest_version(session, product)
    if product.version != request.version:
        raise ProductVersionConflictError(
            f"Draft version changed from {request.version} to {product.version}"
        )

    existing = GeneratedProductData.model_validate(product.product_data)
    candidate = request.product_data.model_copy(
        update={
            "source_evidence": existing.source_evidence,
            "conflicts": existing.conflicts,
        }
    )
    sources = _normalized_sources(session, product.job_id)
    support_errors = factual_support_errors(candidate, sources)
    if support_errors and not request.override_note:
        raise ProductValidationError("; ".join(support_errors))
    if support_errors:
        candidate = candidate.model_copy(
            update={
                "warnings": sorted(
                    set(
                        candidate.warnings
                        + [f"Manual factual override: {request.override_note}"]
                    )
                )
            }
        )
    _protect_reference_images(candidate, sources)

    product.product_data = candidate.model_dump(mode="json")
    product.overall_confidence = float(candidate.overall_confidence)
    product.warnings = candidate.warnings
    product.version += 1
    sync_product_children(product, candidate)
    session.commit()
    return product


def approve_generated_product(session: Session, product_id: UUID) -> GeneratedProduct:
    product = get_generated_product(session, product_id)
    if product is None:
        raise ProductNotFoundError("Generated product was not found")
    if product.status == JobStatus.PUBLISHED:
        raise ProductStateError("Published product is already immutable")
    if product.status == JobStatus.APPROVED:
        return product
    if product.status not in {JobStatus.DRAFT, JobStatus.REVIEW_REQUIRED}:
        raise ProductStateError("Product is not ready for approval")
    _require_latest_version(session, product)
    open_conflict = session.scalar(
        select(ProductConflict.id).where(
            ProductConflict.job_id == product.job_id,
            ProductConflict.status == ConflictStatus.OPEN,
            ProductConflict.requires_review.is_(True),
        ).limit(1)
    )
    if open_conflict is not None:
        raise ProductStateError("All required conflicts must be resolved before approval")
    GeneratedProductData.model_validate(product.product_data)
    product.status = JobStatus.APPROVED
    product.job.status = JobStatus.APPROVED
    session.commit()
    return product


def publish_generated_product(
    session: Session,
    product_id: UUID,
    publisher: Publisher,
) -> GeneratedProduct:
    product = session.scalar(
        select(GeneratedProduct)
        .where(GeneratedProduct.id == product_id)
        .with_for_update()
    )
    if product is None:
        raise ProductNotFoundError("Generated product was not found")
    if product.status == JobStatus.PUBLISHED:
        if not product.published_external_id:
            raise ProductPublishError("Published product is missing its external identifier")
        return product
    if product.status != JobStatus.APPROVED:
        raise ProductStateError("Only approved products can be published")
    _require_latest_version(session, product)

    data = GeneratedProductData.model_validate(product.product_data)
    try:
        result = publisher.publish(data, idempotency_key=f"{product.id}:{product.version}")
    except Exception as exc:
        raise ProductPublishError("Publisher adapter failed; the product remains approved") from exc
    if not result.external_id.strip():
        raise ProductPublishError("Publisher adapter returned an empty external identifier")

    product.published_external_id = result.external_id
    product.status = JobStatus.PUBLISHED
    product.job.status = JobStatus.PUBLISHED
    session.commit()
    return product


def list_product_conflicts(
    session: Session, product_id: UUID
) -> list[ProductConflictDetail]:
    product = session.get(GeneratedProduct, product_id)
    if product is None:
        raise ProductNotFoundError("Generated product was not found")
    conflicts = list(
        session.scalars(
            select(ProductConflict)
            .where(ProductConflict.job_id == product.job_id)
            .order_by(ProductConflict.created_at, ProductConflict.field_path)
        )
    )
    return [_to_conflict_detail(conflict) for conflict in conflicts]


def resolve_product_conflict(
    session: Session,
    product_id: UUID,
    conflict_id: UUID,
    request: ConflictResolutionRequest,
) -> ProductConflictDetail:
    product = get_generated_product(session, product_id)
    if product is None:
        raise ProductNotFoundError("Generated product was not found")
    if product.status in {JobStatus.APPROVED, JobStatus.PUBLISHED}:
        raise ProductStateError("Conflicts cannot be changed after approval")
    _require_latest_version(session, product)
    conflict = session.scalar(
        select(ProductConflict).where(
            ProductConflict.id == conflict_id,
            ProductConflict.job_id == product.job_id,
        )
    )
    if conflict is None:
        raise ProductNotFoundError("Product conflict was not found")

    resolution: dict[str, Any] = {"action": request.action.value}
    if request.action == ConflictResolutionAction.ACCEPT_VALUE:
        matching = [item for item in conflict.values if item.get("value") == request.value]
        if request.source_id is not None:
            matching = [
                item
                for item in matching
                if str(request.source_id) in item.get("source_ids", [])
            ]
        if not matching:
            raise ProductValidationError("Accepted value must match conflict source evidence")
        resolution.update(value=request.value, source_id=str(request.source_id) if request.source_id else None)
        conflict.status = ConflictStatus.RESOLVED
    elif request.action == ConflictResolutionAction.ENTER_MANUALLY:
        resolution.update(value=request.value, manual=True)
        conflict.status = ConflictStatus.RESOLVED
    else:
        conflict.status = ConflictStatus.IGNORED

    conflict.resolution = resolution
    conflict.resolution_note = request.note
    conflict.requires_review = False
    payload = GeneratedProductData.model_validate(product.product_data)
    data = payload.model_dump(mode="json")
    if request.action != ConflictResolutionAction.IGNORE:
        _set_field_path(data, conflict.field_path, request.value)
    session.flush()
    remaining = list(
        session.scalars(
            select(ProductConflict).where(
                ProductConflict.job_id == product.job_id,
                ProductConflict.status == ConflictStatus.OPEN,
                ProductConflict.requires_review.is_(True),
            )
        )
    )
    data["conflicts"] = [_conflict_payload(item) for item in remaining]
    warnings = [warning for warning in data["warnings"] if "factual conflict" not in warning]
    if remaining:
        warnings.append(
            f"{len(remaining)} factual conflict{'s' if len(remaining) != 1 else ''} require review."
        )
    if request.action == ConflictResolutionAction.ENTER_MANUALLY:
        warnings.append(f"Manual conflict override for {conflict.field_path}: {request.note}")
    data["warnings"] = sorted(set(warnings))
    validated = GeneratedProductData.model_validate(data)
    product.product_data = validated.model_dump(mode="json")
    product.warnings = validated.warnings
    product.version += 1
    sync_product_children(product, validated)
    session.commit()
    return _to_conflict_detail(conflict)


def sync_product_children(product: GeneratedProduct, data: GeneratedProductData) -> None:
    product.highlights = [
        GeneratedProductHighlight(name=item.name, value=item.value, position=index)
        for index, item in enumerate(data.highlights)
    ]
    product.images = [
        GeneratedProductImage(
            url=str(item.url),
            source_url=str(item.source_url) if item.source_url else None,
            alt=item.alt,
            primary_candidate=item.primary_candidate,
            reference_only=item.reference_only,
            position=index,
        )
        for index, item in enumerate(data.images)
    ]
    product.variations = [
        GeneratedProductVariation(
            name=item.name,
            sku=item.sku,
            sale_price=item.price,
            mrp=item.mrp,
            attributes=item.attributes,
        )
        for item in data.variations
    ]
    product.packs = [
        GeneratedProductPack(
            label=item.label,
            quantity=item.quantity,
            sku=item.sku,
            sale_price=item.price,
            mrp=item.mrp,
            pack_metadata={},
        )
        for item in data.packs
    ]


def _normalized_sources(session: Session, job_id: UUID) -> list[NormalizedProductSource]:
    return [
        NormalizedProductSource.model_validate(payload)
        for payload in session.scalars(
            select(NormalizedProductSourceModel.product_data)
            .join(ScrapingSource, NormalizedProductSourceModel.source_id == ScrapingSource.id)
            .where(
                ScrapingSource.job_id == job_id,
                ScrapingSource.status == SourceStatus.COMPLETED,
            )
        )
    ]


def _protect_reference_images(
    product: GeneratedProductData, sources: list[NormalizedProductSource]
) -> None:
    competitor_urls = {str(image.url) for source in sources for image in source.images}
    unsafe = [str(image.url) for image in product.images if str(image.url) in competitor_urls and not image.reference_only]
    if unsafe:
        raise ProductValidationError("Competitor reference images cannot be marked publishable")


def _set_field_path(data: dict[str, Any], field_path: str, value: Any) -> None:
    if field_path.startswith("specifications."):
        data.setdefault("specifications", {})[field_path.removeprefix("specifications.")] = value
    elif field_path.startswith("pricing."):
        data.setdefault("pricing", {})[field_path.removeprefix("pricing.")] = value
    elif "." not in field_path and field_path in data:
        data[field_path] = value
    else:
        raise ProductValidationError(f"Conflict field cannot be updated safely: {field_path}")


def _conflict_payload(conflict: ProductConflict) -> dict[str, Any]:
    return {
        "id": str(conflict.id),
        "field_path": conflict.field_path,
        "values": conflict.values,
        "requires_review": conflict.requires_review,
    }


def _to_conflict_detail(conflict: ProductConflict) -> ProductConflictDetail:
    return ProductConflictDetail(
        id=conflict.id,
        field_path=conflict.field_path,
        values=conflict.values,
        status=conflict.status,
        requires_review=conflict.requires_review,
        resolution=conflict.resolution,
        resolution_note=conflict.resolution_note,
    )


def _require_latest_version(session: Session, product: GeneratedProduct) -> None:
    latest_version = session.scalar(
        select(GeneratedProduct.version)
        .where(GeneratedProduct.job_id == product.job_id)
        .order_by(GeneratedProduct.version.desc())
        .limit(1)
    )
    if latest_version is not None and product.version != latest_version:
        raise ProductVersionConflictError(
            f"Generated product version {product.version} is superseded by version {latest_version}"
        )
