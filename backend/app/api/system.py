from fastapi import APIRouter
from pydantic import BaseModel

from app import __version__
from app.core.config import get_settings

router = APIRouter(tags=["system"])


class Health(BaseModel):
    status: str
    version: str
    env: str


@router.get("/health")
def health() -> Health:
    return Health(status="ok", version=__version__, env=get_settings().app_env)
