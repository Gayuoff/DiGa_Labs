"""Runs the shared validation cases; the frontend runs the same cases from shared/fixtures/."""

import pytest
from pydantic import ValidationError

from app.domain import Spec
from app.domain.cases import ITEM_CASES, SPEC_CASES, spec_case
from app.domain.examples import STUDENT_SPEC
from app.domain.item_data import check_item_data


@pytest.mark.parametrize(("name", "mutate", "fragment"), SPEC_CASES, ids=[c[0] for c in SPEC_CASES])
def test_spec_case_is_rejected(name, mutate, fragment):
    with pytest.raises(ValidationError) as exc:
        Spec.model_validate(spec_case(mutate))
    assert fragment in str(exc.value)


@pytest.mark.parametrize(("name", "type_key", "data", "fragment"), ITEM_CASES,
                         ids=[c[0] for c in ITEM_CASES])
def test_item_case(name, type_key, data, fragment):
    errors = check_item_data(Spec.model_validate(STUDENT_SPEC), type_key, data)
    if fragment is None:
        assert errors == []
    else:
        assert any(fragment in e for e in errors), errors
