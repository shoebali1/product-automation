from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.ai.product_generator import (
    OpenAIProductGenerator,
    ProductGenerationError,
    _draft_quality_errors,
)
from app.products.comparison import compare_sources
from app.schemas.common import ProductImage, ProductPack, ProductVariation
from app.schemas.generated_product import GeneratedProductData, SEOData
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
        seo=SEOData(
            meta_title="Acme Widget W-1 Silicone Product Details and Uses.",
            meta_keywords=[
                "Acme Widget W-1",
                "silicone widget",
                "Acme product",
                "general use widget",
                "W-1 model",
                "silicone product",
                "widget specifications",
                "Acme silicone widget",
            ],
            meta_description=(
                "Explore the Acme Widget W-1 silicone product, including its verified material "
                "specification and practical details for informed product selection."
            ),
            business_meta_title="Acme Widget W-1 Silicone Product Supply Details",
            business_meta_description=(
                "Review the Acme Widget W-1 silicone product, including its verified material "
                "specification and practical details for professional procurement."
            ),
        ),
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


def test_preserves_scraped_highlights_variations_and_packs_when_model_omits_them() -> None:
    item = source().model_copy(
        update={
            "features": ["Transparent body for easy visual inspection"],
            "variations": [
                ProductVariation(
                    name="Large",
                    sku="W-L",
                    price=Decimal("120"),
                    attributes={"Size": "Large"},
                )
            ],
            "packs": [
                ProductPack(
                    label="Pack of 10",
                    quantity=10,
                    price=Decimal("999"),
                    sku="W-P10",
                )
            ],
        }
    )
    comparison = compare_sources([("source-1", item)])
    client = FakeClient([draft("Acme")])

    result = OpenAIProductGenerator(client=client).generate([item], comparison)

    assert any(item.value == "Transparent body for easy visual inspection" for item in result.product.highlights)
    assert any(item.name == "Material" and item.value == "Silicone" for item in result.product.highlights)
    assert result.product.variations[0].attributes == {"Size": "Large"}
    assert result.product.variations[0].sku == "W-L"
    assert result.product.packs[0].quantity == 10
    assert result.product.packs[0].sku == "W-P10"


def test_adds_title_and_alt_text_to_every_generated_image() -> None:
    image_url = "https://example.com/images/widget.jpg"
    item = source().model_copy(
        update={
            "images": [ProductImage(url=image_url, reference_only=True)],
        }
    )
    ai_draft = draft("Acme").model_copy(
        update={
            "images": [
                ProductImage(
                    url=image_url,
                    primary_candidate=True,
                    reference_only=True,
                )
            ]
        }
    )
    client = FakeClient([ai_draft])

    result = OpenAIProductGenerator(client=client).generate(
        [item], compare_sources([("source-1", item)])
    )

    assert result.product.images[0].title == "Acme Widget W-1 - Primary Image"
    assert result.product.images[0].alt == "Acme Widget W-1 primary product image"


def test_fails_after_one_unsuccessful_repair() -> None:
    item = source()
    comparison = compare_sources([("source-1", item)])
    unsupported = draft("Acme").model_copy(
        update={"description": "Invented 999 ml capacity."}
    )
    client = FakeClient([unsupported, unsupported, unsupported])
    with pytest.raises(ProductGenerationError, match="repair attempt"):
        OpenAIProductGenerator(client=client).generate([item], comparison)


def test_normalizes_near_boundary_meta_description() -> None:
    from app.ai.product_generator import _normalize_recoverable_draft

    product = draft("Acme")
    short_meta = "A" * 139
    product = product.model_copy(
        update={"seo": product.seo.model_copy(update={"meta_description": short_meta})}
    )

    normalized = _normalize_recoverable_draft(product)

    assert 140 <= len(normalized.seo.meta_description) <= 160


