# Deploying LIC Surrender Value Calculator to Render

Quick links for deploying the React application in `src/y2026/lic2` to [Render](https://render.com):

- **Blueprint File**: [`render.yaml`](file:///c:/Users/Manisha/Documents/github-2025/genai/render.yaml)
- **Detailed Step-by-Step Guide**: [`src/y2026/lic2/DEPLOYMENT.md`](file:///c:/Users/Manisha/Documents/github-2025/genai/src/y2026/lic2/DEPLOYMENT.md)

### Quick Settings for Render Static Site:
- **Build Command**: `npm ci && npm run build:lic2`
- **Publish Directory**: `src/y2026/lic2/dist`
- **Rewrite Rule**: `/*` → `/index.html`

