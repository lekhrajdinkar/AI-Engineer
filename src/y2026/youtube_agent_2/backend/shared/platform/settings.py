"""Cross-cutting environment settings used by the service platform."""

import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() == "true"


FIREBASE_ENABLED = env_bool("FIREBASE_ENABLED")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "agent-2026-d3f51")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
FIREBASE_DEFAULT_USER_ID = os.getenv(
    "FIREBASE_DEFAULT_USER_ID", "legacy-single-user"
)
FIREBASE_AUTH_REQUIRED = env_bool(
    "FIREBASE_AUTH_REQUIRED", default=FIREBASE_ENABLED
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
SERVICE_REQUEST_TIMEOUT_SECS = float(
    os.getenv("SERVICE_REQUEST_TIMEOUT_SECS", "30")
)
