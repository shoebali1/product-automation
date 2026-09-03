from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.ai.agentrouter import AgentRouterClientAdapter
from app.db.base import Base
from app.models.ai_provider import AIProvider
from app.schemas.ai_provider import AIModelCreate
from app.services.ai_providers import create_ai_model


class FakeMessages:
    def __init__(self) -> None:
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            content=[
                SimpleNamespace(type="thinking", thinking="private reasoning"),
                SimpleNamespace(type="text", text="OK"),
            ],
            usage=SimpleNamespace(input_tokens=12, output_tokens=3),
        )


def test_agentrouter_adapter_translates_anthropic_response() -> None:
    messages = FakeMessages()
    client = AgentRouterClientAdapter(SimpleNamespace(messages=messages))

    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[
            {"role": "system", "content": "Return JSON."},
            {"role": "user", "content": "Test"},
        ],
        response_format={"type": "json_object"},
        max_tokens=100,
        temperature=0.2,
    )

    assert messages.calls == [
        {
            "model": "deepseek-v4-flash",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": "Test"}],
            "system": "Return JSON.",
        }
    ]
    assert response.choices[0].message.content == "OK"
    assert response.usage.prompt_tokens == 12
    assert response.usage.completion_tokens == 3


def test_agentrouter_adapter_accepts_plain_string_proxy_response() -> None:
    messages = FakeMessages()
    messages.create = lambda **_: "OK"
    client = AgentRouterClientAdapter(SimpleNamespace(messages=messages))

    response = client.chat.completions.create(
        model="gpt-alias",
        messages=[{"role": "user", "content": "Test"}],
        max_tokens=64,
    )

    assert response.choices[0].message.content == "OK"


def test_agentrouter_model_is_always_created_in_compatible_json_mode() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        provider = AIProvider(
            slug="agentrouter",
            name="AgentRouter",
            base_url="https://agentrouter.org",
            enabled=False,
            custom_headers={},
        )
        session.add(provider)
        session.commit()

        model = create_ai_model(
            session,
            provider.id,
            AIModelCreate(
                model_id="deepseek-v4-flash",
                display_name="DeepSeek V4 Flash",
                supports_json_schema=True,
            ),
        )

        assert model.supports_json_schema is False
