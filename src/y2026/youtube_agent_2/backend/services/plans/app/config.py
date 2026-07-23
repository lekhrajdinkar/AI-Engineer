"""Configuration owned by the learning-plans service.

Most values can be overridden with environment variables. For normal model setup,
add the provider API key to the API and worker environments, then create/edit the
model configuration from the UI. The model identity and capacity defaults below
only seed the first model in an empty database; the UI is the source of truth after
that record exists.
"""

import os
from pathlib import Path

from src.y2026.youtube_agent_2.backend.shared.platform import settings as platform


# Course/content behavior.
ALLOWED_PREBUILT_LABELS = {"watched", "mark_for_delete", "bookmarked"}
TRIM_VIDEO_DESC = True

# Persistence. PLANS_DATABASE_PATH takes precedence over the legacy shared path.
_database_path = os.getenv("PLANS_DATABASE_PATH") or os.getenv("DATABASE_PATH")
DB_PATH = (
    Path(_database_path)
    if _database_path
    else platform.BACKEND_ROOT / "youtubeldb.sqlite3"
)

# Shared platform and authentication settings.
FIREBASE_ENABLED = platform.FIREBASE_ENABLED
FIREBASE_DEFAULT_USER_ID = platform.FIREBASE_DEFAULT_USER_ID
INTERNAL_SERVICE_TOKEN = platform.INTERNAL_SERVICE_TOKEN
SERVICE_REQUEST_TIMEOUT_SECS = platform.SERVICE_REQUEST_TIMEOUT_SECS
YOUTUBE_SERVICE_URL = os.getenv("YOUTUBE_SERVICE_URL", "http://127.0.0.1:8002")

# Provider credentials. Keep these in environment variables; never commit keys.
# The API process and background worker must both receive the same required key.
# Provider SDK integrations are installed from the Plans service requirements.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Optional catalog for extra OpenAI-compatible providers. Built-in Google, Groq,
# and OpenAI providers do not need a catalog entry.
AI_PROVIDER_CATALOG_PATH = Path(
    os.getenv(
        "AI_PROVIDER_CATALOG_PATH",
        Path(__file__).resolve().parent / "ai_providers" / "providers.json",
    )
)

# One-time seed for an empty model-config store. Once a record exists, manage it
# from the AI Model Configurations UI; changing these values will not update it.
AI_LLM_CONFIG_ID = os.getenv("AI_LLM_CONFIG_ID", "model_groq_gpt_oss")
AI_LLM_DISPLAY_NAME = os.getenv("AI_LLM_DISPLAY_NAME", "Groq GPT-OSS")
AI_LLM_PROVIDER = os.getenv("AI_LLM_PROVIDER", "groq")
AI_LLM_MODEL = os.getenv("AI_LLM_MODEL", "openai/gpt-oss-20b")

# Defaults copied into that one-time seeded model configuration.
AI_LLM_TEMPERATURE = float(os.getenv("AI_LLM_TEMPERATURE", "0"))
AI_LLM_MAX_INPUT_TOKENS = int(os.getenv("AI_LLM_MAX_INPUT_TOKENS", "8000"))
AI_LLM_DEFAULT_BATCH_SIZE = int(os.getenv("AI_LLM_DEFAULT_BATCH_SIZE", "30"))
AI_LLM_MAX_BATCH_SIZE = int(os.getenv("AI_LLM_MAX_BATCH_SIZE", "50"))
AI_LLM_MAX_WHOLE_VIDEOS = int(os.getenv("AI_LLM_MAX_WHOLE_VIDEOS", "30"))

# Runtime behavior shared by provider clients (not stored per model).
AI_LLM_TIMEOUT_SECS = float(os.getenv("AI_LLM_TIMEOUT_SECS", "60"))
AI_LLM_MAX_RETRIES = int(os.getenv("AI_LLM_MAX_RETRIES", "2"))

# Request-size safeguards. The synchronous legacy endpoint has a smaller limit;
# queued AI jobs may accept more videos and split them into model-sized batches.
AI_MAX_VIDEOS_PER_REQUEST = int(os.getenv("AI_MAX_VIDEOS_PER_REQUEST", "1000"))
AI_JOB_MAX_VIDEOS_PER_REQUEST = int(
    os.getenv("AI_JOB_MAX_VIDEOS_PER_REQUEST", "1000")
)

# Connection-test and background-worker timing.
AI_MODEL_TEST_TIMEOUT_SECS = float(
    os.getenv("AI_MODEL_TEST_TIMEOUT_SECS", "10")
)
AI_WORKER_POLL_INTERVAL_SECS = float(
    os.getenv("AI_WORKER_POLL_INTERVAL_SECS", "2")
)
AI_WORKER_LEASE_SECS = int(os.getenv("AI_WORKER_LEASE_SECS", "300"))

# Worker backoff after provider rate-limit responses. Provider Retry-After values
# are honored when present, bounded by the maximum below.
AI_RATE_LIMIT_DEFAULT_WAIT_SECS = int(
    os.getenv("AI_RATE_LIMIT_DEFAULT_WAIT_SECS", "60")
)
AI_RATE_LIMIT_MAX_WAIT_SECS = int(
    os.getenv("AI_RATE_LIMIT_MAX_WAIT_SECS", "900")
)
