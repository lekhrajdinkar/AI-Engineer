"""Durable HTTP API for asynchronous AI course-generation requests."""

from __future__ import annotations

import base64
import binascii
from datetime import datetime, timezone
import json
import math
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseAttemptRecord,
    AiCourseBatchRecord,
    AiCourseRequest,
    AiCourseRequestDetails,
    AiCourseRequestRecord,
    AiCourseRequestStatus,
    AiCourseVideo,
    AiModelConfigRecord,
    LearningPlan,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store
from src.y2026.youtube_agent_2.backend.services.plans.app.domain.ai_capacity import (
    estimate_tokens,
    fits_capacity,
    safe_token_budget,
)
from src.y2026.youtube_agent_2.backend.shared.platform import identity


router = APIRouter(tags=["ai-course-requests"])


class AiCourseJobSubmission(AiCourseRequest):
    model_config_id: str = Field(min_length=1)


class AiCourseRequestAccepted(BaseModel):
    request_id: str
    status: str
    status_url: str


class AiCourseRequestRetryAccepted(AiCourseRequestAccepted):
    retried_from_request_id: str


class AiCourseRequestListResponse(BaseModel):
    items: list[AiCourseRequestRecord]
    next_cursor: str | None = None


class AiCourseSourceSummary(BaseModel):
    channel_id: str
    title: str
    playlists: list[str] = Field(default_factory=list)
    video_count: int = 0


class AiCourseRequestDetailResponse(AiCourseRequestRecord):
    request_options: dict[str, Any] = Field(default_factory=dict)
    selected_sources: list[AiCourseSourceSummary] = Field(default_factory=list)
    captured_videos: list[AiCourseVideo] = Field(default_factory=list)
    batches: list[AiCourseBatchRecord] = Field(default_factory=list)
    attempts: list[AiCourseAttemptRecord] = Field(default_factory=list)
    completion_summary: dict[str, Any] = Field(default_factory=dict)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _owner_id() -> str:
    return identity.current_user_id() or config.FIREBASE_DEFAULT_USER_ID


def _status_url(plan_id: str, request_id: str) -> str:
    return f"/api/plans/{plan_id}/ai-course-requests/{request_id}"


def _snapshot_model_config(
    model_config: AiModelConfigRecord,
    seen: set[str] | None = None,
) -> dict[str, Any]:
    seen = set(seen or ())
    if model_config.id in seen:
        raise HTTPException(
            status_code=422,
            detail="AI model fallback configuration contains a cycle",
        )
    seen.add(model_config.id)
    snapshot = {
        "id": model_config.id,
        "name": model_config.name,
        "provider": model_config.provider,
        "model": model_config.model,
        "temperature": model_config.temperature,
        "structured_output_mode": model_config.structured_output_mode,
        "max_input_tokens": model_config.max_input_tokens,
        "default_batch_size": model_config.default_batch_size,
        "max_batch_size": model_config.max_batch_size,
        "max_whole_videos": model_config.max_whole_videos,
        "fallback_model_config_id": model_config.fallback_model_config_id,
        "fallback_model_snapshot": None,
    }
    if model_config.fallback_model_config_id:
        fallback_row = store.load_ai_model_config(
            model_config.fallback_model_config_id
        )
        if not fallback_row:
            raise HTTPException(
                status_code=422,
                detail="Selected AI model fallback configuration is unavailable",
            )
        fallback = AiModelConfigRecord.model_validate(fallback_row)
        snapshot["fallback_model_snapshot"] = _snapshot_model_config(fallback, seen)
    return snapshot


def _resolve_model_snapshot(model_config_id: str) -> dict[str, Any]:
    row = store.load_ai_model_config(model_config_id)
    if not row:
        raise HTTPException(
            status_code=422,
            detail=f"AI model configuration '{model_config_id}' is not available",
        )
    model_config = AiModelConfigRecord.model_validate(row)
    api_key = {
        "groq": config.GROQ_API_KEY,
        "google": config.GOOGLE_API_KEY,
        "openai": config.OPENAI_API_KEY,
    }.get(model_config.provider, "")
    if not model_config.enabled:
        raise HTTPException(status_code=422, detail="Selected AI model is disabled")
    if model_config.test_status != "passed":
        raise HTTPException(
            status_code=422,
            detail="Selected AI model must pass its provider test before use",
        )
    if not api_key:
        raise HTTPException(
            status_code=422,
            detail=f"Server credential for {model_config.provider} is missing",
        )
    return _snapshot_model_config(model_config)


def _load_plan(plan_id: str) -> LearningPlan:
    row = store.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return LearningPlan.model_validate(row)


def _new_videos(plan: LearningPlan, submitted: list[AiCourseVideo]) -> list[AiCourseVideo]:
    existing_ids = {
        video.video_id
        for course in plan.courses
        for module in course.modules
        for video in module.videos
    }
    result: list[AiCourseVideo] = []
    seen: set[str] = set()
    for video in submitted:
        if video.video_id not in seen and video.video_id not in existing_ids:
            result.append(video)
            seen.add(video.video_id)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="Every selected video is already present in this learning plan",
        )
    if len(result) > config.AI_JOB_MAX_VIDEOS_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Select at most {config.AI_JOB_MAX_VIDEOS_PER_REQUEST} unique videos "
                "for one AI request"
            ),
        )
    return result


