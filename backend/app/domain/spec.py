"""The Spec: a typed, declarative description of one workspace app.

The AI writes specs, people edit them, the engine renders them. Nothing here is code, so a spec
that passes validation can always be rendered. Cross-references are checked in `Spec` and every
problem is reported at once, so the Architect AI can repair a spec in a single retry.
"""

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import Field, JsonValue, model_validator

from app.domain.base import DomainModel, Hex, Icon, Key, Label
from app.domain.events import EventType

GRID_COLUMNS = 12


# --- Types: the shape of items ---------------------------------------------------------------


class FieldType(StrEnum):
    TEXT = "text"
    LONG_TEXT = "long_text"
    NUMBER = "number"
    CHECKBOX = "checkbox"
    DATE = "date"
    DATETIME = "datetime"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    RELATION = "relation"
    URL = "url"
    FILE = "file"
    INK = "ink"


# Attributes every item has. Queries may use them; type fields may not reuse their names.
BUILTIN_FIELDS: dict[str, FieldType] = {
    "title": FieldType.TEXT,
    "created_at": FieldType.DATETIME,
    "updated_at": FieldType.DATETIME,
}
RESERVED_FIELD_KEYS = frozenset(
    {*BUILTIN_FIELDS, "id", "type", "data", "deleted_at", "created_by", "workspace_id",
     "version", "sample"}
)
_CHOICE_TYPES = {FieldType.SELECT, FieldType.MULTI_SELECT}


class Option(DomainModel):
    key: Key
    label: Label
    color: Hex | None = None


class FieldDef(DomainModel):
    key: Key
    label: Label
    type: FieldType
    required: bool = False
    options: list[Option] = Field(default=[], max_length=50)
    target_type: Key | None = None
    """For relation fields: the type of item linked to."""

    @model_validator(mode="after")
    def _check_shape(self) -> "FieldDef":
        if self.key in RESERVED_FIELD_KEYS:
            raise ValueError(f"field key '{self.key}' is reserved")
        is_choice = self.type in _CHOICE_TYPES
        if is_choice and not self.options:
            raise ValueError(f"field '{self.key}': {self.type} needs at least one option")
        if not is_choice and self.options:
            raise ValueError(f"field '{self.key}': only select fields have options")
        option_keys = [o.key for o in self.options]
        if len(option_keys) != len(set(option_keys)):
            raise ValueError(f"field '{self.key}': duplicate option keys")
        if (self.type is FieldType.RELATION) != (self.target_type is not None):
            raise ValueError(f"field '{self.key}': relation fields, and only they, need targetType")
        return self


class ObjectType(DomainModel):
    key: Key
    label: Label
    icon: Icon | None = None
    fields: list[FieldDef] = Field(default=[], max_length=64)

    @model_validator(mode="after")
    def _unique_fields(self) -> "ObjectType":
        keys = [f.key for f in self.fields]
        if len(keys) != len(set(keys)):
            raise ValueError(f"type '{self.key}': duplicate field keys")
        return self

    def field_type(self, key: str) -> FieldType | None:
        if key in BUILTIN_FIELDS:
            return BUILTIN_FIELDS[key]
        return next((f.type for f in self.fields if f.key == key), None)


# --- Queries: which items a view shows ---------------------------------------------------------


