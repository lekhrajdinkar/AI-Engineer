"""Prompt projection and conservative token budgeting for AI course jobs."""

from __future__ import annotations

import json
import math

from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseOrganizationContext,
    AiCourseVideo,
)


TOKEN_SAFETY_RATIO = 0.8
FIXED_PROMPT_TOKENS = 600
EXPECTED_OUTPUT_TOKENS_PER_VIDEO = 80


def trim_words(value: str | None, maximum: int) -> str:
    return " ".join((value or "").split()[:maximum])


def project_video(
    video: AiCourseVideo,
    context: AiCourseOrganizationContext,
) -> dict:
    projected = {"video_id": video.video_id, "title": video.title}
    if context.mode in {"title_tags", "full_metadata"}:
        projected["tags"] = video.tags[:context.max_tags_per_video]
    if context.mode == "full_metadata":
        projected["description"] = trim_words(
            video.description, context.description_max_words
        )
    if video.channel_id:
        projected["channel_id"] = video.channel_id
    if video.playlist_id:
        projected["playlist_id"] = video.playlist_id
    return projected


def estimate_tokens(
    videos: list[AiCourseVideo],
    context: AiCourseOrganizationContext,
) -> int:
    prompt = json.dumps(
        [project_video(video, context) for video in videos],
        separators=(",", ":"),
        ensure_ascii=False,
    )
    input_tokens = math.ceil(len(prompt) / 4) + FIXED_PROMPT_TOKENS
    return input_tokens + len(videos) * EXPECTED_OUTPUT_TOKENS_PER_VIDEO


def safe_token_budget(model_snapshot: dict) -> int:
    return max(
        256,
        int(model_snapshot.get("max_input_tokens", 8000) * TOKEN_SAFETY_RATIO),
    )


def fits_capacity(
    videos: list[AiCourseVideo],
    context: AiCourseOrganizationContext,
    model_snapshot: dict,
) -> bool:
    return estimate_tokens(videos, context) <= safe_token_budget(model_snapshot)


def capacity_safe_batches(
    videos: list[AiCourseVideo],
    context: AiCourseOrganizationContext,
    model_snapshot: dict,
    requested_maximum: int,
) -> list[list[AiCourseVideo]]:
    batches: list[list[AiCourseVideo]] = []
    current: list[AiCourseVideo] = []
    for video in videos:
        proposed = [*current, video]
        if current and (
            len(proposed) > requested_maximum
            or not fits_capacity(proposed, context, model_snapshot)
        ):
            batches.append(current)
            current = [video]
        else:
            current = proposed
        if not fits_capacity(current, context, model_snapshot):
            raise ValueError(
                f"Video '{video.video_id}' exceeds the selected model capacity by itself"
            )
    if current:
        batches.append(current)
    return batches