def _validate_capacity(
    request: AiCourseJobSubmission,
    videos: list[AiCourseVideo],
    snapshot: dict[str, Any],
) -> None:
    if request.processing.mode == "batch":
        requested_size = request.processing.batch_size or 0
        if requested_size > snapshot["max_batch_size"]:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Batch size must not exceed {snapshot['max_batch_size']} "
                    f"for {snapshot['name']}"
                ),
            )
    elif len(videos) > snapshot["max_whole_videos"]:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{snapshot['name']} supports at most "
                f"{snapshot['max_whole_videos']} videos in whole mode; choose batch mode"
            ),
        )
    if request.processing.mode == "whole" and not fits_capacity(
        videos, request.organization_context, snapshot
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Whole mode is estimated at {estimate_tokens(videos, request.organization_context)} "
                f"tokens, above the safe budget of {safe_token_budget(snapshot)}; "
                "choose batch mode"
            ),
        )


def _create_records(
    plan_id: str,
    request: AiCourseJobSubmission,
    *,
    retried_from_request_id: str | None = None,
) -> tuple[AiCourseRequestRecord, AiCourseRequestDetails]:
    plan = _load_plan(plan_id)
    snapshot = _resolve_model_snapshot(request.model_config_id)
    videos = _new_videos(plan, request.videos)
    _validate_capacity(request, videos, snapshot)
    now = _utcnow()
    requested_batch_size = (
        request.processing.batch_size if request.processing.mode == "batch" else None
    )
    total_batches = (
        math.ceil(len(videos) / requested_batch_size)
        if requested_batch_size
        else 1
    )
    parent = AiCourseRequestRecord(
        plan_id=plan_id,
        user_id=_owner_id(),
        model_config_id=request.model_config_id,
        model_snapshot=snapshot,
        processing_mode=request.processing.mode,
        requested_batch_size=requested_batch_size,
        organization_context=request.organization_context,
        total_videos=len(videos),
        total_batches=total_batches,
        retried_from_request_id=retried_from_request_id,
        created_at=now,
        updated_at=now,
    )
    details = AiCourseRequestDetails(
        request_id=parent.id,
        request_options={
            "model_config_id": request.model_config_id,
            "processing": request.processing.model_dump(),
            "organization_context": request.organization_context.model_dump(),
        },
        selected_sources=request.source_channels,
        videos=videos,
        created_at=now,
        updated_at=now,
    )
    return parent, details


def _accepted(parent: AiCourseRequestRecord) -> AiCourseRequestAccepted:
    return AiCourseRequestAccepted(
        request_id=parent.id,
        status=parent.status,
        status_url=_status_url(parent.plan_id, parent.id),
    )


def _load_parent(plan_id: str, request_id: str) -> AiCourseRequestRecord:
    row = store.load_ai_course_request(request_id)
    if not row:
        raise HTTPException(status_code=404, detail="AI course request not found")
    parent = AiCourseRequestRecord.model_validate(row)
    if parent.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="AI course request not found")
    return parent


def _source_summaries(
    details: AiCourseRequestDetails,
) -> list[AiCourseSourceSummary]:
    video_counts: dict[str, int] = {}
    for video in details.videos:
        if video.channel_id:
            video_counts[video.channel_id] = video_counts.get(video.channel_id, 0) + 1
    return [
        AiCourseSourceSummary(
            channel_id=channel.channel_id,
            title=channel.title,
            playlists=[playlist.title for playlist in channel.playlists],
            video_count=video_counts.get(channel.channel_id, 0),
        )
        for channel in details.selected_sources
    ]


def _detail(parent: AiCourseRequestRecord) -> AiCourseRequestDetailResponse:
    details_row = store.load_ai_course_request_details(parent.id)
    if not details_row:
        raise HTTPException(
            status_code=409,
            detail="Captured details for this AI request are unavailable",
        )
    details = AiCourseRequestDetails.model_validate(details_row)
    return AiCourseRequestDetailResponse(
        **parent.model_dump(),
        request_options=details.request_options,
        selected_sources=_source_summaries(details),
        captured_videos=details.videos,
        batches=[
            AiCourseBatchRecord.model_validate(row)
            for row in store.list_ai_course_batches(parent.id)
        ],
        attempts=[
            AiCourseAttemptRecord.model_validate(row)
            for row in store.list_ai_course_attempts(parent.id)
        ],
        completion_summary=details.completion_summary,
    )


def _encode_cursor(record: AiCourseRequestRecord) -> str:
    payload = json.dumps(
        {"created_at": record.created_at.isoformat(), "id": record.id},
        separators=(",", ":"),
    ).encode()
    return base64.urlsafe_b64encode(payload).decode().rstrip("=")


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode())
        return datetime.fromisoformat(payload["created_at"]), payload["id"]
    except (
        binascii.Error,
        KeyError,
        TypeError,
        UnicodeDecodeError,
        ValueError,
        json.JSONDecodeError,
    ) as error:
        raise HTTPException(status_code=400, detail="Invalid pagination cursor") from error


