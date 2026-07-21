# Local Kubernetes deployment

These manifests target the Docker Desktop `docker-desktop` context. They run
the three backend microservices in the `youtube-agent` namespace. The gateway
is exposed on `http://localhost:8001`; the YouTube and plans services are
reachable only through Kubernetes service discovery.

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

## Update or remove

After rebuilding an image with the same `:local` tag, restart that Deployment:

```powershell
kubectl rollout restart deployment/api-gateway -n youtube-agent
kubectl rollout restart deployment/youtube-service -n youtube-agent
kubectl rollout restart deployment/plans-service -n youtube-agent
```

Remove only these application resources with:

```powershell
kubectl delete namespace youtube-agent
```

Deleting the namespace also deletes both local SQLite persistent volume
claims and their stored application data.
