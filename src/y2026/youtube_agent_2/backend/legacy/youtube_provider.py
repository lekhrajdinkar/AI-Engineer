"""In-process YouTube adapter used only by the legacy combined application."""

from src.y2026.youtube_agent_2.backend.services.youtube.app.infrastructure import (
    youtube_client,
)


class LegacyLocalYouTubeProvider:
    def list_channels(self) -> list[dict]:
        return youtube_client.list_subscribed_channels()

    def get_channel_playlists(self, channel_id: str) -> list[dict]:
        return youtube_client.get_channel_playlists(channel_id)

    def get_playlist_videos(self, playlist_id: str) -> list[dict]:
        return youtube_client.get_playlist_videos(playlist_id)

    def get_channel_videos(self, channel_id: str) -> list[dict]:
        return youtube_client.get_channel_videos(channel_id)
