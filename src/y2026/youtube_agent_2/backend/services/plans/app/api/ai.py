"""HTTP routes for LLM-backed course-generation workflows."""

from fastapi import APIRouter, Request

from src.y2026.youtube_agent_2.backend.services.plans.app.domain import course_generation as service
from src.y2026.youtube_agent_2.backend.services.plans.app.models import AiCourseRequest

router = APIRouter(tags=["llm-integration"])


@router.post("/api/plans/{plan_id}/add-course-ai-suggested")
def add_ai_suggested_course(
    plan_id: str, request: AiCourseRequest, http_request: Request
):
    return service.add_suggested_course(
        plan_id, request, http_request.state.llm_run_id
    )


@router.post(
    "/api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed"
)
def ai_suggest_refresh_feed(
    plan_id: str, course_id: str, http_request: Request
):
    return service.organize_refresh_feed(
        plan_id, course_id, http_request.state.llm_run_id
    )
