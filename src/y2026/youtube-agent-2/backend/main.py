from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import os
import sqlite3
from dotenv import load_dotenv

from . import db
from . import youtube_client

load_dotenv()

app = FastAPI(title="YouTube Learning Organizer - Backend Prototype")


# Demo channels come from the youtube_client (scaffold)
def get_demo_channels():
    return youtube_client.list_subscribed_channels()


class Video(BaseModel):
    video_id: str
    title: str
    url: Optional[str] = None
    duration_secs: Optional[int] = None
    watched: bool = False


class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    videos: List[Video] = Field(default_factory=list)


class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    modules: List[Module] = Field(default_factory=list)


class LearningPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    channel_ids: List[str] = []


class LearningPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    channels: List[dict] = Field(default_factory=list)
    courses: List[Course] = Field(default_factory=list)


@app.get("/", tags=["meta"])
def root():
    return {"service": "YouTube Learning Organizer (prototype)", "status": "ok"}


@app.get("/api/channels", tags=["channels"])
def list_channels():
    print(f"🌐 [GET /api/channels] Called")
    channels = get_demo_channels()
    print(f"   Returned {len(channels)} channels")
    if channels:
        print(f"   First channel: {channels[0].get('title', 'N/A')}")
    return {"channels": channels}



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
    conn = sqlite3.connect(db.DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM tokens WHERE provider = ?", ("google",))
    conn.commit()
    conn.close()
    print("🔑 [google_logout] All Google tokens cleared")
    return {"message": "logged out", "next": "/auth/google/login"}


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


@app.post("/api/plans", tags=["plans"])
def create_plan(payload: LearningPlanCreate):
    # Build channel objects from channel_ids (demo)
    all_channels = get_demo_channels()
    channels = [c for c in all_channels if c["channel_id"] in payload.channel_ids]
    plan = LearningPlan(name=payload.name, description=payload.description, channels=channels)
    # persist to sqlite
    db.save_plan(plan.model_dump())
    return {"plan_id": plan.id, "plan": plan}


@app.get("/api/plans/{plan_id}", tags=["plans"])
def get_plan(plan_id: str):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    # pydantic will parse datetimes
    return LearningPlan.model_validate(row)


@app.patch("/api/plans/{plan_id}/refresh", tags=["plans"])
def refresh_plan(plan_id: str):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)
    now = datetime.now(timezone.utc)
    plan.updated_at = now

    # create a default course/module if none
    if not plan.courses:
        new_course = Course(title="Imported Course")
        new_module = Module(title="Module 1", sequence=1)
        new_course.modules.append(new_module)
        plan.courses.append(new_course)

    # add a synthetic video
    new_video = Video(video_id=str(uuid.uuid4()), title=f"New video {now.isoformat()}")
    plan.courses[0].modules[0].videos.append(new_video)

    db.save_plan(plan.model_dump())
    return {"message": "refreshed", "added_video": new_video}


@app.post("/api/plans/{plan_id}/ai-suggest", tags=["plans"])
def ai_suggest(plan_id: str):
    # Simple keyword-based grouping suggestion
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)
    videos = []
    for c in plan.courses:
        for m in c.modules:
            for v in m.videos:
                videos.append({"video_id": v.video_id, "title": v.title or ""})

    # basic heuristic: map top non-stopword to videos
    stopwords = {"the", "a", "an", "of", "and", "in", "to", "for", "with", "on", "how"}
    suggestions = {}
    for v in videos:
        words = [w.strip(".,:;()[]") for w in v["title"].lower().split() if w]
        key = None
        for w in words:
            if w not in stopwords:
                key = w
                break
        if not key:
            key = "misc"
        suggestions.setdefault(key, []).append(v)

    return {"suggestions": suggestions}


@app.get("/api/search", tags=["search"])
def search(q: str):
    results = []
    for row in db.list_plans():
        plan = LearningPlan.model_validate(row)
        for c in plan.courses:
            for m in c.modules:
                for v in m.videos:
                    if q.lower() in (v.title or "").lower():
                        results.append({"plan_id": plan.id, "video_id": v.video_id, "title": v.title})
    return {"q": q, "results": results}
