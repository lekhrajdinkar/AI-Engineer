"""Compatibility entry point for the API gateway."""

from .app.main import app, select_upstream

__all__ = ["app", "select_upstream"]
