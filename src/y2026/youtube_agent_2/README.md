# Youtube Agent
[project-req-doc.md](docs/01_project-req-doc.md)

```
README.md
docs/
deploymnet/
frontend/
backend/
├── services/
│   ├── gateway/
│   │   ├── app/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── youtube/
│   │   ├── app/api, domain, infrastructure, repositories
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── plans/
│       ├── app/api, domain, infrastructure, repositories
│       ├── tests/
│       ├── Dockerfile
│       └── requirements.txt
├── shared/
│   ├── contracts/
│   └── platform/
```

## ✔️ Run ⭐
microservice | http://127.0.0.1:8001/docs | [microservices.md](docs/04_microservices.md)

```
- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- pip install -r requirements.txt
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
# The local deployment includes Ollama qwen3:8b and Dozzle log monitoring.
kubectl apply -k src/y2026/youtube_agent_2/deployment/kubernetes

# Helm (recommended for repeatable Kubernetes installs)
helm upgrade --install youtube-agent src/y2026/youtube_agent_2/deployment/helm --namespace youtube-agent --create-namespace --timeout 20m --wait
```
React UI
```bash
# Start Vite
# Dependencies are installed at the repo root (`../../..`). No separate `npm install` needed here.
cd src\y2026\youtube_agent_2\frontend;
npm run dev
```

fallback to SQLite
```properties
FIREBASE_ENABLED=false
FIREBASE_AUTH_REQUIRED=false
```
Deploy/Run to render
- [deploy-to-render.md](docs/03_deploy-to-render.md)
- [render-microservices.yaml](deployment/render/render-microservices.yaml)

Local Kubernetes
- [deployment/kubernetes/README.md](deployment/kubernetes/README.md)
- [deployment/helm/README.md](deployment/helm/README.md)

---
## ✔️One time configuration
- 1 update environment variables 
  - [.env.example backend](backend/.env.example)
  - [.env.example frontend](frontend/.env.example)
- [2 firebase-integration.md](docs/02_firebase-integration.md) | Authn
- 3 Console Console | GCP 
  - https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=agents-2026-502600
  - https://developers.google.com/youtube/v3/docs/?apix=true | usage docs
  - Setup API service to call YT API 
  - OAuth client (fastapi), fetch and store it firebase database
  - ![img.png](docs/img/google-console.png)

```
Steps
- Navigation menu → APIs & Services → Library.
- Search for “YouTube Data API v3” → Enable.
- APIs & Services → OAuth consent screen.
- Choose “Internal” (G Suite only) or “External” (most apps use External).
- Create OAuth 2.0 Client ID
    - APIs & Services → Credentials → + Create Credentials → OAuth client ID.
    - Application type: choose “Web application”.
    - Name: e.g., “youtube-learning-ui”.
    - Authorized JavaScript origins: (if needed) e.g., http://localhost:5173 , UI URL
    - Authorized redirect URIs:  http://localhost:8001/auth/google/callback , backend api URL
```
