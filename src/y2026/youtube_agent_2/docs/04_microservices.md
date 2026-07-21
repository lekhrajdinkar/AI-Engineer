# Microservice Architecture

- The backend is split into an API gateway:
    - a YouTube integration service,
    - a learning-plans service.
  
The backend runs as three independently packaged FastAPI services. Each service
folder owns its API, domain, infrastructure, repositories, configuration,
requirements, Dockerfile, and tests. The React application still calls one
base URL and does not need route changes.

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

From the repository root:

```powershell
docker compose -f src/y2026/youtube_agent_2/deployment/docker/docker-compose.yml up --build
```

The gateway is available at `http://localhost:8001`. Run the frontend as
before with `npm run dev`; its API base URL remains the gateway URL.

## Run with Docker Desktop Kubernetes

The manifests under `deployment/kubernetes` run each backend as a separate
Deployment and Service. The gateway uses a local LoadBalancer on port 8001;
YouTube and plans remain cluster-internal. Each data service has its own
persistent volume claim.

Build the three `:local` images and apply the Kustomize directory by following
[`deployment/kubernetes/README.md`](../deployment/kubernetes/README.md).

For configurable and repeatable installs, use the Helm chart under
`deployment/helm`. It exposes images, replicas, resources, probes, service
ports, persistence, Firebase mode, and external Secret names through
`values.yaml`. See [`deployment/helm/README.md`](../deployment/helm/README.md).

Compose uses separate SQLite volumes for local development. When Firebase is
enabled, both services use their own Firestore collections through the current
repository adapter. For production, deploy each entry point independently:

```text
src.y2026.youtube_agent_2.backend.services.gateway.app.main:app
src.y2026.youtube_agent_2.backend.services.youtube.app.main:app
src.y2026.youtube_agent_2.backend.services.plans.app.main:app
```

## Source layout and dependency direction

```text
backend/
  services/
    gateway/app/       # routing and proxy implementation
    youtube/app/       # OAuth, catalog, YouTube client, token repository
    plans/app/         # plans, sync workflows, models, plan repository
  shared/
    contracts/         # HTTP/event payload types only
    platform/          # auth identity, Firebase setup, middleware
```

Allowed imports are `service -> shared` and imports within the same service.
One service must not import another service's `app` package. Runtime
communication uses HTTP contracts.

A Render blueprint is available at
`../deployment/render/render-microservices.yaml`. Configure both internal URL
variables and set the same `INTERNAL_SERVICE_TOKEN` value on the YouTube and
plans services before directing the UI to the gateway. Each service builds
from the Dockerfile and requirements file inside its own folder.
