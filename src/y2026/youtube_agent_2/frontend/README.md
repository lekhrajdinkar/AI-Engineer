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
    "channels": [
      {
        "channel_id": "string",
        "title": "string",
        "url": "string",
        "videos_count": 0
      }
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

---
## UI Design - update set 1
### 1.
- call /auth/google/debug on screen load first
- if response json has `"has_access_token": true`. 
- then mark it signed in.

### 2. create plan with 3 input only :
- name,
- desc,
- logo (optional)

### 3. view created plan/s page
Action buttons:
- Add course manually
- AI suggested Course creation
- Delete

### 4. Add course manually button:
It will input 4 things:
- course name
- desc
- upload logo (optional) 
- content Source:
    - youtube subscribed channel/s  multi-select tiles (title, Alphabet circle logo)
    - For selected channels tile show dynamically multi-select playlist list ( title, desc, thumbnail )
    - user will click : **load videos** button  
    - video list ( title + thumbnail + desc trimmed)
- after that **create course** button
- it will create course with single module (chapter-1) and all videos into that module. 
- then similarly user can add more courses.

### 5. AI suggest Course create button.
Similar input
- channel
- playlist (optional)

AI will return complete learning plan object with automatically suggested course and modules (chapters inside it)

## UI Design - update set 2 
### 1. Create plan
- Show all dialog box as side drawer from left with 100% vh
- material theme tabs
  - parent tab - channels. first tab - ALL
  - child tab - playlists. first tab - ALL
  - body panel - playlist thumbnail, desc , and underlying video tiles
- all tile must have same width, so look better.

### 1. theme 
- light and dark theme
- keep primary color - navy blue and its shade as secondary color.
- Also dont want rainbow thing and soo many colour.
- material theme

### 2. navigation for learning plan and course
- tabbed view
- parent tab - Learning plans. 
- child tab - courses.
- body panel, left (fixed lenght width, 30%) : add expandable module/chapter and videos
- body panel, right (rest all width, 70%) : show YouTube video frame and palyer actions. don't want o open in new window

## UI Design - update set 3
1. update playlist tile.
- thumbnail  and title.
- remove desc.
- so that all will have same height.

2. Leaning Plan > overview tab > courses > show then in card tiles.
- circular logo on left, if missing then add starting Alphabat logo
- make tile clickable to its page.
- on hover shadow effect

3. Delete plan action btn : Add confirmation.

4,. Add redux state store to keep learning plan object