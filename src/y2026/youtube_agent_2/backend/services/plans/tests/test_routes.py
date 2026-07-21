import unittest

from src.y2026.youtube_agent_2.backend.services.plans.app.main import app
from src.y2026.youtube_agent_2.backend.services.plans.app import config


class PlansRouteTests(unittest.TestCase):
    def test_course_generation_fixture_is_packaged(self):
        self.assertTrue(config.AI_DUMMY_LEARNING_PLAN.is_file())

    def test_service_exposes_plans_but_not_youtube_oauth(self):
        paths = set(app.openapi()["paths"])
        self.assertIn("/api/plans", paths)
        self.assertIn("/api/sources/sync-metadata", paths)
        self.assertNotIn("/auth/google/login", paths)


if __name__ == "__main__":
    unittest.main()
