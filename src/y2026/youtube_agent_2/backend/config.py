import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DEMO_CHANNELS = []
TRIM_VIDEO_DESC = True
ALLOWED_PREBUILT_LABELS = {"watched", "mark_for_delete", "bookmarked"}

# Database / SQLite vs FireBASE
_database_path = os.getenv("DATABASE_PATH")
DB_PATH = Path(_database_path) if _database_path else BASE_DIR / "youtubeldb.sqlite3"

# Firebase is enabled explicitly so local development can continue to use the
# existing SQLite fixture until Firestore credentials are configured.
FIREBASE_ENABLED = os.getenv("FIREBASE_ENABLED", "false").lower() == "true"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "agent-2026-d3f51")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
FIREBASE_DEFAULT_USER_ID = os.getenv("FIREBASE_DEFAULT_USER_ID", "legacy-single-user")
FIREBASE_AUTH_REQUIRED = os.getenv("FIREBASE_AUTH_REQUIRED", "true" if FIREBASE_ENABLED else "false").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Service-to-service traffic is authenticated separately from browser traffic.
# The plans service forwards the active Firebase user id when it calls the
# YouTube service so per-user tokens remain isolated.
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
YOUTUBE_SERVICE_URL = os.getenv("YOUTUBE_SERVICE_URL", "")
GATEWAY_YOUTUBE_SERVICE_URL = os.getenv("GATEWAY_YOUTUBE_SERVICE_URL", "http://127.0.0.1:8002")
GATEWAY_PLANS_SERVICE_URL = os.getenv("GATEWAY_PLANS_SERVICE_URL", "http://127.0.0.1:8003")
SERVICE_REQUEST_TIMEOUT_SECS = float(os.getenv("SERVICE_REQUEST_TIMEOUT_SECS", "30"))

## GOOGLE API
GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
YOUTUBE_SUBSCRIPTIONS_API = "https://www.googleapis.com/youtube/v3/subscriptions"
YOUTUBE_OAUTH_STATE_SECRET = os.getenv("YOUTUBE_OAUTH_STATE_SECRET", "")
YOUTUBE_TOKEN_ENCRYPTION_KEY = os.getenv("YOUTUBE_TOKEN_ENCRYPTION_KEY", "")

## AI DUMMY JSON Setup
AI_DUMMY_LEARNING_PLAN_BM = Path(__file__).parent / "json-dumps" / "04_learning-plan_bm.json"
AI_DUMMY_LEARNING_PLAN_BBGO = Path(__file__).parent / "json-dumps" / "04_learning-plan_bbgo.json"
AI_DUMMY_LEARNING_PLAN = AI_DUMMY_LEARNING_PLAN_BBGO
