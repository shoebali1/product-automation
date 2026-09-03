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

