"""Add configurable AI provider and model registry.

Revision ID: 20260901_0002
Revises: 20260901_0001
"""

from collections.abc import Sequence
from uuid import UUID

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_0002"
down_revision: str | None = "20260901_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "ai_generation_logs", "model", existing_type=sa.String(100), type_=sa.String(320), nullable=False
    )
    op.create_table(
        "ai_providers",
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("api_key_encrypted", sa.Text()),
        sa.Column("api_key_hint", sa.String(20)),
        sa.Column("enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("custom_headers", sa.JSON(), nullable=False),
        sa.Column("last_test_status", sa.String(20)),
        sa.Column("last_test_message", sa.String(500)),
        sa.Column("last_tested_at", sa.DateTime(timezone=True)),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "ai_models",
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="100", nullable=False),
        sa.Column("supports_json_schema", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("max_tokens", sa.Integer(), server_default="4096", nullable=False),
        sa.Column("temperature", sa.Numeric(3, 2), server_default="0.20", nullable=False),
        sa.Column("input_cost_per_million", sa.Numeric(12, 6)),
        sa.Column("output_cost_per_million", sa.Numeric(12, 6)),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["ai_providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "model_id", name="uq_ai_model_provider_model"),
    )
    op.create_index("ix_ai_models_provider_id", "ai_models", ["provider_id"])
    op.create_index("ix_ai_models_is_default", "ai_models", ["is_default"])

    providers = sa.table(
        "ai_providers",
        sa.column("id", sa.Uuid()), sa.column("slug", sa.String()), sa.column("name", sa.String()),
        sa.column("base_url", sa.String()), sa.column("enabled", sa.Boolean()), sa.column("custom_headers", sa.JSON()),
    )
    op.bulk_insert(providers, [
        {"id": UUID("10000000-0000-0000-0000-000000000001"), "slug": "openrouter", "name": "OpenRouter", "base_url": "https://openrouter.ai/api/v1", "enabled": False, "custom_headers": {"HTTP-Referer": "http://localhost:5173", "X-OpenRouter-Title": "Product Intelligence"}},
        {"id": UUID("10000000-0000-0000-0000-000000000002"), "slug": "agentrouter", "name": "AgentRouter", "base_url": "https://agentrouter.org", "enabled": False, "custom_headers": {}},
        {"id": UUID("10000000-0000-0000-0000-000000000003"), "slug": "nvidia", "name": "NVIDIA API Catalog", "base_url": "https://integrate.api.nvidia.com/v1", "enabled": False, "custom_headers": {}},
    ])


def downgrade() -> None:
    op.drop_table("ai_models")
    op.drop_table("ai_providers")
    op.alter_column(
        "ai_generation_logs", "model", existing_type=sa.String(320), type_=sa.String(100), nullable=False
    )
