"""
Alert checker: validates raw line items before calculation and
post-processes ARRSnapshot to surface data quality issues.
"""

from typing import List

from app.backend.core.arr_calculator import ARRSnapshot, RawLineItem


def check_raw_items(raw_items: List[RawLineItem], known_products: set, known_consultants: set) -> List[dict]:
    """
    Pre-calculation checks. Returns a list of alert dicts for items that
    have obvious data problems before the calculator runs.
    """
    alerts = []
    for item in raw_items:
        if item.product_name not in known_products:
            alerts.append({
                "alert_type": "UNCLASSIFIED_PRODUCT",
                "severity": "error",
                "sf_opportunity_id": item.sf_opportunity_id,
                "opportunity_name": item.opportunity_name,
                "account_name": item.account_name,
                "product_name": item.product_name,
                "description": f"Producto '{item.product_name}' no está en la tabla maestra de clasificación.",
            })
        if item.opportunity_owner not in known_consultants:
            alerts.append({
                "alert_type": "MISSING_COUNTRY",
                "severity": "info",
                "sf_opportunity_id": item.sf_opportunity_id,
                "opportunity_name": item.opportunity_name,
                "account_name": item.account_name,
                "product_name": item.product_name,
                "description": f"Consultor '{item.opportunity_owner}' no tiene país asignado.",
            })
    return alerts


def summarize_snapshot_quality(snapshot: ARRSnapshot) -> dict:
    """Return a brief quality summary for logging."""
    total = len(snapshot.line_items)
    excluded = sum(1 for i in snapshot.line_items if i.exclude_from_arr)
    unclassified = sum(1 for i in snapshot.line_items if "UNCLASSIFIED_PRODUCT" in i.data_quality_flags)
    missing_start = sum(1 for i in snapshot.line_items if "MISSING_START_DATE" in i.data_quality_flags)
    missing_end = sum(1 for i in snapshot.line_items if "MISSING_END_DATE" in i.data_quality_flags)
    duration_high = sum(1 for i in snapshot.line_items if "DURATION_ANOMALY_HIGH" in i.data_quality_flags)

    return {
        "total_line_items": total,
        "excluded_from_arr": excluded,
        "unclassified_products": unclassified,
        "missing_start_date": missing_start,
        "missing_end_date": missing_end,
        "duration_anomaly_high": duration_high,
        "total_alerts": len(snapshot.alerts),
    }
