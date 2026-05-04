"""Add data_hash column to snapshots for dedup daily sync

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "snapshots",
        sa.Column("data_hash", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("snapshots", "data_hash")
