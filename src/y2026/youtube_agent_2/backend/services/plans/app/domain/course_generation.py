"""Course-generation workflows that do not require an LLM."""

from datetime import datetime, timezone

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.services.plans.app.models import LearningPlan, Module
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store as db


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
    seen_ids = {video.video_id for item in course.modules for video in item.videos}
    added = 0
    for video in incoming:
        if video.video_id not in seen_ids:
            video.sequence = len(module.videos) + 1
            module.videos.append(video)
            seen_ids.add(video.video_id)
            added += 1
    course.new_video_feeds = []
    course.labels = [label for label in course.labels if label != "refresh_needed"]
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan, "added_videos": added}
