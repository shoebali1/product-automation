import re
from collections import defaultdict
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ConfidenceLevel
from app.schemas.product_source import NormalizedProductSource

SPACE_PATTERN = re.compile(r"\s+")
NON_ALNUM_PATTERN = re.compile(r"[^A-Z0-9]")
SCALAR_FIELDS = (
    "product_title",
    "brand",
    "manufacturer",
    "generic_name",
    "product_code",
    "model",
    "sku",
    "gtin",
    "mpn",
    "category",
)
IDENTIFIER_FIELDS = {"product_code", "model", "sku", "gtin", "mpn"}


class ComparisonSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EvidenceValue(ComparisonSchema):
    value: Any
    source_ids: list[str]


class FieldEvidence(ComparisonSchema):
    field_path: str
    selected_value: Any | None = None
    confidence: ConfidenceLevel
    confidence_score: float = Field(ge=0, le=1)
    values: list[EvidenceValue]
    requires_review: bool = False


class ConflictCandidate(ComparisonSchema):
    field_path: str
    values: list[EvidenceValue]
    requires_review: bool = True


class ResearchComparison(ComparisonSchema):
    evidence: dict[str, FieldEvidence]
    conflicts: list[ConflictCandidate]
    source_count: int


def compare_sources(
    sources: list[tuple[str, NormalizedProductSource]],
) -> ResearchComparison:
    """Compare factual scalar/specification/price values without semantic guessing."""
    field_values: dict[str, list[tuple[str, Any]]] = defaultdict(list)
    specification_names: dict[str, str] = {}
    for source_id, source in sources:
        for field_name in SCALAR_FIELDS:
            value = getattr(source, field_name)
            if value is not None and str(value).strip():
                field_values[field_name].append((source_id, value))
        for name, value in source.specifications.items():
            clean_name = _clean_text(name)
            if clean_name and str(value).strip():
                display_name = specification_names.setdefault(clean_name.casefold(), clean_name)
                field_values[f"specifications.{display_name}"].append((source_id, value))
        for price_field in ("mrp", "sale_price", "currency", "gst"):
            value = getattr(source.pricing, price_field)
            if value is not None:
                field_values[f"pricing.{price_field}"].append((source_id, value))

    evidence: dict[str, FieldEvidence] = {}
    conflicts: list[ConflictCandidate] = []
    total_sources = len(sources)
    for field_path, candidates in sorted(field_values.items()):
        grouped = _group_values(field_path, candidates)
        ranked = sorted(grouped.values(), key=lambda item: (-len(item.source_ids), str(item.value)))
        has_conflict = len(ranked) > 1
        top = ranked[0]
        score = len(top.source_ids) / total_sources if total_sources else 0.0
        confidence = _confidence(score, len(top.source_ids), has_conflict)
        selected_value = None if has_conflict else top.value
        field_evidence = FieldEvidence(
            field_path=field_path,
            selected_value=selected_value,
            confidence=confidence,
            confidence_score=score,
            values=ranked,
            requires_review=has_conflict,
        )
        evidence[field_path] = field_evidence
        if has_conflict:
            conflicts.append(
                ConflictCandidate(field_path=field_path, values=ranked, requires_review=True)
            )

    return ResearchComparison(
        evidence=evidence,
        conflicts=conflicts,
        source_count=total_sources,
    )


def _group_values(
    field_path: str, candidates: list[tuple[str, Any]]
) -> dict[str, EvidenceValue]:
    grouped: dict[str, EvidenceValue] = {}
    for source_id, value in candidates:
        canonical = _canonical_value(field_path, value)
        if canonical not in grouped:
            grouped[canonical] = EvidenceValue(value=value, source_ids=[])
        if source_id not in grouped[canonical].source_ids:
            grouped[canonical].source_ids.append(source_id)
    return grouped


def _canonical_value(field_path: str, value: Any) -> str:
    leaf_name = field_path.rsplit(".", 1)[-1]
    if isinstance(value, Decimal):
        return format(value.normalize(), "f")
    text = _clean_text(str(value))
    if leaf_name in IDENTIFIER_FIELDS:
        return NON_ALNUM_PATTERN.sub("", text.upper())
    if leaf_name == "currency":
        return text.upper()
    return text.casefold()


def _clean_text(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value).strip().rstrip(":")


def _confidence(score: float, support_count: int, has_conflict: bool) -> ConfidenceLevel:
    if has_conflict:
        return ConfidenceLevel.CONFLICTED
    if support_count >= 3 and score >= 0.75:
        return ConfidenceLevel.HIGH
    if support_count >= 2 and score >= 0.5:
        return ConfidenceLevel.MEDIUM
    return ConfidenceLevel.LOW
