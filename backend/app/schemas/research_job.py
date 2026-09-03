from uuid import UUID

from pydantic import Field, HttpUrl

from app.models.enums import JobStatus, SourceStatus
from app.schemas.common import StrictSchema


class CreateResearchJobRequest(StrictSchema):
    urls: list[HttpUrl] = Field(min_length=1, max_length=10)
    force_refresh: bool = False


class CreateResearchJobResponse(StrictSchema):
    job_id: UUID
    submitted_urls: int
    unique_urls: int
    status: JobStatus = JobStatus.PENDING


class ResearchSourceSummary(StrictSchema):
    id: UUID
    url: str
    domain: str
    status: SourceStatus
    http_status: int | None = None
    extraction_method: str | None = None
    attempts: int
    error: str | None = None


class ResearchJobDetail(StrictSchema):
    id: UUID
    status: JobStatus
    total_urls: int
    successful_urls: int
    failed_urls: int
    error_summary: str | None = None
    latest_product_id: UUID | None = None
    sources: list[ResearchSourceSummary] = Field(default_factory=list)
