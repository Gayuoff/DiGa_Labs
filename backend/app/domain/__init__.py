"""The domain model: the single source of truth shared by backend, frontend and AI."""

from app.domain.events import Event, EventType, Origin
from app.domain.ids import new_id, utc_now
from app.domain.records import Actor, ActorKind, Item, Relation, Workspace
from app.domain.spec import (
    Action,
    ActionKind,
    Condition,
    Display,
    FieldDef,
    FieldType,
    Journey,
    ObjectType,
    Op,
    Option,
    Page,
    Phase,
    Placement,
    Query,
    Rule,
    Sort,
    Spec,
    Theme,
    Tone,
    Trigger,
    View,
)

__all__ = [
    "Action", "ActionKind", "Actor", "ActorKind", "Condition", "Display", "Event", "EventType",
    "FieldDef", "FieldType", "Item", "Journey", "ObjectType", "Op", "Option", "Origin", "Page",
    "Phase", "Placement", "Query", "Relation", "Rule", "Sort", "Spec", "Theme", "Tone", "Trigger",
    "View", "Workspace", "new_id", "utc_now",
]
