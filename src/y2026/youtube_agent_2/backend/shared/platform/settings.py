"""Cross-cutting environment settings used by the service platform."""

import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() == "true"


STORAGE_BACKEND = os.getenv(
    "STORAGE_BACKEND",
    "firebase_firestore" if env_bool("FIREBASE_ENABLED") else "sqlite",
).strip().lower()
if STORAGE_BACKEND not in {"firebase_firestore", "postgres", "sqlite"}:
    raise RuntimeError(
        "STORAGE_BACKEND must be one of: firebase_firestore, postgres, sqlite"
    )

DATABASE_URL = os.getenv("DATABASE_URL")
FIREBASE_AUTH_ENABLED = env_bool(
    "FIREBASE_AUTH_ENABLED",
    default=env_bool(
        "FIREBASE_AUTH_REQUIRED",
        default=env_bool("FIREBASE_ENABLED"),
    ),
)
# Compatibility alias for older callers. New code should use the explicit
# storage and authentication settings above.
FIREBASE_ENABLED = STORAGE_BACKEND == "firebase_firestore"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "agent-2026-d3f51")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
FIREBASE_DEFAULT_USER_ID = os.getenv(
    "FIREBASE_DEFAULT_USER_ID", "legacy-single-user"
)
FIREBASE_AUTH_REQUIRED = FIREBASE_AUTH_ENABLED
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
SERVICE_REQUEST_TIMEOUT_SECS = float(
    os.getenv("SERVICE_REQUEST_TIMEOUT_SECS", "30")
)
