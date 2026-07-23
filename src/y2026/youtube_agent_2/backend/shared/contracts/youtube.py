"""Transport-only contracts for the YouTube catalog API.

These types describe data crossing a service boundary. They intentionally do
not contain YouTube or learning-plan business behavior.
"""

from typing import NotRequired, TypedDict


class ChannelRecord(TypedDict):
    channel_id: str
    title: str
    url: str
    thumbnail: NotRequired[str]
    source_created_at: NotRequired[str]
    videos_count: NotRequired[int]


class PlaylistRecord(TypedDict):
    playlist_id: str
    title: str
    description: NotRequired[str]
    thumbnail: NotRequired[str]
    source_created_at: NotRequired[str]
    videos_count: NotRequired[int]


class VideoRecord(TypedDict):
    video_id: str
    title: str
    description: NotRequired[str]
    thumbnail: NotRequired[str]
    url: NotRequired[str]
    published_at: NotRequired[str]
    playlist_id: NotRequired[str]
    playlist_item_id: NotRequired[str]
    added_to_playlist_at: NotRequired[str]
    duration_secs: NotRequired[int]
