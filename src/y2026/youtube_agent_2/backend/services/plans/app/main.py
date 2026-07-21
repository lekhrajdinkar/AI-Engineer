"""Learning plans, source workflow, and course-generation service entry point."""

import uuid

from fastapi import Request

from src.y2026.youtube_agent_2.backend.services.plans.app.api.ai import router as ai_router
from src.y2026.youtube_agent_2.backend.services.plans.app.api.plans import router as plans_router
from src.y2026.youtube_agent_2.backend.services.plans.app.api.source_sync import router as source_sync_router
from src.y2026.youtube_agent_2.backend.services.plans.app.observability import configure_logging
from src.y2026.youtube_agent_2.backend.shared.platform import create_app


configure_logging()
app = create_app(
    service_name="plans-service",
    title="YouTube Learning Organizer - Plans Service",
)


@app.middleware("http")
async def add_llm_run_id(request: Request, call_next):
    is_llm_route = request.url.path.endswith(
        "/add-course-ai-suggested"
    ) or request.url.path.endswith(
        "/ai-suggest-refresh-feed"
    )
    if not is_llm_route:
        return await call_next(request)
    request.state.llm_run_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-LLM-Run-ID"] = request.state.llm_run_id
    return response


app.include_router(plans_router)
app.include_router(source_sync_router)
app.include_router(ai_router)
