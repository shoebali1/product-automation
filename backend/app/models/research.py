from typing import Any
from uuid import UUID

from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ConfidenceLevel, ConflictStatus


class ProductSourceEvidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_source_evidence"

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("scraping_jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    field_path: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    value: Mapped[Any] = mapped_column(JSON, nullable=False)
    confidence: Mapped[ConfidenceLevel] = mapped_column(
        Enum(ConfidenceLevel, name="confidence_level"), nullable=False
    )
    confidence_score: Mapped[float] = mapped_column(nullable=False)
    source_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)

    job = relationship("ScrapingJob", back_populates="evidence")


class ProductConflict(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_conflicts"

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("scraping_jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    field_path: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    values: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[ConflictStatus] = mapped_column(
        Enum(ConflictStatus, name="conflict_status"),
        default=ConflictStatus.OPEN,
        index=True,
        nullable=False,
    )
    requires_review: Mapped[bool] = mapped_column(default=True, nullable=False)
    resolution: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    resolution_note: Mapped[str | None] = mapped_column(Text)

    job = relationship("ScrapingJob", back_populates="conflicts")
