"""Compatibility facade over service-owned repositories.

Production services never import this module. It exists for the legacy app and
older migration scripts while callers transition to the owning service.
"""

from src.y2026.youtube_agent_2.backend.shared.platform.identity import (
    current_user_id,
    reset_current_user,
    set_current_user,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories.store import (
    delete_plan,
    init_store as init_plans_store,
    list_plans,
    load_plan,
    load_source_sync_metadata,
    save_plan,
    save_source_sync_metadata,
    supports_targeted_updates,
    update_course_fields,
    update_module_fields,
    update_plan_fields,
    update_video_fields,
)
from src.y2026.youtube_agent_2.backend.services.youtube.app.repositories.token_store import (
    delete_tokens,
    init_store as init_token_store,
    load_latest_tokens,
    save_tokens,
)


def init_db() -> None:
    init_plans_store()
    init_token_store()


init_db()

__all__ = [
    "current_user_id",
    "delete_plan",
    "delete_tokens",
    "init_db",
    "list_plans",
    "load_latest_tokens",
    "load_plan",
    "load_source_sync_metadata",
    "reset_current_user",
    "save_plan",
    "save_source_sync_metadata",
    "save_tokens",
    "set_current_user",
    "supports_targeted_updates",
    "update_course_fields",
    "update_module_fields",
    "update_plan_fields",
    "update_video_fields",
]
