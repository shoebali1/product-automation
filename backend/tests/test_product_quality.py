from decimal import Decimal
from types import SimpleNamespace

from app.models.enums import ConflictStatus, JobStatus
from app.products.quality import build_product_quality_context
from app.schemas.generated_product import GeneratedProductData, Highlight


def product(**updates) -> GeneratedProductData:
    data = GeneratedProductData(
        product_title="Acme Widget",
        slug="acme-widget",
        business_product_title="Acme Widget",
        brand="Acme",
        category="Widgets",
        short_description="A useful product description that gives shoppers the essential product context.",
        description="A detailed and evidence-backed product description. " * 6,
        highlights=[Highlight(name=f"Feature {i}", value="Value") for i in range(5)],
        specifications={"Material": "Silicone", "Size": "10 ml", "Color": "Blue"},
        overall_confidence=Decimal("0.8"),
    )
    return data.model_copy(update=updates)


def source(domain):
    return SimpleNamespace(domain=domain, extraction_method="json_ld+dom")


def test_quality_context_separates_confidence_completeness_and_coverage() -> None:
    context = build_product_quality_context(
        product(),
        JobStatus.DRAFT,
        [source("a.example"), source("b.example"), source("c.example")],
        [],
    )

    assert context.metrics["confidence"].score == 80
    assert context.metrics["source_coverage"].score == 100
    assert context.sources.independent_domains == 3
    assert context.readiness == "READY_FOR_APPROVAL"
    assert not context.blockers


def test_open_conflict_is_explained_and_caps_readiness() -> None:
    conflict = SimpleNamespace(
        status=ConflictStatus.OPEN,
        requires_review=True,
        field_path="pricing.sale_price",
        values=[{"value": "10"}, {"value": "12"}],
    )
    context = build_product_quality_context(
        product(overall_confidence=Decimal("0.9")),
        JobStatus.REVIEW_REQUIRED,
        [source("a.example"), source("b.example"), source("c.example")],
        [conflict],
    )

    assert context.readiness == "BLOCKED_BY_CONFLICTS"
    assert context.metrics["readiness"].score <= 59
    assert context.blockers[0].field_path == "pricing.sale_price"
    assert "different values" in context.blockers[0].detail


def test_missing_core_content_produces_actionable_context() -> None:
    context = build_product_quality_context(
        product(brand=None, category=None, description=""),
        JobStatus.DRAFT,
        [source("a.example")],
        [],
    )

    assert context.readiness == "NEEDS_CONTENT"
    assert {item.field_path for item in context.blockers} >= {"brand", "category", "description"}
    assert any("authoritative source" in action for action in context.next_actions)
