"""Add stage_context column to engines table.

Revision ID: 001_add_stage_context
Revises: None
Create Date: 2026-01-29

This migration:
1. Adds stage_context JSON column (nullable)
2. Makes legacy prompt columns nullable (they were previously required)

The stage_context column holds engine-specific context for prompt composition
using Jinja2 templates and shared framework primers.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_add_stage_context'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add stage_context column
    op.add_column(
        'engines',
        sa.Column('stage_context', sa.JSON(), nullable=True)
    )

    # Make prompt columns nullable (for backward compatibility during transition)
    # This allows engines to use stage_context instead of raw prompts
    with op.batch_alter_table('engines') as batch_op:
        batch_op.alter_column(
            'extraction_prompt',
            existing_type=sa.Text(),
            nullable=True
        )
        batch_op.alter_column(
            'curation_prompt',
            existing_type=sa.Text(),
            nullable=True
        )


def downgrade() -> None:
    # Remove stage_context column
    op.drop_column('engines', 'stage_context')

    # Make prompt columns required again
    # Note: This may fail if there are engines with NULL prompts
    with op.batch_alter_table('engines') as batch_op:
        batch_op.alter_column(
            'extraction_prompt',
            existing_type=sa.Text(),
            nullable=False
        )
        batch_op.alter_column(
            'curation_prompt',
            existing_type=sa.Text(),
            nullable=False
        )
