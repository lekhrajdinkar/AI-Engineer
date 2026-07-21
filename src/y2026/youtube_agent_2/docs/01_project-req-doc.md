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
### Phase-1 ✅
1) Authentication ✔️
- OAuth identity (firebase Authentication > Oauth IDP)
- user profile page

2) Connect to youTube ✔️
- to fetch subscribed channel, playlist, videos
- by calling youtube API v3
- create OAuth client to call API

3) persistence layer:
- local run : use SQLite to store fetched token, app data, etc
- on server : use Firebase FireStore to token Store, app data, etc

4) Learning plan object ✔️
- load all plans from backend on App start
- call `GET /api/plans` — Get all plan detail and store in redux store.
- redux first, else fallback to API load.
- Add refresh icon, to load again from backend and refresh redux store.
- [proposed learning-plan object](schema/leaning-plan.json)

5) Create Learning Plan ✔️
- create Learning plan form (1 Step form - with name, desc, optinal logo).
- remove any other steps from form.
- call `POST /api/plans` — store a learning plan into backend.

6) learning plan page view ✔️
- Show learning plan tiles 
- underlying courses list
- learning overview drawer
- 2 actions : Add courses (manual + AI Assisted)
- delete plan

7) leaning workspace (of selected course)
- video frame for selected video
- Module/chapter to expandable trees structure
    - module row
    - underlying video rows
---
### Phase-2 ✅
1) Add course (manual) ✔️
- show 3 steps form as side drawer dialog from left.
    - step-1 : course name, course desc and course logo
    - step-2 : multi-select channels `GET /api/channels`
    - Step-3 : playlist from selected channel.  `GET /api/{channel_id}/playlists`
    - Step-4 : all videos be part of single course object, into chapter-n (module), 10 videos each.
      - eg chapter-1: video 1-10, chapter-2 video 11-20, and so on.
- refresh learning object in redux 
- submit `POST /api/plans/{plan_id}/add-course-manually` 

2) Add course  (AI-assisted)
- show 4 steps form as side drawer dialog from left.
    - step-1 : name, desc and logo
    - step-2 : multi-select channels (subscribed channels list) `GET /api/channels`
    - Step-3 : playlist from selected channel. `GET /api/{channel_id}/playlists`
    - Step-4 : Pull video metadata and show them (title, description, publishedAt, duration, thumbnails) 
      - `GET /api/videos?channel_id={channel_id}&playlist_id={playlist_id}`
- submit to AI:  
    - `POST /api/plans/{plan_id}/add-course-ai-suggested` 
    - future phase: AI Agent will organise videos into courses. so suggested created courses, gets added course into plan. 
    - temporary workaround : get hardcoded JSON response. [json-dumps](json-dumps)
    - > TODO-1 ⚠️ replace with LLM chapter assignment later.
- refresh learning plan object into redux. `GET /api/plans/{plan_id}` 

3) Delete plan ✔️
- delete learning plan object from backend
- `DELETE /api/plans/{plan_id}`

4) Delete Course in Plan ✔️
- `DELETE /api/courses/{plan_id}`, need to create it first.
- request body will get list of course_id

5) Add label ✔️
- At Plan level,     ["watched", "mark_for_delete", "bookmarked"] + custom
- At course level,   ["watched", "mark_for_delete", "bookmarked"] + custom + refresh_needed
- At Module level,   ["watched", "mark_for_delete", "bookmarked"]
- At video level,    ["watched", "mark_for_delete", "bookmarked"]

6) Global search and navigation drawer page

---
### Phase-3 ✅
1) Video playback progress ✔️
- Store last played video, position, and timestamp for each course and video.
- Restore the last video and timestamp when the learning workspace opens.
- Persist progress only when the video is paused: `PATCH /api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/playback`.
- Completing a video automatically adds the `watched` label.

2) Refresh Course with new Video feed ✔️
- The **Source feed inbox** page
  - On app load, load persisted source-sync metadata into Redux: `GET /api/sources/sync-metadata`.
  - schema : [source-feed-inbox.json](schema/source-feed-inbox.json)
  - lets the user search, filter, sort, and inspect subscribed channels and playlists.
  - It records `last_feed_checked_at`, scans incrementally with a 24-hour overlap, and deduplicates by `video_id` across the learning plan.
- Sync metadata:
  - maps each channel or playlist to its `target_courses` 
  - stores undispatched `new_videos` in the source inbox.
- Push to target: `POST /api/sources/sync-metadata/push-new-feeds` 
  - globally, per channel, or per playlist. 
  - Until LLM assignment is available, 
  - the feed is pushed to the first target course by sequence.
- The pushed course receives:
  - `new_video_feeds` 
  - and the `refresh_needed` label.
  - Its overview icon uses a yellow notification state;
- Course overview can review staged videos and submit: 
  - `POST /api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed`.
  - The temporary organizer adds submitted videos to a `New videos` module; 
  - > TODO-2 ⚠️ replace with LLM chapter assignment later. 

---
### Phase-4 Deploy on Render ✅
- [deploy-to-render.md](../deployment/render/README.md)
- [firebase-integration.md](02_firebase-integration.md)

--- 
### Phase-5 LLM 
- TODO-1 (check phase-2, step-2)
- TODO-2 (check phase-2, step-2)







