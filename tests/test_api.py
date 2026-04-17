"""
API endpoint tests for Phase B.

Uses FastAPI TestClient with a SQLite in-memory database so tests
run without Docker/PostgreSQL. The get_db dependency is overridden.
"""

import sys
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backend.db.connection import Base, get_db
from app.backend.db.models import (
    ARRLineItem,
    ARRMonthlySummary,
    ConsultantCountry,
    ProductClassification,
    RawOpportunityLineItem,
    Snapshot,
    SnapshotAlert,
)
from app.backend.main import app

# ---------------------------------------------------------------------------
# Test database setup (SQLite in-memory)
# ---------------------------------------------------------------------------

SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable JSON support for SQLite (data_quality_flags column)
import json
from sqlalchemy import TypeDecorator, Text as SAText


class JSONBCompat(TypeDecorator):
    """Stores JSONB as JSON text in SQLite."""
    impl = SAText
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return "[]"
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return json.loads(value)


# Patch JSONB columns to use JSONBCompat in tests
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import event as sa_event


@sa_event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test and drop after."""
    # SQLite doesn't support JSONB natively — patch columns in models
    for table in Base.metadata.tables.values():
        for col in table.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSONBCompat()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Helpers to seed test data
# ---------------------------------------------------------------------------

def _make_snapshot(db, status="completed", sync_type="excel_import"):
    snap = Snapshot(
        id=uuid.uuid4(),
        created_at=datetime(2026, 4, 17),
        sync_type=sync_type,
        status=status,
        sf_records_fetched=2,
        sf_records_processed=2,
        alerts_count=1,
        unclassified_products_count=0,
    )
    db.add(snap)
    db.flush()
    return snap


def _make_raw(db, snap_id, sf_opp_id="OPP001", sf_line_id="LI001", product="SaaS LMS"):
    row_id = uuid.uuid4()
    raw = RawOpportunityLineItem(
        id=row_id,
        snapshot_id=snap_id,
        sf_opportunity_id=sf_opp_id,
        sf_line_item_id=sf_line_id,
        opportunity_name="Test Opp",
        account_name="Acme Corp",
        opportunity_owner="Miguel V.",
        opportunity_type="nuevo_negocio",
        channel_type="KAM",
        close_date=date(2025, 1, 15),
        product_name=product,
        unit_price=Decimal("10000.00"),
        quantity=Decimal("1"),
        subscription_start_date=date(2025, 1, 1),
        subscription_end_date=date(2025, 12, 31),
    )
    db.add(raw)
    db.flush()
    return raw


def _make_arr(db, snap_id, raw_id, product_type="SaaS LMS", arr=Decimal("10000")):
    arr_item = ARRLineItem(
        id=uuid.uuid4(),
        snapshot_id=snap_id,
        raw_line_item_id=raw_id,
        product_type=product_type,
        is_saas=True,
        effective_start_date=date(2025, 1, 1),
        effective_end_date=date(2025, 12, 31),
        used_start_fallback=False,
        used_end_fallback=False,
        start_month=date(2025, 1, 1),
        end_month_normalized=date(2025, 12, 31),
        service_days=364,
        real_price=Decimal("10000"),
        daily_price=Decimal("27.47"),
        annualized_value=arr,
        consultant_country="Spain",
        data_quality_flags=[],
    )
    db.add(arr_item)
    db.flush()
    return arr_item


def _make_summary(db, snap_id, month, product_type="SaaS LMS", arr=Decimal("10000")):
    row = ARRMonthlySummary(
        snapshot_id=snap_id,
        month=month,
        product_type=product_type,
        arr_value=arr,
        line_items_count=1,
    )
    db.add(row)
    db.flush()
    return row


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

def test_list_snapshots_empty(client):
    r = client.get("/api/snapshots")
    assert r.status_code == 200
    assert r.json() == []


def test_list_snapshots_returns_data(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    db.commit()
    db.close()

    r = client.get("/api/snapshots")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["status"] == "completed"


def test_get_snapshot_not_found(client):
    r = client.get(f"/api/snapshots/{uuid.uuid4()}")
    assert r.status_code == 404


def test_get_snapshot_found(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    db.commit()
    snap_id = snap.id
    db.close()

    r = client.get(f"/api/snapshots/{snap_id}")
    assert r.status_code == 200
    assert r.json()["id"] == str(snap_id)


# ---------------------------------------------------------------------------
# ARR Summary
# ---------------------------------------------------------------------------

def test_arr_summary_no_snapshot(client):
    r = client.get("/api/arr/summary")
    assert r.status_code == 404


def test_arr_summary_returns_months(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    _make_summary(db, snap.id, date(2025, 1, 1), "SaaS LMS", Decimal("12000"))
    _make_summary(db, snap.id, date(2025, 2, 1), "SaaS LMS", Decimal("13000"))
    db.commit()
    db.close()

    r = client.get("/api/arr/summary")
    assert r.status_code == 200
    data = r.json()
    assert len(data["months"]) == 2
    assert Decimal(data["months"][0]["total_arr"]) == Decimal("12000")
    assert Decimal(data["months"][1]["mom_change"]) == Decimal("1000")


def test_arr_summary_filter_by_product_type(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    _make_summary(db, snap.id, date(2025, 1, 1), "SaaS LMS", Decimal("12000"))
    _make_summary(db, snap.id, date(2025, 1, 1), "SaaS Skills", Decimal("8000"))
    db.commit()
    db.close()

    r = client.get("/api/arr/summary?product_type=SaaS+LMS")
    assert r.status_code == 200
    data = r.json()
    assert len(data["months"]) == 1
    assert Decimal(data["months"][0]["total_arr"]) == Decimal("12000")


# ---------------------------------------------------------------------------
# ARR Line Items
# ---------------------------------------------------------------------------

def test_arr_line_items_empty(client):
    r = client.get("/api/arr/line-items")
    assert r.status_code == 404


def test_arr_line_items_pagination(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    for i in range(5):
        raw = _make_raw(db, snap.id, sf_opp_id=f"OPP{i:03d}", sf_line_id=f"LI{i:03d}")
        _make_arr(db, snap.id, raw.id)
    db.commit()
    db.close()

    r = client.get("/api/arr/line-items?page=1&page_size=3")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 5
    assert len(data["items"]) == 3
    assert data["page"] == 1


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

def test_alerts_empty(client):
    r = client.get("/api/alerts")
    assert r.status_code == 200
    assert r.json() == []


def test_alerts_list_and_filter(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    alert = SnapshotAlert(
        id=uuid.uuid4(),
        snapshot_id=snap.id,
        alert_type="UNCLASSIFIED_PRODUCT",
        severity="error",
        description="Producto no clasificado",
        reviewed=False,
    )
    db.add(alert)
    db.commit()
    alert_id = alert.id
    db.close()

    r = client.get("/api/alerts?reviewed=false")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r2 = client.get("/api/alerts?reviewed=true")
    assert r.status_code == 200
    assert r2.json() == []


def test_patch_alert(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    alert = SnapshotAlert(
        id=uuid.uuid4(),
        snapshot_id=snap.id,
        alert_type="UNCLASSIFIED_PRODUCT",
        severity="error",
        description="Producto no clasificado",
        reviewed=False,
    )
    db.add(alert)
    db.commit()
    alert_id = alert.id
    db.close()

    r = client.patch(
        f"/api/alerts/{alert_id}",
        json={"reviewed": True, "review_note": "Ok, producto nuevo", "reviewed_by": "dmunoz"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["reviewed"] is True
    assert data["review_note"] == "Ok, producto nuevo"
    assert data["reviewed_by"] == "dmunoz"
    assert data["reviewed_at"] is not None


# ---------------------------------------------------------------------------
# Config: Products
# ---------------------------------------------------------------------------

def test_list_products_empty(client):
    r = client.get("/api/config/products")
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_list_product(client):
    payload = {
        "product_name": "Usuarios LMS",
        "product_type": "SaaS LMS",
        "business_line": "isEazy LMS",
    }
    r = client.post("/api/config/products", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["product_name"] == "Usuarios LMS"
    assert data["is_saas"] is True

    r2 = client.get("/api/config/products")
    assert len(r2.json()) == 1


def test_create_product_duplicate(client):
    payload = {"product_name": "Usuarios LMS", "product_type": "SaaS LMS"}
    client.post("/api/config/products", json=payload)
    r = client.post("/api/config/products", json=payload)
    assert r.status_code == 409


def test_update_product(client):
    r = client.post("/api/config/products", json={"product_name": "Old", "product_type": "SaaS LMS"})
    product_id = r.json()["id"]

    r2 = client.put(f"/api/config/products/{product_id}", json={"product_type": "Implantación"})
    assert r2.status_code == 200
    assert r2.json()["product_type"] == "Implantación"
    assert r2.json()["is_saas"] is False


# ---------------------------------------------------------------------------
# Config: Consultants
# ---------------------------------------------------------------------------

def test_list_consultants_empty(client):
    r = client.get("/api/config/consultants")
    assert r.status_code == 200
    assert r.json() == []


def test_update_consultant_not_found(client):
    r = client.put("/api/config/consultants/999", json={"country": "France"})
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Stripe MRR
# ---------------------------------------------------------------------------

def test_stripe_mrr_empty(client):
    r = client.get("/api/stripe-mrr")
    assert r.status_code == 200
    assert r.json() == []


def test_stripe_mrr_upsert(client):
    db = TestingSessionLocal()
    snap = _make_snapshot(db)
    db.commit()
    snap_id = snap.id
    db.close()

    payload = {
        "snapshot_id": str(snap_id),
        "month": "2026-01-01",
        "mrr": "9200.00",
        "entered_by": "dmunoz",
    }
    r = client.put("/api/stripe-mrr", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["mrr"] == "9200.00"
    assert data["arr_equivalent"] == "110400.00"

    # Upsert again — should update
    payload["mrr"] = "9500.00"
    r2 = client.put("/api/stripe-mrr", json=payload)
    assert r2.status_code == 200
    assert r2.json()["mrr"] == "9500.00"

    # GET returns the entry
    r3 = client.get(f"/api/stripe-mrr?snapshot_id={snap_id}")
    assert len(r3.json()) == 1
    assert r3.json()[0]["mrr"] == "9500.00"
