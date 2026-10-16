from enum import StrEnum

from pydantic import AwareDatetime, Field, JsonValue, model_validator

from app.domain.base import DomainModel, Id
from app.domain.ids import new_id, utc_now


class EventType(StrEnum):
    ITEM_CREATED = "item.created"
    ITEM_UPDATED = "item.updated"
    ITEM_DELETED = "item.deleted"
    ITEM_RESTORED = "item.restored"
    RELATION_CREATED = "relation.created"
    RELATION_DELETED = "relation.deleted"
    SPEC_CHANGED = "spec.changed"


class Origin(StrEnum):
    """Who caused a change. Lets the UI undo or explain AI and agent changes separately."""

    USER = "user"
    AI = "ai"
    AGENT = "agent"
    SYSTEM = "system"


_NEEDS_BEFORE = {
    EventType.ITEM_UPDATED,
    EventType.ITEM_DELETED,
    EventType.RELATION_DELETED,
    EventType.SPEC_CHANGED,
}
_NEEDS_AFTER = {
    EventType.ITEM_CREATED,
    EventType.ITEM_UPDATED,
    EventType.ITEM_RESTORED,
    EventType.RELATION_CREATED,
    EventType.SPEC_CHANGED,
}


class Event(DomainModel):
    """One append-only entry in the workspace log: the source of truth for history and undo.

    `before` and `after` hold only the attributes that changed, so swapping them inverts the event.
    Events sharing a `batch_id` came from one user action and are undone together.
    """

    id: Id = Field(default_factory=new_id)
    workspace_id: Id
    type: EventType
    target_id: Id
    actor_id: Id
    origin: Origin = Origin.USER
    batch_id: Id | None = None
    at: AwareDatetime = Field(default_factory=utc_now)
    before: dict[str, JsonValue] | None = None
    after: dict[str, JsonValue] | None = None

    @model_validator(mode="after")
    def _check_snapshots(self) -> "Event":
        if self.type in _NEEDS_BEFORE and self.before is None:
            raise ValueError(f"'{self.type}' event needs `before`")
        if self.type in _NEEDS_AFTER and self.after is None:
            raise ValueError(f"'{self.type}' event needs `after`")
        return self
