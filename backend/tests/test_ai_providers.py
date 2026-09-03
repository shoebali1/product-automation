import json
from types import SimpleNamespace
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.ai.product_generator import (
    AGENTROUTER_GENERATION_TIMEOUT_SECONDS,
    CompatibleModelRoute,
    CompatibleProductGenerator,
    DatabaseRoutingProductGenerator,
)
from app.db.base import Base
from app.models.ai_provider import AIModel, AIProvider
from app.products.comparison import compare_sources
from app.schemas.ai_provider import AIModelCreate, AIModelUpdate, AIProviderUpdate
from app.schemas.generated_product import GeneratedProductData
from app.schemas.product_source import NormalizedProductSource
from app.services.ai_providers import (
    AIProviderConfigurationError,
    create_ai_model,
    decrypt_api_key,
    enabled_ai_models,
    test_ai_model as run_ai_model_test,
    update_ai_model,
    update_ai_provider,
)


def source() -> NormalizedProductSource:
    return NormalizedProductSource(
        source_url="https://example.com/product", domain="example.com",
        product_title="Acme Widget W-1", brand="Acme", sku="W-1",
        description="A silicone widget.", specifications={"Material": "Silicone"},
        extraction_method="test", scraped_at=datetime.now(UTC),
    )


def draft(brand: str) -> GeneratedProductData:
    return GeneratedProductData(
        product_title="Acme Widget W-1", slug="acme-widget-w-1",
        business_product_title="Acme Widget W-1", brand=brand, sku="W-1",
        short_description="A silicone widget.", description="A silicone widget.",
        specifications={"Material": "Silicone"}, overall_confidence=Decimal("0.2"),
    )


class FakeCompletions:
    def __init__(self, content: str) -> None:
        self.content = content
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self.content))],
            usage=SimpleNamespace(prompt_tokens=120, completion_tokens=60),
        )


class FakeChatClient:
    def __init__(self, content: str) -> None:
        self.chat = SimpleNamespace(completions=FakeCompletions(content))


def test_provider_key_is_encrypted_masked_and_never_returned() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        provider = AIProvider(
            slug="test", name="Test", base_url="https://example.com/v1",
            enabled=False, custom_headers={},
        )
        session.add(provider)
        session.commit()

        detail = update_ai_provider(
            session, provider.id, AIProviderUpdate(api_key="secret-key-1234", enabled=True)
        )

        assert detail.api_key_configured is True
        assert detail.api_key_hint == "••••1234"
        assert not hasattr(detail, "api_key")
        assert provider.api_key_encrypted != "secret-key-1234"
        assert decrypt_api_key(provider.api_key_encrypted) == "secret-key-1234"


def test_provider_cannot_be_enabled_without_api_key() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        provider = AIProvider(
            slug="test", name="Test", base_url="https://example.com/v1",
            enabled=False, custom_headers={},
        )
        session.add(provider)
        session.commit()
        with pytest.raises(AIProviderConfigurationError, match="API key"):
            update_ai_provider(session, provider.id, AIProviderUpdate(enabled=True))


def test_default_model_is_enabled_and_ordered_first() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        provider = AIProvider(
            slug="test", name="Test", base_url="https://example.com/v1",
            enabled=False, custom_headers={},
        )
        session.add(provider)
        session.commit()
        update_ai_provider(
            session, provider.id, AIProviderUpdate(api_key="secret-key", enabled=True)
        )
        first = create_ai_model(
            session, provider.id, AIModelCreate(model_id="first", display_name="First", priority=1)
        )
        second = create_ai_model(
            session, provider.id, AIModelCreate(model_id="second", display_name="Second", priority=99)
        )

        update_ai_model(session, second.id, AIModelUpdate(is_default=True))
        routes = enabled_ai_models(session)

        assert [route.model_id for route in routes] == ["second", "first"]
        assert session.get(AIModel, first.id).is_default is False
        assert session.get(AIProvider, provider.id).enabled is True


