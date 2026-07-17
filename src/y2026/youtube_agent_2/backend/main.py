from fastapi import FastAPI, HTTPException
from starlette.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import os
import sqlite3
from dotenv import load_dotenv
from src.y2026.youtube_agent_2.backend import db
from src.y2026.youtube_agent_2.backend import youtube_client
from src.y2026.youtube_agent_2.backend import config

load_dotenv()

#=====================================
# Helper Functions
#=====================================
def trim_description(description: Optional[str]) -> Optional[str]:
    """
    Trim description after the first double newline (\\n\\n).
    If config.TRIM_VIDEO_DESC is False, return description as-is.
    """
    if not config.TRIM_VIDEO_DESC or not description:
        return description
    
    # Split by double newline and return only the first part
    parts = description.split("\n\n")
    return parts[0] if parts else description


def process_videos(videos: List[dict]) -> List[dict]:
    """
    Process videos list: trim descriptions if config.TRIM_VIDEO_DESC is True.
    """
    processed = []
    for v in videos:
        processed_video = v.copy()
        if "description" in processed_video:
            processed_video["description"] = trim_description(processed_video["description"])
        processed.append(processed_video)
    return processed


def get_channels():
    return youtube_client.list_subscribed_channels()

#=====================================
# Model / DTO / EEntity
#=====================================
class Video(BaseModel):
    video_id: str
    title: str
    revised_title_from_ai: str
    url: Optional[str] = None
    sequence: int = 1
    thumbnail: str
    duration_secs: Optional[int] = None
    watched: bool = False

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    videos: List[Video] = Field(default_factory=list)

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    thumbnail: str

class Channel(BaseModel):
    channel_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    video_count: int = 1
    playlists: List[Playlist] = Field(default_factory=list)

class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    description: Optional[str] = None
    modules: List[Module] = Field(default_factory=list)
    source_channels: List[Channel]

class LearningPlan(BaseModel):
    logo_url: str = ""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    courses: List[Course] = Field(default_factory=list)
    source_channels : List[Channel] = Field(default_factory=list)

#=====================================
# API
#=====================================
app = FastAPI(title="YouTube Learning Organizer - Backend")

@app.get("/", tags=["meta"])
def root():
    return {"service": "YouTube Learning Organizer (prototype)", "status": "ok"}

####################
### YouTube Data
####################
#### CHANNEL #####
@app.get("/api/channels", tags=["channels"])
def list_channels():
    print(f"🌐 [GET /api/channels] Called")
    channels = get_channels()
    print(f"   Returned {len(channels)} channels")
    if channels:
        print(f"   First channel: {channels[0].get('title', 'N/A')}")
    return {"channels": channels}

#### PLAYLIST #####
@app.get("/api/{channel_id}/playlists", tags=["playlists"])
def get_channel_playlists(channel_id: str):
    """Fetch all playlists for a given channel."""
    print(f"📋 [GET /api/{channel_id}/playlists] Called")
    playlists = youtube_client.get_channel_playlists(channel_id)
    print(f"   Returned {len(playlists)} playlists")
    return {"channel_id": channel_id, "playlists": playlists}

#### VIDEOS #####
@app.get("/api/videos", tags=["videos"])
def get_videos(channel_id: Optional[str] = None, playlist_id: Optional[str] = None):
    """
    Fetch videos.
    - If only channel_id: returns all uploads for that channel
    - If both channel_id and playlist_id: returns videos for that specific playlist
    - if config.TRIM_VIDEO_DESC, then trim 'description' field, after encounter first \n\n

    sample output
    {
        "channel_id": "",
        "videos": [
            { "video_id": "",      "title": "",      "description": "",      "thumbnail": "",      "url": "",      "position": null},
            { "video_id": "",      "title": "",      "description": "",      "thumbnail": "",      "url": "",      "position": null}
        ]
    }

    """
    print(f"🎬 [GET /api/videos] Called with channel_id={channel_id}, playlist_id={playlist_id}")
    
    if not channel_id:
        raise HTTPException(status_code=400, detail="channel_id is required")
    
    if playlist_id:
        # Get videos from specific playlist
        print(f"   Mode: specific playlist")
        videos = youtube_client.get_playlist_videos(playlist_id)
    else:
        # Get all videos from channel
        print(f"   Mode: channel uploads")
        videos = youtube_client.get_channel_videos(channel_id)
    
    # Process videos: trim descriptions if configured
    videos = process_videos(videos)
    
    if playlist_id:
        return {"channel_id": channel_id, "playlist_id": playlist_id, "videos": videos}
    else:
        return {"channel_id": channel_id, "videos": videos}


