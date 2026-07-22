import gc
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.main import app
from src.y2026.youtube_agent_2.backend.services.plans.app.models import LearningPlan
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store


class AiModelConfigRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = config.DB_PATH
        self.original_firestore_store = store._firestore_store
        self.original_groq_key = config.GROQ_API_KEY
        self.original_google_key = config.GOOGLE_API_KEY
        self.original_openai_key = config.OPENAI_API_KEY
        config.DB_PATH = Path(self.temp_dir.name) / "model-config-test.sqlite3"
        config.GROQ_API_KEY = ""
        config.GOOGLE_API_KEY = "test-google-key"
        config.OPENAI_API_KEY = ""
        store._firestore_store = None
        store.init_store()
        store.save_plan(LearningPlan(id="plan-1", name="Model Test Plan").model_dump())
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        store._firestore_store = self.original_firestore_store
        config.GROQ_API_KEY = self.original_groq_key
        config.GOOGLE_API_KEY = self.original_google_key
        config.OPENAI_API_KEY = self.original_openai_key
        config.DB_PATH = self.original_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def _google_config(self, **overrides):
        payload = {
            "name": "Gemini Flash",
            "provider": "google",
            "model": "gemini-2.0-flash",
            "enabled": True,
            "is_default": False,
            "temperature": 0,
            "structured_output_mode": "json_schema",
            "max_input_tokens": 100000,
            "default_batch_size": 60,
            "max_batch_size": 120,
            "max_whole_videos": 80,
            "fallback_model_config_id": None,
        }
        payload.update(overrides)
        return payload

    def _course_request(self, model_config_id):
        return {
            "model_config_id": model_config_id,
            "processing": {"mode": "batch", "batch_size": 30},
            "organization_context": {
                "mode": "title_only",
                "description_max_words": 200,
                "max_tags_per_video": 12,
            },
            "videos": [
                {
                    "video_id": "video-1",
                    "title": "Agent foundations",
                    "revised_title_from_ai": "Agent foundations",
                    "thumbnail": "",
                    "channel_id": "channel-1",
                }
            ],
            "source_channels": [],
        }

    def test_seeded_config_is_safe_and_secrets_are_rejected(self):
        response = self.client.get("/api/ai-model-configs")

        self.assertEqual(response.status_code, 200)
        seeded = response.json()["items"][0]
        self.assertEqual(seeded["id"], config.AI_LLM_CONFIG_ID)
        self.assertEqual(seeded["credential_status"], "missing")
        self.assertNotIn("api_key", seeded)

        unsafe = self._google_config(api_key="must-not-be-accepted")
        self.assertEqual(
            self.client.post("/api/ai-model-configs", json=unsafe).status_code,
            422,
        )

    def test_create_test_filter_update_and_default_switch(self):
        created = self.client.post(
            "/api/ai-model-configs", json=self._google_config()
        )
        self.assertEqual(created.status_code, 201, created.text)
        model = created.json()
        self.assertEqual(model["credential_status"], "configured")
        self.assertEqual(model["test_status"], "untested")
        self.assertEqual(
            self.client.get("/api/ai-model-configs?enabled=true").json()["items"],
            [],
        )

        with patch(
            "src.y2026.youtube_agent_2.backend.services.plans.app.api.ai_model_configs.requests.get",
            return_value=SimpleNamespace(ok=True, status_code=200),
        ):
            tested = self.client.post(f"/api/ai-model-configs/{model['id']}/test")

        self.assertEqual(tested.status_code, 200)
        self.assertTrue(tested.json()["success"])
        self.assertEqual(tested.json()["config"]["test_status"], "passed")
        self.assertNotIn("test-google-key", tested.text)
        selectable = self.client.get(
            "/api/ai-model-configs?enabled=true"
        ).json()["items"]
        self.assertEqual([item["id"] for item in selectable], [model["id"]])

        updated = self.client.patch(
            f"/api/ai-model-configs/{model['id']}",
            json={"name": "Gemini Flash Primary", "is_default": True},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(updated.json()["is_default"])
        all_configs = self.client.get("/api/ai-model-configs").json()["items"]
        old_default = next(item for item in all_configs if item["id"] == config.AI_LLM_CONFIG_ID)
        self.assertFalse(old_default["is_default"])

        reset = self.client.patch(
            f"/api/ai-model-configs/{model['id']}",
            json={"model": "gemini-2.5-flash"},
        )
        self.assertEqual(reset.json()["test_status"], "untested")

    def test_fallback_cycles_are_rejected(self):
        google = self.client.post(
            "/api/ai-model-configs", json=self._google_config()
        ).json()
        openai = self.client.post(
            "/api/ai-model-configs",
            json={
                **self._google_config(),
                "name": "OpenAI Mini",
                "provider": "openai",
                "model": "gpt-4.1-mini",
                "default_batch_size": 30,
                "max_batch_size": 60,
                "fallback_model_config_id": google["id"],
            },
        ).json()

        cycle = self.client.patch(
            f"/api/ai-model-configs/{google['id']}",
            json={"fallback_model_config_id": openai["id"]},
        )
        self.assertEqual(cycle.status_code, 422)

    def test_referenced_config_is_soft_deleted_and_snapshot_survives(self):
        model = self.client.post(
            "/api/ai-model-configs", json=self._google_config()
        ).json()
        with patch(
            "src.y2026.youtube_agent_2.backend.services.plans.app.api.ai_model_configs.requests.get",
            return_value=SimpleNamespace(ok=True, status_code=200),
        ):
            self.client.post(f"/api/ai-model-configs/{model['id']}/test")

        accepted = self.client.post(
            "/api/plans/plan-1/ai-course-requests",
            json=self._course_request(model["id"]),
        )
        self.assertEqual(accepted.status_code, 202, accepted.text)

        deleted = self.client.delete(f"/api/ai-model-configs/{model['id']}")
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.json()["soft_deleted"])
        self.assertEqual(
            self.client.get(f"/api/ai-model-configs/{model['id']}").status_code,
            405,
        )
        self.assertIsNone(store.load_ai_model_config(model["id"]))
        archived = store.load_ai_model_config(model["id"], include_deleted=True)
        self.assertIsNotNone(archived)

        detail = self.client.get(accepted.json()["status_url"])
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["model_snapshot"]["name"], "Gemini Flash")

    def test_fallback_is_immutable_inside_request_snapshot(self):
        fallback = self.client.post(
            "/api/ai-model-configs",
            json={
                **self._google_config(),
                "name": "OpenAI Fallback",
                "provider": "openai",
                "model": "gpt-4.1-mini",
                "default_batch_size": 30,
                "max_batch_size": 60,
            },
        ).json()
        primary = self.client.post(
            "/api/ai-model-configs",
            json=self._google_config(fallback_model_config_id=fallback["id"]),
        ).json()
        with patch(
            "src.y2026.youtube_agent_2.backend.services.plans.app.api.ai_model_configs.requests.get",
            return_value=SimpleNamespace(ok=True, status_code=200),
        ):
            self.client.post(f"/api/ai-model-configs/{primary['id']}/test")

        accepted = self.client.post(
            "/api/plans/plan-1/ai-course-requests",
            json=self._course_request(primary["id"]),
        ).json()
        self.client.patch(
            f"/api/ai-model-configs/{fallback['id']}",
            json={"name": "Renamed after submission"},
        )

        snapshot = self.client.get(accepted["status_url"]).json()["model_snapshot"]
        self.assertEqual(
            snapshot["fallback_model_snapshot"]["name"], "OpenAI Fallback"
        )


if __name__ == "__main__":
    unittest.main()
