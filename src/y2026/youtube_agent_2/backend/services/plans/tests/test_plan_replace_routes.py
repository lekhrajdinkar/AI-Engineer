import gc
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.main import app
from src.y2026.youtube_agent_2.backend.services.plans.app.models import LearningPlan
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store


class PlanReplaceRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = config.DB_PATH
        self.original_firestore_store = store._firestore_store
        config.DB_PATH = Path(self.temp_dir.name) / "plan-replace-test.sqlite3"
        store._firestore_store = None
        store.init_store()
        store.save_plan(
            LearningPlan(
                id="plan-1",
                name="Original plan",
                description="Before upload",
            ).model_dump()
        )
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        store._firestore_store = self.original_firestore_store
        config.DB_PATH = self.original_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def test_replaces_complete_plan_json(self):
        original = self.client.get("/api/plans/plan-1").json()
        replacement = {
            **original,
            "name": "Uploaded plan",
            "description": "After upload",
            "labels": ["bookmarked"],
        }

        response = self.client.put("/api/plans/plan-1", json=replacement)

        self.assertEqual(response.status_code, 200)
        updated = response.json()["plan"]
        self.assertEqual(updated["name"], "Uploaded plan")
        self.assertEqual(updated["labels"], ["bookmarked"])
        self.assertEqual(updated["created_at"], original["created_at"])
        self.assertNotEqual(updated["updated_at"], original["updated_at"])
        self.assertEqual(
            self.client.get("/api/plans/plan-1").json()["description"],
            "After upload",
        )

    def test_rejects_a_different_plan_id(self):
        replacement = self.client.get("/api/plans/plan-1").json()
        replacement["id"] = "another-plan"

        response = self.client.put("/api/plans/plan-1", json=replacement)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "The uploaded plan id must match the current plan",
        )


if __name__ == "__main__":
    unittest.main()
