"""Request identity context shared by authentication and repositories."""

from contextvars import ContextVar, Token


_current_user_id: ContextVar[str | None] = ContextVar(
    "firebase_user_id", default=None
)


def set_current_user(user_id: str) -> Token:
    return _current_user_id.set(user_id)


def reset_current_user(token: Token) -> None:
    _current_user_id.reset(token)


def current_user_id() -> str | None:
    return _current_user_id.get()
