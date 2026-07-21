"""Public-path ownership rules for the API gateway."""

import re

from . import config


_PLAYLIST_PATH = re.compile(r"^/api/[^/]+/playlists$")


def select_upstream(path: str) -> tuple[str, str]:
    if (
        path.startswith("/auth/")
        or path.startswith("/api/integrations/")
        or path in {"/api/channels", "/api/videos"}
        or _PLAYLIST_PATH.match(path)
    ):
        return "youtube-service", config.YOUTUBE_SERVICE_URL.rstrip("/")
    if path.startswith("/api/"):
        return "plans-service", config.PLANS_SERVICE_URL.rstrip("/")
    return "", ""
