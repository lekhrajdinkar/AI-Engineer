"""YouTube catalog provider used by source workflows.

The legacy application uses the local provider. In the plans microservice,
``YOUTUBE_SERVICE_URL`` selects the HTTP provider so OAuth tokens remain owned
by the YouTube service.
"""

from __future__ import annotations

from typing import Protocol

import requests
from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend import config, db, youtube_client


class SourceProvider(Protocol):
    def list_channels(self) -> list[dict]: ...

    def get_channel_playlists(self, channel_id: str) -> list[dict]: ...

    def get_playlist_videos(self, playlist_id: str) -> list[dict]: ...

    def get_channel_videos(self, channel_id: str) -> list[dict]: ...


class LocalYouTubeProvider:
    def list_channels(self) -> list[dict]:
        return youtube_client.list_subscribed_channels()

    def get_channel_playlists(self, channel_id: str) -> list[dict]:
        return youtube_client.get_channel_playlists(channel_id)

    def get_playlist_videos(self, playlist_id: str) -> list[dict]:
        return youtube_client.get_playlist_videos(playlist_id)

    def get_channel_videos(self, channel_id: str) -> list[dict]:
        return youtube_client.get_channel_videos(channel_id)


class HttpYouTubeProvider:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def _headers(self) -> dict[str, str]:
        if not config.INTERNAL_SERVICE_TOKEN:
            raise HTTPException(
                status_code=503,
                detail="INTERNAL_SERVICE_TOKEN is required for YouTube service calls",
            )
        return {
            "X-Internal-Service-Token": config.INTERNAL_SERVICE_TOKEN,
            "X-Internal-User-ID": db.current_user_id()
            or config.FIREBASE_DEFAULT_USER_ID,
        }

    def _get(self, path: str, params: dict | None = None) -> dict:
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                params=params,
                headers=self._headers(),
                timeout=config.SERVICE_REQUEST_TIMEOUT_SECS,
            )
        except requests.RequestException as error:
            raise HTTPException(status_code=503, detail=f"YouTube service unavailable: {error}") from error

        if not response.ok:
            try:
                detail = response.json().get("detail", response.text)
            except ValueError:
                detail = response.text
            raise HTTPException(status_code=response.status_code, detail=detail)
        return response.json()

    def list_channels(self) -> list[dict]:
        return self._get("/api/channels").get("channels", [])

    def get_channel_playlists(self, channel_id: str) -> list[dict]:
        return self._get(f"/api/{channel_id}/playlists").get("playlists", [])

    def get_playlist_videos(self, playlist_id: str) -> list[dict]:
        return self._get("/api/videos", {"channel_id": "internal", "playlist_id": playlist_id}).get("videos", [])

    def get_channel_videos(self, channel_id: str) -> list[dict]:
        return self._get("/api/videos", {"channel_id": channel_id}).get("videos", [])


def get_source_provider() -> SourceProvider:
    if config.YOUTUBE_SERVICE_URL:
        return HttpYouTubeProvider(config.YOUTUBE_SERVICE_URL)
    return LocalYouTubeProvider()
