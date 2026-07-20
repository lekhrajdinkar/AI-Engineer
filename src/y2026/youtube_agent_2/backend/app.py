"""FastAPI application shell shared by the legacy app and microservices."""

import secrets

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from src.y2026.youtube_agent_2.backend import config, db


def create_app(
    *,
    service_name: str = "legacy-api",
    title: str = "YouTube Learning Organizer - Backend",
    require_identity: bool = True,
) -> FastAPI:
    """Create a service shell without coupling it to feature routes."""
    app = FastAPI(title=title)
    app.state.service_name = service_name

    @app.middleware("http")
    async def require_firebase_identity(request: Request, call_next):
        """Require a Firebase ID token for protected API routes when enabled."""
        if request.method == "OPTIONS" or not require_identity or not request.url.path.startswith("/api/"):
            return await call_next(request)

        internal_token = request.headers.get("X-Internal-Service-Token", "")
        if internal_token:
            if not config.INTERNAL_SERVICE_TOKEN or not secrets.compare_digest(
                internal_token, config.INTERNAL_SERVICE_TOKEN
            ):
                return JSONResponse(status_code=401, content={"detail": "Invalid internal service credential"})
            context_token = db.set_current_user(
                request.headers.get("X-Internal-User-ID") or config.FIREBASE_DEFAULT_USER_ID
            )
            try:
                return await call_next(request)
            finally:
                db.reset_current_user(context_token)

        if not config.FIREBASE_AUTH_REQUIRED:
            return await call_next(request)

        authorization = request.headers.get("Authorization", "")
        scheme, _, id_token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not id_token:
            return JSONResponse(status_code=401, content={"detail": "Firebase ID token required"})

        try:
            from firebase_admin import auth as firebase_auth

            decoded = firebase_auth.verify_id_token(id_token, check_revoked=True)
            context_token = db.set_current_user(decoded["uid"])
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired Firebase ID token"})

        try:
            return await call_next(request)
        finally:
            db.reset_current_user(context_token)

    # Register CORS after authentication so it wraps authentication failures
    # as well as successful endpoint responses.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            config.FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    def health_check():
        return {
            "status": "ok",
            "service": service_name,
            "firebase_enabled": config.FIREBASE_ENABLED,
        }

    @app.get("/", tags=["meta"])
    def root():
        return {"service": service_name, "status": "ok"}

    return app
