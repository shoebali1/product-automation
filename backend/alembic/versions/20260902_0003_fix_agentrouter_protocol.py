"""Use AgentRouter's Anthropic-compatible endpoint.

Revision ID: 20260902_0003
Revises: 20260901_0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260902_0003"
down_revision: str | None = "20260901_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text("UPDATE ai_providers SET base_url = :base_url WHERE slug = :slug").bindparams(
            base_url="https://agentrouter.org", slug="agentrouter"
        )
    )
    op.execute(
        sa.text(
            "UPDATE ai_models SET supports_json_schema = false "
            "WHERE provider_id = (SELECT id FROM ai_providers WHERE slug = :slug)"
        ).bindparams(slug="agentrouter")
    )


def downgrade() -> None:
    op.execute(
        sa.text("UPDATE ai_providers SET base_url = :base_url WHERE slug = :slug").bindparams(
            base_url="https://co.agentrouter.org/v1", slug="agentrouter"
        )
    )
