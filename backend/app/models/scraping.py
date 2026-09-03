from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import JobStatus, SourceStatus


class ScrapingJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scraping_jobs"

    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"), default=JobStatus.PENDING, index=True, nullable=False
    )
    total_urls: Mapped[int] = mapped_column(Integer, nullable=False)
    successful_urls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_urls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_summary: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", back_populates="scraping_jobs")
    sources = relationship("ScrapingSource", back_populates="job", cascade="all, delete-orphan")
    evidence = relationship("ProductSourceEvidence", back_populates="job", cascade="all, delete-orphan")
    conflicts = relationship("ProductConflict", back_populates="job", cascade="all, delete-orphan")
    generated_products = relationship("GeneratedProduct", back_populates="job")


class ScrapingSource(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scraping_sources"
    __table_args__ = (
        UniqueConstraint("job_id", "normalized_url_hash", name="uq_source_job_url_hash"),
    )

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("scraping_jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_url: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_url_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    domain: Mapped[str] = mapped_column(String(253), index=True, nullable=False)
    status: Mapped[SourceStatus] = mapped_column(
        Enum(SourceStatus, name="source_status"),
        default=SourceStatus.PENDING,
        index=True,
        nullable=False,
    )
    http_status: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    extraction_method: Mapped[str | None] = mapped_column(String(100))
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    job = relationship("ScrapingJob", back_populates="sources")
    raw_product = relationship(
        "RawScrapedProduct", back_populates="source", cascade="all, delete-orphan", uselist=False
    )
    normalized_product = relationship(
        "NormalizedProductSource",
        back_populates="source",
        cascade="all, delete-orphan",
        uselist=False,
    )


class RawScrapedProduct(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "raw_scraped_products"

    source_id: Mapped[UUID] = mapped_column(
        ForeignKey("scraping_sources.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    extracted_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    raw_json_ld: Mapped[dict[str, Any] | list[Any]] = mapped_column(JSON, default=dict, nullable=False)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)

    source = relationship("ScrapingSource", back_populates="raw_product")


class NormalizedProductSource(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "normalized_product_sources"

    source_id: Mapped[UUID] = mapped_column(
        ForeignKey("scraping_sources.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    schema_version: Mapped[str] = mapped_column(String(30), default="1.0", nullable=False)
    product_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    source = relationship("ScrapingSource", back_populates="normalized_product")
