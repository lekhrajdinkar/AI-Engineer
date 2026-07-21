# YouTube Service

Owns Google/YouTube OAuth, channel/playlist/video catalog access, OAuth token
encryption, and token persistence. It does not import plans models or plan
repositories.

```powershell
uvicorn src.y2026.youtube_agent_2.backend.services.youtube.app.main:app --reload --port 8002
```
