"""Per-user YouTube OAuth operations."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import HTTPException
from starlette.responses import RedirectResponse

from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.services.youtube.app import config
from src.y2026.youtube_agent_2.backend.services.youtube.app.infrastructure import youtube_client
from src.y2026.youtube_agent_2.backend.services.youtube.app.repositories import token_store


def _create_state(uid: str) -> str:
    if not config.YOUTUBE_OAUTH_STATE_SECRET:
        raise HTTPException(status_code=500, detail="YOUTUBE_OAUTH_STATE_SECRET not configured")
    payload = json.dumps({"uid": uid, "exp": int(time.time()) + 600, "nonce": secrets.token_urlsafe(16)}).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(config.YOUTUBE_OAUTH_STATE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def _verify_state(state: str | None) -> str:
    if not state or not config.YOUTUBE_OAUTH_STATE_SECRET:
        raise HTTPException(status_code=400, detail="Missing or invalid OAuth state")
    try:
        encoded, signature = state.rsplit(".", 1)
        expected = hmac.new(config.YOUTUBE_OAUTH_STATE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if int(payload["exp"]) < time.time():
            raise ValueError("expired")
        return payload["uid"]
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Missing or invalid OAuth state")


def start_connection() -> dict:
    uid = identity.current_user_id()
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase identity required")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google YouTube OAuth is not configured")
    return {"authorize_url": youtube_client.get_oauth_authorize_url(client_id, redirect_uri, "https://www.googleapis.com/auth/youtube.readonly", _create_state(uid))}


def connection_status() -> dict:
    tokens = token_store.load_latest_tokens("google")
    return {"connected": bool(tokens and tokens.get("refresh_token")), "scope": tokens.get("scope") if tokens else None, "connected_at": tokens.get("created_at") if tokens else None}


def callback(code: str | None, error: str | None, state: str | None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code parameter")
    uid = _verify_state(state)
    context_token = identity.set_current_user(uid)
    try:
        tokens = youtube_client.exchange_code_for_tokens(code, os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET"), os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback"))
    finally:
        identity.reset_current_user(context_token)
    if not tokens:
        raise HTTPException(status_code=400, detail="Token exchange failed")
    return RedirectResponse(f"{config.FRONTEND_URL.rstrip('/')}/profile?youtube=connected")
