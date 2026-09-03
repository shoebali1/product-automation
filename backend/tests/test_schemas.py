from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.common import Pricing
from app.schemas.generated_product import GeneratedProductData
from app.schemas.research_job import CreateResearchJobRequest


def test_job_request_enforces_url_count() -> None:
    with pytest.raises(ValidationError):
        CreateResearchJobRequest(urls=[])


def test_pricing_normalizes_currency() -> None:
    pricing = Pricing(sale_price=Decimal("99.50"), currency="inr")
    assert pricing.currency == "INR"


def test_generated_product_rejects_invalid_slug() -> None:
    with pytest.raises(ValidationError):
        GeneratedProductData(
            product_title="Test",
            slug="Invalid Slug",
            business_product_title="Test",
            overall_confidence=Decimal("0.5"),
        )


def test_generated_product_cleans_null_specifications() -> None:
    product = GeneratedProductData(
        product_title="Test",
        slug="test-slug",
        business_product_title="Test",
        overall_confidence=Decimal("0.5"),
        specifications={
            "Brand": "Acme",
            "Generic Name": None,
            "Empty Spec": "",
            "Capacity": "2L",
        },
    )
    assert product.specifications == {"Brand": "Acme", "Capacity": "2L"}

