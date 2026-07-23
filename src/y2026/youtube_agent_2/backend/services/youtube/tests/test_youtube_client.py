import unittest
from unittest.mock import patch

from src.y2026.youtube_agent_2.backend.services.youtube.app.infrastructure import (
    youtube_client,
)


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = ""

    def json(self):
        return self._payload


class YouTubeClientTests(unittest.TestCase):
    def test_channel_incremental_load_uses_activities_published_after(self):
        calls = []

        def fake_get(url, **kwargs):
            calls.append((url, kwargs.get("params", {})))
            if url.endswith("/activities"):
                return FakeResponse(
                    {
                        "items": [
                            {
                                "snippet": {
                                    "type": "upload",
                                    "title": "New upload",
                                    "description": "Description",
                                    "publishedAt": "2026-07-22T09:00:00Z",
                                },
                                "contentDetails": {
                                    "upload": {"videoId": "video-new"}
                                },
                            },
                            {
                                "snippet": {"type": "like"},
                                "contentDetails": {},
                            },
                        ]
                    }
                )
            if url.endswith("/videos"):
                return FakeResponse(
                    {
                        "items": [
                            {
                                "id": "video-new",
                                "snippet": {
                                    "title": "New upload",
                                    "description": "Description",
                                    "publishedAt": "2026-07-22T09:00:00Z",
                                    "thumbnails": {},
                                },
                                "contentDetails": {"duration": "PT2M"},
                                "status": {"embeddable": True},
                                "statistics": {},
                                "recordingDetails": {},
                            }
                        ]
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        with (
            patch.object(
                youtube_client.token_store,
                "load_latest_tokens",
                return_value={"access_token": "token"},
            ),
            patch.object(youtube_client.requests, "get", side_effect=fake_get),
        ):
            videos = youtube_client.get_channel_videos(
                "channel-a", "2026-07-20T10:00:00Z"
            )

        self.assertEqual(len(videos), 1)
        self.assertEqual(videos[0]["video_id"], "video-new")
        activity_call = next(call for call in calls if call[0].endswith("/activities"))
        self.assertEqual(
            activity_call[1]["publishedAfter"], "2026-07-20T10:00:00Z"
        )
        self.assertEqual(activity_call[1]["channelId"], "channel-a")

    def test_playlist_videos_preserve_membership_fields(self):
        def fake_get(url, **kwargs):
            if url.endswith("/playlistItems"):
                return FakeResponse(
                    {
                        "items": [
                            {
                                "id": "playlist-item-a",
                                "snippet": {
                                    "playlistId": "playlist-a",
                                    "publishedAt": "2026-07-22T08:00:00Z",
                                    "position": 0,
                                    "title": "An older video",
                                    "description": "",
                                    "resourceId": {"videoId": "video-a"},
                                    "thumbnails": {},
                                },
                                "contentDetails": {
                                    "videoId": "video-a",
                                    "videoPublishedAt": "2020-01-01T00:00:00Z",
                                },
                            }
                        ]
                    }
                )
            if url.endswith("/videos"):
                return FakeResponse(
                    {
                        "items": [
                            {
                                "id": "video-a",
                                "snippet": {
                                    "title": "An older video",
                                    "description": "",
                                    "publishedAt": "2020-01-01T00:00:00Z",
                                    "thumbnails": {},
                                },
                                "contentDetails": {"duration": "PT1M"},
                                "status": {},
                                "statistics": {},
                                "recordingDetails": {},
                            }
                        ]
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        with (
            patch.object(
                youtube_client.token_store,
                "load_latest_tokens",
                return_value={"access_token": "token"},
            ),
            patch.object(youtube_client.requests, "get", side_effect=fake_get),
        ):
            videos = youtube_client.get_playlist_videos("playlist-a")

        self.assertEqual(videos[0]["playlist_id"], "playlist-a")
        self.assertEqual(videos[0]["playlist_item_id"], "playlist-item-a")
        self.assertEqual(
            videos[0]["added_to_playlist_at"], "2026-07-22T08:00:00Z"
        )
        self.assertEqual(videos[0]["published_at"], "2020-01-01T00:00:00Z")

    def test_incremental_api_failure_is_not_treated_as_empty_feed(self):
        with (
            patch.object(
                youtube_client.token_store,
                "load_latest_tokens",
                return_value={"access_token": "token"},
            ),
            patch.object(
                youtube_client.requests,
                "get",
                return_value=FakeResponse({"error": "quota exceeded"}, 403),
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError, "activities API returned 403"
            ):
                youtube_client.get_channel_videos(
                    "channel-a", "2026-07-20T10:00:00Z"
                )


if __name__ == "__main__":
    unittest.main()
