"""Small DB-API compatibility layer for SQLite and PostgreSQL repositories."""

import sqlite3
import os
from atexit import register
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from threading import Lock
from typing import Iterator


SUPPORTED_RELATIONAL_BACKENDS = {"sqlite", "postgres"}
_postgres_pools = {}
_pool_lock = Lock()


def _postgres_pool(database_url: str):
    with _pool_lock:
        pool = _postgres_pools.get(database_url)
        if pool is None:
            try:
                from psycopg_pool import ConnectionPool
            except ImportError as exc:
                raise RuntimeError(
                    "psycopg-pool is required when STORAGE_BACKEND=postgres"
                ) from exc
            pool = ConnectionPool(
                conninfo=database_url,
                min_size=int(os.getenv("DATABASE_POOL_MIN_SIZE", "1")),
                max_size=int(os.getenv("DATABASE_POOL_MAX_SIZE", "10")),
                open=True,
            )
            _postgres_pools[database_url] = pool
        return pool


def _close_pools() -> None:
    for pool in _postgres_pools.values():
        pool.close()


register(_close_pools)


class Connection:
    def __init__(self, raw, backend: str):
        self.raw = raw
        self.backend = backend

    def execute(self, sql: str, parameters=()):
        if self.backend == "postgres":
            stripped = sql.strip().upper()
            if stripped.startswith("PRAGMA "):
                return _EmptyCursor()
            if stripped == "BEGIN IMMEDIATE":
                sql = "BEGIN"
            sql = sql.replace("?", "%s")
            parameters = tuple(
                value.isoformat() if isinstance(value, (date, datetime)) else value
                for value in parameters
            )
        return self.raw.execute(sql, parameters)

    def commit(self) -> None:
        self.raw.commit()

    def rollback(self) -> None:
        self.raw.rollback()


class _EmptyCursor:
    rowcount = 0

    def fetchone(self):
        return None

    def fetchall(self):
        return []


@contextmanager
def connect(
    backend: str,
    *,
    sqlite_path: Path,
    database_url: str | None,
    timeout: int = 30,
) -> Iterator[Connection]:
    if backend not in SUPPORTED_RELATIONAL_BACKENDS:
        raise ValueError(f"{backend!r} is not a relational storage backend")

    if backend == "sqlite":
        raw = sqlite3.connect(sqlite_path, timeout=timeout)
        connection = Connection(raw, backend)
        try:
            yield connection
            raw.commit()
        except Exception:
            raw.rollback()
            raise
        finally:
            raw.close()
        return

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL must be configured when STORAGE_BACKEND=postgres"
        )
    pool = _postgres_pool(database_url)
    with pool.connection(timeout=timeout) as raw:
        connection = Connection(raw, backend)
        try:
            yield connection
            raw.commit()
        except Exception:
            raw.rollback()
            raise
