"""Add grids, grid_versions, and wildcard_suggestions tables.

Revision ID: 002_add_grids
Revises: 001_add_stage_context
Create Date: 2026-01-30
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "002_add_grids"
down_revision = "001_add_stage_context"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "grids",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("grid_key", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("grid_name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("track", sa.String(50), nullable=False),
        sa.Column("conditions", sa.JSON(), nullable=False),
        sa.Column("axes", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "grid_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("grid_id", sa.String(36), sa.ForeignKey("grids.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("full_snapshot", sa.JSON(), nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "wildcard_suggestions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("grid_id", sa.String(36), sa.ForeignKey("grids.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("dimension_type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("rationale", sa.Text(), nullable=False, server_default=""),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("scope", sa.String(50), nullable=False, server_default="project_specific"),
        sa.Column("source_project", sa.String(255), nullable=True),
        sa.Column("source_session_id", sa.String(255), nullable=True),
        sa.Column("evidence_questions", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="suggested"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("wildcard_suggestions")
    op.drop_table("grid_versions")
    op.drop_table("grids")
