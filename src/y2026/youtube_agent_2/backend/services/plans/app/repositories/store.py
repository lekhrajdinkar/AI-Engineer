"""Plan and source-sync persistence owned by the plans service."""

import json
import sqlite3
from typing import Optional

from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.services.plans.app import config


_firestore_store = None
if config.FIREBASE_ENABLED:
    from .firestore_store import FirestoreStore

    _firestore_store = FirestoreStore()


def _active_user_id() -> str | None:
    return identity.current_user_id()


def init_store() -> None:
    if _firestore_store:
        return
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS source_sync_metadata (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at TEXT
            )
            """
        )


def save_plan(plan_obj: dict) -> None:
    if _firestore_store:
        return _firestore_store.save_plan(plan_obj, _active_user_id())
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO plans (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (
                plan_obj.get("id"),
                json.dumps(plan_obj, default=str),
                plan_obj.get("created_at"),
                plan_obj.get("updated_at"),
            ),
        )


def supports_targeted_updates() -> bool:
    return _firestore_store is not None


def update_plan_fields(plan_id: str, fields: dict) -> bool:
    return bool(
        _firestore_store
        and _firestore_store.update_plan_fields(
            plan_id, fields, _active_user_id()
        )
    )


def update_course_fields(plan_id: str, course_id: str, fields: dict) -> bool:
    return bool(
        _firestore_store
        and _firestore_store.update_course_fields(
            plan_id, course_id, fields, _active_user_id()
        )
    )


def update_module_fields(
    plan_id: str, course_id: str, module_id: str, fields: dict
) -> bool:
    return bool(
        _firestore_store
        and _firestore_store.update_module_fields(
            plan_id, course_id, module_id, fields, _active_user_id()
        )
    )


def update_video_fields(
    plan_id: str,
    course_id: str,
    module_id: str,
    video_id: str,
    fields: dict,
) -> bool:
    return bool(
        _firestore_store
        and _firestore_store.update_video_fields(
            plan_id,
            course_id,
            module_id,
            video_id,
            fields,
            _active_user_id(),
        )
    )


def load_plan(plan_id: str) -> Optional[dict]:
    if _firestore_store:
        return _firestore_store.load_plan(plan_id, _active_user_id())
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(
            "SELECT data FROM plans WHERE id = ?", (plan_id,)
        ).fetchone()
    return json.loads(row[0]) if row else None


def delete_plan(plan_id: str) -> bool:
    if _firestore_store:
        return _firestore_store.delete_plan(plan_id, _active_user_id())
    with sqlite3.connect(config.DB_PATH) as connection:
        cursor = connection.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
        return cursor.rowcount > 0


def list_plans() -> list[dict]:
    if _firestore_store:
        return _firestore_store.list_plans(_active_user_id())
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute(
            "SELECT data FROM plans ORDER BY updated_at DESC"
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def save_source_sync_metadata(metadata: dict) -> None:
    if _firestore_store:
        return _firestore_store.save_source_sync_metadata(
            metadata, _active_user_id()
        )
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO source_sync_metadata (id, data, updated_at) VALUES (1, ?, ?)",
            (json.dumps(metadata, default=str), metadata.get("updated_at")),
        )


def load_source_sync_metadata() -> dict:
    if _firestore_store:
        return _firestore_store.load_source_sync_metadata(_active_user_id())
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(
            "SELECT data FROM source_sync_metadata WHERE id = 1"
        ).fetchone()
    return json.loads(row[0]) if row else {"channels": [], "updated_at": None}


init_store()
