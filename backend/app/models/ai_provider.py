from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AIProvider(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_providers"

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text)
    api_key_hint: Mapped[str | None] = mapped_column(String(20))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    custom_headers: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    last_test_status: Mapped[str | None] = mapped_column(String(20))
    last_test_message: Mapped[str | None] = mapped_column(String(500))
    last_tested_at: Mapped[datetime | None]

    models = relationship(
        "AIModel", back_populates="provider", cascade="all, delete-orphan", order_by="AIModel.priority"
    )


class AIModel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_models"
    __table_args__ = (UniqueConstraint("provider_id", "model_id", name="uq_ai_model_provider_model"),)

    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("ai_providers.id", ondelete="CASCADE"), index=True, nullable=False
    )
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    supports_json_schema: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096, nullable=False)
    temperature: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0.20"), nullable=False)
    input_cost_per_million: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    output_cost_per_million: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))

    provider = relationship("AIProvider", back_populates="models")
