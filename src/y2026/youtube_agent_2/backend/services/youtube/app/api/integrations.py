"""HTTP routes for external account integrations."""

from fastapi import APIRouter

from src.y2026.youtube_agent_2.backend.services.youtube.app.domain import youtube_oauth

router = APIRouter()


@router.post("/api/integrations/youtube/connect", tags=["integrations"])
def start_youtube_connection():
    return youtube_oauth.start_connection()


@router.get("/api/integrations/youtube/status", tags=["integrations"])
def youtube_connection_status():
    return youtube_oauth.connection_status()


@router.get("/auth/google/callback", tags=["auth"])
def google_callback(code: str | None = None, error: str | None = None, state: str | None = None):
    return youtube_oauth.callback(code, error, state)
