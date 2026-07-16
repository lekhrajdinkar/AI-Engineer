# PRD — YouTube Learning Organizer (personal MVP)

This document captures the MVP requirements for a personal learning platform that organizes YouTube subscriptions into structured, course-like learning plans.

## Checklist (what I will do in this pass)
- Review and correct language and typos
- Add measurable success metrics and acceptance criteria
- Provide a clear data model (JSON) and API skeleton
- Tighten phases and technical constraints

## Problem Statement
YouTube subscriptions are useful but unstructured for intentional learning:
- Videos from multiple channels are shown chronologically, not by topic or dependency
- No native grouping by difficulty, prerequisites or learning path
- Manual playlist management is time-consuming and brittle
- No progress tracking or curated discovery for ongoing study

## Objective
- Build a lightweight personal learning platform (React frontend + Python backend)
- MVP goal: let a user create a learning plan from subscribed channels and produce a course-like organization in <= 3 clicks
- Success metric: be able to organize 50+ videos from 5+ channels into a coherent course with modules
- Target users: solo learners; scope is explicitly personal-use only (no social, no monetization)

## Technical Constraints & Considerations
- Use YouTube Data API v3 (API key / OAuth as required). Be mindful of quota limits.
- Local-first storage for MVP: SQLite (recommended) or JSON files; optional Firebase later
- Backend: Python (FastAPI or Flask suggested)
- Frontend: React (CRA / Vite) with Google OAuth for login
- No realtime sync required for MVP; periodic refresh (manual or scheduled) is sufficient

## Features (MVP)

1) Authentication
- Login via Google OAuth (request scopes needed to read subscriptions and playlists)
- Acceptance: User can sign in and authorize the app to read subscriptions

2) Create Learning Plan (manual + AI-assisted)
- Provide name, description, and source channels
- UI shows a dropdown of the user's subscribed channels (from YouTube API)
- Pull video metadata (title, description, publishedAt, duration, thumbnails)
- Manual course creation: user groups videos into courses/modules
- AI Course Builder (Agent-1, optional for Phase-3): suggests courses/modules based on video titles/descriptions
- Acceptance: User can import channels and create a plan; AI suggestions are presented as editable proposals

3) Data model (suggested JSON / DB schema)
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
              { "video_id": "string", "title": "string", "url": "string", "duration_secs": 0, "watched": false }
            ]
          }
        ]
      }
    ]
  }
}
```

4) Search, Sort & Filters
- Search at plan, course, module, and video levels
- Filters: age (1 day / 1 week / 1 month), channel, duration, watched/unwatched
- Acceptance: results return within acceptable latency for local dataset (e.g., <2s for 50–500 items)

5) Update / Refresh Learning Plan
- Incremental refresh: fetch only videos published after the plan's last update
- Channel-level refresh: re-scan a channel or a playlist
- When new videos are found, AI Agent-1 (if enabled) proposes where they fit or flags for manual review

6) Archive / Delete
- Soft-delete or archive plans to preserve history

## Acceptance Criteria (clear pass/fail for MVP)
1. User can authenticate with Google and the app can read their subscriptions
2. User can import videos from at least 3 channels and create a learning plan
3. User can create or accept AI-suggested course/module groupings and edit them
4. Incremental refresh adds only new videos since last update

## Assumptions
- User stores data locally or in a single-user cloud DB
- Titles and descriptions are in English or contain enough metadata for simple AI grouping
- Typical plan size: up to ~500 videos for MVP

## Out of Scope (MVP)
- Team collaboration, sharing or multi-user features
- Full-text transcription-based search (can be future enhancement)
- Advanced analytics, certification, or monetization

## Risks & Mitigations
- YouTube API quota: use incremental sync and careful backoff; cache metadata
- Poor AI grouping quality: present suggestions as editable and allow manual overrides

## Next Steps / To-do
1. Finalize tech choices: FastAPI + SQLite recommended for MVP
2. Create minimal API prototype for channel import and plan creation
3. Build React auth flow and simple dashboard
4. Prototype a simple AI-suggester (keyword clustering) and evaluate
