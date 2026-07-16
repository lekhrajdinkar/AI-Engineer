# Frontend

## Run
Dependencies are installed at the repo root (`../../..`). No separate `npm install` needed here.

```bash
# start dev server (Vite) — proxies /auth and /api to backend at http://127.0.0.1:8001
npm run dev

# production build
npm run build
```

## UI
- Design and build reactJs dashboard for learning plan
- requirements [project-req-doc.md](../metadata/project-req-doc.md)
- building backend api is out of scope.

## proposed learning plan object
```json
{
  "learning_plan": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "channels": [
      { "channel_id": "string", "title": "string", "url": "string", "videos_count": 0 }
    ],
    "courses": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "modules": [
          {
            "id": "uuid",
            "title": "string",
            "sequence": 1,
            "videos": [
              { "video_id": "string", "title": "string", "description": "String","url": "string", "duration_secs": 0, "watched": false }
            ]
          }
        ]
      }
    ]
  }
}
```
---
## backend API prototype
http://127.0.0.1:8001/docs
### Authentication
- `GET /auth/google/login` — Start Google OAuth flow, get access token and save in sqLite3
- `GET /auth/google/callback` — OAuth callback (automatic redirect)
- `GET /auth/google/debug` — Debug access token info
- `POST /auth/google/logout` — Clear access stored tokens

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

---
## Sample Data from API response
- [sample-data](sample-data)
- to understand data Structure, dto