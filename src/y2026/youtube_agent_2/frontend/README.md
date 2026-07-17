# Frontend

## Run
Dependencies are installed at the repo root (`../../..`). No separate `npm install` needed here.

```bash
# Start backend
uvicorn src.y2026.youtube_agent_2.backend.main:app --reload --port 8001

# Start Vite
cd src\y2026\youtube_agent_2\frontend;
npm run dev
```

## UI
- Design and build reactJs dashboard for learning plan
- requirements [project-req-doc.md](../metadata/project-req-doc.md)
- building backend api is out of scope.

## proposed learning-plan object

```json
{
  "learning_plan": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    
    "courses": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "source_channels": [
          {
            "channel_id": "string",
            "title": "string",
            "url": "string",
            "videos_count": 0,
            "playlists": [
              {"playlist_id": "string","title": "string"}
            ]
          }
        ],
        "modules": [
          {
            "id": "uuid",
            "title": "string",
            "sequence": 1,
            "videos": [
              {
                "video_id": "string",
                "title": "string",
                "description": "String",
                "url": "string",
                "duration_secs": 0,
                "watched": false
              }
            ]
          }
        ]
      }
    ]
  }
}
```
---
## backend API
http://127.0.0.1:8001/docs
### Authentication
- `GET /auth/google/login` — Start Google OAuth flow, get access token and save in sqLite3
- `GET /auth/google/callback` — OAuth callback (automatic redirect)
- `GET /auth/google/debug` — Debug access token info
- `POST /auth/google/logout` — Clear access stored tokens

### Fetch Videos
- `GET /api/channels` — List subscribed channels (OAuth required)
- `GET /api/{channel_id}/playlists` — List playlists for a channel
- `GET /api/videos?channel_id={channel_id}` — Get all videos from channel
- `GET /api/videos?channel_id={channel_id}&playlist_id={playlist_id}` — Get videos from specific channel's playlist

### Learning Plans
- `POST /api/plans` — Create a learning plan
- `GET /api/plans` — Get all plan detail
- `GET /api/plans/{plan_id}` — Get plan details

### Create Course in the plan
- `POST /api/plans/{plan_id}/add-course-manually` — Add course into plan
- `POST /api/plans/{plan_id}/add-course-ai-suggested` — Organize videos into course by AI , then add into plan's course

### refresh Course with daily video new feeds.
- `PATCH /api/course/refresh` — Refresh courses with new videos

---
## Sample Data from API response
- [sample-data](sample-data)
- to understand data Structure, dto