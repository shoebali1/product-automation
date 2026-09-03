from datetime import UTC, datetime

from app.models.enums import ConfidenceLevel
from app.products.comparison import compare_sources
from app.schemas.product_source import NormalizedProductSource


def source(**overrides) -> NormalizedProductSource:
    values = {
        "source_url": "https://example.com/product",
        "domain": "example.com",
        "product_title": "Acme Widget",
        "brand": "Acme",
        "product_code": "GS-1078",
        "specifications": {"Material": "Silicone"},
        "extraction_method": "json_ld+dom",
        "scraped_at": datetime.now(UTC),
    }
    values.update(overrides)
    return NormalizedProductSource(**values)


def test_normalizes_safe_identifier_formatting_differences() -> None:
    result = compare_sources(
        [
            ("source-1", source(product_code="GS-1078")),
            ("source-2", source(product_code="GS1078")),
            ("source-3", source(product_code="gs 1078")),
        ]
    )
    evidence = result.evidence["product_code"]
    assert evidence.selected_value == "GS-1078"
    assert evidence.confidence == ConfidenceLevel.HIGH
    assert evidence.confidence_score == 1
    assert result.conflicts == []


def test_conflicting_specification_is_not_selected() -> None:
    result = compare_sources(
        [
            ("source-1", source(specifications={"Balloon Capacity": "10 ml"})),
            ("source-2", source(specifications={"Balloon Capacity": "15 ml"})),
            ("source-3", source(specifications={"Balloon Capacity": "30 ml"})),
        ]
    )
    evidence = result.evidence["specifications.Balloon Capacity"]
    assert evidence.selected_value is None
    assert evidence.confidence == ConfidenceLevel.CONFLICTED
    assert evidence.requires_review is True
    assert result.conflicts[0].field_path == "specifications.Balloon Capacity"


def test_one_source_produces_low_confidence() -> None:
    result = compare_sources([("source-1", source())])
    assert result.evidence["brand"].confidence == ConfidenceLevel.LOW


def test_two_agreeing_sources_produce_medium_confidence() -> None:
    result = compare_sources([("source-1", source()), ("source-2", source())])
    assert result.evidence["brand"].confidence == ConfidenceLevel.MEDIUM


def test_specification_names_are_matched_case_insensitively() -> None:
    result = compare_sources(
        [
            ("source-1", source(specifications={"Material": "Silicone"})),
            ("source-2", source(specifications={"material": "silicone"})),
        ]
    )
    assert result.evidence["specifications.Material"].confidence == ConfidenceLevel.MEDIUM
