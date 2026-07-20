"""Read-only YouTube source catalog operations."""

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend import config, youtube_client


def _trim_description(description: str | None) -> str | None:
    return description.split("\n\n")[0] if config.TRIM_VIDEO_DESC and description else description


def channels() -> dict:
    return {"channels": youtube_client.list_subscribed_channels()}


def playlists(channel_id: str) -> dict:
    return {"channel_id": channel_id, "playlists": youtube_client.get_channel_playlists(channel_id)}


def videos(channel_id: str | None, playlist_id: str | None) -> dict:
    if not channel_id:
        raise HTTPException(status_code=400, detail="channel_id is required")
    raw_videos = youtube_client.get_playlist_videos(playlist_id) if playlist_id else youtube_client.get_channel_videos(channel_id)
    result = [{**video, "description": _trim_description(video.get("description"))} for video in raw_videos]
    return {"channel_id": channel_id, **({"playlist_id": playlist_id} if playlist_id else {}), "videos": result}
