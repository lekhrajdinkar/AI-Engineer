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
- [proposed learning-plan object](schema/leaning-plan.json)

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

### Phase-2 
1) Add course (manual) ✔️
- show 3 steps form as side drawer dialog from left.
    - step-1 : name, desc and logo
    - step-2 : multi-select channels `GET /api/channels`
    - Step-3 : playlist from selected channel.  `GET /api/{channel_id}/playlists`
- refresh learning object in redux 
- submit `POST /api/plans/{plan_id}/add-course-manually` — Add course object  passed in request body, into leaning plan

2) Add course  (AI-assisted) ⚠️
**GCP console:**
   - https://developers.google.com/youtube/v3/docs/?apix=true
   - https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=agents-2026-502600
   - project : `Agents-2026`
   - ![img.png](img.png)
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

5) label
- At Plan level,     ["watched", "mark_for_delete", "bookmarked"] + custom
- At course level,   ["watched", "mark_for_delete", "bookmarked"] + custom + refresh_needed
- At Module level,   ["watched", "mark_for_delete", "bookmarked"]
- At video level,    ["watched", "mark_for_delete", "bookmarked"]

6) Global search and navigation


### Phase-3
1) Refresh Course with new Video feed ✔️
- [source-feed-inbox.json](schema/source-feed-inbox.json)
- On app load, load persisted source-sync metadata into Redux: `GET /api/sources/sync-metadata`.
- The **Source feed inbox** lets the user search, filter, sort, and inspect subscribed channels and playlists.
- Pull from YouTube: `POST /api/sources/sync-metadata`. It records `last_feed_checked_at`, scans incrementally with a 24-hour overlap, and deduplicates by `video_id` across the learning plan.
- Sync metadata maps each channel or playlist to its `target_courses` and stores undispatched `new_videos` in the source inbox.
- Push to target: `POST /api/sources/sync-metadata/push-new-feeds` globally, per channel, or per playlist. Until LLM assignment is available, the feed is pushed to the first target course by sequence.
- The pushed course receives `new_video_feeds` and the `refresh_needed` label. Its overview icon uses a yellow notification state; unrelated courses are not flagged.
- Course overview can review staged videos in a left drawer with **Visual** and **Raw JSON** tabs, then submit: `POST /api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed`.
- The temporary organizer adds submitted videos to a `New videos` module; replace with LLM chapter assignment later.

2) Video playback progress ✔️
- Store last played video, position, and timestamp for each course and video.
- Restore the last video and timestamp when the learning workspace opens.
- Persist progress only when the video is paused: `PATCH /api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/playback`.
- Completing a video automatically adds the `watched` label.




