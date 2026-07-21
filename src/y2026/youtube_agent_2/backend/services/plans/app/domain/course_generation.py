"""LLM-backed course creation and refresh workflows."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import logging
from math import ceil
from typing import Any, Callable, TypeVar

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.infrastructure.ollama_provider import (
    AssignmentResponse,
    CourseOutline,
    LlmOutputError,
    RefreshOutline,
    get_course_organizer,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseRequest,
    Channel,
    Course,
    LearningPlan,
    Module,
    Video,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.observability import log_event
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store as db


logger = logging.getLogger(__name__)
Output = TypeVar("Output")


def _all_plan_video_ids(plan: LearningPlan) -> set[str]:
    committed = {
        video.video_id
        for course in plan.courses
        for module in course.modules
        for video in module.videos
    }
    staged = {
        video.video_id
        for course in plan.courses
        for feed in course.new_video_feeds
        for video in feed.videos
    }
    return committed | staged


def _refresh_known_video_ids(plan: LearningPlan, target_course_id: str) -> set[str]:
    committed = {
        video.video_id
        for course in plan.courses
        for module in course.modules
        for video in module.videos
    }
    staged_elsewhere = {
        video.video_id
        for course in plan.courses
        if course.id != target_course_id
        for feed in course.new_video_feeds
        for video in feed.videos
    }
    return committed | staged_elsewhere


def _deduplicate_videos(
    videos: list[Video], known_ids: set[str]
) -> tuple[list[Video], int]:
    unique: list[Video] = []
    seen = set(known_ids)
    duplicates = 0
    for video in videos:
        if video.video_id in seen:
            duplicates += 1
            continue
        seen.add(video.video_id)
        unique.append(video.model_copy(deep=True))
    return unique, duplicates


def _deduplicate_sources(sources: list[Channel]) -> list[Channel]:
    result: list[Channel] = []
    seen_channels: set[str] = set()
    for source in sources:
        if source.channel_id in seen_channels:
            continue
        seen_channels.add(source.channel_id)
        copied = source.model_copy(deep=True)
        seen_playlists: set[str] = set()
        unique_playlists = []
        for playlist in copied.playlists:
            playlist_id = playlist.playlist_id or playlist.id
            if playlist_id in seen_playlists:
                continue
            seen_playlists.add(playlist_id)
            unique_playlists.append(playlist)
        copied.playlists = unique_playlists
        result.append(copied)
    return result


def _run_context(
    run_id: str,
    workflow: str,
    plan_id: str,
    *,
    course_id: str | None = None,
    stage: str,
    **fields: Any,
) -> dict[str, Any]:
    return {
        "llm_run_id": run_id,
        "workflow": workflow,
        "plan_id": plan_id,
        "course_id": course_id,
        "stage": stage,
        **fields,
    }


def _with_validation_retry(
    operation: Callable[[dict[str, Any], str | None], Output],
    validator: Callable[[Output], None],
    context: dict[str, Any],
) -> Output:
    correction: str | None = None
    for attempt in (1, 2):
        attempt_context = {**context, "attempt": attempt}
        try:
            output = operation(attempt_context, correction)
            validator(output)
            return output
        except (LlmOutputError, ValueError) as error:
            if attempt == 2:
                raise HTTPException(
                    status_code=502,
                    detail="Local LLM returned invalid structured assignments",
                ) from error
            correction = str(error)
            log_event(
                logger,
                "llm.validation.retry",
                level=logging.WARNING,
                **attempt_context,
                model=config.LLM_MODEL,
                validation_error_type=type(error).__name__,
            )
    raise AssertionError("validation retry loop did not return")


def _validate_course_outline(outline: CourseOutline, video_count: int) -> None:
    if len(outline.courses) > video_count:
        raise ValueError("Course outline contains more courses than videos")
    course_keys: set[str] = set()
    module_count = 0
    for course in outline.courses:
        if course.key in course_keys:
            raise ValueError(f"Duplicate course key: {course.key}")
        course_keys.add(course.key)
        module_keys: set[str] = set()
        for module in course.modules:
            module_count += 1
            if module.key in module_keys:
                raise ValueError(
                    f"Duplicate module key {module.key} in course {course.key}"
                )
            module_keys.add(module.key)
    if module_count > video_count:
        raise ValueError("Course outline contains more modules than videos")


def _validate_refresh_outline(
    outline: RefreshOutline,
    existing_module_ids: set[str],
    require_new_module: bool,
    video_count: int,
) -> None:
    if require_new_module and not outline.new_modules:
        raise ValueError("At least one new module is required for an empty course")
    keys: set[str] = set()
    if len(outline.new_modules) > video_count:
        raise ValueError("Refresh outline contains more new modules than videos")
    for module in outline.new_modules:
        if module.key in existing_module_ids or module.key in keys:
            raise ValueError(f"Duplicate or existing new module key: {module.key}")
        keys.add(module.key)


def _validate_assignments(
    assignments: AssignmentResponse,
    expected_video_ids: set[str],
    allowed_destinations: set[tuple[str, str]],
) -> None:
    assigned_ids: list[str] = []
    for group in assignments.groups:
        destination = (group.course_key, group.module_key)
        if destination not in allowed_destinations:
            raise ValueError(f"Unknown destination: {destination}")
        assigned_ids.extend(group.video_ids)
    assigned_set = set(assigned_ids)
    if len(assigned_ids) != len(assigned_set):
        raise ValueError("One or more video IDs were assigned more than once")
    unknown = assigned_set - expected_video_ids
    missing = expected_video_ids - assigned_set
    if unknown:
        raise ValueError(f"Unknown video IDs: {sorted(unknown)}")
    if missing:
        raise ValueError(f"Missing video IDs: {sorted(missing)}")


def _assign_in_batches(
    videos: list[Video],
    destinations: list[dict[str, str]],
    *,
    run_id: str,
    workflow: str,
    plan_id: str,
    course_id: str | None = None,
) -> dict[tuple[str, str], list[str]]:
    provider = get_course_organizer()
    allowed = {
        (destination["course_key"], destination["module_key"])
        for destination in destinations
    }
    grouped_ids: dict[tuple[str, str], list[str]] = defaultdict(list)
    batch_count = ceil(len(videos) / config.LLM_BATCH_SIZE)
    for batch_index, offset in enumerate(
        range(0, len(videos), config.LLM_BATCH_SIZE), start=1
    ):
        batch = videos[offset : offset + config.LLM_BATCH_SIZE]
        context = _run_context(
            run_id,
            workflow,
            plan_id,
            course_id=course_id,
            stage="assignment",
            batch_number=batch_index,
            batch_count=batch_count,
            video_count=len(batch),
        )
        output = _with_validation_retry(
            lambda call_context, correction: provider.assign_videos(
                batch,
                destinations,
                context=call_context,
                correction=correction,
            ),
            lambda response: _validate_assignments(
                response,
                {video.video_id for video in batch},
                allowed,
            ),
            context,
        )
        for group in output.groups:
            grouped_ids[(group.course_key, group.module_key)].extend(group.video_ids)
    return grouped_ids


def _build_courses(
    outline: CourseOutline,
    grouped_ids: dict[tuple[str, str], list[str]],
    videos: list[Video],
    sources: list[Channel],
    starting_sequence: int,
) -> list[Course]:
    by_id = {video.video_id: video for video in videos}
    courses: list[Course] = []
    for outline_course in outline.courses:
        modules: list[Module] = []
        for outline_module in outline_course.modules:
            ids = grouped_ids.get((outline_course.key, outline_module.key), [])
            if not ids:
                continue
            module_videos = []
            for sequence, video_id in enumerate(ids, start=1):
                video = by_id[video_id].model_copy(deep=True)
                video.sequence = sequence
                video.revised_title_from_ai = video.revised_title_from_ai or video.title
                module_videos.append(video)
            modules.append(
                Module(
                    title=outline_module.title,
                    sequence=len(modules) + 1,
                    videos=module_videos,
                )
            )
        if not modules:
            continue
        courses.append(
            Course(
                title=outline_course.title,
                description=outline_course.description or None,
                sequence=starting_sequence + len(courses),
                modules=modules,
                source_channels=[source.model_copy(deep=True) for source in sources],
            )
        )
    if not courses:
        raise HTTPException(status_code=502, detail="Local LLM produced no usable courses")
    return courses


def add_suggested_course(
    plan_id: str, request: AiCourseRequest, run_id: str
) -> dict[str, Any]:
    workflow = "add_course"
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    if len(request.videos) > config.LLM_MAX_VIDEOS:
        raise HTTPException(
            status_code=413,
            detail=f"At most {config.LLM_MAX_VIDEOS} videos can be organized per request",
        )
    videos, duplicate_count = _deduplicate_videos(
        request.videos, _all_plan_video_ids(plan)
    )
    if not videos:
        raise HTTPException(
            status_code=422, detail="No new videos remain after deduplication"
        )

    log_event(
        logger,
        "llm.run.started",
        **_run_context(run_id, workflow, plan_id, stage="run"),
        model=config.LLM_MODEL,
        input_video_count=len(request.videos),
        video_count=len(videos),
        duplicate_video_count=duplicate_count,
    )
    try:
        provider = get_course_organizer()
        outline_context = _run_context(
            run_id,
            workflow,
            plan_id,
            stage="outline",
            video_count=len(videos),
        )
        outline = _with_validation_retry(
            lambda call_context, correction: provider.generate_course_outline(
                videos, context=call_context, correction=correction
            ),
            lambda output: _validate_course_outline(output, len(videos)),
            outline_context,
        )
        destinations = [
            {
                "course_key": course.key,
                "course_title": course.title,
                "module_key": module.key,
                "module_title": module.title,
            }
            for course in outline.courses
            for module in course.modules
        ]
        grouped_ids = _assign_in_batches(
            videos,
            destinations,
            run_id=run_id,
            workflow=workflow,
            plan_id=plan_id,
        )
        courses = _build_courses(
            outline,
            grouped_ids,
            videos,
            _deduplicate_sources(request.source_channels),
            len(plan.courses) + 1,
        )
        plan.courses.extend(courses)
        plan.updated_at = datetime.now(timezone.utc)
        db.save_plan(plan.model_dump())
        log_event(
            logger,
            "llm.run.completed",
            **_run_context(run_id, workflow, plan_id, stage="run"),
            model=config.LLM_MODEL,
            video_count=len(videos),
            duplicate_video_count=duplicate_count,
            course_count=len(courses),
            module_count=sum(len(course.modules) for course in courses),
        )
        return {"message": "AI suggested course created", "plan": plan}
    except Exception as error:
        log_event(
            logger,
            "llm.run.failed",
            level=logging.ERROR,
            **_run_context(run_id, workflow, plan_id, stage="run"),
            model=config.LLM_MODEL,
            http_status=getattr(error, "status_code", 500),
            error_type=type(error).__name__,
        )
        raise


def organize_refresh_feed(plan_id: str, course_id: str, run_id: str) -> dict[str, Any]:
    workflow = "refresh_feed"
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    incoming = [video for feed in course.new_video_feeds for video in feed.videos]
    if not incoming:
        raise HTTPException(
            status_code=422,
            detail="There are no staged new videos to organize",
        )
    if len(incoming) > config.LLM_MAX_VIDEOS:
        raise HTTPException(
            status_code=413,
            detail=f"At most {config.LLM_MAX_VIDEOS} videos can be organized per request",
        )

    known_ids = _refresh_known_video_ids(plan, course_id)
    videos, duplicate_count = _deduplicate_videos(incoming, known_ids)
    log_event(
        logger,
        "llm.run.started",
        **_run_context(run_id, workflow, plan_id, course_id=course_id, stage="run"),
        model=config.LLM_MODEL,
        input_video_count=len(incoming),
        video_count=len(videos),
        duplicate_video_count=duplicate_count,
    )
    try:
        if videos:
            provider = get_course_organizer()
            existing_module_ids = {module.id for module in course.modules}
            outline_context = _run_context(
                run_id,
                workflow,
                plan_id,
                course_id=course_id,
                stage="outline",
                video_count=len(videos),
            )
            refresh_outline = _with_validation_retry(
                lambda call_context, correction: provider.generate_refresh_outline(
                    course.title,
                    course.modules,
                    videos,
                    context=call_context,
                    correction=correction,
                ),
                lambda output: _validate_refresh_outline(
                    output,
                    existing_module_ids,
                    not course.modules,
                    len(videos),
                ),
                outline_context,
            )
            destinations = [
                {
                    "course_key": "existing_course",
                    "course_title": course.title,
                    "module_key": module.id,
                    "module_title": module.title,
                }
                for module in course.modules
            ] + [
                {
                    "course_key": "existing_course",
                    "course_title": course.title,
                    "module_key": module.key,
                    "module_title": module.title,
                }
                for module in refresh_outline.new_modules
            ]
            if not destinations:
                raise HTTPException(
                    status_code=502, detail="Local LLM produced no module destinations"
                )
            grouped_ids = _assign_in_batches(
                videos,
                destinations,
                run_id=run_id,
                workflow=workflow,
                plan_id=plan_id,
                course_id=course_id,
            )
            by_id = {video.video_id: video for video in videos}
            for module in course.modules:
                ids = grouped_ids.get(("existing_course", module.id), [])
                for video_id in ids:
                    video = by_id[video_id].model_copy(deep=True)
                    video.sequence = len(module.videos) + 1
                    module.videos.append(video)
            for outline_module in refresh_outline.new_modules:
                ids = grouped_ids.get(("existing_course", outline_module.key), [])
                if not ids:
                    continue
                module = Module(
                    title=outline_module.title,
                    sequence=len(course.modules) + 1,
                    videos=[],
                )
                for video_id in ids:
                    video = by_id[video_id].model_copy(deep=True)
                    video.sequence = len(module.videos) + 1
                    module.videos.append(video)
                course.modules.append(module)

        course.new_video_feeds = []
        course.labels = [label for label in course.labels if label != "refresh_needed"]
        now = datetime.now(timezone.utc)
        course.updated_at = now
        plan.updated_at = now
        db.save_plan(plan.model_dump())
        log_event(
            logger,
            "llm.run.completed",
            **_run_context(run_id, workflow, plan_id, course_id=course_id, stage="run"),
            model=config.LLM_MODEL,
            video_count=len(videos),
            duplicate_video_count=duplicate_count,
            added_video_count=len(videos),
        )
        return {"plan": plan, "added_videos": len(videos)}
    except Exception as error:
        log_event(
            logger,
            "llm.run.failed",
            level=logging.ERROR,
            **_run_context(run_id, workflow, plan_id, course_id=course_id, stage="run"),
            model=config.LLM_MODEL,
            http_status=getattr(error, "status_code", 500),
            error_type=type(error).__name__,
        )
        raise
