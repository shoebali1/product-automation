from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.enums import JobStatus
from app.publishing import Publisher, get_publisher
from app.schemas.generated_product_api import (
    ConflictResolutionRequest,
    GeneratedProductDetail,
    GeneratedProductListItem,
    ProductConflictDetail,
    UpdateGeneratedProductRequest,
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
