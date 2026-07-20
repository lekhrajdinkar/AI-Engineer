"""AI-facing course workflows.

The current generator imports a deterministic fixture. Keeping it behind this
boundary makes replacing it with an LLM provider independent of HTTP routes and
plan persistence.
"""

from datetime import datetime, timezone
import json
import uuid

from fastapi import HTTPException
from pydantic import ValidationError

from src.y2026.youtube_agent_2.backend import config, db
from src.y2026.youtube_agent_2.backend.entities import Course, LearningPlan, Module


def organize_refresh_feed(plan_id: str, course_id: str) -> dict:
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
            status_code=422, detail="There are no staged new videos to organize"
        )
    module = next(
        (item for item in course.modules if item.title == "New videos"), None
    )
    if not module:
        module = Module(
            title="New videos", sequence=len(course.modules) + 1, videos=[]
        )
        course.modules.append(module)
    seen_ids = {
        video.video_id for item in course.modules for video in item.videos
    }
    added = 0
    for video in incoming:
        if video.video_id not in seen_ids:
            video.sequence = len(module.videos) + 1
            module.videos.append(video)
            seen_ids.add(video.video_id)
            added += 1
    course.new_video_feeds = []
    course.labels = [
        label for label in course.labels if label != "refresh_needed"
    ]
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan, "added_videos": added}


def add_suggested_course(plan_id: str) -> dict:
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)

    try:
        with config.AI_DUMMY_LEARNING_PLAN.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500, detail="Dummy course fixture file was not found"
        ) from error
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Dummy course fixture contains invalid JSON: {error.msg}",
        ) from error
    except OSError as error:
        raise HTTPException(
            status_code=500, detail=f"Unable to read dummy course fixture: {error}"
        ) from error

    fixture_plan = data.get("learning_plan", data)
    courses = fixture_plan.get("courses") if isinstance(fixture_plan, dict) else None
    if not isinstance(courses, list) or not courses:
        raise HTTPException(
            status_code=422,
            detail="Dummy course fixture must contain at least one course",
        )

    imported_courses = []
    for course_index, raw_course_data in enumerate(courses, start=1):
        if not isinstance(raw_course_data, dict):
            raise HTTPException(
                status_code=422,
                detail=f"Dummy course at position {course_index} must be an object",
            )

        course_data = dict(raw_course_data)
        course_data["id"] = str(uuid.uuid4())
        course_data["sequence"] = len(plan.courses) + course_index
        raw_channels = course_data.get("source_channels", [])
        if not isinstance(raw_channels, list):
            raise HTTPException(
                status_code=422,
                detail=f"Source channels for dummy course at position {course_index} must be a list",
            )
        course_data["source_channels"] = []
        for raw_channel_data in raw_channels:
            if not isinstance(raw_channel_data, dict):
                raise HTTPException(
                    status_code=422,
                    detail=f"Source channel for dummy course at position {course_index} must be an object",
                )
            channel_data = dict(raw_channel_data)
            if "video_count" not in channel_data and "videos_count" in channel_data:
                channel_data["video_count"] = channel_data["videos_count"]
            raw_playlists = channel_data.get("playlists", [])
            if not isinstance(raw_playlists, list):
                raise HTTPException(
                    status_code=422,
                    detail=f"Playlists for a source channel in dummy course {course_index} must be a list",
                )
            channel_data["playlists"] = []
            for raw_playlist_data in raw_playlists:
                if not isinstance(raw_playlist_data, dict):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Playlist for a source channel in dummy course {course_index} must be an object",
                    )
                playlist_data = dict(raw_playlist_data)
                if "id" not in playlist_data and "playlist_id" in playlist_data:
                    playlist_data["id"] = playlist_data["playlist_id"]
                channel_data["playlists"].append(playlist_data)
            course_data["source_channels"].append(channel_data)

        raw_modules = course_data.get("modules", [])
        if not isinstance(raw_modules, list):
            raise HTTPException(
                status_code=422,
                detail=f"Modules for dummy course at position {course_index} must be a list",
            )
        course_data["modules"] = []
        for module_index, raw_module_data in enumerate(raw_modules, start=1):
            if not isinstance(raw_module_data, dict):
                raise HTTPException(
                    status_code=422,
                    detail=f"Module {module_index} for dummy course at position {course_index} must be an object",
                )
            module_data = dict(raw_module_data)
            module_data["id"] = str(uuid.uuid4())
            module_data["sequence"] = module_index
            raw_videos = module_data.get("videos", [])
            if not isinstance(raw_videos, list):
                raise HTTPException(
                    status_code=422,
                    detail=f"Videos for module {module_index} in dummy course {course_index} must be a list",
                )
            module_data["videos"] = []
            for video_index, raw_video_data in enumerate(raw_videos, start=1):
                if not isinstance(raw_video_data, dict):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Video {video_index} in module {module_index} of dummy course {course_index} must be an object",
                    )
                video_data = dict(raw_video_data)
                video_data.setdefault(
                    "revised_title_from_ai", video_data.get("title", "")
                )
                video_data["sequence"] = video_index
                module_data["videos"].append(video_data)
            course_data["modules"].append(module_data)

        try:
            imported_courses.append(Course.model_validate(course_data))
        except ValidationError as error:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid dummy course at position {course_index}: {error.errors()}",
            ) from error

    plan.courses.extend(imported_courses)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"message": "AI suggested course created", "plan": plan}
