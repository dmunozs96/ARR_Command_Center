"""Initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # product_classifications
    op.create_table(
        "product_classifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("product_code", sa.Text()),
        sa.Column("product_type", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100)),
        sa.Column("subcategory", sa.String(100)),
        sa.Column("business_line", sa.String(100)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_name"),
    )

    # consultant_countries
    op.create_table(
        "consultant_countries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("consultant_name", sa.Text(), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("consultant_name"),
    )

    # snapshots
    op.create_table(
        "snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("sync_type", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("triggered_by", sa.String(50)),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("sf_records_fetched", sa.Integer()),
        sa.Column("sf_records_processed", sa.Integer()),
        sa.Column("unclassified_products_count", sa.Integer(), server_default="0"),
        sa.Column("alerts_count", sa.Integer(), server_default="0"),
        sa.Column("duration_seconds", sa.Float()),
        sa.Column("error_message", sa.Text()),
        sa.Column("notes", sa.Text()),
        sa.PrimaryKeyConstraint("id"),
    )

    # raw_opportunity_line_items
    op.create_table(
        "raw_opportunity_line_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sf_opportunity_id", sa.String(18), nullable=False),
        sa.Column("sf_line_item_id", sa.String(18), nullable=False),
        sa.Column("opportunity_name", sa.Text()),
        sa.Column("account_name", sa.Text()),
        sa.Column("opportunity_owner", sa.Text()),
        sa.Column("opportunity_type", sa.String(100)),
        sa.Column("channel_type", sa.String(50)),
        sa.Column("opportunity_amount", sa.Numeric(15, 2)),
        sa.Column("close_date", sa.Date(), nullable=False),
        sa.Column("created_date_sf", sa.DateTime()),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("product_code", sa.Text()),
        sa.Column("unit_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 4), nullable=False, server_default="1"),
        sa.Column("subscription_start_date", sa.Date()),
        sa.Column("subscription_end_date", sa.Date()),
        sa.Column("licence_period_months", sa.Integer()),
        sa.Column("business_line", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_raw_oli_snapshot", "raw_opportunity_line_items", ["snapshot_id"])
    op.create_index("idx_raw_oli_sf_ids", "raw_opportunity_line_items", ["sf_opportunity_id", "sf_line_item_id"])

    # arr_line_items
    op.create_table(
        "arr_line_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("raw_line_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_type", sa.String(100)),
        sa.Column("is_saas", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("effective_start_date", sa.Date(), nullable=False),
        sa.Column("effective_end_date", sa.Date(), nullable=False),
        sa.Column("used_start_fallback", sa.Boolean(), server_default="false"),
        sa.Column("used_end_fallback", sa.Boolean(), server_default="false"),
        sa.Column("start_month", sa.Date(), nullable=False),
        sa.Column("end_month_normalized", sa.Date(), nullable=False),
        sa.Column("service_days", sa.Integer(), nullable=False),
        sa.Column("real_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("daily_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("annualized_value", sa.Numeric(15, 4), nullable=False),
        sa.Column("consultant_country", sa.String(100)),
        sa.Column("data_quality_flags", postgresql.JSONB(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["raw_line_item_id"], ["raw_opportunity_line_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_arr_li_snapshot", "arr_line_items", ["snapshot_id"])
    op.create_index("idx_arr_li_month", "arr_line_items", ["start_month", "end_month_normalized"])
    op.create_index("idx_arr_li_product_type", "arr_line_items", ["product_type", "is_saas"])
    op.create_index("idx_arr_li_owner", "arr_line_items", ["snapshot_id", "consultant_country"])

    # arr_monthly_summary
    op.create_table(
        "arr_monthly_summary",
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("product_type", sa.String(100), nullable=False),
        sa.Column("arr_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("line_items_count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("snapshot_id", "month", "product_type"),
    )

    # snapshot_stripe_mrr
    op.create_table(
        "snapshot_stripe_mrr",
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("mrr", sa.Numeric(15, 2), nullable=False),
        sa.Column("entered_by", sa.Text()),
        sa.Column("entered_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("snapshot_id", "month"),
    )

    # snapshot_alerts
    op.create_table(
        "snapshot_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="warning"),
        sa.Column("sf_opportunity_id", sa.String(18)),
        sa.Column("opportunity_name", sa.Text()),
        sa.Column("account_name", sa.Text()),
        sa.Column("product_name", sa.Text()),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reviewed", sa.Boolean(), server_default="false"),
        sa.Column("review_note", sa.Text()),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.Column("reviewed_by", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_alerts_snapshot", "snapshot_alerts", ["snapshot_id", "reviewed"])

    # sync_logs
    op.create_table(
        "sync_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True)),
        sa.Column("timestamp", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("level", sa.String(10)),
        sa.Column("message", sa.Text()),
        sa.Column("context", postgresql.JSONB()),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sync_logs")
    op.drop_index("idx_alerts_snapshot", "snapshot_alerts")
    op.drop_table("snapshot_alerts")
    op.drop_table("snapshot_stripe_mrr")
    op.drop_table("arr_monthly_summary")
    op.drop_index("idx_arr_li_owner", "arr_line_items")
    op.drop_index("idx_arr_li_product_type", "arr_line_items")
    op.drop_index("idx_arr_li_month", "arr_line_items")
    op.drop_index("idx_arr_li_snapshot", "arr_line_items")
    op.drop_table("arr_line_items")
    op.drop_index("idx_raw_oli_sf_ids", "raw_opportunity_line_items")
    op.drop_index("idx_raw_oli_snapshot", "raw_opportunity_line_items")
    op.drop_table("raw_opportunity_line_items")
    op.drop_table("snapshots")
    op.drop_table("consultant_countries")
    op.drop_table("product_classifications")
