# Plans Service

Owns learning plans, courses, modules, videos, source-sync state, staged feeds,
LLM-backed course generation, and their persistence. YouTube data is requested
through the service-owned HTTP adapter using shared wire contracts.

```powershell
uvicorn src.y2026.youtube_agent_2.backend.services.plans.app.main:app --reload --port 8003
```

---

# Plans-Service LLM Integration with Local Kubernetes Monitoring

## Summary

- Replace both deterministic AI implementations with Ollama `qwen3:8b`.
- Preserve synchronous generate-and-save behavior; no preview workflow or frontend changes.
- Start with at most 100 videos per request, processed in batches of 25.
- Ignore video descriptions entirely because they frequently contain promotional or instruction-like content.
- Use structured JSON logs and the lightweight `amir20/dozzle:v10.6.11` image for Kubernetes log monitoring. Dozzle supports Kubernetes pod logs, JSON detection, filtering, and live resource statistics. [Dozzle Kubernetes support](https://dozzle.dev/guide/k8s)

## API and Organization Behavior

- `POST /api/plans/{plan_id}/add-course-ai-suggested`
    - Activate the existing `AiCourseRequest`.
    - Deduplicate by `video_id` within the request and against every course already in the target plan.
    - Organize only new videos; return `422` if nothing remains.
    - Preserve `{"message": "AI suggested course created", "plan": ...}`.

- `POST /api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed`
    - Deduplicate staged feeds internally and against all videos already in the plan.
    - Assign new videos to existing modules or create AI-suggested modules.
    - Clear feeds and `refresh_needed` only after successful validation and persistence.
    - Preserve `{"plan": ..., "added_videos": N}`.

- Add `X-LLM-Run-ID` to successful and error responses for log correlation.
- Return `413` above the configured video limit, `503` when Ollama/model is unavailable, and `502` after repeated invalid model output. Never write partial results or use the old deterministic fallback.

## LLM Provider and Logging

- Add an injectable Ollama provider using `/api/chat` with:
    - Pydantic JSON schemas.
    - `temperature: 0`, `stream: false`, and thinking disabled.
    - One corrective retry for malformed schemas, missing IDs, duplicate IDs, unknown IDs, or invalid course/module keys.
    - Server-side reconstruction of authoritative `Video`, `Course`, and `Module` objects.

- Prompt metadata will contain only:
    - `video_id`, title, tags, `category_id`, publication date, and duration.
    - Custom topic-oriented labels when present.
    - Exclude descriptions, URLs, thumbnails, view/like counts, and state labels such as `watched`, `bookmarked`, `mark_for_delete`, and `refresh_needed`.

- Generate an outline first, then classify videos in batches using compact groups of course/module keys and video IDs. Every accepted input ID must appear exactly once before persistence.

- Add structured JSON logging to stdout with standard Python logging:
    - Events: `llm.run.started`, `llm.call.completed`, `llm.validation.retry`, `llm.run.completed`, and `llm.run.failed`.
    - Fields: run ID, plan/course ID, model, workflow, stage, attempt, batch number, video counts, duplicate counts, latency, HTTP status, prompt/evaluation token counts, and Ollama load/evaluation durations.
    - Never log prompts, model responses, titles, tags, credentials, or descriptions.
    - Add `LOG_LEVEL`, defaulting to `INFO`.

- Configuration defaults:
    - `LLM_BASE_URL=http://localhost:11434`
    - `LLM_MODEL=qwen3:8b`
    - `LLM_REQUEST_TIMEOUT_SECS=600`
    - `LLM_BATCH_SIZE=25`
    - `LLM_MAX_VIDEOS=100`

For a host-run plans service, start an Ollama container and pull the model. The
full Compose stack performs the pull automatically through `ollama-init`:

```powershell
docker compose -f src/y2026/youtube_agent_2/deployment/docker/docker-compose.yml up --build
docker compose -f src/y2026/youtube_agent_2/deployment/docker/docker-compose.yml logs -f plans-service ollama
```

Ollama supports CPU-only Docker execution and schema-constrained structured responses. [Ollama Docker](https://docs.ollama.com/docker), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

## Docker Desktop Kubernetes

- Add Ollama to both the raw Kubernetes manifests and Helm chart:
    - `ollama/ollama:latest`, configurable through Helm values.
    - Single-replica Deployment with `Recreate` strategy.
    - ClusterIP service at `http://ollama:11434`.
    - 10 GiB persistent volume for models.
    - Readiness check using `ollama list`.
    - Retryable Kubernetes Job that pulls `qwen3:8b` into the shared volume.
    - Suggested local resources: request 4 CPU/8 GiB; limit 12 CPU/12 GiB.

- Configure plans service with the in-cluster Ollama URL and gateway timeout of 600 seconds.
- Keep Ollama private inside the cluster; use `kubectl port-forward` only for manual diagnostics.
- Preserve Docker Compose parity for developers not running Kubernetes.

- Add optional Dozzle deployment:
    - `amir20/dozzle:v10.6.11`
    - `DOZZLE_MODE=k8s`
    - Read-only ServiceAccount/RBAC for pods, pod logs, workloads, nodes, and metrics.
    - Disable shell/exec access.
    - ClusterIP service accessed through port-forward.
    - Helm switch `observability.dozzle.enabled`, enabled in the local example values.

- Do not add OpenLIT initially. Its Kubernetes installation adds the OpenLIT platform, ClickHouse, and an OpenTelemetry Collector, which is unnecessarily heavy beside an 8B CPU model on the current 16 GiB Docker allocation. It remains the follow-up option when token dashboards and distributed LLM traces are needed. [OpenLIT self-hosting](https://docs.openlit.io/latest/openlit/installation)

## Manual Verification

Automated test development is excluded as requested. Verify manually with a small 5–20 video selection:

- Confirm the model-pull Job completes and Ollama, plans service, gateway, and Dozzle become ready.
- Follow a run in Dozzle using `llm_run_id` and confirm outline, batch, token, timing, and completion events.
- Confirm course generation preserves original video metadata and saves every unique video exactly once.
- Submit the same selection again and confirm backend duplicate filtering prevents another copy.
- Stage a small refresh feed and confirm placement into existing and newly generated modules.
- Stop Ollama and confirm the endpoint returns `503` without changing the plan or clearing staged feeds.
- Confirm no video descriptions, prompts, or generated responses appear in logs.