####################
### Authentication
####################
@app.get("/auth/google/login", tags=["auth"])
def google_login():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured in environment")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback")
    scope = "https://www.googleapis.com/auth/youtube.readonly openid email"
    print(f"🔐 [google_login] Requesting scopes: {scope}")
    url = youtube_client.get_oauth_authorize_url(client_id, redirect_uri, scope)
    return RedirectResponse(url)

@app.get("/auth/google/callback", tags=["auth"])
def google_callback(code: Optional[str] = None, error: Optional[str] = None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code parameter")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback")
    tokens = youtube_client.exchange_code_for_tokens(code, client_id, client_secret, redirect_uri)
    if not tokens:
        raise HTTPException(status_code=400, detail="Token exchange failed")
    # After saving tokens in DB, return a friendly message
    print(f"✅ [google_callback] Tokens saved. Scopes: {tokens.get('scope', 'NOT_PRESENT')}")
    return {"message": "authentication successful", "next": "/", "info": "Tokens saved (single-user demo)"}

@app.get("/auth/google/debug", tags=["auth"])
def google_debug():
    """Debug endpoint to inspect stored token and scopes."""
    tokens = db.load_latest_tokens("google")
    if not tokens:
        return {"status": "no tokens stored"}
    return {
        "status": "token found",
        "has_access_token": "access_token" in tokens,
        "has_refresh_token": "refresh_token" in tokens,
        "scope": tokens.get("scope", "NOT PRESENT"),
        "token_type": tokens.get("token_type"),
        "created_at": tokens.get("created_at"),
    }

@app.post("/auth/google/logout", tags=["auth"])
def google_logout():
    """Clear stored tokens (forces re-authentication on next login)."""
    # For MVP, we just clear all Google tokens
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM tokens WHERE provider = ?", ("google",))
    conn.commit()
    conn.close()
    print("🔑 [google_logout] All Google tokens cleared")
    return {"message": "logged out", "next": "/auth/google/login"}


####################
### LEARNING PLAN
####################
###### CREATE PLAN #######
@app.post("/api/plans", tags=["plans"])
def create_plan(plan: LearningPlan):
    db.save_plan(plan.model_dump())
    return {"plan_id": plan.id, "plan": plan}

###### VIEW ALL PLAN #######
@app.get("/api/plans", tags=["plans"])
def get_plan():
    return db.list_plans()

###### VIEW A PLAN #######
@app.get("/api/plans/{plan_id}", tags=["plans"])
def get_plan(plan_id: str):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    # pydantic will parse datetimes
    return LearningPlan.model_validate(row)

###### VIEW ALL PLAN #######
@app.delete("/api/plans/{plan_id}", tags=["plans"])
def delete_plan(plan_id: str):
    if not db.delete_plan(plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted"}

####################
### Add COURSES
####################
###### add-course-manual : dump all video in single chapter/ module into given course object #######
@app.patch("/api/plans/{plan_id}/add-course-manually", tags=["plans"])
def refresh_plan(plan_id: str, course: Course):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)
    now = datetime.now(timezone.utc)
    plan.updated_at = now
    plan.courses.append(course)

    db.save_plan(plan.model_dump())
    return {"message": "created course", "plan": plan}

###### todo :: add-course-ai-suggested #######
@app.post("/api/plans/{plan_id}/add-course-ai-suggested", tags=["plans"])
def ai_suggest(plan_id: str, videos: List[Video]):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)

    if not videos:
        raise HTTPException(status_code=400, detail="At least one video is required")

    course = Course(
        title="AI Suggested Course",
        sequence=len(plan.courses) + 1,
        description="Course generated from the selected YouTube videos.",
        source_channels=[],
        modules=[Module(title="Suggested learning path", sequence=1, videos=videos)],
    )
    plan.courses.append(course)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"message": "AI suggested course created", "plan": plan}
