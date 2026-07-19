# Firebase and Render Execution Steps v1

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

- Implement OAuth state/PKCE protection and UID correlation.
- Store encrypted or tightly protected per-user YouTube refresh tokens in Firestore.
- Use the stored user token for private YouTube subscription and playlist calls.
- Support an optional Render `YOUTUBE_API_KEY` only for public-data fallback calls.

## Step 6 — Render deployment

- Add `render.yaml`.
- Configure the static frontend and FastAPI backend services.
- Add Render secrets, Google OAuth redirect URI, CORS origin, and SPA rewrite.
- Run the multi-user verification checklist with two Google accounts.
