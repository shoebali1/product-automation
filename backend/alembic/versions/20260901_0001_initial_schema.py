"""Create the initial product research schema.

Revision ID: 20260901_0001
Revises:
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

job_status = sa.Enum(
    "PENDING", "SCRAPING", "SCRAPED", "ANALYZING", "DRAFT", "REVIEW_REQUIRED",
    "APPROVED", "PUBLISHED", "FAILED", name="job_status"
)
source_status = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="source_status")
confidence_level = sa.Enum("HIGH", "MEDIUM", "LOW", "CONFLICTED", name="confidence_level")
conflict_status = sa.Enum("OPEN", "RESOLVED", "IGNORED", name="conflict_status")
generation_status = sa.Enum("PENDING", "COMPLETED", "FAILED", name="generation_status")


def common_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(200)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        *common_columns(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "scraping_jobs",
        sa.Column("user_id", sa.Uuid()),
        sa.Column("status", job_status, server_default="PENDING", nullable=False),
        sa.Column("total_urls", sa.Integer(), nullable=False),
        sa.Column("successful_urls", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed_urls", sa.Integer(), server_default="0", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("error_summary", sa.Text()),
        *common_columns(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_scraping_jobs_user_id", "scraping_jobs", ["user_id"])
    op.create_index("ix_scraping_jobs_status", "scraping_jobs", ["status"])

    op.create_table(
        "scraping_sources",
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("normalized_url", sa.Text(), nullable=False),
        sa.Column("normalized_url_hash", sa.String(64), nullable=False),
        sa.Column("domain", sa.String(253), nullable=False),
        sa.Column("status", source_status, server_default="PENDING", nullable=False),
        sa.Column("http_status", sa.Integer()),
        sa.Column("error", sa.Text()),
        sa.Column("extraction_method", sa.String(100)),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        *common_columns(),
        sa.ForeignKeyConstraint(["job_id"], ["scraping_jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", "normalized_url_hash", name="uq_source_job_url_hash"),
    )
    op.create_index("ix_scraping_sources_job_id", "scraping_sources", ["job_id"])
    op.create_index("ix_scraping_sources_domain", "scraping_sources", ["domain"])
    op.create_index("ix_scraping_sources_status", "scraping_sources", ["status"])

    op.create_table(
        "raw_scraped_products",
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("extracted_data", sa.JSON(), nullable=False),
        sa.Column("raw_json_ld", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(64)),
        *common_columns(),
        sa.ForeignKeyConstraint(["source_id"], ["scraping_sources.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("source_id"),
    )
    op.create_index("ix_raw_scraped_products_content_hash", "raw_scraped_products", ["content_hash"])

    op.create_table(
        "normalized_product_sources",
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("schema_version", sa.String(30), server_default="1.0", nullable=False),
        sa.Column("product_data", sa.JSON(), nullable=False),
        *common_columns(),
        sa.ForeignKeyConstraint(["source_id"], ["scraping_sources.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("source_id"),
    )

    op.create_table(
        "product_source_evidence",
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("field_path", sa.String(500), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("confidence", confidence_level, nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("source_ids", sa.JSON(), nullable=False),
        sa.Column("rationale", sa.Text()),
        *common_columns(),
        sa.ForeignKeyConstraint(["job_id"], ["scraping_jobs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_source_evidence_job_id", "product_source_evidence", ["job_id"])
    op.create_index("ix_product_source_evidence_field_path", "product_source_evidence", ["field_path"])

    op.create_table(
        "product_conflicts",
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("field_path", sa.String(500), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("status", conflict_status, server_default="OPEN", nullable=False),
        sa.Column("requires_review", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("resolution", sa.JSON()),
        sa.Column("resolution_note", sa.Text()),
        *common_columns(),
        sa.ForeignKeyConstraint(["job_id"], ["scraping_jobs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_conflicts_job_id", "product_conflicts", ["job_id"])
    op.create_index("ix_product_conflicts_field_path", "product_conflicts", ["field_path"])
    op.create_index("ix_product_conflicts_status", "product_conflicts", ["status"])

    op.create_table(
        "generated_products",
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("status", job_status, server_default="DRAFT", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("product_data", sa.JSON(), nullable=False),
        sa.Column("overall_confidence", sa.Float(), server_default="0", nullable=False),
        sa.Column("warnings", sa.JSON(), nullable=False),
        sa.Column("published_external_id", sa.String(255)),
        *common_columns(),
        sa.ForeignKeyConstraint(["job_id"], ["scraping_jobs.id"]),
        sa.UniqueConstraint("job_id", "version", name="uq_product_job_version"),
    )
    op.create_index("ix_generated_products_job_id", "generated_products", ["job_id"])
    op.create_index("ix_generated_products_status", "generated_products", ["status"])

    op.create_table(
        "generated_product_highlights",
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        *common_columns(),
        sa.ForeignKeyConstraint(["product_id"], ["generated_products.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_generated_product_highlights_product_id", "generated_product_highlights", ["product_id"])

    op.create_table(
        "generated_product_images",
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text()),
        sa.Column("alt", sa.Text()),
        sa.Column("primary_candidate", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("reference_only", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        *common_columns(),
        sa.ForeignKeyConstraint(["product_id"], ["generated_products.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_generated_product_images_product_id", "generated_product_images", ["product_id"])

    for table_name, extra_columns in (
        ("generated_product_variations", [
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("sku", sa.String(255)),
            sa.Column("attributes", sa.JSON(), nullable=False),
        ]),
        ("generated_product_packs", [
            sa.Column("quantity", sa.Integer()),
            sa.Column("label", sa.String(255), nullable=False),
            sa.Column("sku", sa.String(255)),
            sa.Column("pack_metadata", sa.JSON(), nullable=False),
        ]),
    ):
        op.create_table(
            table_name,
            sa.Column("product_id", sa.Uuid(), nullable=False),
            *extra_columns,
            sa.Column("sale_price", sa.Numeric(12, 2)),
            sa.Column("mrp", sa.Numeric(12, 2)),
            sa.Column("currency", sa.String(3)),
            *common_columns(),
            sa.ForeignKeyConstraint(["product_id"], ["generated_products.id"], ondelete="CASCADE"),
        )
        op.create_index(f"ix_{table_name}_product_id", table_name, ["product_id"])

    op.create_table(
        "ai_generation_logs",
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid()),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("prompt_version", sa.String(100), nullable=False),
        sa.Column("input_tokens", sa.Integer()),
        sa.Column("output_tokens", sa.Integer()),
        sa.Column("estimated_cost", sa.Numeric(12, 6)),
        sa.Column("processing_time_ms", sa.Integer()),
        sa.Column("status", generation_status, nullable=False),
        sa.Column("error", sa.Text()),
        *common_columns(),
        sa.ForeignKeyConstraint(["job_id"], ["scraping_jobs.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["generated_products.id"]),
    )
    op.create_index("ix_ai_generation_logs_job_id", "ai_generation_logs", ["job_id"])
    op.create_index("ix_ai_generation_logs_product_id", "ai_generation_logs", ["product_id"])


def downgrade() -> None:
    for table_name in (
        "ai_generation_logs",
        "generated_product_packs",
        "generated_product_variations",
        "generated_product_images",
        "generated_product_highlights",
        "generated_products",
        "product_conflicts",
        "product_source_evidence",
        "normalized_product_sources",
        "raw_scraped_products",
        "scraping_sources",
        "scraping_jobs",
        "users",
    ):
        op.drop_table(table_name)
