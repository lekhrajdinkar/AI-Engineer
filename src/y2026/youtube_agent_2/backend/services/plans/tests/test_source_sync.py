import unittest
from unittest.mock import patch

from src.y2026.youtube_agent_2.backend.services.plans.app.domain import source_sync


class FakeSourceProvider:
    def __init__(self):
        self.channel_requests = []

    def list_channels(self):
        raise AssertionError("A channel-scoped sync must not reload all subscriptions")

    def get_channel_playlists(self, channel_id):
        self.requested_playlists_for = channel_id
        return [
            {
                "playlist_id": "playlist-a",
                "title": "Playlist A",
                "videos_count": 2,
            }
        ]

    def get_channel_videos(self, channel_id, published_after=None):
        self.channel_requests.append((channel_id, published_after))
        return [
            {
                "video_id": "channel-new",
                "title": "New channel video",
                "published_at": "2026-07-22T09:00:00+00:00",
            }
        ]

    def get_playlist_videos(self, playlist_id):
        return [
            {
                "video_id": "playlist-old-video",
                "title": "Old video newly added to playlist",
                "published_at": "2020-01-01T00:00:00+00:00",
                "playlist_item_id": "playlist-item-new",
                "playlist_id": playlist_id,
                "added_to_playlist_at": "2026-07-22T08:00:00+00:00",
            }
        ]


