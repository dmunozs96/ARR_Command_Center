"""Unit tests for business-group client consolidation (SPEC-V6).

Pure logic, no DB: parent-map building, transitive resolution to the group root,
global-map robustness, conflict detection, and the client_name_of fallback.
"""

import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backend.core.client_identity import (
    SIN_CUENTA,
    assign_client_names,
    build_parent_map,
    client_name_of,
    flatten_parent_map,
    resolve_to_root,
)


def _row(account, parent=None):
    return {"account_name": account, "parent_account_name": parent}


def test_account_without_parent_is_its_own_client():
    parent_map, conflicts = build_parent_map([_row("Acme")])
    assert parent_map == {}
    assert conflicts == []
    assert resolve_to_root("Acme", parent_map) == "Acme"


def test_single_level_parent():
    parent_map, _ = build_parent_map([_row("Soc A", "Grupo G"), _row("Grupo G")])
    assert resolve_to_root("Soc A", parent_map) == "Grupo G"
    assert resolve_to_root("Grupo G", parent_map) == "Grupo G"


def test_transitive_resolution_to_root():
    # Soc -> Banco Cooperativo -> Grupo Caja Rural  (real shape from the sample)
    rows = [
        _row("Eurocaja Rural", "Banco Cooperativo"),
        _row("Banco Cooperativo", "Grupo Caja Rural"),
        _row("Grupo Caja Rural"),
    ]
    parent_map, _ = build_parent_map(rows)
    assert resolve_to_root("Eurocaja Rural", parent_map) == "Grupo Caja Rural"
    assert resolve_to_root("Banco Cooperativo", parent_map) == "Grupo Caja Rural"
    assert resolve_to_root("Grupo Caja Rural", parent_map) == "Grupo Caja Rural"


def test_global_map_applies_parent_to_all_rows_of_account():
    # Parent informed in only ONE of three rows of "Soc A".
    rows = [_row("Soc A", "Grupo G"), _row("Soc A"), _row("Soc A")]
    conflicts = assign_client_names(rows)
    assert conflicts == []
    assert all(r["client_name"] == "Grupo G" for r in rows)


def test_conflict_detection_picks_deterministic_and_reports():
    rows = [_row("Soc A", "Grupo Z"), _row("Soc A", "Grupo A")]
    parent_map, conflicts = build_parent_map(rows)
    assert parent_map["Soc A"] == "Grupo A"  # lexicographically first
    assert len(conflicts) == 1
    assert conflicts[0]["account_name"] == "Soc A"
    assert conflicts[0]["parents"] == ["Grupo A", "Grupo Z"]


def test_cycle_does_not_hang():
    rows = [_row("A", "B"), _row("B", "A")]
    parent_map, _ = build_parent_map(rows)
    # Must terminate and return a deterministic node, not loop forever.
    assert resolve_to_root("A", parent_map) in {"A", "B"}


def test_self_parent_is_ignored():
    # An account listed as its own parent must not create a cycle or a group.
    parent_map, conflicts = build_parent_map([_row("Acme", "Acme")])
    assert parent_map == {}
    assert conflicts == []


def test_assign_client_names_fills_every_row():
    rows = [_row("Soc A", "Grupo G"), _row("Independiente")]
    assign_client_names(rows)
    assert rows[0]["client_name"] == "Grupo G"
    assert rows[1]["client_name"] == "Independiente"


def test_flatten_parent_map():
    parent_map = {"A": "B", "B": "C"}
    assert flatten_parent_map(parent_map) == {"A": "C", "B": "C"}


def test_client_name_of_prefers_persisted_client_name():
    raw = SimpleNamespace(client_name="Grupo G", account_name="Soc A")
    assert client_name_of(raw) == "Grupo G"


def test_client_name_of_falls_back_to_account_for_legacy_rows():
    raw = SimpleNamespace(client_name=None, account_name="Soc A")
    assert client_name_of(raw) == "Soc A"


def test_client_name_of_handles_missing_everything():
    raw = SimpleNamespace(client_name=None, account_name=None)
    assert client_name_of(raw) == SIN_CUENTA
