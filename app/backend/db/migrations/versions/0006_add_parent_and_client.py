"""Add parent_account_name and client_name to raw_opportunity_line_items

Introduces business-group consolidation (SPEC-V6). client_name holds the
group-root client identity resolved at import time; parent_account_name keeps
the raw "Cuenta principal" value for audit. Both nullable so existing rows are
untouched; callers COALESCE(client_name, account_name) for legacy snapshots.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "raw_opportunity_line_items",
        sa.Column("parent_account_name", sa.Text(), nullable=True),
    )
    op.add_column(
        "raw_opportunity_line_items",
        sa.Column("client_name", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("raw_opportunity_line_items", "client_name")
    op.drop_column("raw_opportunity_line_items", "parent_account_name")
