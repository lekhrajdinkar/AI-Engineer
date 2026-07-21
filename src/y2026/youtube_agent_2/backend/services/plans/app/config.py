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

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:8b")
LLM_REQUEST_TIMEOUT_SECS = float(os.getenv("LLM_REQUEST_TIMEOUT_SECS", "600"))
LLM_BATCH_SIZE = max(1, int(os.getenv("LLM_BATCH_SIZE", "25")))
LLM_MAX_VIDEOS = max(1, int(os.getenv("LLM_MAX_VIDEOS", "100")))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
