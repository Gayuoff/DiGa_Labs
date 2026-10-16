"""Spec behaviour beyond the shared rejection cases (those live in test_cases.py)."""

import copy

import pytest
from pydantic import ValidationError

from app.domain import Spec
from app.domain.examples import STUDENT_SPEC


def spec_dict() -> dict:
    return copy.deepcopy(STUDENT_SPEC)


def test_example_spec_is_valid():
    spec = Spec.model_validate(spec_dict())
    board = spec.view("assignments_board")
    assert board is not None and board.group_by == "status"


def test_round_trips_through_camel_case_wire_format():
    spec = Spec.model_validate(spec_dict())
    wire = spec.model_dump(mode="json")
    assert wire["views"][0]["groupBy"] == "status"
    assert wire["formatVersion"] == 1
    assert Spec.model_validate(wire) == spec


def test_rejects_unknown_keys():
    data = spec_dict()
    data["views"][0]["colour"] = "red"
    with pytest.raises(ValidationError, match="colour"):
        Spec.model_validate(data)


def test_builtin_fields_are_queryable():
    data = spec_dict()
    data["views"][0]["query"]["sort"] = [{"field": "created_at", "dir": "desc"}]
    Spec.model_validate(data)


def test_every_reference_error_is_reported_at_once():
    data = spec_dict()
    data["views"][1]["query"]["type"] = "exam"
    data["pages"][0]["blocks"][2]["view"] = "habits"
    with pytest.raises(ValidationError) as exc:
        Spec.model_validate(data)
    assert "unknown type 'exam'" in str(exc.value)
    assert "unknown view 'habits'" in str(exc.value)
