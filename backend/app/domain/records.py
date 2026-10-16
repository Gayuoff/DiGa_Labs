from enum import StrEnum
from typing import Annotated

from pydantic import AwareDatetime, Field, JsonValue, StringConstraints, model_validator

from app.domain.base import DomainModel, Id, Key, Label
from app.domain.ids import new_id, utc_now


class Item(DomainModel):
    """Any record in a workspace: task, note, client, medicine, quest. Its spec type gives it shape.

    Widgets never own items; every view is a query over the same pool.
    """

    id: Id = Field(default_factory=new_id)
    workspace_id: Id
    type: Key
    title: Annotated[str, StringConstraints(max_length=500)] = ""
    data: dict[Key, JsonValue] = {}
    created_by: Id
    created_at: AwareDatetime = Field(default_factory=utc_now)
    updated_at: AwareDatetime = Field(default_factory=utc_now)
    deleted_at: AwareDatetime | None = None
    version: int = Field(default=1, ge=1)
    sample: bool = False
    """True for AI-generated starter data, so it can be cleared without touching real data."""


class Relation(DomainModel):
    """A directed link between two items, e.g. assignment -> subject. Together: the graph."""

    id: Id = Field(default_factory=new_id)
    workspace_id: Id
    kind: Key
    from_id: Id
    to_id: Id
    created_by: Id
    created_at: AwareDatetime = Field(default_factory=utc_now)

    @model_validator(mode="after")
    def _no_self_link(self) -> "Relation":
        if self.from_id == self.to_id:
            raise ValueError("an item cannot be related to itself")
        return self


class ActorKind(StrEnum):
    HUMAN = "human"
    AI = "ai"
    AGENT = "agent"
    SYSTEM = "system"


class Actor(DomainModel):
    """Anyone who can act on a workspace: a person, the Architect AI, or an agent."""

    id: Id = Field(default_factory=new_id)
    kind: ActorKind
    name: Label


class Workspace(DomainModel):
    id: Id = Field(default_factory=new_id)
    name: Label
    owner_id: Id
    spec_version: int = Field(default=1, ge=1)
    created_at: AwareDatetime = Field(default_factory=utc_now)
    updated_at: AwareDatetime = Field(default_factory=utc_now)
