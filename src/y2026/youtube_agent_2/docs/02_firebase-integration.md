# Firebase and Render Execution Steps v1

## project Setup
- Console: https://console.firebase.google.com/u/0/project/agent-2026-d3f51/firestore/databases/-default-/data
- projectID:    `agent-2026-d3f51`
- project naame: `youtube-agent-2026`

**Database**
  - Firestore: Build → Firestore Database → Create database → Native mode. Choose the region carefully; it cannot later be changed easily.

**Authentication**
  - Google sign-in:
  - Build → Authentication → Get started → Sign-in method → Google → Enable → select support email → Save.

**webApp**
  - On the overview page, look for the Web icon: </> -> Register app

---
## Target architecture
- UI: `ui.myapp.render.com` (React static site)
- API: FastAPI Render web service
- App sign-in: Firebase Authentication with Google
- API authentication: Firebase ID token in `Authorization: Bearer <token>`
- API authorization: FastAPI verifies the token and scopes all data to the Firebase `uid`
- Data: Cloud Firestore
- YouTube access: separate, per-user Google OAuth authorization with `youtube.readonly`
- Secrets: Render environment variables or secret files only

Google/YouTube access tokens are used only for YouTube Data API calls. They are not used as custom access tokens for this application's API.

## Step 1 — Firebase project preflight

**Status:** Complete — project-side setup is ready for user action.

### Codex completed

- Defined the Firebase Auth, Firestore, per-user authorization, and YouTube OAuth separation.
- Defined the Firestore ownership model: `users/{uid}/plans`, `users/{uid}/source_sync`, and `users/{uid}/integrations/youtube`.
- Identified that the current global SQLite token and plan storage must be replaced before a multi-user deployment.

### User action required

1. Create or select a Firebase project.
2. Create a **Cloud Firestore** database in **Native mode**.
3. Enable **Authentication → Sign-in method → Google**.
4. Create a Firebase Web App and keep its public web configuration available for the frontend.
5. Create a Firebase Admin service account for the FastAPI backend. Do not commit or paste its private key into the repository.

Do not configure the final Google YouTube OAuth callback URL yet; that will be done after the backend Render URL is known.

## Step 2 — Firestore repository and migration

**Status:** Complete — code is ready; no production data has been migrated.

- Added Firebase Admin SDK dependency and environment-based Firebase configuration.
- Added a normalized Firestore repository: plan, course, module, video, feed, sync metadata, and integration-token records are persisted in Firestore documents/subcollections.
- Added a Firestore switch (`FIREBASE_ENABLED=true`) while preserving local SQLite fallback during the transition.
- Added `migrate_sqlite_to_firestore.py` for a one-time legacy SQLite migration into Firestore.
- Current data is temporarily stored beneath `users/legacy-single-user`; Step 3 will replace this transitional owner with the verified Firebase Auth `uid` per request.

### User action required before deployment

- Keep the Firebase Admin service account private. Later, add its JSON to Render as a secret file or `FIREBASE_SERVICE_ACCOUNT_JSON` secret.
- Do not run the migration yet; it will be run after Step 3 adds user identity handling so imported data can be assigned to the correct Firebase user.

### Original scope

- Add Firebase Admin SDK and environment-based configuration.
- Replace SQLite repository operations with Firestore-backed operations.
- Add a one-time SQLite-to-Firestore migration command.
- Preserve the current API schemas while storing data per Firebase `uid`.

## Step 3 — FastAPI app authentication and authorization

**Status:** Complete — code is ready; frontend token attachment is Step 4.

- Added Firebase ID-token verification middleware for `/api/*` routes when `FIREBASE_AUTH_REQUIRED=true`.
- Rejects missing, invalid, expired, or revoked tokens with `401` before route execution.
- Stores the verified Firebase `uid` in request-local context and scopes Firestore plans, sync metadata, and integration tokens to that user.
- Added CORS configuration from `FRONTEND_URL` and a public `/health` endpoint for Render.
- Keeps authentication disabled by default for the current local SQLite development flow; production must set `FIREBASE_ENABLED=true` and `FIREBASE_AUTH_REQUIRED=true`.

### User action required before deployment

- None yet. Step 4 will use the Firebase Web App configuration created in Step 1.

### Original scope

- Verify Firebase ID tokens for protected API routes.
- Use the verified `uid` for every Firestore read and write.
- Add `/health`, CORS, and production environment configuration.

## Step 4 — React authentication integration

**Status:** Complete — code is ready; Firebase Web App values must be configured per environment.

- Added Firebase Web SDK configuration through `VITE_FIREBASE_*` environment variables.
- Added Firebase Google sign-in/sign-out and a `/profile` page.
- Added the profile control in the side navigation.
- Added `Authorization: Bearer <Firebase ID token>` to frontend API calls.
- Added `VITE_API_BASE_URL` for the future Render backend URL.
- Added `frontend/.env.example`; no Firebase secrets or credentials were committed.

### User action required before local testing or deployment

- Copy the Firebase Web App configuration into a local `frontend/.env` file, using `frontend/.env.example` as the template.
- Set the same `VITE_*` values in the Render frontend Static Site build environment later.
- The Firebase web `apiKey` is a public application identifier; do not confuse it with the Firebase Admin service-account private key.

