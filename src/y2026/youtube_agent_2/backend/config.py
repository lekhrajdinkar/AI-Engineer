import os
from pathlib import Path

DEMO_CHANNELS = []

DB_PATH = Path(__file__).parent / "youtubeldb.sqlite3"

# Firebase is enabled explicitly so local development can continue to use the
# existing SQLite fixture until Firestore credentials are configured.
FIREBASE_ENABLED = os.getenv("FIREBASE_ENABLED", "false").lower() == "true"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "agent-2026-d3f51")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
FIREBASE_DEFAULT_USER_ID = os.getenv("FIREBASE_DEFAULT_USER_ID", "legacy-single-user")
FIREBASE_AUTH_REQUIRED = os.getenv("FIREBASE_AUTH_REQUIRED", "true" if FIREBASE_ENABLED else "false").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
YOUTUBE_SUBSCRIPTIONS_API = "https://www.googleapis.com/youtube/v3/subscriptions"

TRIM_VIDEO_DESC = True

ALLOWED_PREBUILT_LABELS = {"watched", "mark_for_delete", "bookmarked"}

AI_DUMMY_LEARNING_PLAN_BM = Path(__file__).parent / "json-dumps" / "04_learning-plan_bm.json"
AI_DUMMY_LEARNING_PLAN_BBGO = Path(__file__).parent / "json-dumps" / "04_learning-plan_bbgo.json"
AI_DUMMY_LEARNING_PLAN = AI_DUMMY_LEARNING_PLAN_BBGO
