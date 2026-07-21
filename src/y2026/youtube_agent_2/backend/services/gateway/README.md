# API Gateway

Owns public-path routing and reverse proxy behavior. It stores no application
data and depends only on `backend.shared` plus HTTP endpoints exposed by the
other services.

```powershell
uvicorn src.y2026.youtube_agent_2.backend.services.gateway.app.main:app --reload --port 8001
```
