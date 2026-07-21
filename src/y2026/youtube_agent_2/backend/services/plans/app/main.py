"""Learning plans, source workflow, and course-generation service entry point."""

from src.y2026.youtube_agent_2.backend.services.plans.app.api.ai import router as ai_router
from src.y2026.youtube_agent_2.backend.services.plans.app.api.plans import router as plans_router
from src.y2026.youtube_agent_2.backend.services.plans.app.api.source_sync import router as source_sync_router
from src.y2026.youtube_agent_2.backend.shared.platform import create_app


app = create_app(
    service_name="plans-service",
    title="YouTube Learning Organizer - Plans Service",
)
app.include_router(plans_router)
app.include_router(source_sync_router)
app.include_router(ai_router)
