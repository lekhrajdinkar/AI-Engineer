"""HTTP routes for source synchronization and feed staging."""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.y2026.youtube_agent_2.backend.services.plans.app.domain import (
    feed_organization,
    source_sync as sync_service,
)


router = APIRouter(tags=["source-sync"])


class ManualFeedPushRequest(BaseModel):
    channel_id: str
    plan_id: str
    course_id: str
    playlist_id: Optional[str] = None
    module_id: Optional[str] = None
    new_module_title: Optional[str] = None
    video_ids: list[str] = Field(min_length=1)


class OrganizeFeedRequest(BaseModel):
    channel_id: str
    model_config_id: str
    playlist_id: Optional[str] = None
    video_ids: list[str] = Field(min_length=1)
    user_prompt: Optional[str] = None
    previous_suggestion: Optional[dict] = None


class ConfirmOrganizationRequest(BaseModel):
    channel_id: str
    playlist_id: Optional[str] = None
    placements: list[feed_organization.SuggestedPlacement] = Field(min_length=1)


@router.get("/api/sources/sync-metadata")
def get_source_sync_metadata():
    return sync_service.get_sync_metadata()


@router.post("/api/sources/sync-metadata")
def sync_source_metadata(channel_id: Optional[str] = None):
    return sync_service.sync_metadata(channel_id)


@router.post("/api/sources/sync-metadata/push-new-feeds")
def push_new_source_feeds(request: ManualFeedPushRequest):
    return sync_service.push_new_feeds(
        channel_id=request.channel_id,
        playlist_id=request.playlist_id,
        plan_id=request.plan_id,
        course_id=request.course_id,
        module_id=request.module_id,
        new_module_title=request.new_module_title,
        video_ids=request.video_ids,
    )


@router.post("/api/sources/sync-metadata/organize-new-feeds")
def organize_new_source_feeds(request: OrganizeFeedRequest):
    return feed_organization.suggest_organization(
        channel_id=request.channel_id,
        playlist_id=request.playlist_id,
        video_ids=request.video_ids,
        model_config_id=request.model_config_id,
        user_prompt=request.user_prompt,
        previous_suggestion=request.previous_suggestion,
    )


@router.post("/api/sources/sync-metadata/confirm-organization")
def confirm_source_feed_organization(request: ConfirmOrganizationRequest):
    return feed_organization.apply_organization(
        channel_id=request.channel_id,
        playlist_id=request.playlist_id,
        placements=request.placements,
    )


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
