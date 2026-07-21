# Local Kubernetes deployment

These manifests target the Docker Desktop `docker-desktop` context. They run
the three backend microservices, CPU-only Ollama, a `qwen3:8b` model-pull Job,
and Dozzle in the `youtube-agent` namespace. The gateway is exposed on
`http://localhost:8001`; Ollama and the internal services remain private.

Allocate at least 16 GiB and 12 CPUs to Docker Desktop before enabling its
Kubernetes cluster. The Ollama defaults request 4 CPUs/8 GiB and may use up to
12 CPUs/12 GiB while the model is loaded.

For release-based upgrades and configurable values, prefer the Helm chart in
`deployment/helm`. Do not install both variants into the same namespace.

Run commands from the repository root.

## 1. Build local images

Docker Desktop Kubernetes can use images built by the same Docker Desktop
engine. The manifests use `imagePullPolicy: Never` so Kubernetes does not try
to download the local tags.

```powershell
docker build -f src/y2026/youtube_agent_2/backend/services/gateway/Dockerfile -t youtube-agent-gateway:local .
docker build -f src/y2026/youtube_agent_2/backend/services/youtube/Dockerfile -t youtube-agent-youtube:local .
docker build -f src/y2026/youtube_agent_2/backend/services/plans/Dockerfile -t youtube-agent-plans:local .
```

## 2. Add optional application secrets

The default configuration uses local SQLite and disables Firebase
authentication. The services start without their optional application
Secrets, but YouTube OAuth requires `youtube-service-secrets`. Plans receives
only its Firebase credential through `plans-service-secrets`; it never receives
Google OAuth or YouTube token-encryption secrets.

```powershell
Copy-Item src/y2026/youtube_agent_2/deployment/kubernetes/secret.example.yaml `
  src/y2026/youtube_agent_2/deployment/kubernetes/secret.local.yaml
```

Replace every `replace-me` value in `secret.local.yaml`. The local file is
ignored by Git. Enable Firebase in `configmap.yaml` only after supplying valid
Firebase credentials.

## 3. Deploy

```powershell
kubectl config use-context docker-desktop
kubectl apply -f src/y2026/youtube_agent_2/deployment/kubernetes/namespace.yaml
kubectl apply -f src/y2026/youtube_agent_2/deployment/kubernetes/secret.local.yaml
kubectl apply -k src/y2026/youtube_agent_2/deployment/kubernetes
kubectl rollout status deployment/api-gateway -n youtube-agent
kubectl rollout status deployment/youtube-service -n youtube-agent
kubectl rollout status deployment/plans-service -n youtube-agent
kubectl rollout status deployment/ollama -n youtube-agent
kubectl wait --for=condition=complete job/ollama-model-pull -n youtube-agent --timeout=20m
```

Skip the `secret.local.yaml` command when only testing health and local SQLite
features.

## 4. Verify and access

```powershell
kubectl get all,pvc -n youtube-agent
Invoke-RestMethod http://localhost:8001/health
```

If Docker Desktop does not publish the LoadBalancer immediately, use a port
forward in a separate terminal:

```powershell
kubectl port-forward service/api-gateway 8001:8001 -n youtube-agent
```

Then run the Vite frontend locally on `http://localhost:5173`.

To inspect structured plans-service and Ollama logs in Dozzle:

```powershell
kubectl port-forward service/dozzle 8080:8080 -n youtube-agent
```

Open `http://localhost:8080` and filter for `llm_run_id`. Resource statistics
also require the Kubernetes Metrics API; logs work without it. Ollama can be
temporarily inspected with:

```powershell
kubectl port-forward service/ollama 11434:11434 -n youtube-agent
```

## Update or remove

After rebuilding an image with the same `:local` tag, restart that Deployment:

```powershell
kubectl rollout restart deployment/api-gateway -n youtube-agent
kubectl rollout restart deployment/youtube-service -n youtube-agent
kubectl rollout restart deployment/plans-service -n youtube-agent
kubectl rollout restart deployment/ollama -n youtube-agent
```

Remove only these application resources with:

```powershell
kubectl delete namespace youtube-agent
```

Deleting the namespace also deletes the local SQLite and Ollama persistent
volume claims and their stored data/models.
