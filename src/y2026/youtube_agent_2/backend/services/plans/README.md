# Plans Service

Owns learning plans, courses, modules, videos, source-sync state, staged feeds,
course generation, and their persistence. YouTube data is requested through
the service-owned HTTP adapter using shared wire contracts.

AI course generation uses the LangGraph workflow in `app/api/ai.py`. Set
`GROQ_API_KEY` before invoking it; `AI_LLM_MODEL` defaults to
`openai/gpt-oss-20b` for the hosted Groq POC.

```powershell
uvicorn src.y2026.youtube_agent_2.backend.services.plans.app.main:app --reload --port 8003
```
