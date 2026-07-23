import unittest

from src.y2026.youtube_agent_2.backend.services.plans.app.main import app


class PlansRouteTests(unittest.TestCase):
    def test_course_generation_accepts_a_request_body(self):
        operation = app.openapi()["paths"][
            "/api/plans/{plan_id}/add-course-ai-suggested"
        ]["post"]
        self.assertIn("requestBody", operation)

    def test_service_exposes_plans_but_not_youtube_oauth(self):
        paths = set(app.openapi()["paths"])
        self.assertIn("/api/plans", paths)
        self.assertIn("/api/sources/sync-metadata", paths)
        self.assertIn("/api/sources/sync-metadata/organize-new-feeds", paths)
        self.assertIn("/api/sources/sync-metadata/confirm-organization", paths)
        self.assertNotIn("/auth/google/login", paths)


if __name__ == "__main__":
    unittest.main()
