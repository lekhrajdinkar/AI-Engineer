# Deploying LIC Surrender Value Calculator to Render

This guide outlines how to deploy the React-based **LIC Surrender Value Calculator** (`src/y2026/lic2`) to [Render](https://render.com) as a fast, free **Static Site**.

---

## Method 1: Automatic Blueprint Deployment (Recommended)

Render can automatically detect and configure the deployment using the included [`render.yaml`](file:///c:/Users/Manisha/Documents/github-2025/genai/render.yaml) file.

### Steps:
1. Push your repository changes to GitHub / GitLab.
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top right and select **Blueprint**.
4. Connect your GitHub/GitLab repository.
5. Render will detect `render.yaml` and configure:
   - **Service Name**: `lic-surrender-value-calculator`
   - **Runtime**: `Static Site`
   - **Build Command**: `npm ci && npm run build:lic2`
   - **Publish Directory**: `src/y2026/lic2/dist`
   - **Rewrite Rule**: `/*` → `/index.html` (SPA routing)
6. Click **Apply**. Render will automatically build and publish your site with a free `onrender.com` SSL domain.

---

## Method 2: Manual Static Site Setup via Render Dashboard

If you prefer to configure the service manually on Render without blueprints:

1. In the Render Dashboard, click **New +** → **Static Site**.
2. Connect your Git repository.
3. Configure the following fields:

| Field | Value |
|---|---|
| **Name** | `lic-surrender-calculator` |
| **Branch** | `main` (or your active branch) |
| **Root Directory** | *(leave empty to build from repo root)* |
| **Build Command** | `npm ci && npm run build:lic2` |
| **Publish Directory** | `src/y2026/lic2/dist` |

4. Scroll down to **Redirects/Rewrites** and add:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
5. Click **Create Static Site**.

---

## Method 3: Deploying `lic2` with Root Directory set to `src/y2026/lic2`

If you want Render to treat `src/y2026/lic2` as an isolated root folder:

| Field | Value |
|---|---|
| **Name** | `lic-surrender-calculator` |
| **Root Directory** | `src/y2026/lic2` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

Add rewrite rule:
- `/*` → `/index.html`

---

## Local Build Verification

Before deploying, you can verify the build locally:

```bash
# Build from project root
npm run build:lic2

# Or build from inside lic2 folder
cd src/y2026/lic2
npm run build
```

The output will be created in `src/y2026/lic2/dist/` and is ready for production hosting.