### Original scope

- Add Firebase Web Auth with Google sign-in/sign-out.
- Send the current Firebase ID token with API calls.
- Add a user profile page and authentication state.

## Step 5 — Per-user YouTube authorization

**Status:** Complete — code is ready; OAuth client URLs and secrets must be configured before live testing.

- Added Firebase-authenticated endpoints to start a YouTube connection and retrieve connection status.
- Added signed, expiring OAuth `state` that binds the public callback to the initiating Firebase `uid`.
- Stores each user's YouTube token beneath that user's Firestore integration document.
- Encrypts Firestore YouTube token payloads with `YOUTUBE_TOKEN_ENCRYPTION_KEY`.
- Added YouTube connection status and connect/reconnect control to the profile page.
- Redirects the completed YouTube OAuth callback back to `/profile` in the deployed frontend.

### User action required before live OAuth testing

- Create a Google Cloud OAuth **Web application** client for YouTube Data API access.
- Add the callback URL `https://<backend-service>.onrender.com/auth/google/callback` after the backend Render service name is chosen. Use the local callback URL only for local testing.
- Later configure these Render backend secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `YOUTUBE_OAUTH_STATE_SECRET`, and `YOUTUBE_TOKEN_ENCRYPTION_KEY`.
- Keep all backend secrets private. The YouTube OAuth token is never sent to the React application.

### OAuth note

- The backend uses the confidential server-side authorization-code flow with client secret, signed `state`, HTTPS callback, and per-user token storage.
- PKCE is not yet added. Add it if this flow is moved to a browser/public client or an external OAuth authorization server is introduced.

### Original scope

- Implement OAuth state protection and UID correlation.
- Store encrypted or tightly protected per-user YouTube refresh tokens in Firestore.
- Use the stored user token for private YouTube subscription and playlist calls.
- Support an optional Render `YOUTUBE_API_KEY` only for public-data fallback calls.

## Step 6 — Render deployment

**Status:** Complete — Blueprint and deployment instructions are ready; Render account actions are required to launch services.

- Added `src/y2026/youtube_agent_2/render.yaml` for a FastAPI Render Web Service and React Render Static Site.
- Configured the API health check, Firebase production flags, generated OAuth state secret, and secret placeholders.
- Configured frontend build variables and a `/* → /index.html` SPA rewrite.
- The Blueprint intentionally does not include confidential values.

### User action required to deploy

1. Push the current branch to the Git repository that Render can access.
2. Render Dashboard → **New → Blueprint** → select the repository and choose `src/y2026/youtube_agent_2/render.yaml` if prompted for its path.
3. Create the Blueprint. Render will create `youtube-learning-api` and `youtube-learning-ui`.
4. Copy each generated `onrender.com` URL.
5. Set API secrets:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (or use a Render secret file with Application Default Credentials)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://<api-url>/auth/google/callback`
   - `FRONTEND_URL=https://<ui-url>`
   - `YOUTUBE_TOKEN_ENCRYPTION_KEY` (a Fernet key)
6. Set frontend build variables:
   - `VITE_API_BASE_URL=https://<api-url>`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_APP_ID`
7. Redeploy the API, then redeploy the Static Site so Vite embeds the final API URL.
8. Add the API callback URL to the Google OAuth Web Client's authorized redirect URIs.
9. In Firebase Authentication, add the deployed UI domain to authorized domains if Firebase requests it.
10. Test with two Google accounts: each must see only their own plans, sync metadata, and YouTube connection.

### Original scope

- Add `render.yaml`.

## Local validation preflight

**Status:** Automated checks complete; browser-based Firebase and YouTube OAuth checks are ready.

- Restored `frontend/.env.example` and added `backend/.env.example`.
- Confirmed the local frontend `.env` contains all required Firebase/API variable names without reading or exposing their values.
- Confirmed the backend `.env` contains the required Firebase, OAuth, and encryption variable names without reading or exposing their values.
- Updated FastAPI startup so it explicitly loads `backend/.env` before application configuration is imported.
- Started the verified backend at `http://127.0.0.1:8003`: `/health` reports `firebase_enabled: true`, and an unauthenticated `/api/plans` request correctly returns `401`.
- Started the local frontend at `http://127.0.0.1:5173`, configured for that backend process.

### User browser check

1. Open `http://127.0.0.1:5173/profile`.
2. Sign in with the Firebase Google provider and confirm the profile displays the signed-in account.
3. Open the app's learning-plan view. An empty state is expected for a newly authenticated Firebase user until plans are created or migrated.
4. Use **Connect YouTube** on the profile page and complete the Google consent screen. Confirm that the browser returns to the profile page and reports YouTube as connected.

### Notes

- Existing processes on ports `8001` and `8002` were left untouched; they were older processes without the Firebase configuration. Use port `8003` for this validation session.
- After the browser check, stop the local development processes and set the production values in Render before deployment.

- Configure the static frontend and FastAPI backend services.
- Add Render secrets, Google OAuth redirect URI, CORS origin, and SPA rewrite.
- Run the multi-user verification checklist with two Google accounts.
