from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.enums import JobStatus
from app.publishing import Publisher, get_publisher
from app.schemas.generated_product import GeneratedProductData
from app.schemas.generated_product_api import (
    CatalogTaxonomy,
    ConflictResolutionRequest,
    GeneratedProductDetail,
    GeneratedProductListItem,
    ProductConflictDetail,
    SurginatalSubmissionResult,
    UpdateGeneratedProductRequest,
)
from app.services.surginatal import fetch_surginatal_taxonomy
from app.services.surginatal_submission import (
    MAX_IMAGE_BYTES,
    SubmissionImage,
    SurginatalSubmissionError,
    submit_product_to_surginatal,
)
from app.services.generated_products import (
    ProductNotFoundError,
    ProductPublishError,
    ProductStateError,
    ProductValidationError,
    ProductVersionConflictError,
    approve_generated_product,
    get_generated_product,
    list_generated_products,
    list_product_conflicts,
    publish_generated_product,
    resolve_product_conflict,
    to_product_detail,
    update_generated_product,
)

router = APIRouter(prefix="/generated-products", tags=["generated products"])


@router.get("", response_model=list[GeneratedProductListItem])
def list_products(
    status: JobStatus | None = None,
    session: Session = Depends(get_db_session),
) -> list[GeneratedProductListItem]:
    return list_generated_products(session, status=status)


@router.get("/taxonomy/options", response_model=CatalogTaxonomy)
def get_catalog_taxonomy() -> CatalogTaxonomy:
    taxonomy = fetch_surginatal_taxonomy()
    categories = []
    for category in taxonomy.get("category_data", []):
        if not category.get("id") or not category.get("name"):
            continue
        categories.append(
            {
                "id": category["id"],
                "name": category["name"],
                "subcategories": [
                    {"id": item["id"], "name": item["name"]}
                    for item in category.get("subcategories", [])
                    if item.get("id") and item.get("name")
                ],
            }
        )
    brands = [
        {"id": brand["id"], "name": brand["name"]}
        for brand in taxonomy.get("brand_data", [])
        if brand.get("id") and brand.get("name")
    ]
    return CatalogTaxonomy(categories=categories, brands=brands)


@router.get("/{product_id}", response_model=GeneratedProductDetail)
def get_product(
    product_id: UUID, session: Session = Depends(get_db_session)
) -> GeneratedProductDetail:
    product = get_generated_product(session, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Generated product was not found")
    return to_product_detail(product, session)


@router.put("/{product_id}", response_model=GeneratedProductDetail)
def update_product(
    product_id: UUID,
    request: UpdateGeneratedProductRequest,
    session: Session = Depends(get_db_session),
) -> GeneratedProductDetail:
    try:
        return to_product_detail(update_generated_product(session, product_id, request), session)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductVersionConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ProductValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ProductStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{product_id}/surginatal", response_model=SurginatalSubmissionResult)
async def submit_product_to_catalog(
    product_id: UUID,
    images: list[UploadFile] = File(default=[]),
    image_titles: list[str] = Form(default=[]),
    image_alt: list[str] = Form(default=[]),
    primary_image_index: int | None = Form(default=None),
    session: Session = Depends(get_db_session),
) -> SurginatalSubmissionResult:
    product = get_generated_product(session, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Generated product was not found")
    if len(image_titles) != len(images) or len(image_alt) != len(images):
        raise HTTPException(
            status_code=422,
            detail="Every selected local image must have one title and one alt text value",
        )

    local_images = []
    for index, image in enumerate(images):
        content_type = (image.content_type or "").lower()
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=422, detail=f"{image.filename} is not an image")
        content = await image.read(MAX_IMAGE_BYTES + 1)
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{image.filename} exceeds the 15 MB image limit",
            )
        local_images.append(
            SubmissionImage(
                filename=image.filename or f"local-image-{index + 1}",
                content=content,
                content_type=content_type,
                title=image_titles[index],
                alt=image_alt[index],
                primary=primary_image_index == index,
            )
        )

    data = GeneratedProductData.model_validate(product.product_data)
    try:
        external_id = await run_in_threadpool(
            submit_product_to_surginatal,
            data,
            local_images=local_images,
            existing_product_id=data.surginatal_product_id,
        )
    except SurginatalSubmissionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    stored_data = dict(product.product_data)
    stored_data["surginatal_product_id"] = external_id
    product.product_data = stored_data
    session.commit()
    return SurginatalSubmissionResult(
        message="Product saved and submitted to Surginatal",
        product_id=external_id,
        product=to_product_detail(product, session),
    )


@router.post("/{product_id}/approve", response_model=GeneratedProductDetail)
def approve_product(
    product_id: UUID, session: Session = Depends(get_db_session)
) -> GeneratedProductDetail:
    try:
        return to_product_detail(approve_generated_product(session, product_id), session)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{product_id}/publish", response_model=GeneratedProductDetail)
def publish_product(
    product_id: UUID,
    session: Session = Depends(get_db_session),
    publisher: Publisher = Depends(get_publisher),
) -> GeneratedProductDetail:
    try:
        return to_product_detail(publish_generated_product(session, product_id, publisher), session)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductPublishError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ProductStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/{product_id}/conflicts", response_model=list[ProductConflictDetail])
def get_conflicts(
    product_id: UUID, session: Session = Depends(get_db_session)
) -> list[ProductConflictDetail]:
    try:
        return list_product_conflicts(session, product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put(
    "/{product_id}/conflicts/{conflict_id}",
    response_model=ProductConflictDetail,
)
def resolve_conflict(
    product_id: UUID,
    conflict_id: UUID,
    request: ConflictResolutionRequest,
    session: Session = Depends(get_db_session),
) -> ProductConflictDetail:
    try:
        return resolve_product_conflict(session, product_id, conflict_id, request)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ProductStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
