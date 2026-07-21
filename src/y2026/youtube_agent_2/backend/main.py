"""Legacy all-in-one entry point retained during the microservice migration.

New deployments should run the gateway, YouTube service, and plans service
entry points under ``backend.services``. Keeping this module preserves the old
Render command and gives the team a quick rollback path.
"""

from src.y2026.youtube_agent_2.backend.api.ai import router as ai_router
from src.y2026.youtube_agent_2.backend.api.integrations import (
    router as integrations_router,
)
from src.y2026.youtube_agent_2.backend.api.plans import router as plans_router
from src.y2026.youtube_agent_2.backend.api.source_sync import router as source_sync_router
from src.y2026.youtube_agent_2.backend.api.sources import router as sources_router
from src.y2026.youtube_agent_2.backend.app import create_app
from src.y2026.youtube_agent_2.backend.legacy.youtube_provider import (
    LegacyLocalYouTubeProvider,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.infrastructure.youtube_provider import (
    configure_source_provider,
)


configure_source_provider(LegacyLocalYouTubeProvider())

app = create_app()
app.include_router(plans_router)
app.include_router(integrations_router)
app.include_router(sources_router)
app.include_router(source_sync_router)
app.include_router(ai_router)
