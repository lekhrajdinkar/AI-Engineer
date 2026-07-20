import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from src.y2026.youtube_agent_2.backend import config, db
from src.y2026.youtube_agent_2.backend.app import create_app
from src.y2026.youtube_agent_2.backend.domain.sources.provider import (
    HttpYouTubeProvider,
)
from src.y2026.youtube_agent_2.backend.main import app as legacy_app
from src.y2026.youtube_agent_2.backend.services.gateway.main import (
    app as gateway_app,
    select_upstream,
)
from src.y2026.youtube_agent_2.backend.services.plans.main import app as plans_app
from src.y2026.youtube_agent_2.backend.services.youtube.main import app as youtube_app


def route_paths(app) -> set[str]:
    return {route.path for route in app.routes}


class ServiceBoundaryTests(unittest.TestCase):
    def test_youtube_service_owns_only_integration_and_catalog_features(self):
        paths = route_paths(youtube_app)
        self.assertIn("/auth/google/login", paths)
        self.assertIn("/api/channels", paths)
        self.assertNotIn("/api/plans", paths)
        self.assertNotIn("/api/sources/sync-metadata", paths)

    def test_plans_service_owns_plan_and_workflow_features(self):
        paths = route_paths(plans_app)
        self.assertIn("/api/plans", paths)
        self.assertIn("/api/sources/sync-metadata", paths)
        self.assertIn("/api/plans/{plan_id}/add-course-ai-suggested", paths)
        self.assertNotIn("/auth/google/login", paths)
        self.assertNotIn("/api/channels", paths)

    def test_legacy_entry_point_preserves_both_route_sets(self):
        paths = route_paths(legacy_app)
        expected = (route_paths(youtube_app) | route_paths(plans_app)) - {
            "/",
            "/health",
            "/openapi.json",
            "/docs",
            "/docs/oauth2-redirect",
            "/redoc",
        }
        self.assertTrue(expected.issubset(paths))

    def test_gateway_routes_requests_to_the_owning_service(self):
        self.assertEqual(select_upstream("/auth/google/login")[0], "youtube-service")
        self.assertEqual(select_upstream("/api/channels")[0], "youtube-service")
        self.assertEqual(
            select_upstream("/api/channel-1/playlists")[0], "youtube-service"
        )
        self.assertEqual(select_upstream("/api/plans")[0], "plans-service")
        self.assertEqual(
            select_upstream("/api/sources/sync-metadata")[0], "plans-service"
        )

    def test_each_service_exposes_its_identity_in_health(self):
        self.assertEqual(
            TestClient(gateway_app).get("/health").json()["service"], "api-gateway"
        )
        self.assertEqual(
            TestClient(youtube_app).get("/health").json()["service"],
            "youtube-service",
        )
        self.assertEqual(
            TestClient(plans_app).get("/health").json()["service"], "plans-service"
        )

    def test_internal_calls_preserve_user_identity(self):
        internal_app = create_app(service_name="internal-test")

        @internal_app.get("/api/whoami")
        def whoami():
            return {"user_id": db.current_user_id()}

        with patch.object(config, "FIREBASE_AUTH_REQUIRED", True), patch.object(
            config, "INTERNAL_SERVICE_TOKEN", "test-service-secret"
        ):
            response = TestClient(internal_app).get(
                "/api/whoami",
                headers={
                    "X-Internal-Service-Token": "test-service-secret",
                    "X-Internal-User-ID": "firebase-user-1",
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"user_id": "firebase-user-1"})
        self.assertIsNone(db.current_user_id())

    def test_http_provider_has_a_local_user_fallback(self):
        provider = HttpYouTubeProvider("http://youtube-service:8002")
        with patch.object(config, "INTERNAL_SERVICE_TOKEN", "test-service-secret"):
            self.assertEqual(
                provider._headers()["X-Internal-User-ID"],
                config.FIREBASE_DEFAULT_USER_ID,
            )

    def test_plans_api_keeps_the_existing_create_contract(self):
        client = TestClient(plans_app)
        with patch.object(config, "FIREBASE_AUTH_REQUIRED", False), patch(
            "src.y2026.youtube_agent_2.backend.domain.plans.service.db.save_plan"
        ) as save_plan:
            response = client.post(
                "/api/plans",
                json={"name": "Microservices", "description": "Test plan"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["plan"]["name"], "Microservices")
        save_plan.assert_called_once()


if __name__ == "__main__":
    unittest.main()