def test_model_check_uses_one_bounded_remote_attempt(monkeypatch) -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    captured = {}

    def fake_client(provider, *, timeout_seconds, max_retries):
        captured.update(timeout_seconds=timeout_seconds, max_retries=max_retries)
        return FakeChatClient("OK")

    monkeypatch.setattr("app.services.ai_providers.client_for_provider", fake_client)

    with Session(engine) as session:
        provider = AIProvider(
            slug="test", name="Test", base_url="https://example.com/v1",
            enabled=True, api_key_encrypted="not-used-by-fake", custom_headers={},
        )
        model = AIModel(
            provider=provider, model_id="test-model", display_name="Test model",
        )
        session.add_all([provider, model])
        session.commit()

        result = run_ai_model_test(session, model.id)

    assert result.ok is True
    assert result.response_preview == "OK"
    assert captured == {"timeout_seconds": 25.0, "max_retries": 0}


def test_agentrouter_generation_uses_long_timeout_without_transport_retry(monkeypatch) -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    captured = {}

    def fake_client(provider, *, timeout_seconds, max_retries):
        captured.update(timeout_seconds=timeout_seconds, max_retries=max_retries)
        return FakeChatClient("{}")

    monkeypatch.setattr("app.services.ai_providers.client_for_provider", fake_client)
    with Session(engine) as session:
        provider = AIProvider(
            slug="agentrouter",
            name="AgentRouter",
            base_url="https://agentrouter.org",
            enabled=True,
            api_key_encrypted="configured",
            custom_headers={},
        )
        session.add(
            AIModel(
                provider=provider,
                model_id="gpt-5.6-sol",
                display_name="GPT 5.6 Sol",
                enabled=True,
                is_default=True,
                supports_json_schema=False,
            )
        )
        session.commit()

        generator = DatabaseRoutingProductGenerator.from_session(session)

    assert generator.routes[0].model_id == "gpt-5.6-sol"
    assert captured == {
        "timeout_seconds": AGENTROUTER_GENERATION_TIMEOUT_SECONDS,
        "max_retries": 0,
    }


def test_compatible_generator_parses_structured_chat_completion() -> None:
    item = source()
    client = FakeChatClient(draft("Acme").model_dump_json())
    route = CompatibleModelRoute(
        provider_name="openrouter", model_id="vendor/model", client=client,
        supports_json_schema=True, max_tokens=4096, temperature=0.2,
    )

    result = CompatibleProductGenerator(route).generate(
        [item], compare_sources([("source-1", item)])
    )

    assert result.model == "openrouter:vendor/model"
    assert result.usage.input_tokens == 120
    assert result.product.brand == "Acme"
    assert client.chat.completions.calls[0]["response_format"]["type"] == "json_schema"


def test_compatible_generator_accepts_wrapped_output_and_symbolic_confidence() -> None:
    item = source()
    payload = draft("Acme").model_dump(mode="json")
    payload.pop("slug")
    payload.pop("business_product_title")
    payload["overall_confidence"] = "LOW"
    payload["id"] = None
    payload["features"] = ["A factual feature"]
    payload["packs"] = [{"pack_size": "Single unit", "price": None}]
    payload["seo"] = {
        "title": "Acme Widget W-1",
        "keywords": ["acme widget"],
        "meta_description": "A silicone widget.",
    }
    client = FakeChatClient(json.dumps({"data": {"product": payload}}))
    route = CompatibleModelRoute(
        provider_name="openrouter",
        model_id="wrapped-model",
        client=client,
        supports_json_schema=True,
        max_tokens=4096,
        temperature=0.2,
    )

    result = CompatibleProductGenerator(route).generate(
        [item], compare_sources([("source-1", item)])
    )

    assert result.product.product_title == "Acme Widget W-1"
    assert result.product.slug == "acme-widget-w-1"
    assert result.product.business_product_title == "Acme Widget W-1"
    assert result.product.highlights[0].value == "A factual feature"
    assert result.product.packs[0].label == "Single unit"
    assert result.product.seo.meta_title == "Acme Widget W-1"
    assert result.product.overall_confidence == Decimal("0.4")


def test_json_object_route_includes_schema_in_prompt() -> None:
    item = source()
    client = FakeChatClient(draft("Acme").model_dump_json())
    route = CompatibleModelRoute(
        provider_name="openrouter",
        model_id="json-object-model",
        client=client,
        supports_json_schema=False,
        max_tokens=4096,
        temperature=0.2,
    )

    CompatibleProductGenerator(route).generate(
        [item], compare_sources([("source-1", item)])
    )

    call = client.chat.completions.calls[0]
    assert call["response_format"] == {"type": "json_object"}
    assert "REQUIRED OUTPUT JSON SCHEMA" in call["messages"][1]["content"]
