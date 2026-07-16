# PRD project requirement doc

## Problem Statement
YouTube subscriptions lack organizational structure for learning:
- Videos from multiple channels appear chronologically, not thematically
- No grouping by topic, difficulty, or dependency
- Manual categorization across browsers/playlists is time-consuming
- No progress tracking or learning path recommendations
- New content discovery is reactive, not curated

## Objective
- build learning platform like udemy from reactjs.
- MVP Goal: Users can organize subscribed YouTube channels into structured learning plans within 3 clicks
- Success Metric: Can group 50+ videos from 5+ channels into a coherent course with modules
- Target Users: Solo learners (not teams)
- Scope Boundary: Personal use only; no social features, no monetization
- backend services with python

## Technical Constraints
- YouTube API call with API_KEY
- Local data storage (JSON/SQLite/firebase)
- No real-time sync requirements

## features
### feature-1 : login
- login with Google account

### feature-2 : Add Learning plan
- Add name
- Add description
- Add Source 
  - show dropdown > YouTube channel list from subscriptions
  - pull videos metadata.
- Add courses
  - AI Agent 1 (course builder agent) will help to create course's 
  - for the learning plan from videos metadata, primarly title and description feild few lines
  - capture learning plan object data in json. Define it well.
- define json objects well.
  - hierachy : learnig plan >> courses >> modules >> videos
  - note following same hierachy like used in plateform like udemy.

Suggested JSON
```json
{
  "learning_plan": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "created_date": "ISO8601",
    "updated_date": "ISO8601",
    "channels": [
      {
        "id": "youtube_channel_id",
        "name": "string",
        "url": "string",
        "videos_count": "int"
      }
    ],
    "courses": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "modules": [
          {
            "id": "uuid",
            "name": "string",
            "sequence": "int",
            "videos": [
              {
                "id": "youtube_video_id",
                "title": "string",
                "url": "string",
                "duration_mins": "int",
                "watched": "boolean",
                "notes": "string",
                "created_at": "ISO8601"
              }
            ]
          }
        ]
      }
    ]
  }
}
```
    
### feature-3.1 : search and sort
- at plans level
- at modules + videos level

### feature-3.2 : Filter on videos
examples
- 1-day old 
- 1-week old
- 1-month old

### feature-4 : update Learning plan, 
way-1
- refresh plan with daily feed.
- fetch ONLY new videos from last update date of plan
- updated courses collection then by AI Agent 1 (course builder agent)

way-2
- update channels list
- create course by organizing video's metadata
  - take course - capture progress
- source data from youtube channel
  - list all videos
  - list channel
  - list videos from a specific channel's playlist

### feature-5 : archive/delete Learning plan

---

## Phase Breakdown

Phase-1 (UI with React) - 4 weeks
- Week 1-2: Auth (Google Login), Dashboard layout
- Week 3: Learning plan CRUD forms
- Week 4: Basic search/filter UI

Phase-2 (Backend without AI) - 3 weeks
- Week 1: API setup, DB schema, YouTube API integration
- Week 2: CRUD endpoints for learning plans/courses
- Week 3: Search & pagination

Phase-3 (Build AI Agents) - Parallel / 2 weeks
- Course builder agent (video grouping logic)
- Recommendation logic

Phase-4 (Integration) - 1 week
- Wire AI agents into backend
- E2E testing

## Future Enhancement
### Will integrate with more AI Agents
- Recommendation Agent
- Sematic search Agent

## Assumptions
- User has YouTube account with active subscriptions
- Videos title and desc will passed to AI agent for reasoning for course and module
- Max ~500 videos per learning course.

## Out of Scope (Not in MVP)
- Team collaboration
- Video transcription/search by content
- Progress analytics
- Certificate generation
- Monetization