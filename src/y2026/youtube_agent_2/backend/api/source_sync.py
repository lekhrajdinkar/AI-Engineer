"""HTTP routes for source synchronization and feed staging."""

from typing import Optional

from fastapi import APIRouter

from src.y2026.youtube_agent_2.backend.domain.sources import sync_service


router = APIRouter(tags=["source-sync"])


@router.get("/api/sources/sync-metadata")
def get_source_sync_metadata():
    return sync_service.get_sync_metadata()


@router.post("/api/sources/sync-metadata")
def sync_source_metadata():
    return sync_service.sync_metadata()


@router.post("/api/sources/sync-metadata/push-new-feeds")
def push_new_source_feeds(
    channel_id: Optional[str] = None, playlist_id: Optional[str] = None
):
    return sync_service.push_new_feeds(channel_id, playlist_id)


@router.post(
    "/api/plans/{plan_id}/courses/{course_id}/discover-new-videos",
    tags=["courses"],
)
def discover_new_videos(
    plan_id: str,
    course_id: str,
    channel_id: Optional[str] = None,
    playlist_id: Optional[str] = None,
):
    return sync_service.discover_new_videos(
        plan_id, course_id, channel_id, playlist_id
    )
