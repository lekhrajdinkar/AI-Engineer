import unittest

from src.y2026.youtube_agent_2.backend.services.youtube.app.main import app


class YouTubeRouteTests(unittest.TestCase):
    def test_service_exposes_catalog_but_not_plan_routes(self):
        paths = {route.path for route in app.routes}
        self.assertIn("/api/channels", paths)
        self.assertIn("/auth/google/login", paths)
        self.assertNotIn("/api/plans", paths)


if __name__ == "__main__":
    unittest.main()
