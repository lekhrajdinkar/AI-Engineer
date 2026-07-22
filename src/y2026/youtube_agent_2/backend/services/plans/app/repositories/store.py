"""Plan and source-sync persistence owned by the plans service."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.services.plans.app import config


_firestore_store = None
if config.FIREBASE_ENABLED:
    from .firestore_store import FirestoreStore

    _firestore_store = FirestoreStore()


def _active_user_id() -> str | None:
    return identity.current_user_id()


def _ai_user_id(user_id: str | None = None) -> str:
    return user_id or _active_user_id() or config.FIREBASE_DEFAULT_USER_ID


def _json_text(value: dict) -> str:
    return json.dumps(value, default=str, separators=(",", ":"))


def _ensure_sqlite_column(
    connection: sqlite3.Connection,
    table: str,
    column: str,
    declaration: str,
) -> None:
    columns = {
        row[1] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()
    }
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


def _default_ai_model_config() -> dict:
    now = datetime.now(timezone.utc)
    provider_key = {
        "groq": config.GROQ_API_KEY,
        "google": config.GOOGLE_API_KEY,
        "openai": config.OPENAI_API_KEY,
    }.get(config.AI_LLM_PROVIDER, "")
    return {
        "id": config.AI_LLM_CONFIG_ID,
        "name": config.AI_LLM_DISPLAY_NAME,
        "provider": config.AI_LLM_PROVIDER,
        "model": config.AI_LLM_MODEL,
        "enabled": True,
        "is_default": True,
        "temperature": config.AI_LLM_TEMPERATURE,
        "structured_output_mode": "auto",
        "max_input_tokens": config.AI_LLM_MAX_INPUT_TOKENS,
        "default_batch_size": config.AI_LLM_DEFAULT_BATCH_SIZE,
        "max_batch_size": config.AI_LLM_MAX_BATCH_SIZE,
        "max_whole_videos": config.AI_LLM_MAX_WHOLE_VIDEOS,
        "fallback_model_config_id": None,
        "credential_status": "configured" if provider_key else "missing",
        "test_status": "untested",
        "test_message": None,
        "last_tested_at": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }


def init_store() -> None:
    if _firestore_store:
        _firestore_store.ensure_default_ai_model_config(
            _default_ai_model_config()
        )
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
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_course_requests (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                next_attempt_at TEXT,
                claimed_by TEXT,
                lease_expires_at TEXT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        _ensure_sqlite_column(connection, "ai_course_requests", "claimed_by", "TEXT")
        _ensure_sqlite_column(
            connection, "ai_course_requests", "lease_expires_at", "TEXT"
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_course_requests_plan_user_created
            ON ai_course_requests (plan_id, user_id, created_at DESC, id DESC)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_course_requests_worker_v2
            ON ai_course_requests (status, next_attempt_at, lease_expires_at, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_course_request_details (
                request_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (request_id) REFERENCES ai_course_requests(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_course_batches (
                id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                number INTEGER NOT NULL,
                status TEXT NOT NULL,
                next_attempt_at TEXT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (request_id, number),
                FOREIGN KEY (request_id) REFERENCES ai_course_requests(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_course_batches_request_number
            ON ai_course_batches (request_id, number)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_course_attempts (
                id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                batch_id TEXT,
                number INTEGER NOT NULL,
                status TEXT NOT NULL,
                data TEXT NOT NULL,
                at TEXT NOT NULL,
                UNIQUE (request_id, number),
                FOREIGN KEY (request_id) REFERENCES ai_course_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES ai_course_batches(id) ON DELETE SET NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_course_attempts_request_number
            ON ai_course_attempts (request_id, number)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_model_configs (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                is_default INTEGER NOT NULL,
                deleted_at TEXT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_model_configs_active
            ON ai_model_configs (deleted_at, enabled, provider)
            """
        )
        default_config = _default_ai_model_config()
        connection.execute(
            """
            INSERT OR IGNORE INTO ai_model_configs (
                id, provider, enabled, is_default, deleted_at, data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                default_config["id"],
                default_config["provider"],
                int(default_config["enabled"]),
                int(default_config["is_default"]),
                default_config["deleted_at"],
                _json_text(default_config),
                default_config["created_at"],
                default_config["updated_at"],
            ),
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


def _parent_values(request_obj: dict) -> tuple:
    return (
        request_obj["id"],
        request_obj["plan_id"],
        request_obj["user_id"],
        request_obj["status"],
        request_obj.get("next_attempt_at"),
        request_obj.get("claimed_by"),
        request_obj.get("lease_expires_at"),
        _json_text(request_obj),
        request_obj["created_at"],
        request_obj["updated_at"],
    )


def _insert_ai_request(connection: sqlite3.Connection, request_obj: dict) -> None:
    connection.execute(
        """
        INSERT INTO ai_course_requests (
            id, plan_id, user_id, status, next_attempt_at, claimed_by,
            lease_expires_at, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        _parent_values(request_obj),
    )


def _upsert_ai_request(connection: sqlite3.Connection, request_obj: dict) -> None:
    connection.execute(
        """
        INSERT INTO ai_course_requests (
            id, plan_id, user_id, status, next_attempt_at, claimed_by,
            lease_expires_at, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            plan_id = excluded.plan_id,
            user_id = excluded.user_id,
            status = excluded.status,
            next_attempt_at = excluded.next_attempt_at,
            claimed_by = excluded.claimed_by,
            lease_expires_at = excluded.lease_expires_at,
            data = excluded.data,
            updated_at = excluded.updated_at
        """,
        _parent_values(request_obj),
    )


def _upsert_ai_details(connection: sqlite3.Connection, details_obj: dict) -> None:
    connection.execute(
        """
        INSERT INTO ai_course_request_details (request_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(request_id) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at
        """,
        (
            details_obj["request_id"],
            _json_text(details_obj),
            details_obj["created_at"],
            details_obj["updated_at"],
        ),
    )


def _upsert_ai_batch(connection: sqlite3.Connection, batch_obj: dict) -> None:
    connection.execute(
        """
        INSERT INTO ai_course_batches (
            id, request_id, number, status, next_attempt_at, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            next_attempt_at = excluded.next_attempt_at,
            data = excluded.data,
            updated_at = excluded.updated_at
        """,
        (
            batch_obj["id"],
            batch_obj["request_id"],
            batch_obj["number"],
            batch_obj["status"],
            batch_obj.get("next_attempt_at"),
            _json_text(batch_obj),
            batch_obj["created_at"],
            batch_obj["updated_at"],
        ),
    )


def create_ai_course_request(
    request_obj: dict,
    details_obj: dict,
    batches: Iterable[dict] = (),
) -> None:
    """Atomically persist a new parent, captured input, and initial batches."""
    request_obj = dict(request_obj)
    request_obj["user_id"] = _ai_user_id(request_obj.get("user_id"))
    if details_obj.get("request_id") != request_obj.get("id"):
        raise ValueError("AI request details must reference the parent request")
    batch_rows = [dict(batch) for batch in batches]
    if any(batch.get("request_id") != request_obj.get("id") for batch in batch_rows):
        raise ValueError("Every AI batch must reference the parent request")
    if _firestore_store:
        return _firestore_store.create_ai_course_request(
            request_obj, details_obj, batch_rows, request_obj["user_id"]
        )
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        _insert_ai_request(connection, request_obj)
        _upsert_ai_details(connection, details_obj)
        for batch in batch_rows:
            _upsert_ai_batch(connection, batch)


def save_ai_course_request(request_obj: dict) -> None:
    request_obj = dict(request_obj)
    request_obj["user_id"] = _ai_user_id(request_obj.get("user_id"))
    if _firestore_store:
        return _firestore_store.save_ai_course_request(
            request_obj, request_obj["user_id"]
        )
    with sqlite3.connect(config.DB_PATH) as connection:
        _upsert_ai_request(connection, request_obj)


def load_ai_course_request(
    request_id: str, user_id: str | None = None
) -> Optional[dict]:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.load_ai_course_request(request_id, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(
            "SELECT data FROM ai_course_requests WHERE id = ? AND user_id = ?",
            (request_id, owner_id),
        ).fetchone()
    return json.loads(row[0]) if row else None


def list_ai_course_requests(
    plan_id: str, user_id: str | None = None
) -> list[dict]:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.list_ai_course_requests(plan_id, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT data FROM ai_course_requests
            WHERE plan_id = ? AND user_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (plan_id, owner_id),
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def save_ai_course_request_details(details_obj: dict, user_id: str | None = None) -> None:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.save_ai_course_request_details(details_obj, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        _upsert_ai_details(connection, details_obj)


def load_ai_course_request_details(
    request_id: str, user_id: str | None = None
) -> Optional[dict]:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.load_ai_course_request_details(request_id, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(
            """
            SELECT details.data
            FROM ai_course_request_details AS details
            JOIN ai_course_requests AS request ON request.id = details.request_id
            WHERE details.request_id = ? AND request.user_id = ?
            """,
            (request_id, owner_id),
        ).fetchone()
    return json.loads(row[0]) if row else None


def save_ai_course_batch(batch_obj: dict, user_id: str | None = None) -> None:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.save_ai_course_batch(batch_obj, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        _upsert_ai_batch(connection, batch_obj)


def list_ai_course_batches(
    request_id: str, user_id: str | None = None
) -> list[dict]:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.list_ai_course_batches(request_id, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT batch.data
            FROM ai_course_batches AS batch
            JOIN ai_course_requests AS request ON request.id = batch.request_id
            WHERE batch.request_id = ? AND request.user_id = ?
            ORDER BY batch.number
            """,
            (request_id, owner_id),
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def save_ai_course_attempt(attempt_obj: dict, user_id: str | None = None) -> None:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.save_ai_course_attempt(attempt_obj, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            INSERT INTO ai_course_attempts (
                id, request_id, batch_id, number, status, data, at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                batch_id = excluded.batch_id,
                status = excluded.status,
                data = excluded.data,
                at = excluded.at
            """,
            (
                attempt_obj["id"],
                attempt_obj["request_id"],
                attempt_obj.get("batch_id"),
                attempt_obj["number"],
                attempt_obj["status"],
                _json_text(attempt_obj),
                attempt_obj["at"],
            ),
        )


def list_ai_course_attempts(
    request_id: str, user_id: str | None = None
) -> list[dict]:
    owner_id = _ai_user_id(user_id)
    if _firestore_store:
        return _firestore_store.list_ai_course_attempts(request_id, owner_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT attempt.data
            FROM ai_course_attempts AS attempt
            JOIN ai_course_requests AS request ON request.id = attempt.request_id
            WHERE attempt.request_id = ? AND request.user_id = ?
            ORDER BY attempt.number
            """,
            (request_id, owner_id),
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def _stored_datetime(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value))
        except ValueError:
            return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def claim_next_ai_course_request(
    worker_id: str,
    lease_seconds: int,
) -> Optional[dict]:
    """Atomically claim queued work or recover an expired worker lease."""
    now = datetime.now(timezone.utc)
    lease_expires_at = now + timedelta(seconds=lease_seconds)
    if _firestore_store:
        return _firestore_store.claim_next_ai_course_request(
            worker_id, now, lease_expires_at
        )
    with sqlite3.connect(config.DB_PATH, timeout=30) as connection:
        connection.execute("BEGIN IMMEDIATE")
        rows = connection.execute(
            """
            SELECT data FROM ai_course_requests
            WHERE status IN ('queued', 'running', 'waiting_for_rate_limit')
            ORDER BY created_at, id
            """
        ).fetchall()
        selected = None
        for row in rows:
            candidate = json.loads(row[0])
            candidate_status = candidate.get("status")
            if candidate_status == "running":
                eligible = (_stored_datetime(candidate.get("lease_expires_at")) or now) <= now
            elif candidate_status == "waiting_for_rate_limit":
                eligible = (_stored_datetime(candidate.get("next_attempt_at")) or now) <= now
            else:
                eligible = True
            if eligible:
                selected = candidate
                break
        if selected is None:
            connection.commit()
            return None
        selected.update(
            status="running",
            claimed_by=worker_id,
            lease_expires_at=lease_expires_at,
            next_attempt_at=None,
            started_at=selected.get("started_at") or now,
            updated_at=now,
        )
        connection.execute(
            """
            UPDATE ai_course_requests
            SET status = 'running', next_attempt_at = NULL, claimed_by = ?,
                lease_expires_at = ?, data = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                worker_id,
                lease_expires_at,
                _json_text(selected),
                now,
                selected["id"],
            ),
        )
        connection.commit()
    return selected


def renew_ai_course_request_lease(
    request_id: str,
    worker_id: str,
    lease_seconds: int,
    user_id: str | None = None,
) -> bool:
    now = datetime.now(timezone.utc)
    lease_expires_at = now + timedelta(seconds=lease_seconds)
    if _firestore_store:
        return _firestore_store.renew_ai_course_request_lease(
            request_id,
            worker_id,
            _ai_user_id(user_id),
            now,
            lease_expires_at,
        )
    with sqlite3.connect(config.DB_PATH, timeout=30) as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT data FROM ai_course_requests WHERE id = ?",
            (request_id,),
        ).fetchone()
        if not row:
            connection.commit()
            return False
        request_obj = json.loads(row[0])
        if (
            request_obj.get("status") != "running"
            or request_obj.get("claimed_by") != worker_id
        ):
            connection.commit()
            return False
        request_obj["lease_expires_at"] = lease_expires_at
        request_obj["updated_at"] = now
        connection.execute(
            """
            UPDATE ai_course_requests
            SET lease_expires_at = ?, data = ?, updated_at = ?
            WHERE id = ? AND claimed_by = ? AND status = 'running'
            """,
            (
                lease_expires_at,
                _json_text(request_obj),
                now,
                request_id,
                worker_id,
            ),
        )
        connection.commit()
    return True


def save_ai_model_config(config_obj: dict) -> None:
    if _firestore_store:
        return _firestore_store.save_ai_model_config(config_obj)
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO ai_model_configs (
                id, provider, enabled, is_default, deleted_at, data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                provider = excluded.provider,
                enabled = excluded.enabled,
                is_default = excluded.is_default,
                deleted_at = excluded.deleted_at,
                data = excluded.data,
                updated_at = excluded.updated_at
            """,
            (
                config_obj["id"],
                config_obj["provider"],
                int(config_obj["enabled"]),
                int(config_obj["is_default"]),
                config_obj.get("deleted_at"),
                _json_text(config_obj),
                config_obj["created_at"],
                config_obj["updated_at"],
            ),
        )


def load_ai_model_config(config_id: str, *, include_deleted: bool = False) -> Optional[dict]:
    if _firestore_store:
        return _firestore_store.load_ai_model_config(
            config_id, include_deleted=include_deleted
        )
    query = "SELECT data FROM ai_model_configs WHERE id = ?"
    parameters: tuple = (config_id,)
    if not include_deleted:
        query += " AND deleted_at IS NULL"
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(query, parameters).fetchone()
    return json.loads(row[0]) if row else None


def list_ai_model_configs(*, include_deleted: bool = False) -> list[dict]:
    if _firestore_store:
        return _firestore_store.list_ai_model_configs(
            include_deleted=include_deleted
        )
    query = "SELECT data FROM ai_model_configs"
    if not include_deleted:
        query += " WHERE deleted_at IS NULL"
    query += " ORDER BY is_default DESC, provider, id"
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute(query).fetchall()
    return [json.loads(row[0]) for row in rows]


def delete_ai_model_config(config_id: str) -> bool:
    if _firestore_store:
        return _firestore_store.delete_ai_model_config(config_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        cursor = connection.execute(
            "DELETE FROM ai_model_configs WHERE id = ?", (config_id,)
        )
        return cursor.rowcount > 0


def is_ai_model_config_referenced(config_id: str) -> bool:
    if _firestore_store:
        return _firestore_store.is_ai_model_config_referenced(config_id)
    with sqlite3.connect(config.DB_PATH) as connection:
        rows = connection.execute("SELECT data FROM ai_course_requests").fetchall()
    return any(
        json.loads(row[0]).get("model_config_id") == config_id for row in rows
    )


init_store()
