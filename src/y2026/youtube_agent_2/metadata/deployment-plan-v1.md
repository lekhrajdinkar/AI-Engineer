# Render Deployment Plan v1

Deploy two Render services:

1. **Backend Web Service** — FastAPI
2. **Frontend Static Site** — Vite/React

## 1. Frontend production configuration

- Replace the production reliance on Vite's local proxy with `VITE_API_BASE_URL`.
- Local development can keep relative `/api` requests; production uses the deployed backend URL.
- Add a static-site SPA rewrite so direct routes such as `/plans/.../learn` serve `index.html`.

## 2. Backend production configuration

- Render start command:

  ```text
  uvicorn src.y2026.youtube_agent_2.backend.main:app --host 0.0.0.0 --port $PORT
  ```

- Add CORS for the deployed frontend URL.
- Add a lightweight `/health` endpoint for the Render health check.
- Read frontend URL, database path, and OAuth configuration from environment variables.
- After Google OAuth succeeds, redirect back to the frontend instead of showing the backend JSON response.

## 3. Persistent data

- The current SQLite database stores plans and Google OAuth tokens beside the source code.
- Render's default filesystem is ephemeral, so attach a persistent disk for this personal MVP.
- Store the database at `/var/data/youtubeldb.sqlite3` through a configurable database-path environment variable.
- Use one backend instance while SQLite is used.
- Long term: migrate to Render Postgres for a production-grade multi-instance setup.

## 4. Render service settings

### Backend web service

- Root directory: `src/y2026/youtube_agent_2/backend`
- Build command: `pip install -r requirements.txt`
- Start command: the Uvicorn command above
- Persistent disk mount: `/var/data`
- Health check: `/health`

### Frontend static site

- Root directory: `src/y2026/youtube_agent_2/frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Build environment variable: `VITE_API_BASE_URL=https://<backend-service>.onrender.com`

## 5. Secrets and OAuth

Configure these as Render environment variables; do not commit them:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://<backend-service>.onrender.com/auth/google/callback`
- `FRONTEND_URL=https://<frontend-site>.onrender.com`
- `DATABASE_PATH=/var/data/youtubeldb.sqlite3`

In Google Cloud Console, add the deployed backend callback URL as an authorized redirect URI. Add the deployed frontend URL as an authorized JavaScript origin if required by the OAuth client.

## 6. Deployment verification

1. Deploy backend and confirm `/health` responds.
2. Deploy frontend and verify API calls reach the backend.
3. Complete Google sign-in and confirm the browser returns to the frontend.
4. Test plan/course creation, source sync, feed refresh, and playback progress.
5. Redeploy the backend and confirm plans and OAuth tokens remain available.

## Next implementation work

1. Add production API-base support, CORS, health endpoint, and OAuth frontend redirect.
2. Make the SQLite path configurable and add persistent-disk support.
3. Add `render.yaml` for repeatable Render service configuration.
4. Deploy and run the verification checklist.
