"""HTTP routes for course-generation workflows."""

from fastapi import APIRouter

from src.y2026.youtube_agent_2.backend.domain.ai import service


router = APIRouter(tags=["course-generation"])


@router.post(
    "/api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed",
    tags=["courses"],
)
def ai_suggest_refresh_feed(plan_id: str, course_id: str):
    return service.organize_refresh_feed(plan_id, course_id)


@router.post("/api/plans/{plan_id}/add-course-ai-suggested", tags=["plans"])
def add_ai_suggested_course(plan_id: str):
    return service.add_suggested_course(plan_id)
