# Backend 
---
## One time configuration
### update environment variables 
```.dotenv
.env file
---
# YOUTUBE_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8001/auth/google/callback
```

### Setup  Google Oauth Client
- https://console.cloud.google.com/
- Create or select a Project
- Navigation menu → APIs & Services → Library.
- Search for “YouTube Data API v3” → Enable.
- APIs & Services → OAuth consent screen.
- Choose “Internal” (G Suite only) or “External” (most apps use External).
- Create OAuth 2.0 Client ID
    - APIs & Services → Credentials → + Create Credentials → OAuth client ID.
    - Application type: choose “Web application”.
    - Name: e.g., “youtube-learning-ui”.
    - Authorized JavaScript origins: (if needed) e.g., http://localhost:5173
    - Authorized redirect URIs:  http://localhost:8001/auth/google/callback

---
## Run ⭐
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# From the backend directory
cd src\y2026\youtube-agent-2\backend
uvicorn main:app --reload --port 8001
```

---
## API DOCs
http://127.0.0.1:8001/docs 
### Authentication
- `GET /auth/google/login` — Start Google OAuth flow
  - http://localhost:8001/auth/google/login
- `GET /auth/google/callback` — OAuth callback (automatic redirect)
- `GET /auth/google/debug` — Debug token info
- `POST /auth/google/logout` — Clear stored tokens

### YouTube Data
- `GET /api/channels` — List subscribed channels (OAuth required)
- `GET /api/{channel_id}/playlists` — List playlists for a channel
- `GET /api/videos?channel_id={channel_id}` — Get all videos from channel
- `GET /api/videos?channel_id={channel_id}&playlist_id={playlist_id}` — Get videos from specific playlist

### Learning Plans
- `POST /api/plans` — Create a learning plan
- `GET /api/plans/{plan_id}` — Get plan details
- `PATCH /api/plans/{plan_id}/refresh` — Refresh plan (demo: adds synthetic video)
- `POST /api/plans/{plan_id}/ai-suggest` — AI-powered grouping suggestion
- `GET /api/search?q={query}` — Search videos across all plans


## Load Dumps from API call taken at [json-dumps](json-dumps)
- http://127.0.0.1:8001/api/channels
    - youtube-agent-2/backend/json-dumps/channels.json
- http://127.0.0.1:8001/api/UCzCsyvyrq38R6TnztEzOmgg/playlists
    - youtube-agent-2/backend/json-dumps/playlist.json
- http://127.0.0.1:8001/api/videos?channel_id=UCzCsyvyrq38R6TnztEzOmgg&playlist_id=PLJq-63ZRPdBt-RFGwsJO9Pv6A8ZwYHua9 
    - youtube-agent-2/backend/json-dumps/videos-of-a-playlist.json
- http://127.0.0.1:8001/api/videos?channel_id=UCzCsyvyrq38R6TnztEzOmgg

