import os
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.services.youtube.app import config
from src.y2026.youtube_agent_2.backend.services.youtube.app.domain import youtube_oauth
from src.y2026.youtube_agent_2.backend.shared.platform import identity


class YouTubeOAuthTests(unittest.TestCase):
    def test_connection_requires_verified_firebase_identity(self):
        with self.assertRaises(HTTPException) as raised:
            youtube_oauth.start_connection()
        self.assertEqual(raised.exception.status_code, 401)

    def test_callback_restores_firebase_uid_from_signed_state(self):
        original_secret = config.YOUTUBE_OAUTH_STATE_SECRET
        config.YOUTUBE_OAUTH_STATE_SECRET = "test-oauth-state-secret"
        context_token = identity.set_current_user("firebase-user-1")
        try:
            with patch.dict(
                os.environ,
                {
                    "GOOGLE_CLIENT_ID": "client-id",
                    "GOOGLE_CLIENT_SECRET": "client-secret",
                    "GOOGLE_REDIRECT_URI": "http://localhost:8001/auth/google/callback",
                },
            ):
                authorize_url = youtube_oauth.start_connection()["authorize_url"]
        finally:
            identity.reset_current_user(context_token)

        state = parse_qs(urlparse(authorize_url).query)["state"][0]
        observed_user_ids = []

        def exchange(*_args):
            observed_user_ids.append(identity.current_user_id())
            return {"access_token": "access", "refresh_token": "refresh"}

        try:
            with patch.object(
                youtube_oauth.youtube_client,
                "exchange_code_for_tokens",
                side_effect=exchange,
            ):
                response = youtube_oauth.callback("code", None, state)
        finally:
            config.YOUTUBE_OAUTH_STATE_SECRET = original_secret

        self.assertEqual(observed_user_ids, ["firebase-user-1"])
        self.assertIn("/profile?youtube=connected", response.headers["location"])
        self.assertIsNone(identity.current_user_id())


if __name__ == "__main__":
    unittest.main()
