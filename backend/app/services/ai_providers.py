from datetime import UTC, datetime
from time import perf_counter
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
import httpx
from openai import OpenAI
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.ai.agentrouter import AgentRouterClientAdapter
from app.core.config import settings
from app.models.ai_provider import AIModel, AIProvider
from app.schemas.ai_provider import (
    AIModelCreate,
    AIModelDetail,
    AIModelTestResult,
    AIModelUpdate,
    AIProviderDetail,
    AIProviderUpdate,
)


class AIProviderNotFoundError(LookupError):
    pass


class AIProviderConfigurationError(ValueError):
    pass


MODEL_TEST_TIMEOUT_SECONDS = 25.0


def list_ai_providers(session: Session) -> list[AIProviderDetail]:
    providers = session.scalars(
        select(AIProvider).options(selectinload(AIProvider.models)).order_by(AIProvider.name)
    ).all()
    return [to_provider_detail(provider) for provider in providers]


def update_ai_provider(
    session: Session, provider_id: UUID, request: AIProviderUpdate
) -> AIProviderDetail:
    provider = _provider(session, provider_id)
    will_have_key = bool(request.api_key) or bool(
        provider.api_key_encrypted and not request.clear_api_key
    )
    if request.enabled is True and not will_have_key:
        raise AIProviderConfigurationError("Configure an API key before enabling this provider")
    if request.custom_headers and any(
        name.lower() in {"authorization", "x-api-key", "api-key"}
        for name in request.custom_headers
    ):
        raise AIProviderConfigurationError("Put credentials in the API key field, not custom headers")
    changes = request.model_dump(exclude_unset=True, exclude={"api_key", "clear_api_key"})
    if "base_url" in changes:
        changes["base_url"] = str(changes["base_url"]).rstrip("/")
    for key, value in changes.items():
        setattr(provider, key, value)
    if request.api_key is not None:
        provider.api_key_encrypted = encrypt_api_key(request.api_key)
        provider.api_key_hint = _key_hint(request.api_key)
    elif request.clear_api_key:
        provider.api_key_encrypted = None
        provider.api_key_hint = None
        provider.enabled = False
    session.commit()
    return to_provider_detail(provider)


def create_ai_model(
    session: Session, provider_id: UUID, request: AIModelCreate
) -> AIModelDetail:
    provider = _provider(session, provider_id)
    values = request.model_dump()
    if provider.slug == "agentrouter":
        values["supports_json_schema"] = False
    model = AIModel(provider_id=provider_id, **values)
    session.add(model)
    try:
        session.flush()
        if model.is_default:
            _make_default(session, model)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise AIProviderConfigurationError("That model ID already exists for this provider") from exc
    return to_model_detail(model)


def update_ai_model(
    session: Session, model_id: UUID, request: AIModelUpdate
) -> AIModelDetail:
    model = _model(session, model_id)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    if model.provider.slug == "agentrouter":
        model.supports_json_schema = False
    if request.is_default:
        model.enabled = True
        _make_default(session, model)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise AIProviderConfigurationError("That model ID already exists for this provider") from exc
    return to_model_detail(model)


def delete_ai_model(session: Session, model_id: UUID) -> None:
    model = _model(session, model_id)
    session.delete(model)
    session.commit()


def test_ai_model(session: Session, model_id: UUID) -> AIModelTestResult:
    model = _model(session, model_id)
    provider = model.provider
    started = perf_counter()
    try:
        # A connection test should return one clear result promptly. Generation calls may
        # retry, but retrying here can outlive the browser request and look like a cancellation.
        client = client_for_provider(
            provider,
            timeout_seconds=MODEL_TEST_TIMEOUT_SECONDS,
            max_retries=0,
        )
        response = client.chat.completions.create(
            model=model.model_id,
            messages=[{"role": "user", "content": "Reply with exactly OK"}],
            max_tokens=64 if provider.slug == "agentrouter" else 8,
            temperature=0,
        )
        preview = (response.choices[0].message.content or "").strip()[:200]
        result = AIModelTestResult(
            ok=True, model=model.model_id, provider=provider.name,
            latency_ms=round((perf_counter() - started) * 1000), response_preview=preview,
            message="Provider and model responded successfully.",
        )
        provider.last_test_status = "SUCCESS"
        provider.last_test_message = result.message
    except Exception as exc:
        result = AIModelTestResult(
            ok=False, model=model.model_id, provider=provider.name,
            latency_ms=round((perf_counter() - started) * 1000),
            message=_safe_remote_error(exc),
        )
        provider.last_test_status = "FAILED"
        provider.last_test_message = result.message
    provider.last_tested_at = datetime.now(UTC)
    session.commit()
    return result


