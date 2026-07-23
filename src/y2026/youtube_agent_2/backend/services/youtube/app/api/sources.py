"""HTTP routes for content-source catalog operations."""

from fastapi import APIRouter

from src.y2026.youtube_agent_2.backend.services.youtube.app.domain import catalog

router = APIRouter()


@router.get("/api/channels", tags=["channels"])
def list_channels():
    return catalog.channels()


@router.get("/api/{channel_id}/playlists", tags=["playlists"])
def get_channel_playlists(channel_id: str):
    return catalog.playlists(channel_id)


@router.get("/api/videos", tags=["videos"])
def get_videos(
    channel_id: str | None = None,
    playlist_id: str | None = None,
    published_after: str | None = None,
):
    return catalog.videos(channel_id, playlist_id, published_after)
