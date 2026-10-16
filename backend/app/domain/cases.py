"""Validation cases shared with the frontend, exported to shared/fixtures/.

The backend (Pydantic) and the frontend (TypeScript) both validate specs and item data. Each case
here must be rejected by both with an error containing the same fragment; the tests on each side
run every case, which keeps the two validators in step.
"""

import copy
from collections.abc import Callable

from app.domain.examples import STUDENT_SPEC
from app.domain.spec import Spec

SpecMutation = Callable[[dict], None]


def _view(spec: dict, key: str) -> dict:
    return next(v for v in spec["views"] if v["key"] == key)


def _type(spec: dict, key: str) -> dict:
    return next(t for t in spec["types"] if t["key"] == key)


def _field(spec: dict, type_key: str, field_key: str) -> dict:
    return next(f for f in _type(spec, type_key)["fields"] if f["key"] == field_key)


def _home_blocks(spec: dict) -> list[dict]:
    return next(p for p in spec["pages"] if p["key"] == "home")["blocks"]


def _no_group_by(s: dict) -> None:
    del _view(s, "assignments_board")["groupBy"]


def _group_by_date(s: dict) -> None:
    _view(s, "assignments_board")["groupBy"] = "due"


def _no_date_field(s: dict) -> None:
    del _view(s, "deadlines")["dateField"]


def _date_field_select(s: dict) -> None:
    _view(s, "deadlines")["dateField"] = "priority"


def _unknown_view_type(s: dict) -> None:
    _view(s, "deadlines")["query"]["type"] = "exam"


def _unknown_sort_field(s: dict) -> None:
    _view(s, "assignments_board")["query"]["sort"] = [{"field": "deadline"}]


def _duplicate_view(s: dict) -> None:
    s["views"].append(dict(_view(s, "inbox")))


def _duplicate_page(s: dict) -> None:
    s["pages"].append({"key": "home", "title": "Home again"})


def _unknown_block_view(s: dict) -> None:
    _home_blocks(s)[2]["view"] = "habits"


def _overlapping_blocks(s: dict) -> None:
    _home_blocks(s)[2].update(x=6, w=6)


def _block_past_grid(s: dict) -> None:
    _home_blocks(s)[2]["w"] = 6


def _unknown_relation_target(s: dict) -> None:
    _field(s, "assignment", "subject")["targetType"] = "course"


def _select_without_options(s: dict) -> None:
    _field(s, "assignment", "status")["options"] = []


def _reserved_field_key(s: dict) -> None:
    _type(s, "subject")["fields"].append({"key": "title", "label": "Title", "type": "text"})


def _in_without_list(s: dict) -> None:
    _view(s, "inbox")["query"]["where"] = [{"field": "tags", "op": "in", "value": "inbox"}]


def _rule_unknown_field(s: dict) -> None:
    s["rules"][0]["when"]["where"][0]["field"] = "grade"


def _phase_outside_journey(s: dict) -> None:
    s["journey"] = {
        "lengthDays": 30,
        "phases": [
            {"key": "learn", "title": "Learn", "startDay": 1, "endDay": 10},
            {"key": "ship", "title": "Ship", "startDay": 11, "endDay": 31},
        ],
    }


def _overlapping_phases(s: dict) -> None:
    s["journey"] = {
        "lengthDays": 30,
        "phases": [
            {"key": "learn", "title": "Learn", "startDay": 1, "endDay": 12},
            {"key": "build", "title": "Build", "startDay": 10, "endDay": 20},
        ],
    }


SPEC_CASES: list[tuple[str, SpecMutation, str]] = [
    ("board needs groupBy", _no_group_by, "board view needs groupBy"),
    ("groupBy must be a select field", _group_by_date, "groupBy 'due' must be a select field"),
    ("calendar needs dateField", _no_date_field, "calendar view needs dateField"),
    ("dateField must be a date", _date_field_select, "dateField 'priority' must be a date field"),
    ("view of an unknown type", _unknown_view_type, "unknown type 'exam'"),
    ("sort on an unknown field", _unknown_sort_field, "has no field 'deadline'"),
    ("duplicate view key", _duplicate_view, "duplicate view key 'inbox'"),
    ("duplicate page key", _duplicate_page, "duplicate page key 'home'"),
    ("block of an unknown view", _unknown_block_view, "unknown view 'habits'"),
    ("overlapping blocks", _overlapping_blocks, "overlap"),
    ("block past the grid", _block_past_grid, "runs past column 12"),
    ("relation to an unknown type", _unknown_relation_target, "unknown type 'course'"),
    ("select without options", _select_without_options, "needs at least one option"),
    ("reserved field key", _reserved_field_key, "field key 'title' is reserved"),
    ("'in' without a list", _in_without_list, "'in' needs a list value"),
    ("rule on an unknown field", _rule_unknown_field, "type 'assignment' has no field 'grade'"),
    ("phase outside the journey", _phase_outside_journey, "outside the 30-day journey"),
    ("overlapping phases", _overlapping_phases, "phases 'learn' and 'build' overlap"),
]

# (name, item type, data, error fragment or None when the data is valid)
ITEM_CASES: list[tuple[str, str, dict, str | None]] = [
    ("valid assignment", "assignment", {"status": "doing", "due": "2026-10-20"}, None),
    ("null clears a field", "assignment", {"due": None}, None),
    ("valid multi-select", "note", {"tags": ["inbox", "exam"], "body": "text"}, None),
    ("valid number", "subject", {"credits": 4}, None),
    ("unknown type", "exam", {}, "unknown type 'exam'"),
    ("unknown field", "assignment", {"grade": "A"}, "type 'assignment' has no field 'grade'"),
    ("option not in the list", "assignment", {"status": "blocked"}, "'blocked' is not an option"),
    ("select needs text", "assignment", {"status": 3}, "expected an option key"),
    ("bad date", "assignment", {"due": "20/10/2026"}, "expected a date (YYYY-MM-DD)"),
    ("impossible date", "assignment", {"due": "2026-02-30"}, "expected a date (YYYY-MM-DD)"),
    ("number as text", "subject", {"credits": "four"}, "expected a number"),
    ("boolean is not a number", "subject", {"credits": True}, "expected a number"),
    ("multi-select needs a list", "note", {"tags": "inbox"}, "expected a list of option keys"),
    ("multi-select repeats", "note", {"tags": ["inbox", "inbox"]}, "repeats 'inbox'"),
    ("multi-select unknown", "note", {"tags": ["urgent"]}, "'urgent' is not an option"),
    ("text needs a string", "note", {"body": 42}, "expected text"),
    ("relations are links", "assignment", {"subject": "s1"}, "relations are stored as links"),
]


def spec_case(mutate: SpecMutation) -> dict:
    """The reference spec in full wire format (defaults filled in, as stored) with one mistake."""
    spec =copy.deepcopy(Spec.model_validate(STUDENT_SPEC).model_dump(mode="json"))
    mutate(spec)
    return spec
