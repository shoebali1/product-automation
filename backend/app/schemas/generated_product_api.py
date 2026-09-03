from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import Field, model_validator

from app.models.enums import ConflictStatus, JobStatus
from app.schemas.common import StrictSchema
from app.schemas.generated_product import GeneratedProductData


class GeneratedProductListItem(StrictSchema):
    id: UUID
    job_id: UUID
    status: JobStatus
    version: int
    published_external_id: str | None = None
    product_title: str
    brand: str | None = None
    category: str | None = None
    sku: str | None = None
    mrp: Decimal | None = None
    sale_price: Decimal | None = None
    currency: str | None = None
    thumbnail_url: str | None = None
    overall_confidence: float = 0.0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class QualityMetric(StrictSchema):
    score: int = Field(ge=0, le=100)
    label: str
    explanation: str


class QualityIssue(StrictSchema):
    code: str
    severity: str
    field_path: str | None = None
    title: str
    detail: str
    action: str


class SourceQualitySummary(StrictSchema):
    successful_sources: int = Field(ge=0)
    independent_domains: int = Field(ge=0)
    domains: list[str] = Field(default_factory=list)
    extraction_methods: list[str] = Field(default_factory=list)


class EvidenceQualitySummary(StrictSchema):
    total_fields: int = Field(ge=0)
    high_confidence_fields: int = Field(ge=0)
    medium_confidence_fields: int = Field(ge=0)
    low_confidence_fields: int = Field(ge=0)
    conflicted_fields: int = Field(ge=0)
    reviewed_conflicts: int = Field(ge=0)


class ProductQualityContext(StrictSchema):
    readiness: str
    grade: str
    headline: str
    summary: str
    metrics: dict[str, QualityMetric]
    sources: SourceQualitySummary
    evidence: EvidenceQualitySummary
    strengths: list[str] = Field(default_factory=list)
    blockers: list[QualityIssue] = Field(default_factory=list)
    recommendations: list[QualityIssue] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)


class GeneratedProductDetail(StrictSchema):
    id: UUID
    job_id: UUID
    status: JobStatus
    version: int
    published_external_id: str | None = None
    product_data: GeneratedProductData
    quality_context: ProductQualityContext


class UpdateGeneratedProductRequest(StrictSchema):
    version: int = Field(ge=1)
    product_data: GeneratedProductData
    override_note: str | None = Field(default=None, min_length=5, max_length=1000)


class ConflictResolutionAction(StrEnum):
    ACCEPT_VALUE = "ACCEPT_VALUE"
    ENTER_MANUALLY = "ENTER_MANUALLY"
    IGNORE = "IGNORE"


class ConflictResolutionRequest(StrictSchema):
    action: ConflictResolutionAction
    value: Any | None = None
    source_id: UUID | None = None
    note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_action_fields(self):
        if self.action in {
            ConflictResolutionAction.ACCEPT_VALUE,
            ConflictResolutionAction.ENTER_MANUALLY,
        } and self.value is None:
            raise ValueError("value is required for the selected conflict action")
        if self.action == ConflictResolutionAction.ENTER_MANUALLY and not self.note:
            raise ValueError("note is required for a manual conflict value")
        return self


class ProductConflictDetail(StrictSchema):
    id: UUID
    field_path: str
    values: list[dict[str, Any]]
    status: ConflictStatus
    requires_review: bool
    resolution: dict[str, Any] | None = None
    resolution_note: str | None = None
