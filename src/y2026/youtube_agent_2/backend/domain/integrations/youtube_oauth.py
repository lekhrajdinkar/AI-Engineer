"""Per-user YouTube OAuth operations."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time

from fastapi import HTTPException
from starlette.responses import RedirectResponse

from src.y2026.youtube_agent_2.backend import config, db, youtube_client


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
    uid = db.current_user_id()
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase identity required")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google YouTube OAuth is not configured")
    return {"authorize_url": youtube_client.get_oauth_authorize_url(client_id, redirect_uri, "https://www.googleapis.com/auth/youtube.readonly", _create_state(uid))}


def connection_status() -> dict:
    tokens = db.load_latest_tokens("google")
    return {"connected": bool(tokens and tokens.get("refresh_token")), "scope": tokens.get("scope") if tokens else None, "connected_at": tokens.get("created_at") if tokens else None}


def login() -> RedirectResponse:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured in environment")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback")
    return RedirectResponse(youtube_client.get_oauth_authorize_url(client_id, redirect_uri, "https://www.googleapis.com/auth/youtube.readonly openid email"))


def callback(code: str | None, error: str | None, state: str | None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code parameter")
    uid = _verify_state(state) if config.FIREBASE_ENABLED else None
    context_token = db.set_current_user(uid) if uid else None
    try:
        tokens = youtube_client.exchange_code_for_tokens(code, os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET"), os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback"))
    finally:
        if context_token:
            db.reset_current_user(context_token)
    if not tokens:
        raise HTTPException(status_code=400, detail="Token exchange failed")
    if config.FIREBASE_ENABLED:
        return RedirectResponse(f"{config.FRONTEND_URL.rstrip('/')}/profile?youtube=connected")
    return {"message": "authentication successful", "next": "/", "info": "Tokens saved (single-user demo)"}


def debug() -> dict:
    tokens = db.load_latest_tokens("google")
    if not tokens:
        return {"status": "no tokens stored"}
    return {"status": "token found", "has_access_token": "access_token" in tokens, "has_refresh_token": "refresh_token" in tokens, "scope": tokens.get("scope", "NOT PRESENT"), "token_type": tokens.get("token_type"), "created_at": tokens.get("created_at")}


def logout() -> dict:
    # Legacy single-user SQLite endpoint retained for API compatibility.
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute("DELETE FROM tokens WHERE provider = ?", ("google",))
    conn.commit()
    conn.close()
    return {"message": "logged out", "next": "/auth/google/login"}
