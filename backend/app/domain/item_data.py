"""Checks item data against its spec type. Mirrored by frontend/src/spec/validate.ts."""

import math
import re
from datetime import date, datetime

from pydantic import JsonValue

from app.domain.spec import FieldDef, FieldType, Spec

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$")


def check_item_data(spec: Spec, type_key: str, data: dict[str, JsonValue]) -> list[str]:
    """Problems with `data` for an item of `type_key`. `None` values clear a field and are fine."""
    object_type = spec.object_type(type_key)
    if object_type is None:
        return [f"unknown type '{type_key}'"]
    errors: list[str] = []
    for key, value in data.items():
        field = next((f for f in object_type.fields if f.key == key), None)
        if field is None:
            errors.append(f"type '{type_key}' has no field '{key}'")
        elif value is not None and (problem := _value_problem(field, value)):
            errors.append(f"field '{key}': {problem}")
    return errors


def _value_problem(field: FieldDef, value: JsonValue) -> str | None:
    options = {o.key for o in field.options}
    match field.type:
        case FieldType.TEXT | FieldType.LONG_TEXT | FieldType.URL:
            return None if isinstance(value, str) else "expected text"
        case FieldType.NUMBER:
            ok = isinstance(value, int | float) and not isinstance(value, bool)
            return None if ok and math.isfinite(value) else "expected a number"
        case FieldType.CHECKBOX:
            return None if isinstance(value, bool) else "expected true or false"
        case FieldType.DATE:
            return None if _is_date(value) else "expected a date (YYYY-MM-DD)"
        case FieldType.DATETIME:
            return None if _is_datetime(value) else "expected a date and time"
        case FieldType.SELECT:
            if not isinstance(value, str):
                return "expected an option key"
            return None if value in options else f"'{value}' is not an option"
        case FieldType.MULTI_SELECT:
            if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
                return "expected a list of option keys"
            seen: set[str] = set()
            for key in value:
                if key in seen:
                    return f"repeats '{key}'"
                if key not in options:
                    return f"'{key}' is not an option"
                seen.add(key)
            return None
        case FieldType.RELATION:
            return "relations are stored as links, not in data"
        case FieldType.FILE | FieldType.INK:
            return None


def _is_date(value: JsonValue) -> bool:
    if not isinstance(value, str) or not _DATE.match(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _is_datetime(value: JsonValue) -> bool:
    if not isinstance(value, str) or not _DATETIME.match(value):
        return False
    try:
        datetime.fromisoformat(value)
    except ValueError:
        return False
    return True
