from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.ai_provider import (
    AIModelCreate,
    AIModelDetail,
    AIModelTestResult,
    AIModelUpdate,
    AIProviderDetail,
    AIProviderUpdate,
)
from app.services.ai_providers import (
    AIProviderConfigurationError,
    AIProviderNotFoundError,
    create_ai_model,
    delete_ai_model,
    list_ai_providers,
    test_ai_model,
    update_ai_model,
    update_ai_provider,
)

router = APIRouter(prefix="/admin/ai", tags=["admin ai"])


@router.get("/providers", response_model=list[AIProviderDetail])
def get_providers(session: Session = Depends(get_db_session)) -> list[AIProviderDetail]:
    return list_ai_providers(session)


@router.put("/providers/{provider_id}", response_model=AIProviderDetail)
def put_provider(
    provider_id: UUID,
    request: AIProviderUpdate,
    session: Session = Depends(get_db_session),
) -> AIProviderDetail:
    try:
        return update_ai_provider(session, provider_id, request)
    except AIProviderNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AIProviderConfigurationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/providers/{provider_id}/models", response_model=AIModelDetail, status_code=201)
def post_model(
    provider_id: UUID,
    request: AIModelCreate,
    session: Session = Depends(get_db_session),
) -> AIModelDetail:
    try:
        return create_ai_model(session, provider_id, request)
    except AIProviderNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AIProviderConfigurationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.put("/models/{model_id}", response_model=AIModelDetail)
def put_model(
    model_id: UUID,
    request: AIModelUpdate,
    session: Session = Depends(get_db_session),
) -> AIModelDetail:
    try:
        return update_ai_model(session, model_id, request)
    except AIProviderNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AIProviderConfigurationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_model(model_id: UUID, session: Session = Depends(get_db_session)) -> Response:
    try:
        delete_ai_model(session, model_id)
    except AIProviderNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/models/{model_id}/test", response_model=AIModelTestResult)
def test_model(model_id: UUID, session: Session = Depends(get_db_session)) -> AIModelTestResult:
    try:
        return test_ai_model(session, model_id)
    except AIProviderNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

