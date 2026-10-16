"""Export what the frontend shares with the backend:

- shared/domain.openapi.json: the domain models, input for the frontend's generated types
- shared/examples/*.json: reference specs, validated and in full wire format

Run from backend/:  .venv\\Scripts\\python -m scripts.export_schema
Then from the repo root:  npm run gen:domain
"""

import json
from pathlib import Path

from pydantic.json_schema import models_json_schema

from app import __version__
from app.domain import Actor, Event, Item, Relation, Spec, Workspace
from app.domain.examples import STUDENT_SPEC

SHARED = Path(__file__).resolve().parents[2] / "shared"
OUT = SHARED / "domain.openapi.json"
EXAMPLES = {"study_hq": STUDENT_SPEC}


def build() -> dict:
    _, schema = models_json_schema(
        [(m, "serialization") for m in (Spec, Item, Relation, Event, Workspace, Actor)],
        ref_template="#/components/schemas/{model}",
    )
    return {
        "openapi": "3.1.0",
        "info": {"title": "Second Brain domain", "version": __version__},
        "paths": {},
        "components": {"schemas": schema["$defs"]},
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path}")


def main() -> None:
    write_json(OUT, build())
    for name, raw in EXAMPLES.items():
        spec = Spec.model_validate(raw).model_dump(mode="json")
        write_json(SHARED / "examples" / f"{name}.json", spec)


if __name__ == "__main__":
    main()
