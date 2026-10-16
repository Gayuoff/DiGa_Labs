import copy

import pytest
from pydantic import ValidationError

from app.domain import Spec
from app.domain.examples import STUDENT_SPEC


def spec_dict() -> dict:
    return copy.deepcopy(STUDENT_SPEC)


def assert_rejected(data: dict, *fragments: str) -> None:
    with pytest.raises(ValidationError) as exc:
        Spec.model_validate(data)
    for fragment in fragments:
        assert fragment in str(exc.value)


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
    assert_rejected(data, "colour")


def test_board_needs_group_by():
    data = spec_dict()
    del data["views"][0]["groupBy"]
    assert_rejected(data, "board view needs groupBy")


def test_group_by_must_be_a_select_field():
    data = spec_dict()
    data["views"][0]["groupBy"] = "due"
    assert_rejected(data, "groupBy 'due' must be a select field")


def test_calendar_date_field_must_be_a_date():
    data = spec_dict()
    data["views"][1]["dateField"] = "priority"
    assert_rejected(data, "dateField 'priority' must be a date field")


def test_view_must_reference_an_existing_type():
    data = spec_dict()
    data["views"][1]["query"]["type"] = "exam"
    assert_rejected(data, "unknown type 'exam'")


def test_query_fields_must_exist():
    data = spec_dict()
    data["views"][0]["query"]["sort"] = [{"field": "deadline"}]
    assert_rejected(data, "has no field 'deadline'")


def test_builtin_fields_are_queryable():
    data = spec_dict()
    data["views"][0]["query"]["sort"] = [{"field": "created_at", "dir": "desc"}]
    Spec.model_validate(data)


def test_duplicate_view_keys_are_rejected():
    data = spec_dict()
    data["views"].append(copy.deepcopy(data["views"][0]))
    assert_rejected(data, "duplicate view key 'assignments_board'")


def test_page_blocks_must_reference_views():
    data = spec_dict()
    data["pages"][0]["blocks"][2]["view"] = "habits"
    assert_rejected(data, "unknown view 'habits'")


def test_blocks_must_not_overlap():
    data = spec_dict()
    data["pages"][0]["blocks"][2]["x"] = 6
    data["pages"][0]["blocks"][2]["w"] = 6
    assert_rejected(data, "overlap")


def test_blocks_must_fit_the_grid():
    data = spec_dict()
    data["pages"][0]["blocks"][2]["w"] = 6
    assert_rejected(data, "runs past column 12")


def test_relation_target_must_exist():
    data = spec_dict()
    data["types"][0]["fields"][3]["targetType"] = "course"
    assert_rejected(data, "unknown type 'course'")


def test_select_fields_need_options():
    data = spec_dict()
    data["types"][0]["fields"][0]["options"] = []
    assert_rejected(data, "needs at least one option")


def test_reserved_field_keys_are_rejected():
    data = spec_dict()
    data["types"][1]["fields"].append({"key": "title", "label": "Title", "type": "text"})
    assert_rejected(data, "field key 'title' is reserved")


def test_condition_value_must_match_operator():
    data = spec_dict()
    data["views"][2]["query"]["where"] = [{"field": "tags", "op": "in", "value": "inbox"}]
    assert_rejected(data, "'in' needs a list value")


def test_rule_conditions_must_use_type_fields():
    data = spec_dict()
    data["rules"][0]["when"]["where"][0]["field"] = "grade"
    assert_rejected(data, "rule 'submitted_xp': type 'assignment' has no field 'grade'")


def test_journey_phases_must_fit_the_journey():
    data = spec_dict()
    data["journey"] = {
        "lengthDays": 30,
        "phases": [
            {"key": "learn", "title": "Learn", "startDay": 1, "endDay": 10},
            {"key": "ship", "title": "Ship", "startDay": 11, "endDay": 31},
        ],
    }
    assert_rejected(data, "outside the 30-day journey")


def test_journey_phases_must_not_overlap():
    data = spec_dict()
    data["journey"] = {
        "lengthDays": 30,
        "phases": [
            {"key": "learn", "title": "Learn", "startDay": 1, "endDay": 12},
            {"key": "build", "title": "Build", "startDay": 10, "endDay": 20},
        ],
    }
    assert_rejected(data, "phases 'learn' and 'build' overlap")


def test_every_reference_error_is_reported_at_once():
    data = spec_dict()
    data["views"][1]["query"]["type"] = "exam"
    data["pages"][0]["blocks"][2]["view"] = "habits"
    assert_rejected(data, "unknown type 'exam'", "unknown view 'habits'")
