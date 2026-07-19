"""One-time migration of the legacy SQLite data into Firestore.

Run with FIREBASE_ENABLED=true and Firebase Admin credentials configured:
    python -m src.y2026.youtube_agent_2.backend.migrate_sqlite_to_firestore
"""
import json
import sqlite3

from src.y2026.youtube_agent_2.backend import config, db


def migrate():
    if not config.FIREBASE_ENABLED:
        raise RuntimeError("Set FIREBASE_ENABLED=true before running this migration.")
    connection = sqlite3.connect(config.DB_PATH)
    try:
        for (raw_plan,) in connection.execute("SELECT data FROM plans"):
            db.save_plan(json.loads(raw_plan))
        row = connection.execute("SELECT data FROM source_sync_metadata WHERE id = 1").fetchone()
        if row:
            db.save_source_sync_metadata(json.loads(row[0]))
        row = connection.execute("SELECT provider, data FROM tokens ORDER BY id DESC LIMIT 1").fetchone()
        if row:
            db.save_tokens(row[0], json.loads(row[1]))
    finally:
        connection.close()


if __name__ == "__main__":
    migrate()
    print("SQLite data migrated to Firestore for the transitional legacy user.")
