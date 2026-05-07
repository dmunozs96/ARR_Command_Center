"""Widen calculated ARR descriptive fields

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "arr_line_items",
        "product_type",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "arr_line_items",
        "consultant_country",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "arr_monthly_summary",
        "product_type",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "arr_monthly_summary",
        "product_type",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "arr_line_items",
        "consultant_country",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "arr_line_items",
        "product_type",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
