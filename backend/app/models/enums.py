from enum import StrEnum


class JobStatus(StrEnum):
    PENDING = "PENDING"
    SCRAPING = "SCRAPING"
    SCRAPED = "SCRAPED"
    ANALYZING = "ANALYZING"
    DRAFT = "DRAFT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"


class SourceStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ConfidenceLevel(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    CONFLICTED = "CONFLICTED"


class ConflictStatus(StrEnum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    IGNORED = "IGNORED"


class GenerationStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

