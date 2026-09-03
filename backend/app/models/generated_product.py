from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import JobStatus


class GeneratedProduct(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_products"
    __table_args__ = (UniqueConstraint("job_id", "version", name="uq_product_job_version"),)

    job_id: Mapped[UUID] = mapped_column(ForeignKey("scraping_jobs.id"), index=True, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status", create_type=False),
        default=JobStatus.DRAFT,
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    product_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    overall_confidence: Mapped[float] = mapped_column(default=0.0, nullable=False)
    warnings: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    published_external_id: Mapped[str | None] = mapped_column(String(255))

    job = relationship("ScrapingJob", back_populates="generated_products")
    highlights = relationship(
        "GeneratedProductHighlight", back_populates="product", cascade="all, delete-orphan"
    )
    images = relationship("GeneratedProductImage", back_populates="product", cascade="all, delete-orphan")
    variations = relationship(
        "GeneratedProductVariation", back_populates="product", cascade="all, delete-orphan"
    )
    packs = relationship("GeneratedProductPack", back_populates="product", cascade="all, delete-orphan")


class GeneratedProductHighlight(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_product_highlights"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("generated_products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product = relationship("GeneratedProduct", back_populates="highlights")


class GeneratedProductImage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_product_images"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("generated_products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    alt: Mapped[str | None] = mapped_column(Text)
    primary_candidate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reference_only: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product = relationship("GeneratedProduct", back_populates="images")


class GeneratedProductVariation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_product_variations"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("generated_products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(255))
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    mrp: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    attributes: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    product = relationship("GeneratedProduct", back_populates="variations")


class GeneratedProductPack(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_product_packs"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("generated_products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    quantity: Mapped[int | None] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(255))
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    mrp: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    pack_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    product = relationship("GeneratedProduct", back_populates="packs")
