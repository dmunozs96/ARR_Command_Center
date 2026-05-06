"""Add excluded_from_arr to arr_line_items and arr_line_item_id to snapshot_alerts

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "arr_line_items",
        sa.Column("excluded_from_arr", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "snapshot_alerts",
        sa.Column("arr_line_item_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_snapshot_alerts_arr_line_item",
        "snapshot_alerts",
        "arr_line_items",
        ["arr_line_item_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_snapshot_alerts_arr_line_item", "snapshot_alerts", type_="foreignkey")
    op.drop_column("snapshot_alerts", "arr_line_item_id")
    op.drop_column("arr_line_items", "excluded_from_arr")
