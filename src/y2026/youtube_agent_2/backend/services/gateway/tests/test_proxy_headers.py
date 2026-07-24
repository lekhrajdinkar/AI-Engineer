import unittest
from unittest.mock import Mock

from src.y2026.youtube_agent_2.backend.services.gateway.app.main import (
    _upstream_request_headers,
)


class GatewayProxyHeaderTests(unittest.TestCase):
    def test_requests_uncompressed_upstream_response(self):
        request = Mock()
        request.headers = {
            "host": "youtube-learning-gateway.onrender.com",
            "accept-encoding": "gzip, deflate, br, zstd",
            "authorization": "Bearer firebase-token",
        }

        headers = _upstream_request_headers(request)

        self.assertEqual(headers["Accept-Encoding"], "identity")
        self.assertEqual(
            headers["X-Forwarded-Host"],
            "youtube-learning-gateway.onrender.com",
        )
        self.assertEqual(headers["authorization"], "Bearer firebase-token")
        self.assertNotIn("accept-encoding", headers)


if __name__ == "__main__":
    unittest.main()