@router.post(
    "/api/plans/{plan_id}/ai-course-requests",
    response_model=AiCourseRequestAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def submit_ai_course_request(plan_id: str, request: AiCourseJobSubmission):
    parent, details = _create_records(plan_id, request)
    store.create_ai_course_request(parent.model_dump(), details.model_dump())
    return _accepted(parent)


@router.get(
    "/api/plans/{plan_id}/ai-course-requests",
    response_model=AiCourseRequestListResponse,
)
def list_ai_course_requests(
    plan_id: str,
    request_status: AiCourseRequestStatus | None = Query(default=None, alias="status"),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    _load_plan(plan_id)
    records = [
        AiCourseRequestRecord.model_validate(row)
        for row in store.list_ai_course_requests(plan_id)
    ]
    if request_status:
        records = [record for record in records if record.status == request_status]
    if cursor:
        cursor_key = _decode_cursor(cursor)
        records = [
            record
            for record in records
            if (record.created_at, record.id) < cursor_key
        ]
    page = records[:limit]
    next_cursor = _encode_cursor(page[-1]) if len(records) > limit else None
    return AiCourseRequestListResponse(items=page, next_cursor=next_cursor)


@router.get(
    "/api/plans/{plan_id}/ai-course-requests/{request_id}",
    response_model=AiCourseRequestDetailResponse,
)
def get_ai_course_request(plan_id: str, request_id: str):
    return _detail(_load_parent(plan_id, request_id))


@router.post(
    "/api/plans/{plan_id}/ai-course-requests/{request_id}/retry",
    response_model=AiCourseRequestRetryAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_ai_course_request(plan_id: str, request_id: str):
    original = _load_parent(plan_id, request_id)
    if original.status not in {"failed", "cancelled"}:
        raise HTTPException(
            status_code=409,
            detail="Only failed or cancelled AI requests can be retried",
        )
    details_row = store.load_ai_course_request_details(original.id)
    if not details_row:
        raise HTTPException(status_code=409, detail="Captured request details are unavailable")
    original_details = AiCourseRequestDetails.model_validate(details_row)
    plan = _load_plan(plan_id)
    videos = _new_videos(plan, original_details.videos)
    now = _utcnow()
    total_batches = (
        math.ceil(len(videos) / original.requested_batch_size)
        if original.requested_batch_size
        else 1
    )
    parent = AiCourseRequestRecord(
        plan_id=plan_id,
        user_id=_owner_id(),
        model_config_id=original.model_config_id,
        model_snapshot=original.model_snapshot,
        processing_mode=original.processing_mode,
        requested_batch_size=original.requested_batch_size,
        organization_context=original.organization_context,
        total_videos=len(videos),
        total_batches=total_batches,
        retried_from_request_id=original.id,
        created_at=now,
        updated_at=now,
    )
    details = AiCourseRequestDetails(
        request_id=parent.id,
        request_options=original_details.request_options,
        selected_sources=original_details.selected_sources,
        videos=videos,
        created_at=now,
        updated_at=now,
    )
    store.create_ai_course_request(parent.model_dump(), details.model_dump())
    accepted = _accepted(parent)
    return AiCourseRequestRetryAccepted(
        **accepted.model_dump(),
        retried_from_request_id=original.id,
    )


@router.post(
    "/api/plans/{plan_id}/ai-course-requests/{request_id}/cancel",
    response_model=AiCourseRequestRecord,
)
def cancel_ai_course_request(plan_id: str, request_id: str):
    parent = _load_parent(plan_id, request_id)
    if parent.status == "cancelled":
        return parent
    if parent.status in {"completed", "failed"}:
        raise HTTPException(
            status_code=409,
            detail=f"A {parent.status} AI request cannot be cancelled",
        )
    now = _utcnow()
    parent.status = "cancelled"
    parent.updated_at = now
    parent.completed_at = now
    parent.next_attempt_at = None
    parent.claimed_by = None
    parent.lease_expires_at = None
    store.save_ai_course_request(parent.model_dump())

    for row in store.list_ai_course_batches(parent.id):
        batch = AiCourseBatchRecord.model_validate(row)
        if batch.status not in {"completed", "failed", "cancelled"}:
            batch.status = "cancelled"
            batch.updated_at = now
            batch.completed_at = now
            batch.next_attempt_at = None
            store.save_ai_course_batch(batch.model_dump())

    attempts = store.list_ai_course_attempts(parent.id)
    next_number = max((item.get("number", 0) for item in attempts), default=0) + 1
    store.save_ai_course_attempt(
        AiCourseAttemptRecord(
            request_id=parent.id,
            number=next_number,
            event="Request cancelled by user",
            status="cancelled",
            at=now,
        ).model_dump()
    )
    return parent
