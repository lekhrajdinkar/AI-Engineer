"""HTTP adapter from plans workflows to the YouTube service."""

from __future__ import annotations

from typing import Protocol

import requests
from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.shared.contracts.youtube import (
    ChannelRecord,
    PlaylistRecord,
    VideoRecord,
)
from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.services.plans.app import config


class SourceProvider(Protocol):
    def list_channels(self) -> list[ChannelRecord]: ...

    def get_channel_playlists(self, channel_id: str) -> list[PlaylistRecord]: ...

    def get_playlist_videos(self, playlist_id: str) -> list[VideoRecord]: ...

    def get_channel_videos(
        self, channel_id: str, published_after: str | None = None
    ) -> list[VideoRecord]: ...


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
            "X-Internal-User-ID": identity.current_user_id()
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

    def get_channel_videos(
        self, channel_id: str, published_after: str | None = None
    ) -> list[dict]:
        params = {"channel_id": channel_id}
        if published_after:
            params["published_after"] = published_after
        return self._get("/api/videos", params).get("videos", [])


_provider_override: SourceProvider | None = None


def configure_source_provider(provider: SourceProvider | None) -> None:
    """Override the HTTP adapter from a controlled composition root or test."""
    global _provider_override
    _provider_override = provider


def get_source_provider() -> SourceProvider:
    return _provider_override or HttpYouTubeProvider(config.YOUTUBE_SERVICE_URL)
