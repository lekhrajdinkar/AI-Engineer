import unittest
from types import SimpleNamespace
from unittest.mock import patch

from src.y2026.youtube_agent_2.backend.services.plans.app.domain import (
    feed_organization,
)


class FakeStructuredModel:
    def __init__(self):
        self.messages = None

    def with_structured_output(self, schema, **options):
        self.schema = schema
        self.options = options
        return self

    def invoke(self, messages):
        self.messages = messages
        return {
            "summary": "Place each video by topic.",
            "placements": [
                {
                    "video_id": "video-a",
                    "plan_id": "plan-a",
                    "course_id": "course-a",
                    "module_id": "module-a",
                    "reason": "Matches architecture.",
                }
            ],
        }


class FakeProvider:
    def supports_structured_output(self, method):
        return method == "json_schema"

    def structured_output_options(self, method):
        return {"method": method}


class FeedOrganizationTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {
            "channels": [
                {
                    "channel_id": "channel-a",
                    "target_courses": [
                        {"plan_id": "plan-a", "course_id": "course-a"}
                    ],
                    "new_videos": [
                        {
                            "video_id": "video-a",
                            "title": "Architecture patterns",
                            "description": "A concise architecture overview.",
                            "thumbnail": "must-not-be-sent",
                        },
                        {
                            "video_id": "video-b",
                            "title": "Databases",
                            "description": "Database internals.",
                        },
                    ],
                    "playlists": [],
                }
            ]
        }
        self.plan = {
            "id": "plan-a",
            "name": "Engineering",
            "description": "Engineering learning plan",
            "courses": [
                {
                    "id": "course-a",
                    "title": "Architecture",
                    "description": "Architecture course",
                    "source_channels": [],
                    "modules": [
                        {
                            "id": "module-a",
                            "title": "Patterns",
                            "sequence": 1,
                            "videos": [],
                        }
                    ],
                }
            ],
        }

    def test_suggestion_uses_trimmed_context_and_returns_reviewable_placement(self):
        model = FakeStructuredModel()
        model_config = SimpleNamespace(
            id="model-a",
            name="Model A",
            provider="fake",
            structured_output_mode="json_schema",
        )
        with (
            patch.object(
                feed_organization.db,
                "load_source_sync_metadata",
                return_value=self.metadata,
            ),
            patch.object(feed_organization.db, "load_plan", return_value=self.plan),
            patch.object(
                feed_organization,
                "_default_model",
                return_value=(model_config, model),
            ),
            patch.object(
                feed_organization.provider_registry,
                "require",
                return_value=FakeProvider(),
            ),
        ):
            result = feed_organization.suggest_organization(
                "channel-a", None, ["video-a"]
            )

        prompt = model.messages[1][1]
        self.assertIn("Engineering learning plan", prompt)
        self.assertIn("Architecture course", prompt)
        self.assertIn("Architecture patterns", prompt)
        self.assertNotIn("must-not-be-sent", prompt)
        self.assertEqual(
            result["proposal"]["placements"][0]["module_id"], "module-a"
        )

    def test_confirmed_proposal_moves_only_selected_videos(self):
        saved_plans = []
        saved_metadata = []
        placement = feed_organization.SuggestedPlacement(
            video_id="video-a",
            plan_id="plan-a",
            course_id="course-a",
            module_id="module-a",
            reason="Matches architecture.",
        )
        with (
            patch.object(
                feed_organization.db,
                "load_source_sync_metadata",
                return_value=self.metadata,
            ),
            patch.object(feed_organization.db, "load_plan", return_value=self.plan),
            patch.object(
                feed_organization.db,
                "save_plan",
                side_effect=lambda value: saved_plans.append(value),
            ),
            patch.object(
                feed_organization.db,
                "save_source_sync_metadata",
                side_effect=lambda value: saved_metadata.append(value),
            ),
        ):
            result = feed_organization.apply_organization(
                "channel-a", None, [placement]
            )

        videos = saved_plans[0]["courses"][0]["modules"][0]["videos"]
        self.assertEqual([video["video_id"] for video in videos], ["video-a"])
        self.assertEqual(
            [
                video["video_id"]
                for video in saved_metadata[0]["channels"][0]["new_videos"]
            ],
            ["video-b"],
        )
        self.assertEqual(result["pushed_videos"], 1)


if __name__ == "__main__":
    unittest.main()
