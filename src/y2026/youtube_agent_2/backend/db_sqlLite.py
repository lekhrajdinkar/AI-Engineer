import sqlite3
import json
from typing import Optional, List
from src.y2026.youtube_agent_2.backend import config

def init_db():
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
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    data = json.dumps(tokens, default=str)
    created = tokens.get("created_at")
    cur.execute("INSERT INTO tokens (provider, data, created_at) VALUES (?, ?, ?)", (provider, data, created))
    conn.commit()
    conn.close()


def load_latest_tokens(provider: str) -> Optional[dict]:
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM tokens WHERE provider = ? ORDER BY id DESC LIMIT 1", (provider,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])


def load_plan(plan_id: str) -> Optional[dict]:
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM plans WHERE id = ?", (plan_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])

def delete_plan(plan_id: str) -> bool:
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def list_plans() -> List[dict]:
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM plans ORDER BY updated_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [json.loads(r[0]) for r in rows]


init_db()

