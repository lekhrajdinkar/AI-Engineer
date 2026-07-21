"""YouTube OAuth and catalog microservice entry point."""

from src.y2026.youtube_agent_2.backend.services.youtube.app.api.integrations import (
    router as integrations_router,
)
from src.y2026.youtube_agent_2.backend.services.youtube.app.api.sources import (
    router as sources_router,
)
from src.y2026.youtube_agent_2.backend.shared.platform import create_app


app = create_app(
    service_name="youtube-service",
    title="YouTube Learning Organizer - YouTube Service",
)
app.include_router(integrations_router)
app.include_router(sources_router)
