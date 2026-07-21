# Plans Service

Owns learning plans, courses, modules, videos, source-sync state, staged feeds,
course generation, and their persistence. YouTube data is requested through
the service-owned HTTP adapter using shared wire contracts.

The current dummy AI generator reads sample exports from `docs/json-dumps`;
`AI_FIXTURE_DIR` can override that temporary fixture location.

```powershell
uvicorn src.y2026.youtube_agent_2.backend.services.plans.app.main:app --reload --port 8003
```
