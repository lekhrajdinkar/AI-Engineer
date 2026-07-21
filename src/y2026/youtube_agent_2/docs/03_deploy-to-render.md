# Deploy the microservices to Render

The [Render Blueprint](../deployment/render/render-microservices.yaml) creates
four independently deployed services:

- `youtube-learning-gateway`: the public API URL used by the frontend.
- `youtube-learning-youtube`: YouTube OAuth and catalog integration.
- `youtube-learning-plans`: plans, courses, and source synchronization.
- `youtube-learning-ui`: the React/Vite static site.

The blueprint contains no confidential values. Add secrets through Render's
environment settings and never commit service-account JSON or local `.env`
files.

## 1. Create the Blueprint

1. In Render, select **New -> Blueprint** and connect this repository.
2. Use `src/y2026/youtube_agent_2/deployment/render/render-microservices.yaml`
   as the Blueprint path.
3. Create the Blueprint and wait for the initial builds.
4. Copy the generated gateway, YouTube, plans, and UI URLs.

## 2. Configure service routing

Set these values to the generated internal or public service URLs:

| Render service | Variable | Value |
| --- | --- | --- |
| Gateway | `GATEWAY_YOUTUBE_SERVICE_URL` | URL of `youtube-learning-youtube` |
| Gateway | `GATEWAY_PLANS_SERVICE_URL` | URL of `youtube-learning-plans` |
| Plans | `YOUTUBE_SERVICE_URL` | URL of `youtube-learning-youtube` |
| UI | `VITE_API_BASE_URL` | URL of `youtube-learning-gateway` |

Generate one long random `INTERNAL_SERVICE_TOKEN` and set the same value on
the YouTube and plans services. The gateway does not need this token because
it forwards the browser's Firebase identity token.

## 3. Configure Firebase and YouTube

Set the following on both data-owning backend services where applicable:

| Variable | Service | Notes |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | YouTube, plans | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | YouTube, plans | Complete Admin service-account JSON |
| `FRONTEND_URL` | Gateway, YouTube, plans | Exact deployed UI origin |
| `GOOGLE_CLIENT_ID` | YouTube | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | YouTube | Matching client secret |
| `GOOGLE_REDIRECT_URI` | YouTube | `https://<gateway-url>/auth/google/callback` |
| `YOUTUBE_TOKEN_ENCRYPTION_KEY` | YouTube | Stable Fernet key |

The blueprint enables Firebase and requires authentication for the YouTube and
plans services. It also generates `YOUTUBE_OAUTH_STATE_SECRET` automatically.

Configure the UI's `VITE_FIREBASE_*` variables using the Firebase Web App
configuration. Vite embeds these values at build time, so redeploy the UI after
changing them.

## 4. Configure Google and Firebase consoles

1. Add `https://<gateway-url>/auth/google/callback` to the Google OAuth web
   client's authorized redirect URIs.
2. Add the deployed UI hostname to Firebase Authentication's authorized
   domains.
3. Confirm Google sign-in is enabled in Firebase Authentication.

## 5. Verify the deployment

1. Confirm `/health` returns success for the gateway, YouTube, and plans URLs.
2. Open the UI and sign in with Google.
3. Connect YouTube and confirm the callback returns to `/profile`.
4. Create and update a plan through the gateway.
5. Test with two Firebase accounts and confirm their Firestore data and
   YouTube connections remain isolated.

## Troubleshooting

- `401` from `/api/*`: the browser did not send a valid Firebase ID token.
- `503` from the gateway: verify both `GATEWAY_*_SERVICE_URL` values and the
  downstream services' health endpoints.
- `Fernet key must be 32 url-safe base64-encoded bytes`: generate a key with
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
- OAuth callback errors: ensure `GOOGLE_REDIRECT_URI` exactly matches the URI
  configured in Google Cloud.
- Browser CORS errors: set `FRONTEND_URL` to the exact deployed UI origin and
  redeploy all backend services.
