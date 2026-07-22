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

# Hosted LLM used by the AI course-generation endpoint. Groq's free plan is a
# convenient POC default; these settings can be replaced without changing the
# graph or HTTP contract.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
AI_LLM_MODEL = os.getenv("AI_LLM_MODEL", "openai/gpt-oss-20b")
AI_LLM_TEMPERATURE = float(os.getenv("AI_LLM_TEMPERATURE", "0"))
AI_LLM_TIMEOUT_SECS = float(os.getenv("AI_LLM_TIMEOUT_SECS", "60"))
AI_LLM_MAX_RETRIES = int(os.getenv("AI_LLM_MAX_RETRIES", "2"))
AI_MAX_VIDEOS_PER_REQUEST = int(os.getenv("AI_MAX_VIDEOS_PER_REQUEST", "50"))
