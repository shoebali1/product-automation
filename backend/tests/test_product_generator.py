from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.ai.product_generator import OpenAIProductGenerator, ProductGenerationError
from app.products.comparison import compare_sources
from app.schemas.generated_product import GeneratedProductData
from app.schemas.product_source import NormalizedProductSource


def source() -> NormalizedProductSource:
    return NormalizedProductSource(
        source_url="https://example.com/product",
        domain="example.com",
        product_title="Acme Widget W-1",
        brand="Acme",
        sku="W-1",
        description="A silicone widget for general product use.",
        specifications={"Material": "Silicone"},
        raw_json_ld={"secret_to_prompt": "must-not-appear"},
        extraction_method="json_ld+dom",
        scraped_at=datetime.now(UTC),
    )


def draft(brand: str) -> GeneratedProductData:
    return GeneratedProductData(
        product_title="Acme Widget W-1",
        slug="acme-widget-w-1",
        business_product_title="Acme Widget W-1",
        brand=brand,
        sku="W-1",
        short_description="A silicone widget.",
        description="A silicone widget for general product use.",
        specifications={"Material": "Silicone"},
        overall_confidence=Decimal("0.2"),
    )


class FakeResponses:
    def __init__(self, outputs) -> None:
        self.outputs = iter(outputs)
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            output_parsed=next(self.outputs),
            usage=SimpleNamespace(input_tokens=100, output_tokens=50),
        )


class FakeClient:
    def __init__(self, outputs) -> None:
        self.responses = FakeResponses(outputs)


def test_replaces_generated_structured_fact_with_verified_evidence() -> None:
    item = source()
    comparison = compare_sources([("source-1", item)])
    client = FakeClient([draft("Invented Brand")])

    result = OpenAIProductGenerator(client=client, model="gpt-5.6-sol").generate(
        [item], comparison
    )

    assert result.product.brand == "Acme"
    assert len(client.responses.calls) == 1
    assert result.usage.input_tokens == 100
    assert result.product.overall_confidence == Decimal("0.4")
    assert result.product.source_evidence["brand"]["selected_value"] == "Acme"
    assert any("Only 1 successful source" in warning for warning in result.product.warnings)


def test_does_not_send_raw_json_ld_to_model() -> None:
    item = source()
    comparison = compare_sources([("source-1", item)])
    client = FakeClient([draft("Acme")])
    OpenAIProductGenerator(client=client).generate([item], comparison)
    prompt = client.responses.calls[0]["input"][1]["content"]
    assert "raw_json_ld" not in prompt
    assert "must-not-appear" not in prompt


def test_fails_after_one_unsuccessful_repair() -> None:
    item = source()
    comparison = compare_sources([("source-1", item)])
    unsupported = draft("Acme").model_copy(
        update={"description": "Invented 999 ml capacity."}
    )
    client = FakeClient([unsupported, unsupported])
    with pytest.raises(ProductGenerationError, match="repair attempt"):
        OpenAIProductGenerator(client=client).generate([item], comparison)
