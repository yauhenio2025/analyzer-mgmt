"""Add engine_profile column to engines table.

Revision ID: 003_add_engine_profile
Revises: 002_add_grids
Create Date: 2026-01-30
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "003_add_engine_profile"
down_revision = "002_add_grids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "engines",
        sa.Column("engine_profile", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("engines", "engine_profile")
