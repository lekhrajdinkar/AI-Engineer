"""Configuration owned by the API gateway."""

import os

from src.y2026.youtube_agent_2.backend.shared.platform import settings


YOUTUBE_SERVICE_URL = os.getenv(
    "GATEWAY_YOUTUBE_SERVICE_URL", "http://127.0.0.1:8002"
)
PLANS_SERVICE_URL = os.getenv(
    "GATEWAY_PLANS_SERVICE_URL", "http://127.0.0.1:8003"
)
REQUEST_TIMEOUT_SECS = settings.SERVICE_REQUEST_TIMEOUT_SECS