class Op(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    IN = "in"
    NOT_IN = "not_in"
    CONTAINS = "contains"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"


class Condition(DomainModel):
    field: Key
    op: Op
    value: JsonValue = None

    @model_validator(mode="after")
    def _check_value(self) -> "Condition":
        if self.op in (Op.IS_EMPTY, Op.IS_NOT_EMPTY):
            if self.value is not None:
                raise ValueError(f"'{self.op}' takes no value")
        elif self.op in (Op.IN, Op.NOT_IN):
            if not isinstance(self.value, list):
                raise ValueError(f"'{self.op}' needs a list value")
        elif self.value is None:
            raise ValueError(f"'{self.op}' needs a value")
        return self


class Sort(DomainModel):
    field: Key
    dir: Literal["asc", "desc"] = "asc"


class Query(DomainModel):
    type: Key
    where: list[Condition] = Field(default=[], max_length=20)
    match: Literal["all", "any"] = "all"
    sort: list[Sort] = Field(default=[], max_length=5)
    limit: int | None = Field(default=None, ge=1, le=10_000)


# --- Views and pages: how items are shown and arranged ----------------------------------------


class Display(StrEnum):
    LIST = "list"
    BOARD = "board"
    TABLE = "table"
    CALENDAR = "calendar"
    TIMELINE = "timeline"
    GALLERY = "gallery"
    DOC = "doc"
    CHART = "chart"
    PROGRESS = "progress"


_NEEDS_DATE = {Display.CALENDAR, Display.TIMELINE}


class View(DomainModel):
    key: Key
    title: Label
    display: Display
    query: Query
    group_by: Key | None = None
    date_field: Key | None = None
    fields: list[Key] = Field(default=[], max_length=32)
    """Fields shown on cards or as table columns, in order."""
    options: dict[str, JsonValue] = {}
    """Renderer-specific settings, e.g. chart kind. Validated by the renderer."""

    @model_validator(mode="after")
    def _check_display_needs(self) -> "View":
        if self.display is Display.BOARD and self.group_by is None:
            raise ValueError(f"view '{self.key}': board view needs groupBy")
        if self.display in _NEEDS_DATE and self.date_field is None:
            raise ValueError(f"view '{self.key}': {self.display} view needs dateField")
        return self


class Placement(DomainModel):
    view: Key
    x: int = Field(ge=0, lt=GRID_COLUMNS)
    y: int = Field(ge=0)
    w: int = Field(ge=1, le=GRID_COLUMNS)
    h: int = Field(ge=1, le=48)

    @model_validator(mode="after")
    def _fits_grid(self) -> "Placement":
        if self.x + self.w > GRID_COLUMNS:
            raise ValueError(f"block '{self.view}' runs past column {GRID_COLUMNS}")
        return self


class Page(DomainModel):
    key: Key
    title: Label
    icon: Icon | None = None
    blocks: list[Placement] = Field(default=[], max_length=24)

    @model_validator(mode="after")
    def _check_blocks(self) -> "Page":
        views = [b.view for b in self.blocks]
        if len(views) != len(set(views)):
            raise ValueError(f"page '{self.key}': a view is placed twice")
        for i, a in enumerate(self.blocks):
            for b in self.blocks[i + 1 :]:
                if a.x < b.x + b.w and b.x < a.x + a.w and a.y < b.y + b.h and b.y < a.y + a.h:
                    raise ValueError(f"page '{self.key}': blocks '{a.view}' and '{b.view}' overlap")
        return self


# --- Rules: what happens when something happens ------------------------------------------------


class ActionKind(StrEnum):
    SET_FIELD = "set_field"
    CREATE_ITEM = "create_item"
    AWARD = "award"
    NOTIFY = "notify"


class Trigger(DomainModel):
    on: EventType
    type: Key | None = None
    where: list[Condition] = Field(default=[], max_length=10)


class Action(DomainModel):
    do: ActionKind
    args: dict[str, JsonValue] = {}


class Rule(DomainModel):
    key: Key
    title: Label
    enabled: bool = True
    when: Trigger
    then: list[Action] = Field(min_length=1, max_length=10)


# --- Time: journeys whose interface changes by phase -----------------------------------------


class Phase(DomainModel):
    key: Key
    title: Label
    start_day: int = Field(ge=1)
    end_day: int = Field(ge=1)
    views: list[Key] = []
    """Views that switch on during this phase."""

    @model_validator(mode="after")
    def _ordered(self) -> "Phase":
        if self.end_day < self.start_day:
            raise ValueError(f"phase '{self.key}' ends before it starts")
        return self


class Journey(DomainModel):
    length_days: int = Field(ge=1, le=3650)
    starts_on: date | None = None
    phases: list[Phase] = Field(default=[], max_length=20)

    @model_validator(mode="after")
    def _check_phases(self) -> "Journey":
        keys = [p.key for p in self.phases]
        if len(keys) != len(set(keys)):
            raise ValueError("journey: duplicate phase keys")
        ordered = sorted(self.phases, key=lambda p: p.start_day)
        for prev, cur in zip(ordered, ordered[1:], strict=False):
            if cur.start_day <= prev.end_day:
                raise ValueError(f"journey: phases '{prev.key}' and '{cur.key}' overlap")
        for p in self.phases:
            if p.end_day > self.length_days:
                raise ValueError(
                    f"journey: phase '{p.key}' ends on day {p.end_day}, "
                    f"outside the {self.length_days}-day journey"
                )
        return self


# --- Theme: the skin --------------------------------------------------------------------------


class Tone(StrEnum):
    PROFESSIONAL = "professional"
    PLAYFUL = "playful"
    CALM = "calm"
    BOLD = "bold"


class Theme(DomainModel):
    accent: Hex = "#6366f1"
    tone: Tone = Tone.PROFESSIONAL
    density: Literal["compact", "comfortable", "spacious"] = "comfortable"
    radius: Literal["none", "sm", "md", "lg"] = "md"
    mode: Literal["light", "dark", "system"] = "system"


# --- The spec ---------------------------------------------------------------------------------


class Spec(DomainModel):
    format_version: Literal[1] = 1
    name: Label
    description: str | None = Field(default=None, max_length=500)
    theme: Theme = Theme()
    types: list[ObjectType] = Field(min_length=1, max_length=32)
    views: list[View] = Field(min_length=1, max_length=64)
    pages: list[Page] = Field(min_length=1, max_length=32)
    rules: list[Rule] = Field(default=[], max_length=64)
    journey: Journey | None = None

    def object_type(self, key: str) -> ObjectType | None:
        return next((t for t in self.types if t.key == key), None)

    def view(self, key: str) -> View | None:
        return next((v for v in self.views if v.key == key), None)

    @model_validator(mode="after")
    def _check_references(self) -> "Spec":
        errors: list[str] = []
        types = _index(self.types, "type", errors)
        views = _index(self.views, "view", errors)
        _index(self.pages, "page", errors)
        _index(self.rules, "rule", errors)

        for t in self.types:
            for f in t.fields:
                if f.target_type is not None and f.target_type not in types:
                    errors.append(f"type '{t.key}' field '{f.key}': unknown type '{f.target_type}'")

        for v in self.views:
            errors.extend(_check_view(v, types))

        for p in self.pages:
            for b in p.blocks:
                if b.view not in views:
                    errors.append(f"page '{p.key}': unknown view '{b.view}'")

        for r in self.rules:
            where = f"rule '{r.key}'"
            if r.when.type is None:
                if r.when.where:
                    errors.append(f"{where}: conditions need a type")
                continue
            t = types.get(r.when.type)
            if t is None:
                errors.append(f"{where}: unknown type '{r.when.type}'")
                continue
            errors.extend(_missing_fields(where, t, [c.field for c in r.when.where]))

        if self.journey is not None:
            for ph in self.journey.phases:
                for key in ph.views:
                    if key not in views:
                        errors.append(f"journey phase '{ph.key}': unknown view '{key}'")

        if errors:
            raise ValueError("invalid spec:\n- " + "\n- ".join(errors))
        return self


def _index[T: (ObjectType, View, Page, Rule)](
    entries: list[T], label: str, errors: list[str]
) -> dict[str, T]:
    index: dict[str, T] = {}
    for entry in entries:
        if entry.key in index:
            errors.append(f"duplicate {label} key '{entry.key}'")
        index[entry.key] = entry
    return index


def _missing_fields(where: str, t: ObjectType, keys: list[str]) -> list[str]:
    return [f"{where}: type '{t.key}' has no field '{k}'" for k in keys if t.field_type(k) is None]


def _check_view(v: View, types: dict[str, ObjectType]) -> list[str]:
    where = f"view '{v.key}'"
    t = types.get(v.query.type)
    if t is None:
        return [f"{where}: unknown type '{v.query.type}'"]
    errors = _missing_fields(
        where, t, [c.field for c in v.query.where] + [s.field for s in v.query.sort] + v.fields
    )
    if v.group_by is not None:
        kind = t.field_type(v.group_by)
        if kind is None:
            errors += _missing_fields(where, t, [v.group_by])
        elif kind is not FieldType.SELECT:
            errors.append(f"{where}: groupBy '{v.group_by}' must be a select field")
    if v.date_field is not None:
        kind = t.field_type(v.date_field)
        if kind is None:
            errors += _missing_fields(where, t, [v.date_field])
        elif kind not in (FieldType.DATE, FieldType.DATETIME):
            errors.append(f"{where}: dateField '{v.date_field}' must be a date field")
    return errors
