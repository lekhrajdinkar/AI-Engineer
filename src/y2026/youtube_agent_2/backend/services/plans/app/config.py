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
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AI_LLM_CONFIG_ID = os.getenv("AI_LLM_CONFIG_ID", "model_groq_gpt_oss")
AI_LLM_DISPLAY_NAME = os.getenv("AI_LLM_DISPLAY_NAME", "Groq GPT-OSS")
AI_LLM_PROVIDER = os.getenv("AI_LLM_PROVIDER", "groq")
AI_LLM_MODEL = os.getenv("AI_LLM_MODEL", "openai/gpt-oss-20b")
AI_LLM_TEMPERATURE = float(os.getenv("AI_LLM_TEMPERATURE", "0"))
AI_LLM_TIMEOUT_SECS = float(os.getenv("AI_LLM_TIMEOUT_SECS", "60"))
AI_LLM_MAX_RETRIES = int(os.getenv("AI_LLM_MAX_RETRIES", "2"))
AI_LLM_MAX_INPUT_TOKENS = int(os.getenv("AI_LLM_MAX_INPUT_TOKENS", "8000"))
AI_LLM_DEFAULT_BATCH_SIZE = int(os.getenv("AI_LLM_DEFAULT_BATCH_SIZE", "30"))
AI_LLM_MAX_BATCH_SIZE = int(os.getenv("AI_LLM_MAX_BATCH_SIZE", "50"))
AI_LLM_MAX_WHOLE_VIDEOS = int(os.getenv("AI_LLM_MAX_WHOLE_VIDEOS", "30"))
AI_MAX_VIDEOS_PER_REQUEST = int(os.getenv("AI_MAX_VIDEOS_PER_REQUEST", "50"))
AI_JOB_MAX_VIDEOS_PER_REQUEST = int(
    os.getenv("AI_JOB_MAX_VIDEOS_PER_REQUEST", "1000")
)
AI_MODEL_TEST_TIMEOUT_SECS = float(
    os.getenv("AI_MODEL_TEST_TIMEOUT_SECS", "10")
)
