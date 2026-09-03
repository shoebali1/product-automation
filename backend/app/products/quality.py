from collections.abc import Iterable
from typing import Any

from app.models.enums import ConflictStatus, JobStatus
from app.schemas.generated_product import GeneratedProductData
from app.schemas.generated_product_api import (
    EvidenceQualitySummary,
    ProductQualityContext,
    QualityIssue,
    QualityMetric,
    SourceQualitySummary,
)


def build_product_quality_context(
    product: GeneratedProductData,
    status: JobStatus,
    sources: Iterable[Any],
    conflicts: Iterable[Any],
) -> ProductQualityContext:
    """Build an operator-facing, deterministic explanation of product quality."""
    source_list = list(sources)
    conflict_list = list(conflicts)
    open_conflicts = [
        item
        for item in conflict_list
        if item.status == ConflictStatus.OPEN and item.requires_review
    ]
    reviewed_conflicts = [
        item for item in conflict_list if item.status != ConflictStatus.OPEN
    ]
    open_conflict_fields = {item.field_path for item in open_conflicts}

    evidence_items = list(product.source_evidence.values())
    evidence_levels = [
        str(item.get("confidence", "LOW")).upper()
        for item in evidence_items
        if isinstance(item, dict)
    ]
    evidence_summary = EvidenceQualitySummary(
        total_fields=len(evidence_items),
        high_confidence_fields=evidence_levels.count("HIGH"),
        medium_confidence_fields=evidence_levels.count("MEDIUM"),
        low_confidence_fields=evidence_levels.count("LOW"),
        conflicted_fields=len(open_conflicts),
        reviewed_conflicts=len(reviewed_conflicts),
    )

    completeness_score, missing_critical, missing_recommended = _completeness(product)
    confidence_score = round(float(product.overall_confidence) * 100)
    domains = sorted({source.domain for source in source_list if source.domain})
    source_score = min(100, round(len(domains) / 3 * 100))
    source_summary = SourceQualitySummary(
        successful_sources=len(source_list),
        independent_domains=len(domains),
        domains=domains,
        extraction_methods=sorted(
            {source.extraction_method for source in source_list if source.extraction_method}
        ),
    )

    blockers = [
        QualityIssue(
            code="OPEN_CONFLICT",
            severity="BLOCKER",
            field_path=item.field_path,
            title=f"Resolve {friendly_field(item.field_path)}",
            detail=(
                f"Sources provide {len(item.values)} different values. "
                "The product cannot be approved until a reviewer selects or enters a value."
            ),
            action=f"Open Conflicts and review {friendly_field(item.field_path)}.",
        )
        for item in open_conflicts
    ]
    blockers.extend(
        QualityIssue(
            code="MISSING_CRITICAL_FIELD",
            severity="HIGH",
            field_path=field_path,
            title=f"Add {friendly_field(field_path)}",
            detail="This core catalog field is empty or does not contain enough useful content.",
            action=f"Verify and complete {friendly_field(field_path)} from an authoritative source.",
        )
        for field_path in missing_critical
        if field_path not in open_conflict_fields
    )

    recommendations = [
        QualityIssue(
            code="MISSING_RECOMMENDED_FIELD",
            severity="MEDIUM",
            field_path=field_path,
            title=f"Improve {friendly_field(field_path)}",
            detail="Adding this field will make the listing more useful, searchable, and publish-ready.",
            action=f"Add evidence-backed {friendly_field(field_path)} where available.",
        )
        for field_path in missing_recommended
        if field_path not in open_conflict_fields
    ]
    if len(domains) < 3:
        recommendations.insert(
            0,
            QualityIssue(
                code="LIMITED_SOURCE_COVERAGE",
                severity="MEDIUM",
                title="Add independent source coverage",
                detail=(
                    f"Only {len(domains)} independent domain{' is' if len(domains) == 1 else 's are'} "
                    "represented; three or more reliable domains provide stronger corroboration."
                ),
                action="Research at least three independent sources, including a manufacturer source when possible.",
            ),
        )

    readiness_score = round(
        confidence_score * 0.45 + completeness_score * 0.35 + source_score * 0.20
    )
    if open_conflicts:
        readiness_score = min(readiness_score, 59)
    readiness = _readiness(status, open_conflicts, missing_critical, readiness_score)
    grade = _grade(readiness_score)
    strengths = _strengths(product, evidence_summary, source_summary, completeness_score)
    next_actions = _next_actions(blockers, recommendations, readiness)

    headline, summary = _summary(
        readiness,
        readiness_score,
        open_conflicts=len(open_conflicts),
        missing_critical=len(
            [field for field in missing_critical if field not in open_conflict_fields]
        ),
        source_count=len(source_list),
    )
    return ProductQualityContext(
        readiness=readiness,
        grade=grade,
        headline=headline,
        summary=summary,
        metrics={
            "readiness": QualityMetric(
                score=readiness_score,
                label="Publish readiness",
                explanation="Weighted from factual confidence (45%), completeness (35%), and source coverage (20%); open conflicts cap readiness below 60%.",
            ),
            "confidence": QualityMetric(
                score=confidence_score,
                label="Factual confidence",
                explanation="Agreement level of non-conflicted facts across successful sources, capped when fewer than three sources are available.",
            ),
            "completeness": QualityMetric(
                score=completeness_score,
                label="Catalog completeness",
                explanation="Coverage of core identity, description, commerce, media, specification, and SEO fields.",
            ),
            "source_coverage": QualityMetric(
                score=source_score,
                label="Source coverage",
                explanation="Independent-domain coverage; three or more successful domains receive full coverage credit.",
            ),
        },
        sources=source_summary,
        evidence=evidence_summary,
        strengths=strengths,
        blockers=blockers,
        recommendations=recommendations,
        next_actions=next_actions,
    )


