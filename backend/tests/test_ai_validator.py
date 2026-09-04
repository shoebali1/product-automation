from datetime import UTC, datetime
from decimal import Decimal

from app.ai.validator import factual_support_errors
from app.schemas.generated_product import GeneratedProductData
from app.schemas.product_source import NormalizedProductSource


def test_rejects_unsupported_medical_claim_and_numeric_fact() -> None:
    source = NormalizedProductSource(
        source_url="https://example.com/product",
        domain="example.com",
        product_title="Acme Widget",
        description="A general-purpose widget.",
        extraction_method="test",
        scraped_at=datetime.now(UTC),
    )
    product = GeneratedProductData(
        product_title="Acme Widget",
        slug="acme-widget",
        business_product_title="Acme Widget",
        description="FDA approved with a 10 ml capacity.",
        overall_confidence=Decimal("0.5"),
    )
    errors = factual_support_errors(product, [source])
    assert "unsupported sensitive claim: fda approved" in errors
    assert "generated prose contains unsupported numeric fact: 10" in errors


def test_accepts_model_specification_from_structured_source_evidence() -> None:
    source = NormalizedProductSource(
        source_url="https://example.com/product",
        domain="example.com",
        product_title="Acme Device 2650",
        model="2650",
        extraction_method="test",
        scraped_at=datetime.now(UTC),
    )
    product = GeneratedProductData(
        product_title="Acme Device 2650",
        slug="acme-device-2650",
        business_product_title="Acme Device 2650",
        specifications={"Model": "2650"},
        overall_confidence=Decimal("0.5"),
    )

    assert "specifications.Model is unsupported: 2650" not in factual_support_errors(
        product, [source]
    )
