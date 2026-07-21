"""Compatibility facade for service-specific configuration modules.

New service code must import its own ``app.config`` module or shared platform
settings directly.
"""

from src.y2026.youtube_agent_2.backend.shared.platform.settings import (
    BACKEND_ROOT as BASE_DIR,
    FIREBASE_AUTH_REQUIRED,
    FIREBASE_DEFAULT_USER_ID,
    FIREBASE_ENABLED,
    FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_ACCOUNT_JSON,
    FRONTEND_URL,
    INTERNAL_SERVICE_TOKEN,
    SERVICE_REQUEST_TIMEOUT_SECS,
)
from src.y2026.youtube_agent_2.backend.services.gateway.app.config import (
    PLANS_SERVICE_URL as GATEWAY_PLANS_SERVICE_URL,
    YOUTUBE_SERVICE_URL as GATEWAY_YOUTUBE_SERVICE_URL,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.config import (
    AI_DUMMY_LEARNING_PLAN,
    AI_DUMMY_LEARNING_PLAN_BBGO,
    AI_DUMMY_LEARNING_PLAN_BM,
    ALLOWED_PREBUILT_LABELS,
    DB_PATH,
    YOUTUBE_SERVICE_URL,
)
from src.y2026.youtube_agent_2.backend.services.youtube.app.config import (
    DEMO_CHANNELS,
    GOOGLE_OAUTH_AUTHORIZE,
    GOOGLE_OAUTH_TOKEN,
    TRIM_VIDEO_DESC,
    YOUTUBE_OAUTH_STATE_SECRET,
    YOUTUBE_SUBSCRIPTIONS_API,
    YOUTUBE_TOKEN_ENCRYPTION_KEY,
)
