import unittest

from src.y2026.youtube_agent_2.backend.services.gateway.app.routing import (
    select_upstream,
)


class GatewayRoutingTests(unittest.TestCase):
    def test_routes_catalog_and_plan_paths_to_their_owners(self):
        self.assertEqual(select_upstream("/api/channels")[0], "youtube-service")
        self.assertEqual(select_upstream("/api/plans")[0], "plans-service")


if __name__ == "__main__":
    unittest.main()
