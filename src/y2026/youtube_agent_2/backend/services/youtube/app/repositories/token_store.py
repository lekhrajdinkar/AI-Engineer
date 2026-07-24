"""OAuth token persistence owned exclusively by the YouTube service."""

import json
from typing import Optional

from cryptography.fernet import Fernet

from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.shared.platform.firebase import (
    firestore_client,
)
from src.y2026.youtube_agent_2.backend.shared.platform.relational import connect
from src.y2026.youtube_agent_2.backend.services.youtube.app import config


_firestore = (
    firestore_client()
    if config.STORAGE_BACKEND == "firebase_firestore"
    else None
)


def _connect():
    return connect(
        config.STORAGE_BACKEND,
        sqlite_path=config.DB_PATH,
        database_url=config.DATABASE_URL,
    )


def _user_id() -> str:
    return identity.require_current_user()


def _integration_ref(provider: str):
    return (
        _firestore.collection("users")
        .document(_user_id())
        .collection("integrations")
        .document(provider)
    )


def _token_cipher() -> Fernet:
    if not config.YOUTUBE_TOKEN_ENCRYPTION_KEY:
        raise RuntimeError(
            "YOUTUBE_TOKEN_ENCRYPTION_KEY must be configured for Firestore or PostgreSQL token storage"
        )
    return Fernet(config.YOUTUBE_TOKEN_ENCRYPTION_KEY.encode())


def init_store() -> None:
    if _firestore:
        return
    with _connect() as connection:
        id_declaration = (
            "BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY"
            if connection.backend == "postgres"
            else "INTEGER PRIMARY KEY AUTOINCREMENT"
        )
        user_column = (
            "user_id TEXT NOT NULL,"
            if connection.backend == "postgres"
            else ""
        )
        connection.execute(
            f"""
            CREATE TABLE IF NOT EXISTS tokens (
                id {id_declaration},
                {user_column}
                provider TEXT,
                data TEXT,
                created_at TEXT
            )
            """
        )


def save_tokens(provider: str, tokens: dict) -> None:
    if _firestore:
        encrypted = _token_cipher().encrypt(
            json.dumps(tokens, default=str).encode()
        ).decode()
        _integration_ref(provider).set(
            {"encrypted": encrypted, "created_at": tokens.get("created_at")},
            merge=False,
        )
        return
    with _connect() as connection:
        serialized = json.dumps(tokens, default=str)
        if connection.backend == "postgres":
            serialized = _token_cipher().encrypt(serialized.encode()).decode()
            connection.execute(
                """
                INSERT INTO tokens (user_id, provider, data, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (_user_id(), provider, serialized, tokens.get("created_at")),
            )
        else:
            connection.execute(
                "INSERT INTO tokens (provider, data, created_at) VALUES (?, ?, ?)",
                (provider, serialized, tokens.get("created_at")),
            )


def load_latest_tokens(provider: str) -> Optional[dict]:
    if _firestore:
        snapshot = _integration_ref(provider).get()
        if not snapshot.exists:
            return None
        stored = snapshot.to_dict()
        if "encrypted" in stored:
            return json.loads(
                _token_cipher().decrypt(stored["encrypted"].encode()).decode()
            )
        return stored
    with _connect() as connection:
        if connection.backend == "postgres":
            row = connection.execute(
                """
                SELECT data FROM tokens
                WHERE user_id = ? AND provider = ?
                ORDER BY id DESC LIMIT 1
                """,
                (_user_id(), provider),
            ).fetchone()
        else:
            row = connection.execute(
                "SELECT data FROM tokens WHERE provider = ? ORDER BY id DESC LIMIT 1",
                (provider,),
            ).fetchone()
    if not row:
        return None
    serialized = row[0]
    if config.STORAGE_BACKEND == "postgres":
        serialized = _token_cipher().decrypt(serialized.encode()).decode()
    return json.loads(serialized)


def delete_tokens(provider: str) -> None:
    if _firestore:
        _integration_ref(provider).delete()
        return
    with _connect() as connection:
        if connection.backend == "postgres":
            connection.execute(
                "DELETE FROM tokens WHERE user_id = ? AND provider = ?",
                (_user_id(), provider),
            )
        else:
            connection.execute(
                "DELETE FROM tokens WHERE provider = ?", (provider,)
            )


init_store()
