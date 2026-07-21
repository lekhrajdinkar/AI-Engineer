"""Configuration owned by the learning-plans service."""

import os
from pathlib import Path

from src.y2026.youtube_agent_2.backend.shared.platform import settings as platform


ALLOWED_PREBUILT_LABELS = {"watched", "mark_for_delete", "bookmarked"}
TRIM_VIDEO_DESC = True

_database_path = os.getenv("PLANS_DATABASE_PATH") or os.getenv("DATABASE_PATH")
DB_PATH = (
    Path(_database_path)
    if _database_path
    else platform.BACKEND_ROOT / "youtubeldb.sqlite3"
)

FIREBASE_ENABLED = platform.FIREBASE_ENABLED
FIREBASE_DEFAULT_USER_ID = platform.FIREBASE_DEFAULT_USER_ID
INTERNAL_SERVICE_TOKEN = platform.INTERNAL_SERVICE_TOKEN
SERVICE_REQUEST_TIMEOUT_SECS = platform.SERVICE_REQUEST_TIMEOUT_SECS
YOUTUBE_SERVICE_URL = os.getenv(
    "YOUTUBE_SERVICE_URL", "http://127.0.0.1:8002"
)

_default_fixture_dir = Path(__file__).resolve().parents[4] / "docs" / "json-dumps"
AI_FIXTURE_DIR = Path(os.getenv("AI_FIXTURE_DIR", _default_fixture_dir))
AI_DUMMY_LEARNING_PLAN_BM = AI_FIXTURE_DIR / "04_learning-plan_bm.json"
AI_DUMMY_LEARNING_PLAN_BBGO = AI_FIXTURE_DIR / "04_learning-plan_bbgo.json"
AI_DUMMY_LEARNING_PLAN = AI_DUMMY_LEARNING_PLAN_BM
