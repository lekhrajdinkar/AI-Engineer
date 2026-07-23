"""Backward-compatible public gateway for the frontend."""

import httpx
from fastapi import Request
from starlette.responses import Response

from src.y2026.youtube_agent_2.backend.shared.platform import create_app
from src.y2026.youtube_agent_2.backend.services.gateway.app import config
from src.y2026.youtube_agent_2.backend.services.gateway.app.routing import select_upstream


app = create_app(
    service_name="api-gateway",
    title="YouTube Learning Organizer - API Gateway",
    require_identity=False,
)

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


def _upstream_request_headers(request: Request) -> dict[str, str]:
    headers = {
        name: value
        for name, value in request.headers.items()
        if name.lower() not in {"host", "content-length", "accept-encoding"}
    }
    # httpx only decodes optional Brotli/Zstandard encodings when their extra
    # packages are installed. Asking service-to-service calls for identity
    # prevents encoded bytes from being forwarded as an application/json body.
    headers["Accept-Encoding"] = "identity"
    headers["X-Forwarded-Host"] = request.headers.get("host", "")
    return headers


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
    request_headers = _upstream_request_headers(request)
    request_headers["X-Gateway-Service"] = service_name

    try:
        async with httpx.AsyncClient(
            follow_redirects=False, timeout=config.REQUEST_TIMEOUT_SECS
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
