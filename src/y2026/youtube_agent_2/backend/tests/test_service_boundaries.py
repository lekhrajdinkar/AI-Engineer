import unittest
from unittest.mock import patch
from pathlib import Path

from fastapi.testclient import TestClient

from src.y2026.youtube_agent_2.backend.shared.platform import create_app, identity, settings
from src.y2026.youtube_agent_2.backend.services.plans.app import config as plans_config
from src.y2026.youtube_agent_2.backend.services.plans.app.infrastructure.youtube_provider import (
    HttpYouTubeProvider,
)
from src.y2026.youtube_agent_2.backend.services.gateway.app.main import (
    app as gateway_app,
)
from src.y2026.youtube_agent_2.backend.services.gateway.app.routing import (
    select_upstream,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.main import app as plans_app
from src.y2026.youtube_agent_2.backend.services.youtube.app.main import app as youtube_app


def route_paths(app) -> set[str]:
    return set(app.openapi()["paths"])


class ServiceBoundaryTests(unittest.TestCase):
    def test_services_do_not_import_another_services_app_package(self):
        services_root = Path(__file__).resolve().parents[1] / "services"
        service_names = {"gateway", "youtube", "plans"}
        for owner in service_names:
            for source_file in (services_root / owner / "app").rglob("*.py"):
                source = source_file.read_text(encoding="utf-8")
                for other in service_names - {owner}:
                    forbidden = f"backend.services.{other}.app"
                    self.assertNotIn(forbidden, source, f"{source_file} imports {other}")

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
            return {"user_id": identity.current_user_id()}

        with patch.object(settings, "FIREBASE_AUTH_REQUIRED", True), patch.object(
            settings, "INTERNAL_SERVICE_TOKEN", "test-service-secret"
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
        self.assertIsNone(identity.current_user_id())

    def test_http_provider_has_a_local_user_fallback(self):
        provider = HttpYouTubeProvider("http://youtube-service:8002")
        with patch.object(
            plans_config, "INTERNAL_SERVICE_TOKEN", "test-service-secret"
        ):
            self.assertEqual(
                provider._headers()["X-Internal-User-ID"],
                plans_config.FIREBASE_DEFAULT_USER_ID,
            )

    def test_plans_api_keeps_the_existing_create_contract(self):
        client = TestClient(plans_app)
        with patch.object(settings, "FIREBASE_AUTH_REQUIRED", False), patch(
            "src.y2026.youtube_agent_2.backend.services.plans.app.domain.plans.db.save_plan"
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