def enabled_ai_models(session: Session) -> list[AIModel]:
    return list(session.scalars(
        select(AIModel)
        .join(AIProvider)
        .options(selectinload(AIModel.provider))
        .where(AIModel.enabled.is_(True), AIProvider.enabled.is_(True), AIProvider.api_key_encrypted.is_not(None))
        .order_by(AIModel.is_default.desc(), AIModel.priority, AIModel.created_at)
    ))


def client_for_provider(
    provider: AIProvider,
    *,
    timeout_seconds: float = 30.0,
    max_retries: int = 1,
) -> object:
    if not provider.api_key_encrypted:
        raise AIProviderConfigurationError("API key is not configured")
    if provider.slug == "agentrouter":
        from anthropic import Anthropic

        return AgentRouterClientAdapter(
            Anthropic(
                api_key=decrypt_api_key(provider.api_key_encrypted),
                base_url=provider.base_url,
                default_headers=provider.custom_headers or None,
                timeout=timeout_seconds,
                max_retries=max_retries,
            )
        )
    return OpenAI(
        api_key=decrypt_api_key(provider.api_key_encrypted),
        base_url=provider.base_url,
        default_headers=provider.custom_headers or None,
        http_client=httpx.Client(timeout=timeout_seconds, follow_redirects=True),
        max_retries=max_retries,
    )


def encrypt_api_key(value: str) -> str:
    return _fernet().encrypt(value.strip().encode()).decode()


def decrypt_api_key(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise AIProviderConfigurationError("Stored API key cannot be decrypted") from exc


def to_provider_detail(provider: AIProvider) -> AIProviderDetail:
    return AIProviderDetail(
        id=provider.id, slug=provider.slug, name=provider.name, base_url=provider.base_url,
        enabled=provider.enabled, api_key_configured=bool(provider.api_key_encrypted),
        api_key_hint=provider.api_key_hint, custom_headers=provider.custom_headers or {},
        last_test_status=provider.last_test_status, last_test_message=provider.last_test_message,
        last_tested_at=provider.last_tested_at,
        models=[to_model_detail(model) for model in provider.models],
    )


def to_model_detail(model: AIModel) -> AIModelDetail:
    return AIModelDetail.model_validate(model, from_attributes=True)


def _fernet() -> Fernet:
    if settings.ai_credential_encryption_key is None:
        raise AIProviderConfigurationError("AI_CREDENTIAL_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(settings.ai_credential_encryption_key.get_secret_value().encode())
    except (TypeError, ValueError) as exc:
        raise AIProviderConfigurationError("AI_CREDENTIAL_ENCRYPTION_KEY is invalid") from exc


def _provider(session: Session, provider_id: UUID) -> AIProvider:
    provider = session.scalar(
        select(AIProvider).options(selectinload(AIProvider.models)).where(AIProvider.id == provider_id)
    )
    if provider is None:
        raise AIProviderNotFoundError("AI provider was not found")
    return provider


def _model(session: Session, model_id: UUID) -> AIModel:
    model = session.scalar(
        select(AIModel).options(selectinload(AIModel.provider)).where(AIModel.id == model_id)
    )
    if model is None:
        raise AIProviderNotFoundError("AI model was not found")
    return model


def _make_default(session: Session, model: AIModel) -> None:
    session.execute(update(AIModel).where(AIModel.id != model.id).values(is_default=False))
    model.is_default = True


def _key_hint(value: str) -> str:
    clean = value.strip()
    return f"••••{clean[-4:]}" if len(clean) >= 4 else "••••"


def _safe_remote_error(error: Exception) -> str:
    status_code = getattr(error, "status_code", None)
    if status_code == 401:
        return "The provider rejected the API key. Replace it with a valid key and test again."
    if status_code == 403:
        return "The API key does not have permission to use this provider or model."
    if status_code == 404:
        return "The provider did not recognize this model ID or endpoint."
    if status_code == 429:
        return "The provider rate limit or account quota was reached. Try again later."
    message = str(error).replace("\n", " ").strip()
    return (message or error.__class__.__name__)[:450]