class SourceSyncTests(unittest.TestCase):
    def test_get_metadata_rebinds_cached_targets_from_current_plans(self):
        previous = {
            "updated_at": "2026-07-21T12:00:00+00:00",
            "channels": [
                {
                    "channel_id": "channel-a",
                    "title": "Channel A",
                    "target_courses": [],
                    "new_videos": [{"video_id": "pending-video"}],
                    "playlists": [
                        {
                            "playlist_id": "playlist-a",
                            "target_courses": [],
                            "last_feed_checked_at": "2026-07-21T10:00:00+00:00",
                        }
                    ],
                }
            ],
        }
        channel_targets = [
            {
                "plan_id": "plan-a",
                "course_id": f"course-{index}",
                "course_sequence": index,
            }
            for index in range(1, 12)
        ]
        playlist_targets = [
            {
                "plan_id": "plan-a",
                "course_id": "playlist-course",
                "course_sequence": 12,
            }
        ]
        saved = []

        with (
            patch.object(
                source_sync.db,
                "load_source_sync_metadata",
                return_value=previous,
            ),
            patch.object(
                source_sync.db,
                "save_source_sync_metadata",
                side_effect=lambda metadata: saved.append(metadata),
            ),
            patch.object(
                source_sync,
                "_source_targets",
                return_value={
                    "channel-a": {
                        "target_courses": channel_targets,
                        "playlists": {"playlist-a": playlist_targets},
                    }
                },
            ),
        ):
            result = source_sync.get_sync_metadata()

        channel = result["channels"][0]
        self.assertEqual(len(channel["target_courses"]), 11)
        self.assertEqual(
            channel["playlists"][0]["target_courses"], playlist_targets
        )
        self.assertEqual(
            channel["new_videos"], previous["channels"][0]["new_videos"]
        )
        self.assertEqual(
            channel["playlists"][0]["last_feed_checked_at"],
            "2026-07-21T10:00:00+00:00",
        )
        self.assertEqual(saved, [result])

    def test_channel_sync_merges_one_channel_and_uses_feed_checkpoint(self):
        provider = FakeSourceProvider()
        previous = {
            "updated_at": "2026-07-21T12:00:00+00:00",
            "channels": [
                {
                    "channel_id": "channel-a",
                    "title": "Channel A",
                    "videos_count": 0,
                    "last_reconciled_videos_count": 0,
                    "last_feed_checked_at": "2026-07-21T10:00:00+00:00",
                    "target_courses": [
                        {
                            "plan_id": "plan-a",
                            "course_id": "course-a",
                            "course_sequence": 1,
                        }
                    ],
                    "new_videos": [
                        {
                            "video_id": "pending-video",
                            "title": "Already pending",
                            "published_at": "2026-07-21T11:00:00+00:00",
                        }
                    ],
                    "playlists": [
                        {
                            "playlist_id": "playlist-a",
                            "title": "Playlist A",
                            "last_feed_checked_at": "2026-07-21T10:00:00+00:00",
                            "target_courses": [
                                {
                                    "plan_id": "plan-a",
                                    "course_id": "course-a",
                                    "course_sequence": 1,
                                }
                            ],
                            "new_videos": [],
                        }
                    ],
                },
                {
                    "channel_id": "channel-b",
                    "title": "Channel B",
                    "new_videos": [{"video_id": "leave-me-alone"}],
                    "playlists": [],
                },
            ],
        }
        target_map = {
            "channel-a": {
                "target_courses": previous["channels"][0]["target_courses"],
                "playlists": {
                    "playlist-a": previous["channels"][0]["playlists"][0][
                        "target_courses"
                    ]
                },
            }
        }
        saved = []

        with (
            patch.object(source_sync, "get_source_provider", return_value=provider),
            patch.object(
                source_sync.db,
                "load_source_sync_metadata",
                return_value=previous,
            ),
            patch.object(
                source_sync.db,
                "save_source_sync_metadata",
                side_effect=lambda metadata: saved.append(metadata),
            ),
            patch.object(source_sync, "_source_targets", return_value=target_map),
            patch.object(source_sync, "_apply_sync_to_courses"),
        ):
            result = source_sync.sync_metadata("channel-a")

        self.assertEqual(provider.requested_playlists_for, "channel-a")
        self.assertEqual(provider.channel_requests[0][0], "channel-a")
        self.assertEqual(
            provider.channel_requests[0][1],
            "2026-07-20T10:00:00+00:00",
        )
        self.assertEqual(result["channels"][1], previous["channels"][1])
        channel = result["channels"][0]
        self.assertEqual(
            {video["video_id"] for video in channel["new_videos"]},
            {"pending-video", "channel-new"},
        )
        self.assertEqual(
            channel["playlists"][0]["new_videos"][0]["video_id"],
            "playlist-old-video",
        )
        self.assertEqual(
            channel["playlists"][0]["new_videos"][0]["playlist_item_id"],
            "playlist-item-new",
        )
        self.assertEqual(saved[-1], result)

    def test_full_reconciliation_finds_missing_video_older_than_checkpoint(self):
        provider = FakeSourceProvider()

        def channel_videos(channel_id, published_after=None):
            provider.channel_requests.append((channel_id, published_after))
            return [
                {
                    "video_id": "known-video",
                    "title": "Known video",
                    "published_at": "2020-01-01T00:00:00+00:00",
                },
                {
                    "video_id": "VtiZXaomOTg",
                    "title": "Newest missing video",
                    "published_at": "2026-07-22T03:00:05+00:00",
                },
                {
                    "video_id": "ji05dvR6A8Y",
                    "title": "Older missing video",
                    "published_at": "2026-07-15T03:00:05+00:00",
                },
            ]

        provider.get_channel_videos = channel_videos
        with (
            patch.object(source_sync, "get_source_provider", return_value=provider),
            patch.object(
                source_sync,
                "_known_source_video_ids",
                return_value={"known-video"},
            ),
        ):
            videos = source_sync._new_source_videos(
                "channel-a",
                None,
                [{"plan_id": "plan-a", "course_id": "course-a"}],
                "2026-07-23T01:01:27+00:00",
                reconcile_full=True,
            )

        self.assertEqual(provider.channel_requests, [("channel-a", None)])
        self.assertEqual(
            [video["video_id"] for video in videos],
            ["VtiZXaomOTg", "ji05dvR6A8Y"],
        )

    def test_manual_push_creates_module_and_clears_selected_inbox(self):
        metadata = {
            "channels": [
                {
                    "channel_id": "channel-a",
                    "target_courses": [
                        {"plan_id": "plan-a", "course_id": "course-a"}
                    ],
                    "new_videos": [
                        {
                            "video_id": "video-new",
                            "title": "New video",
                            "published_at": "2026-07-22T09:00:00+00:00",
                        },
                        {
                            "video_id": "video-route-later",
                            "title": "Route later",
                            "published_at": "2026-07-22T10:00:00+00:00",
                        }
                    ],
                    "playlists": [],
                }
            ]
        }
        plan = {
            "id": "plan-a",
            "name": "Plan A",
            "courses": [
                {
                    "id": "course-a",
                    "title": "Course A",
                    "source_channels": [],
                    "modules": [],
                }
            ],
        }
        saved_plans = []
        saved_metadata = []
        with (
            patch.object(
                source_sync.db, "load_source_sync_metadata", return_value=metadata
            ),
            patch.object(source_sync.db, "load_plan", return_value=plan),
            patch.object(
                source_sync.db,
                "save_plan",
                side_effect=lambda value: saved_plans.append(value),
            ),
            patch.object(
                source_sync.db,
                "save_source_sync_metadata",
                side_effect=lambda value: saved_metadata.append(value),
            ),
        ):
            result = source_sync.push_new_feeds(
                channel_id="channel-a",
                plan_id="plan-a",
                course_id="course-a",
                new_module_title="Fresh uploads",
                video_ids=["video-new"],
            )

        module = saved_plans[0]["courses"][0]["modules"][0]
        self.assertEqual(module["title"], "Fresh uploads")
        self.assertEqual(module["videos"][0]["video_id"], "video-new")
        self.assertEqual(result["pushed_videos"], 1)
        self.assertEqual(
            [
                video["video_id"]
                for video in saved_metadata[0]["channels"][0]["new_videos"]
            ],
            ["video-route-later"],
        )


if __name__ == "__main__":
    unittest.main()
