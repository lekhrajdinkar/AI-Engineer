import gc
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.main import app
from src.y2026.youtube_agent_2.backend.services.plans.app.models import LearningPlan
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store


class AiRequestRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = config.DB_PATH
        self.original_groq_api_key = config.GROQ_API_KEY
        self.original_firestore_store = store._firestore_store
        config.DB_PATH = Path(self.temp_dir.name) / "plans-api-test.sqlite3"
        config.GROQ_API_KEY = "test-groq-key"
        store._firestore_store = None
        store.init_store()
        model_config = store.load_ai_model_config(config.AI_LLM_CONFIG_ID)
        model_config["credential_status"] = "configured"
        model_config["test_status"] = "passed"
        store.save_ai_model_config(model_config)
        store.save_plan(
            LearningPlan(id="plan-1", name="AI Engineering").model_dump()
        )
        store.save_plan(
            LearningPlan(id="plan-2", name="Another Plan").model_dump()
        )
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        store._firestore_store = self.original_firestore_store
        config.GROQ_API_KEY = self.original_groq_api_key
        config.DB_PATH = self.original_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def _payload(self, video_id="video-1"):
        return {
            "model_config_id": config.AI_LLM_CONFIG_ID,
            "processing": {"mode": "batch", "batch_size": 30},
            "organization_context": {
                "mode": "title_only",
                "description_max_words": 200,
                "max_tags_per_video": 12,
            },
            "videos": [
                {
                    "video_id": video_id,
                    "title": "LangGraph introduction",
                    "revised_title_from_ai": "LangGraph introduction",
                    "thumbnail": "",
                    "channel_id": "channel-1",
                    "playlist_id": "playlist-1",
                }
            ],
            "source_channels": [
                {
                    "channel_id": "channel-1",
                    "title": "AI Engineering",
                    "url": "https://youtube.example/channel-1",
                    "playlists": [
                        {
                            "playlist_id": "playlist-1",
                            "title": "LangGraph",
                        }
                    ],
                }
            ],
        }

    def _submit(self, video_id="video-1"):
        response = self.client.post(
            "/api/plans/plan-1/ai-course-requests",
            json=self._payload(video_id),
        )
        self.assertEqual(response.status_code, 202, response.text)
        return response.json()

    def test_submit_list_and_detail_contracts(self):
        accepted = self._submit()
        request_id = accepted["request_id"]

        self.assertEqual(accepted["status"], "queued")
        self.assertEqual(
            accepted["status_url"],
            f"/api/plans/plan-1/ai-course-requests/{request_id}",
        )

        listed = self.client.get("/api/plans/plan-1/ai-course-requests")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["items"][0]["id"], request_id)
        self.assertNotIn("captured_videos", listed.json()["items"][0])

        detail = self.client.get(accepted["status_url"])
        self.assertEqual(detail.status_code, 200)
        body = detail.json()
        self.assertEqual(body["captured_videos"][0]["video_id"], "video-1")
        self.assertEqual(body["selected_sources"][0]["playlists"], ["LangGraph"])
        self.assertEqual(body["selected_sources"][0]["video_count"], 1)
        self.assertEqual(body["batches"], [])
        self.assertEqual(body["attempts"], [])

        wrong_plan = self.client.get(
            f"/api/plans/plan-2/ai-course-requests/{request_id}"
        )
        self.assertEqual(wrong_plan.status_code, 404)

    def test_cancel_is_idempotent_and_retry_creates_a_new_request(self):
        accepted = self._submit()
        request_id = accepted["request_id"]
        cancel_url = f"{accepted['status_url']}/cancel"

        cancelled = self.client.post(cancel_url)
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json()["status"], "cancelled")
        self.assertEqual(self.client.post(cancel_url).json()["status"], "cancelled")

        detail = self.client.get(accepted["status_url"]).json()
        self.assertEqual(detail["attempts"][-1]["event"], "Request cancelled by user")

        retried = self.client.post(f"{accepted['status_url']}/retry")
        self.assertEqual(retried.status_code, 202, retried.text)
        retry_body = retried.json()
        self.assertNotEqual(retry_body["request_id"], request_id)
        self.assertEqual(retry_body["retried_from_request_id"], request_id)

        retry_detail = self.client.get(retry_body["status_url"]).json()
        self.assertEqual(retry_detail["retried_from_request_id"], request_id)
        self.assertEqual(retry_detail["captured_videos"][0]["video_id"], "video-1")
        self.assertEqual(
            self.client.post(f"{retry_body['status_url']}/retry").status_code,
            409,
        )

    def test_list_supports_status_filter_and_opaque_cursor(self):
        first = self._submit("video-1")
        self.client.post(f"{first['status_url']}/cancel")
        second = self._submit("video-2")

        filtered = self.client.get(
            "/api/plans/plan-1/ai-course-requests?status=cancelled"
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual([item["id"] for item in filtered.json()["items"]], [first["request_id"]])

        first_page = self.client.get(
            "/api/plans/plan-1/ai-course-requests?limit=1"
        ).json()
        self.assertEqual(len(first_page["items"]), 1)
        self.assertIsNotNone(first_page["next_cursor"])
        second_page = self.client.get(
            "/api/plans/plan-1/ai-course-requests",
            params={"limit": 1, "cursor": first_page["next_cursor"]},
        )
        self.assertEqual(second_page.status_code, 200)
        self.assertEqual(len(second_page.json()["items"]), 1)
        self.assertNotEqual(
            second_page.json()["items"][0]["id"], first_page["items"][0]["id"]
        )
        self.assertEqual(
            self.client.get(
                "/api/plans/plan-1/ai-course-requests?cursor=not-valid"
            ).status_code,
            400,
        )

    def test_submission_validates_plan_model_and_capacity(self):
        missing_plan = self.client.post(
            "/api/plans/missing/ai-course-requests", json=self._payload()
        )
        self.assertEqual(missing_plan.status_code, 404)

        unknown_model = self._payload()
        unknown_model["model_config_id"] = "unknown-model"
        self.assertEqual(
            self.client.post(
                "/api/plans/plan-1/ai-course-requests", json=unknown_model
            ).status_code,
            422,
        )

        oversized_batch = self._payload()
        oversized_batch["processing"]["batch_size"] = config.AI_LLM_MAX_BATCH_SIZE + 1
        self.assertEqual(
            self.client.post(
                "/api/plans/plan-1/ai-course-requests", json=oversized_batch
            ).status_code,
            422,
        )

    def test_batch_submission_accepts_166_videos_without_llm_work(self):
        payload = self._payload()
        template = payload["videos"][0]
        payload["videos"] = [
            {
                **template,
                "video_id": f"video-{index}",
                "title": f"LangGraph lesson {index}",
                "revised_title_from_ai": f"LangGraph lesson {index}",
            }
            for index in range(166)
        ]

        response = self.client.post(
            "/api/plans/plan-1/ai-course-requests", json=payload
        )

        self.assertEqual(response.status_code, 202, response.text)
        parent = self.client.get(response.json()["status_url"]).json()
        self.assertEqual(parent["total_videos"], 166)
        self.assertEqual(parent["total_batches"], 6)
        self.assertEqual(parent["status"], "queued")


if __name__ == "__main__":
    unittest.main()
