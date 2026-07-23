# Youtube Agent
[project-req-doc.md](docs/01_project-req-doc.md)

## ✔️ Run ⭐
- env var: [.env.example backend](backend/.env.example)| [.env.example frontend](frontend/.env.example)
- http://127.0.0.1:8001/docs (API GATEWAY) | http://127.0.0.1:5173 (UI)

```
- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- uv add  -r src/y2026/youtube_agent_2/backend/services/plans/requirements.txt 
- uv add  -r src/y2026/youtube_agent_2/backend/services/youtube/requirements.txt 
- uv add  -r src/y2026/youtube_agent_2/backend/services/gateway/requirements.txt 
```

```bash
# API gateway 
uvicorn src.y2026.youtube_agent_2.backend.services.gateway.app.main:app --reload --port 8001

# microServices (2)
uvicorn src.y2026.youtube_agent_2.backend.services.youtube.app.main:app --reload --port 8002
uvicorn src.y2026.youtube_agent_2.backend.services.plans.app.main:app --reload --port 8003

# Docker Compose (optional)
docker compose -f src/y2026/youtube_agent_2/deployment/docker/docker-compose.yml up --build

# Docker Desktop Kubernetes
# See deployment/kubernetes/README.md for build, secrets, and deploy commands.
kubectl apply -k src/y2026/youtube_agent_2/deployment/kubernetes

# Helm (recommended for repeatable Kubernetes installs)
helm upgrade --install youtube-agent src/y2026/youtube_agent_2/deployment/helm --namespace youtube-agent --create-namespace --wait
```
React UI
```bash
# Start Vite
# Dependencies are installed at the repo root (`../../..`). No separate `npm install` needed here.
cd src\y2026\youtube_agent_2\frontend; npm run dev
```

fallback to SQLite
```properties
FIREBASE_ENABLED=false
FIREBASE_AUTH_REQUIRED=false
```

**Future Deployment**
- [deploy-to-render.md](deployment/render/README.md) | [render-microservices.yaml](deployment/render/render-microservices.yaml)
- [deployment/kubernetes/README.md](deployment/kubernetes/README.md)
- [deployment/helm/README.md](deployment/helm/README.md)