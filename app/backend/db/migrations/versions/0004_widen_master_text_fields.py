"""Widen master table descriptive fields

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "product_classifications",
        "product_type",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        "product_classifications",
        "category",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "product_classifications",
        "subcategory",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "product_classifications",
        "business_line",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "consultant_countries",
        "country",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "consultant_countries",
        "country",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "product_classifications",
        "business_line",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "product_classifications",
        "subcategory",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "product_classifications",
        "category",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "product_classifications",
        "product_type",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
