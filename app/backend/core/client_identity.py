"""Business-group client consolidation (SPEC-V6).

A Salesforce account may belong to a business group via its "Cuenta principal"
(parent account). By-client analytics — churn, new logo, up/down-selling, gagero,
top accounts — must group by the GROUP ROOT, not the individual account, or the
same client moving an opportunity between group companies shows up as churn + new
logo simultaneously, inflating both.

This module resolves each account to its group root using a GLOBAL account->parent
map (so the parent's own parent is known even when it only appears in the parent's
rows) and follows the chain transitively, with a cycle guard.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func

from app.backend.db.models import RawOpportunityLineItem

SIN_CUENTA = "Sin cuenta"


def build_parent_map(rows: list[dict]) -> tuple[dict[str, str], list[dict]]:
    """From raw import rows, build {account -> direct parent} and detect conflicts.

    Uses every row globally: if an account declares a parent in ANY of its rows,
    that parent applies to all of them. A conflict is an account seen with two
    DIFFERENT non-empty parents; the lexicographically-first parent is chosen
    deterministically and the conflict is reported (never silently dropped).

    Returns (parent_map, conflicts) where each conflict is
    {"account_name": str, "parents": sorted list of the distinct parents}.
    """
    seen_parents: dict[str, set[str]] = {}
    for row in rows:
        account = (row.get("account_name") or "").strip()
        parent = (row.get("parent_account_name") or "").strip()
        if not account or not parent or parent == account:
            continue
        seen_parents.setdefault(account, set()).add(parent)

    parent_map: dict[str, str] = {}
    conflicts: list[dict] = []
    for account, parents in seen_parents.items():
        if len(parents) > 1:
            conflicts.append({"account_name": account, "parents": sorted(parents)})
        parent_map[account] = sorted(parents)[0]
    return parent_map, conflicts


def resolve_to_root(account: Optional[str], parent_map: dict[str, str]) -> str:
    """Follow account -> parent -> ... to the group root, guarding against cycles."""
    if not account:
        return SIN_CUENTA
    current = account
    seen: set[str] = set()
    while current in parent_map and current not in seen:
        seen.add(current)
        current = parent_map[current]
    return current


def flatten_parent_map(parent_map: dict[str, str]) -> dict[str, str]:
    """Precompute {account -> group root} for every account in the map."""
    return {account: resolve_to_root(account, parent_map) for account in parent_map}


def assign_client_names(rows: list[dict]) -> list[dict]:
    """Resolve the consolidated client identity (group root) for each row in place.

    Builds a global account->parent map from all rows, flattens it to group roots
    (following chains transitively, with a cycle guard), and writes row["client_name"].
    Returns the list of parent conflicts to surface as quality alerts.
    """
    parent_map, conflicts = build_parent_map(rows)
    account_to_root = flatten_parent_map(parent_map)
    for row in rows:
        account = row.get("account_name")
        # Accounts that never appear as a child resolve to themselves.
        row["client_name"] = account_to_root.get(account) or resolve_to_root(account, parent_map)
    return conflicts


# --- Query-layer helpers (used by the analytics endpoints) -------------------

def client_name_of(raw: RawOpportunityLineItem) -> str:
    """Consolidated client identity of a persisted raw row, with a legacy fallback.

    Snapshots imported before V6 have client_name = NULL; fall back to account_name
    so their behaviour is unchanged (each account is its own client).
    """
    return (getattr(raw, "client_name", None) or raw.account_name or SIN_CUENTA)


def client_name_expr():
    """SQL expression COALESCE(client_name, account_name) for WHERE/filter clauses."""
    return func.coalesce(
        RawOpportunityLineItem.client_name, RawOpportunityLineItem.account_name
    )
