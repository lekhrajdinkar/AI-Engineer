"""OAuth token persistence owned exclusively by the YouTube service."""

import json
import sqlite3
from typing import Optional

from cryptography.fernet import Fernet

from src.y2026.youtube_agent_2.backend.shared.platform import identity
from src.y2026.youtube_agent_2.backend.shared.platform.firebase import (
    firestore_client,
)
from src.y2026.youtube_agent_2.backend.services.youtube.app import config


_firestore = firestore_client() if config.FIREBASE_ENABLED else None


def _user_id() -> str:
    return identity.current_user_id() or config.FIREBASE_DEFAULT_USER_ID


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
            "YOUTUBE_TOKEN_ENCRYPTION_KEY must be configured when Firestore is enabled"
        )
    return Fernet(config.YOUTUBE_TOKEN_ENCRYPTION_KEY.encode())


def init_store() -> None:
    if _firestore:
        return
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute(
            "INSERT INTO tokens (provider, data, created_at) VALUES (?, ?, ?)",
            (provider, json.dumps(tokens, default=str), tokens.get("created_at")),
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
    with sqlite3.connect(config.DB_PATH) as connection:
        row = connection.execute(
            "SELECT data FROM tokens WHERE provider = ? ORDER BY id DESC LIMIT 1",
            (provider,),
        ).fetchone()
    return json.loads(row[0]) if row else None


def delete_tokens(provider: str) -> None:
    if _firestore:
        _integration_ref(provider).delete()
        return
    with sqlite3.connect(config.DB_PATH) as connection:
        connection.execute("DELETE FROM tokens WHERE provider = ?", (provider,))


init_store()