def _completeness(product: GeneratedProductData) -> tuple[int, list[str], list[str]]:
    checks: list[tuple[str, int, bool, bool]] = [
        ("product_title", 10, bool(product.product_title.strip()), True),
        ("business_product_title", 4, bool(product.business_product_title.strip()), True),
        ("slug", 3, bool(product.slug.strip()), True),
        ("brand", 8, bool(product.brand), True),
        ("category", 8, bool(product.category), True),
        ("description", 10, len(product.description.strip()) >= 200, True),
        ("short_description", 6, len(product.short_description.strip()) >= 80, False),
        ("highlights", 7, len(product.highlights) >= 5, False),
        ("specifications", 8, len(product.specifications) >= 3, False),
        ("manufacturer", 4, bool(product.manufacturer), False),
        ("generic_name", 3, bool(product.generic_name), False),
        ("identifier", 5, any((product.product_code, product.sku, product.gtin)), False),
        ("pricing.sale_price", 5, product.pricing.sale_price is not None, False),
        ("pricing.currency", 2, bool(product.pricing.currency), False),
        ("images", 5, bool(product.images), False),
        ("seo.meta_title", 4, bool(product.seo.meta_title), False),
        ("seo.meta_description", 4, bool(product.seo.meta_description), False),
        ("benefits", 2, bool(product.benefits), False),
        ("precautions", 2, bool(product.precautions), False),
    ]
    earned = sum(weight for _, weight, passed, _ in checks if passed)
    total = sum(weight for _, weight, _, _ in checks)
    missing_critical = [name for name, _, passed, critical in checks if critical and not passed]
    missing_recommended = [name for name, _, passed, critical in checks if not critical and not passed]
    return round(earned / total * 100), missing_critical, missing_recommended


def _readiness(status, open_conflicts, missing_critical, score: int) -> str:
    if status == JobStatus.PUBLISHED:
        return "PUBLISHED"
    if status == JobStatus.APPROVED:
        return "APPROVED"
    if open_conflicts:
        return "BLOCKED_BY_CONFLICTS"
    if missing_critical or score < 70:
        return "NEEDS_CONTENT"
    return "READY_FOR_APPROVAL"


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "E"


def _strengths(product, evidence, sources, completeness_score: int) -> list[str]:
    strengths = []
    if sources.independent_domains >= 3:
        strengths.append(f"Evidence was collected from {sources.independent_domains} independent domains.")
    if evidence.high_confidence_fields:
        count = evidence.high_confidence_fields
        strengths.append(
            f"{count} factual field{'s have' if count != 1 else ' has'} high-confidence agreement."
        )
    if len(product.highlights) >= 5:
        strengths.append(f"The draft contains {len(product.highlights)} customer-facing highlights.")
    if len(product.description.strip()) >= 200:
        strengths.append("The full description has useful catalog depth.")
    if completeness_score >= 80:
        strengths.append("Most important catalog fields are complete.")
    return strengths[:5]


def _next_actions(blockers, recommendations, readiness: str) -> list[str]:
    actions = []
    for issue in [*blockers, *recommendations]:
        if issue.action not in actions:
            actions.append(issue.action)
        if len(actions) == 5:
            break
    if not actions and readiness == "READY_FOR_APPROVAL":
        actions.append("Perform a final human review, then approve the product.")
    elif not actions and readiness == "APPROVED":
        actions.append("Publish the approved product when the destination catalog is ready.")
    return actions


def _summary(readiness, score, *, open_conflicts, missing_critical, source_count):
    labels = {
        "PUBLISHED": "Product is published",
        "APPROVED": "Product is approved",
        "BLOCKED_BY_CONFLICTS": "Human fact review is required",
        "NEEDS_CONTENT": "Product needs more catalog context",
        "READY_FOR_APPROVAL": "Product is ready for final review",
    }
    parts = [f"Publish readiness is {score}% from {source_count} successful sources."]
    if open_conflicts:
        parts.append(f"Resolve {open_conflicts} open factual conflict{'s' if open_conflicts != 1 else ''} first.")
    if missing_critical:
        parts.append(f"Complete {missing_critical} critical catalog field{'s' if missing_critical != 1 else ''}.")
    if not open_conflicts and not missing_critical:
        parts.append("No critical factual or content blockers remain.")
    return labels[readiness], " ".join(parts)


def friendly_field(field_path: str) -> str:
    return field_path.replace(".", " ").replace("_", " ").strip().title()
