import sqlite3
import json
from contextvars import ContextVar
from cryptography.fernet import Fernet
from typing import Optional, List
from src.y2026.youtube_agent_2.backend import config

_firestore_store = None
_current_user_id = ContextVar("firebase_user_id", default=None)
if config.FIREBASE_ENABLED:
    from src.y2026.youtube_agent_2.backend.firestore_store import FirestoreStore
    _firestore_store = FirestoreStore()


def set_current_user(user_id: str):
    """Set the verified Firebase uid for the current request context."""
    return _current_user_id.set(user_id)


def reset_current_user(token):
    _current_user_id.reset(token)


def _active_user_id():
    return _current_user_id.get()


def current_user_id():
    return _active_user_id()


def _token_cipher():
    if not config.YOUTUBE_TOKEN_ENCRYPTION_KEY:
        raise RuntimeError("YOUTUBE_TOKEN_ENCRYPTION_KEY must be configured when Firestore is enabled")
    return Fernet(config.YOUTUBE_TOKEN_ENCRYPTION_KEY.encode())

def init_db():
    if _firestore_store:
        return
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS source_sync_metadata (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL,
            updated_at TEXT
        )
        """
    )
    # tokens table for storing OAuth tokens (single-user MVP)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            data TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def save_plan(plan_obj: dict):
    if _firestore_store:
        return _firestore_store.save_plan(plan_obj, _active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    pid = plan_obj.get("id")
    data = json.dumps(plan_obj, default=str)
    created = plan_obj.get("created_at")
    updated = plan_obj.get("updated_at")
    cur.execute("INSERT OR REPLACE INTO plans (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)", (pid, data, created, updated))
    conn.commit()
    conn.close()


def save_tokens(provider: str, tokens: dict):
    if _firestore_store:
        encrypted = _token_cipher().encrypt(json.dumps(tokens, default=str).encode()).decode()
        return _firestore_store.save_tokens(provider, {"encrypted": encrypted, "created_at": tokens.get("created_at")}, _active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    data = json.dumps(tokens, default=str)
    created = tokens.get("created_at")
    cur.execute("INSERT INTO tokens (provider, data, created_at) VALUES (?, ?, ?)", (provider, data, created))
    conn.commit()
    conn.close()


def load_latest_tokens(provider: str) -> Optional[dict]:
    if _firestore_store:
        stored = _firestore_store.load_latest_tokens(provider, _active_user_id())
        if not stored:
            return None
        if "encrypted" in stored:
            return json.loads(_token_cipher().decrypt(stored["encrypted"].encode()).decode())
        return stored
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM tokens WHERE provider = ? ORDER BY id DESC LIMIT 1", (provider,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])


def load_plan(plan_id: str) -> Optional[dict]:
    if _firestore_store:
        return _firestore_store.load_plan(plan_id, _active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM plans WHERE id = ?", (plan_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])

def delete_plan(plan_id: str) -> bool:
    if _firestore_store:
        return _firestore_store.delete_plan(plan_id, _active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def list_plans() -> List[dict]:
    if _firestore_store:
        return _firestore_store.list_plans(_active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM plans ORDER BY updated_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [json.loads(r[0]) for r in rows]

def save_source_sync_metadata(metadata: dict):
    if _firestore_store:
        return _firestore_store.save_source_sync_metadata(metadata, _active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO source_sync_metadata (id, data, updated_at) VALUES (1, ?, ?)",
        (json.dumps(metadata, default=str), metadata.get("updated_at")),
    )
    conn.commit()
    conn.close()

def load_source_sync_metadata() -> dict:
    if _firestore_store:
        return _firestore_store.load_source_sync_metadata(_active_user_id())
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM source_sync_metadata WHERE id = 1")
    row = cur.fetchone()
    conn.close()
    return json.loads(row[0]) if row else {"channels": [], "updated_at": None}


init_db()

