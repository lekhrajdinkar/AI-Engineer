"""Backward-compatible public gateway for the frontend."""

import re
import httpx
from fastapi import Request
from starlette.responses import Response

from src.y2026.youtube_agent_2.backend import config
from src.y2026.youtube_agent_2.backend.app import create_app


app = create_app(
    service_name="api-gateway",
    title="YouTube Learning Organizer - API Gateway",
    require_identity=False,
)

_PLAYLIST_PATH = re.compile(r"^/api/[^/]+/playlists$")
_HOP_BY_HOP_RESPONSE_HEADERS = {
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


def select_upstream(path: str) -> tuple[str, str]:
    """Return the owning service name and base URL for a public path."""
    if (
        path.startswith("/auth/")
        or path.startswith("/api/integrations/")
        or path in {"/api/channels", "/api/videos"}
        or _PLAYLIST_PATH.match(path)
    ):
        return "youtube-service", config.GATEWAY_YOUTUBE_SERVICE_URL.rstrip("/")
    if path.startswith("/api/"):
        return "plans-service", config.GATEWAY_PLANS_SERVICE_URL.rstrip("/")
    return "", ""


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    include_in_schema=False,
)
async def proxy(path: str, request: Request):
    public_path = f"/{path}"
    service_name, base_url = select_upstream(public_path)
    if not base_url:
        return Response(
            content=b'{"detail":"Route not found"}',
            status_code=404,
            media_type="application/json",
        )

    target_url = f"{base_url}{public_path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"
    request_headers = {
        name: value
        for name, value in request.headers.items()
        if name.lower() not in {"host", "content-length"}
    }
    request_headers["X-Forwarded-Host"] = request.headers.get("host", "")
    request_headers["X-Gateway-Service"] = service_name

    try:
        async with httpx.AsyncClient(
            follow_redirects=False, timeout=config.SERVICE_REQUEST_TIMEOUT_SECS
        ) as client:
            upstream = await client.request(
                request.method,
                target_url,
                headers=request_headers,
                content=await request.body(),
            )
    except httpx.RequestError:
        return Response(
            content=(
                '{"detail":"%s unavailable"}' % service_name
            ).encode("utf-8"),
            status_code=503,
            media_type="application/json",
        )

    response_headers = {
        name: value
        for name, value in upstream.headers.items()
        if name.lower() not in _HOP_BY_HOP_RESPONSE_HEADERS
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