def test_quality_validation_enforces_rich_content_and_html_rules() -> None:
    rich_source = source().model_copy(
        update={"features": [f"Verified product feature {index}" for index in range(1, 10)]}
    )
    product = draft("Acme").model_copy(
        update={"description": "<div>Too short and unsupported HTML structure.</div>"}
    )

    errors = _draft_quality_errors(product, [rich_source])

    assert any("short_description must contain 80-120 words" in error for error in errors)
    assert any("description must contain 400-500 visible words" in error for error in errors)
    assert any("unsupported HTML tags: div" in error for error in errors)
    assert any("properly nested" in error for error in errors)
    assert any("highlights must contain 8-12" in error for error in errors)


def test_quality_validation_rejects_bad_metadata_and_duplicate_keywords() -> None:
    bad_seo = SEOData(
        meta_title="Too short",
        meta_keywords=["widget"] * 8,
        meta_description="Too short",
        business_meta_title="",
        business_meta_description="",
    )

    errors = _draft_quality_errors(draft("Acme").model_copy(update={"seo": bad_seo}), [source()])

    assert any("meta_title must contain 50-60 characters" in error for error in errors)
    assert any("meta_description must contain 140-160 characters" in error for error in errors)
    assert "seo.meta_keywords must not contain duplicate terms" in errors
    assert "seo.business_meta_title must not be empty" in errors
    assert "seo.business_meta_description must not be empty" in errors


def test_resolves_conflicting_data_with_ai_selection(monkeypatch) -> None:
    taxonomy = {
        "brand_data": [{"id": 49, "name": "Romsons", "slug": "romsons"}],
        "category_data": [
            {
                "id": 10,
                "name": "Catheters & Drainage",
                "slug": "catheters-drainage",
                "subcategories": [
                    {
                        "id": 11,
                        "name": "Urine Collection Bags & Urometers",
                        "slug": "urine-collection-bags-urometers",
                    }
                ],
            }
        ],
    }
    monkeypatch.setattr(
        "app.services.surginatal.fetch_surginatal_taxonomy",
        lambda *args, **kwargs: taxonomy,
    )
    source_1 = NormalizedProductSource(
        source_url="https://site1.com/p",
        domain="site1.com",
        product_title="Romsons Urine Bag",
        brand="Romsons Scientific",
        category="Catheters",
        description="Standard urine bag.",
        specifications={"Capacity": "2000 ml"},
        extraction_method="test",
        scraped_at=datetime.now(UTC),
    )
    source_2 = NormalizedProductSource(
        source_url="https://site2.com/p",
        domain="site2.com",
        product_title="Romsons Uro Bag",
        brand="Romsons",
        category="Urology",
        description="Standard urine bag.",
        specifications={"Capacity": "2 Litre"},
        extraction_method="test",
        scraped_at=datetime.now(UTC),
    )
    comparison = compare_sources([("s1", source_1), ("s2", source_2)])
    # Verify there is a conflict in the raw comparison
    assert len(comparison.conflicts) > 0

    ai_draft = GeneratedProductData(
        product_title="Romsons 2L Uro Urine Bag",
        slug="romsons-2l-uro-urine-bag",
        business_product_title="Romsons 2L Uro Urine Bag",
        brand="Romsons",
        category="Catheters & Drainage",
        subcategory="Urine Collection Bags & Urometers",
        description="Standard urine bag.",
        specifications={"Capacity": "2 Litre"},
        seo=draft("Romsons").seo,
        overall_confidence=Decimal("0.8"),
    )
    client = FakeClient([ai_draft])
    result = OpenAIProductGenerator(client=client).generate([source_1, source_2], comparison)

    # Verify AI choice is preserved and enriched with Surginatal ID
    assert result.product.brand == "Romsons"
    assert result.product.brand_id == 49
    assert result.product.specifications["Capacity"] == "2 Litre"
    # Conflicts in product data are marked RESOLVED, not OPEN
    assert all(c["status"] == "RESOLVED" for c in result.product.conflicts)
    assert all(not c["requires_review"] for c in result.product.conflicts)
