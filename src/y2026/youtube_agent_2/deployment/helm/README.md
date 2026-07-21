# YouTube Agent Helm chart

This chart deploys the API gateway, YouTube integration service, plans service,
CPU-only Ollama with `qwen3:8b`, and optional Dozzle log monitoring. It defaults
to Docker Desktop Kubernetes, local application images, SQLite persistence,
and disabled Firebase authentication.

Allocate at least 16 GiB and 12 CPUs to Docker Desktop. Ollama requests 4
CPUs/8 GiB and may use up to 12 CPUs/12 GiB while the model is loaded.

Use either this Helm chart or the raw Kustomize manifests for a given cluster,
not both. Installing both creates two independent copies of the services.

Run commands from the repository root.

## 1. Build the images

```powershell
docker build -f src/y2026/youtube_agent_2/backend/services/gateway/Dockerfile -t youtube-agent-gateway:local .
docker build -f src/y2026/youtube_agent_2/backend/services/youtube/Dockerfile -t youtube-agent-youtube:local .
docker build -f src/y2026/youtube_agent_2/backend/services/plans/Dockerfile -t youtube-agent-plans:local .
```

The default `imagePullPolicy: Never` makes the Docker Desktop cluster use
these local images.

## 2. Install or upgrade

```powershell
kubectl config use-context docker-desktop
helm upgrade --install youtube-agent `
  src/y2026/youtube_agent_2/deployment/helm `
  --namespace youtube-agent `
  --create-namespace `
  --timeout 20m `
  --wait
```

The post-install/post-upgrade Job pulls the configured model into the retained
Ollama PVC. Subsequent upgrades reuse the cached model.

The gateway is exposed at `http://localhost:8001`. If Docker Desktop has not
published the LoadBalancer, use:

```powershell
kubectl port-forward service/youtube-agent-gateway 8001:8001 -n youtube-agent
```

Dozzle is enabled for local installs and is not publicly exposed:

```powershell
kubectl port-forward service/youtube-agent-dozzle 8080:8080 -n youtube-agent
```

Open `http://localhost:8080` and filter structured logs by `llm_run_id`.

## Application secrets

The chart always creates a shared internal-service Secret unless
`internalService.existingSecret` is configured. YouTube OAuth and Firebase
Secrets are not created by default.

For local OAuth/Firebase testing, create service-owned Secrets outside Helm.
The example under `deployment/kubernetes` contains separate YouTube and plans
Secrets so the plans service never receives Google OAuth credentials:

```powershell
kubectl create namespace youtube-agent --dry-run=client -o yaml | kubectl apply -f -
Copy-Item src/y2026/youtube_agent_2/deployment/kubernetes/secret.example.yaml `
  src/y2026/youtube_agent_2/deployment/kubernetes/secret.local.yaml
# Replace all replace-me values, then apply it.
kubectl apply -f src/y2026/youtube_agent_2/deployment/kubernetes/secret.local.yaml
```

Create a private `deployment/helm/values.local.yaml` containing:

```yaml
config:
  firebaseEnabled: true
  firebaseAuthRequired: true

secrets:
  youtube:
    existingSecret: youtube-service-secrets
  plans:
    existingSecret: plans-service-secrets
```

The private values filename is ignored by Git. Apply it with:

```powershell
helm upgrade --install youtube-agent `
  src/y2026/youtube_agent_2/deployment/helm `
  --namespace youtube-agent `
  --create-namespace `
  --values src/y2026/youtube_agent_2/deployment/helm/values.local.yaml `
  --wait
```

For shared environments, also use an externally managed Secret containing
`INTERNAL_SERVICE_TOKEN` and set `internalService.existingSecret` instead of
keeping the development token.

## Inspect and validate

```powershell
helm lint src/y2026/youtube_agent_2/deployment/helm
helm template youtube-agent src/y2026/youtube_agent_2/deployment/helm --namespace youtube-agent
helm status youtube-agent -n youtube-agent
kubectl get deployments,services,pvc,jobs -n youtube-agent
```

All settings, including image repositories/tags, replicas, resources, service
ports, probes, and persistence, are configurable in `values.yaml`.

## Uninstall

```powershell
helm uninstall youtube-agent -n youtube-agent
```

The chart retains its PVCs by default to avoid deleting SQLite data during an
uninstall or reinstall. Delete them explicitly only when the data is no longer
needed:

```powershell
kubectl delete pvc youtube-agent-youtube-data youtube-agent-plans-data youtube-agent-ollama-data -n youtube-agent
```
