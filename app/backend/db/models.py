import uuid
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.backend.db.connection import Base


def _uuid():
    return str(uuid.uuid4())


class ProductClassification(Base):
    __tablename__ = "product_classifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(Text, nullable=False, unique=True)
    product_code = Column(Text)
    product_type = Column(String(100), nullable=False)
    category = Column(String(100))
    subcategory = Column(String(100))
    business_line = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    @property
    def is_saas(self) -> bool:
        return self.product_type.startswith("SaaS")


class ConsultantCountry(Base):
    __tablename__ = "consultant_countries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    consultant_name = Column(Text, nullable=False, unique=True)
    country = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, nullable=False, default=func.now())
    sync_type = Column(String(20), nullable=False, default="manual")
    triggered_by = Column(String(50))
    status = Column(String(20), nullable=False, default="pending")
    sf_records_fetched = Column(Integer)
    sf_records_processed = Column(Integer)
    unclassified_products_count = Column(Integer, default=0)
    alerts_count = Column(Integer, default=0)
    duration_seconds = Column(Float)
    error_message = Column(Text)
    notes = Column(Text)

    raw_line_items = relationship("RawOpportunityLineItem", back_populates="snapshot", cascade="all, delete-orphan")
    arr_line_items = relationship("ARRLineItem", back_populates="snapshot", cascade="all, delete-orphan")
    monthly_summaries = relationship("ARRMonthlySummary", back_populates="snapshot", cascade="all, delete-orphan")
    alerts = relationship("SnapshotAlert", back_populates="snapshot", cascade="all, delete-orphan")
    stripe_mrr = relationship("SnapshotStripeMRR", back_populates="snapshot", cascade="all, delete-orphan")


class RawOpportunityLineItem(Base):
    __tablename__ = "raw_opportunity_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)

    sf_opportunity_id = Column(String(18), nullable=False)
    sf_line_item_id = Column(String(18), nullable=False)

    opportunity_name = Column(Text)
    account_name = Column(Text)
    opportunity_owner = Column(Text)
    opportunity_type = Column(String(100))
    channel_type = Column(String(50))
    opportunity_amount = Column(Numeric(15, 2))
    close_date = Column(Date, nullable=False)
    created_date_sf = Column(DateTime)

    product_name = Column(Text, nullable=False)
    product_code = Column(Text)
    unit_price = Column(Numeric(15, 2), nullable=False)
    quantity = Column(Numeric(10, 4), nullable=False, default=1)
    subscription_start_date = Column(Date)
    subscription_end_date = Column(Date)
    licence_period_months = Column(Integer)
    business_line = Column(Text)

    created_at = Column(DateTime, default=func.now())

    snapshot = relationship("Snapshot", back_populates="raw_line_items")
    arr_line_item = relationship("ARRLineItem", back_populates="raw_line_item", uselist=False)


class ARRLineItem(Base):
    __tablename__ = "arr_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)
    raw_line_item_id = Column(UUID(as_uuid=True), ForeignKey("raw_opportunity_line_items.id"), nullable=False)

    product_type = Column(String(100))
    is_saas = Column(Boolean, nullable=False, default=False)

    effective_start_date = Column(Date, nullable=False)
    effective_end_date = Column(Date, nullable=False)
    used_start_fallback = Column(Boolean, default=False)
    used_end_fallback = Column(Boolean, default=False)

    start_month = Column(Date, nullable=False)
    end_month_normalized = Column(Date, nullable=False)
    service_days = Column(Integer, nullable=False)

    real_price = Column(Numeric(15, 2), nullable=False)
    daily_price = Column(Numeric(20, 8), nullable=False)
    annualized_value = Column(Numeric(15, 4), nullable=False)

    consultant_country = Column(String(100))
    data_quality_flags = Column(JSONB, default=list)

    created_at = Column(DateTime, default=func.now())

    snapshot = relationship("Snapshot", back_populates="arr_line_items")
    raw_line_item = relationship("RawOpportunityLineItem", back_populates="arr_line_item")


class ARRMonthlySummary(Base):
    __tablename__ = "arr_monthly_summary"

    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), primary_key=True)
    month = Column(Date, primary_key=True)
    product_type = Column(String(100), primary_key=True)
    arr_value = Column(Numeric(15, 2), nullable=False)
    line_items_count = Column(Integer, nullable=False, default=0)

    snapshot = relationship("Snapshot", back_populates="monthly_summaries")


class SnapshotStripeMRR(Base):
    __tablename__ = "snapshot_stripe_mrr"

    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), primary_key=True)
    month = Column(Date, primary_key=True)
    mrr = Column(Numeric(15, 2), nullable=False)
    entered_by = Column(Text)
    entered_at = Column(DateTime, default=func.now())

    snapshot = relationship("Snapshot", back_populates="stripe_mrr")

    @property
    def arr_equivalent(self):
        return self.mrr * 12


class SnapshotAlert(Base):
    __tablename__ = "snapshot_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, default="warning")
    sf_opportunity_id = Column(String(18))
    opportunity_name = Column(Text)
    account_name = Column(Text)
    product_name = Column(Text)
    description = Column(Text, nullable=False)
    reviewed = Column(Boolean, default=False)
    review_note = Column(Text)
    reviewed_at = Column(DateTime)
    reviewed_by = Column(Text)
    created_at = Column(DateTime, default=func.now())

    snapshot = relationship("Snapshot", back_populates="alerts")


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id"))
    timestamp = Column(DateTime, default=func.now())
    level = Column(String(10))
    message = Column(Text)
    context = Column(JSONB)
