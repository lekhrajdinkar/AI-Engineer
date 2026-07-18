# PRD — YouTube Learning Organizer (personal MVP)

This document captures the MVP requirements for a personal learning platform that organizes YouTube subscriptions into structured, course-like learning plans.

## Problem Statement
YouTube subscriptions are useful but unstructured for intentional learning:
- Videos from multiple channels are shown chronologically, not by topic or dependency
- No native grouping by difficulty, prerequisites or learning path
- Manual playlist management is time-consuming and brittle
- No progress tracking or curated discovery for ongoing study

## Objective
- Build a lightweight personal learning platform (React frontend + Python backend)
- MVP goal: let a user create a learning plan with no course intially
- Add courses in the plan later by:
    - manually 
    - from AI help.
- course object will have source subscribed channels/s and optinally playlist/s
- if playlist not selected, then all videos will considered from that channel.
- videos will be stored inside coherent course with modules/chapter
- hierarchy will be like : learning path > courses > modules > videos
- Target users: solo learners; scope is explicitly personal-use only (no social, no monetization)

## Technical Constraints & Considerations
- Use YouTube Data API v3 (API key / OAuth as required). Be mindful of quota limits.
- Local-first storage for MVP: SQLite (recommended) or JSON files; optional Firebase later.
- Backend: Python (FastAPI)
- Frontend: React (CRA / Vite) with Google OAuth for login
- No realtime sync required for new video feed; periodic refresh (manual or scheduled) is sufficient

---
## Features (MVP)
### Phase-1
1) Authentication ✔️
- On App load call `GET /auth/google/debug`
- has token then ignore else Login `GET /auth/google/login`

2) Load Learning plan object ✔️
- load all plans from backend on App start
- call `GET /api/plans` — Get all plan detail and store in redux store.
- redux first, else fallback to API load.
- Add refresh icon, to load again from backend and refresh redux store.

- proposed learning-plan object:
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
        "sequence": 1,
        "description": "string",
        "created_at": "ISO8601",
        "updated_at": "ISO8601",
        "source_channels": [
          {
            "channel_id": "string",
            "title": "string",
            "url": "string",
            "videos_count": 0,
            "playlists": [
              {"playlist_id": "string","title": "string", "thumbnail":  "string"}
            ]
          }
        ],
        "modules": [
          {
            "id": "uuid",
            "title": "string",
            "sequence": 1,
            "labels": ["watched", "mark_for_delete", "bookmarked"]
            "videos": [
              {
                "video_id": "string",
                "title": "string",
                "description": "String",
                "url": "string",
                "duration_secs": 0,
                "thumbnail":  "string",
                "labels": ["watched", "mark_for_delete", "bookmarked"]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

3) Create Learning Plan ✔️
- create Learning plan form (1 Step form - with name, desc, optinal logo).
- remove any other steps from form.
- call `POST /api/plans` — store a learning plan into backend.

4) learning plan page view ✔️
- Show learning plan tiles (fixed width title, on hover shadow)
- onClick selected learning plan, it will show tabs: overview tab, dedicated tab for underlying course init
- overview tab > learning plan details and tiles for each course (fixed width title, on hover shadow)
- overview tab > actions (at bottom)
    - add course in plan, manual
    - add course in plan, AI Assisted
    - delete plan
- individual course tab:
    - left side 60% : 
      - video frame for selected video
    - right side 40% : 
      - Module/chapter to expandable trees structure. 
      - with search box at top to seach module or video.
      - thumbnail , title and trimmed desc
      - thin borders
      - Action: mutli-select then >  mark for delete, mark as bookmark, mark as complete.

## Phase-2 
1) Add course (manual) ✔️
- show 3 steps form as side drawer dialog from left.
    - step-1 : name, desc and logo
    - step-2 : multi-select channels `GET /api/channels`
    - Step-3 : playlist from selected channel.  `GET /api/{channel_id}/playlists`
- refresh learning object in redux 
- submit `POST /api/plans/{plan_id}/add-course-manually` — Add course object  passed in request body, into leaning plan

2) Add course  (AI-assisted) ⚠️
- show 4 steps form as side drawer dialog from left.
    - step-1 : name, desc and logo
    - step-2 : multi-select channels (subscribed channels list) `GET /api/channels`
    - Step-3 : playlist from selected channel. `GET /api/{channel_id}/playlists`
    - Step-4 : Pull video metadata and show them (title, description, publishedAt, duration, thumbnails) `GET /api/videos?channel_id={channel_id}&playlist_id={playlist_id}`
- submit:  `POST /api/plans/{plan_id}/add-course-ai-suggested` 
    - AI Agent will organise videos into courses.
    - Add course into plan. 
- refresh learning plan object into redux. `GET /api/plans/{plan_id}` 

3) Delete plan ✔️
- delete learning plan object from backend
- `DELETE /api/plans/{plan_id}`

4) Delete Course in Plan
- `DELETE /api/courses/{plan_id}`, need to create it first.
- request body will get list of course_id

5) patch 
- At Module level,  just update "labels": ["watched", "mark_for_delete", "bookmarked"]
- At course level,  just update "labels": ["watched", "mark_for_delete", "bookmarked"]

these will be used to filter module and videos on screen then.



### Phase-3 (future)
1) Update / Refresh Learning Plan
- Incremental refresh: fetch only videos published after the plan's last update
- Channel-level refresh: re-scan a channel or a playlist
- When new videos are found, AI Agent-1 (if enabled) proposes where they fit or flags for manual review

2) Search, Sort & Filters
- Search at plan, course, module, and video levels
- Filters: age (1 day / 1 week / 1 month), channel, duration, watched/unwatched
- Acceptance: results return within acceptable latency for local dataset (e.g., <2s for 50–500 items)


