import time

import pytest
from pydantic import ValidationError

from app.domain import Event, Item, Relation, new_id


def test_new_ids_are_unique_and_time_sortable():
    first = new_id()
    time.sleep(0.002)
    later = [new_id() for _ in range(1000)]
    assert len(first) == 26
    assert len(set(later)) == 1000
    assert all(first < i for i in later)


def test_item_uses_camel_case_on_the_wire():
    item = Item(workspace_id="ws1", type="assignment", title="DBMS 3", created_by="u1",
                data={"status": "doing"})
    wire = item.model_dump(mode="json")
    assert wire["workspaceId"] == "ws1"
    assert wire["createdBy"] == "u1"
    assert wire["data"] == {"status": "doing"}
    assert Item.model_validate(wire) == item


def test_item_rejects_bad_type_key():
    with pytest.raises(ValidationError):
        Item(workspace_id="ws1", type="Not A Key", created_by="u1")


def test_relation_cannot_link_an_item_to_itself():
    with pytest.raises(ValidationError, match="related to itself"):
        Relation(workspace_id="ws1", kind="subject", from_id="a", to_id="a", created_by="u1")


def test_update_event_needs_before_and_after():
    with pytest.raises(ValidationError, match="needs `before`"):
        Event(workspace_id="ws1", type="item.updated", target_id="i1", actor_id="u1",
              after={"title": "new"})


def test_created_event_needs_after():
    with pytest.raises(ValidationError, match="needs `after`"):
        Event(workspace_id="ws1", type="item.created", target_id="i1", actor_id="u1")


def test_valid_update_event():
    event = Event(workspace_id="ws1", type="item.updated", target_id="i1", actor_id="u1",
                  before={"title": "old"}, after={"title": "new"}, origin="ai")
    assert event.model_dump(mode="json")["targetId"] == "i1"
