from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints
from pydantic.alias_generators import to_camel

Key = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,47}$")]
"""Stable machine name inside a spec (types, fields, views, pages, rules). Titles are for humans."""

Id = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,128}$")]
"""Identifier of a stored record. New ones come from `new_id()`."""

Label = Annotated[str, StringConstraints(min_length=1, max_length=120)]
Hex = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
Icon = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]{1,40}$")]
"""A lucide icon name, e.g. "book-open"."""


class DomainModel(BaseModel):
    """Base for every domain model: snake_case in Python, camelCase on the wire, no unknown keys."""

    model_config = ConfigDict(
        extra="forbid",
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
        validate_assignment=True,
        str_strip_whitespace=True,
        json_schema_serialization_defaults_required=True,
    )
