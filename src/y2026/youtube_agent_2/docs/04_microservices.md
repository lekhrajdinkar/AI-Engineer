# Microservice Architecture

- The backend is split into an API gateway:
    - a YouTube integration service,
    - a learning-plans service.
  
The backend can now run as three independent FastAPI processes. The React
application still calls one base URL and does not need route changes.

```text
React UI (:5173)
       |
       v
API gateway (:8001)
       |-------------------------------|
       v                               v
YouTube service (:8002)          Plans service (:8003)
- Google/YouTube OAuth           - plans and courses
- channels/playlists/videos      - source synchronization state
- encrypted provider tokens      - staged feeds and course generation
       ^                               |
       |---- authenticated HTTP --------|
```

## Ownership

| Service | Public routes | Data ownership |
| --- | --- | --- |
| API gateway | Existing frontend API surface | No application data |
| YouTube service | `/auth/*`, `/api/integrations/*`, `/api/channels`, `/api/videos`, playlist catalog | OAuth tokens |
| Plans service | `/api/plans/*`, `/api/courses/*`, `/api/sources/sync-metadata*` | Plans, courses, and source-sync state |

The plans service never reads YouTube OAuth tokens. It calls the YouTube
service with `X-Internal-Service-Token` and `X-Internal-User-ID`. Browser
requests continue to use Firebase bearer tokens. The internal token must be a
long random value and must be identical in both backend services.

## Run with Docker Compose

From `src/y2026/youtube_agent_2`:

```powershell
docker compose up --build
```

The gateway is available at `http://localhost:8001`. Run the frontend as
before with `npm run dev`; its API base URL remains the gateway URL.

Compose uses separate SQLite volumes for local development. When Firebase is
enabled, both services use their own Firestore collections through the current
repository adapter. For production, deploy each entry point independently:

```text
src.y2026.youtube_agent_2.backend.services.gateway.main:app
src.y2026.youtube_agent_2.backend.services.youtube.main:app
src.y2026.youtube_agent_2.backend.services.plans.main:app
```

A separate Render blueprint is available at
`../deployment/render/render-microservices.yaml`. Configure both internal URL
variables and set the same `INTERNAL_SERVICE_TOKEN` value on the YouTube and
plans services before directing the UI to the gateway. The existing
`render.yaml` continues to deploy the rollback-compatible single process.

## Compatibility and rollback

`src.y2026.youtube_agent_2.backend.main:app` still composes every router into
one process. It is the rollback target during migration and retains all public
paths. New code should be added to a domain module and route module, then
composed only into its owning service and the legacy entry point.
