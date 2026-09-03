from decimal import Decimal
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import GenerationStatus


class AIGenerationLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_generation_logs"

    job_id: Mapped[UUID] = mapped_column(ForeignKey("scraping_jobs.id"), index=True, nullable=False)
    product_id: Mapped[UUID | None] = mapped_column(ForeignKey("generated_products.id"), index=True)
    model: Mapped[str] = mapped_column(String(320), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[GenerationStatus] = mapped_column(
        Enum(GenerationStatus, name="generation_status"), nullable=False
    )
    error: Mapped[str | None] = mapped_column(Text)
