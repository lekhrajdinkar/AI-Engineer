from fastapi import FastAPI, HTTPException
from starlette.responses import RedirectResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import os
import sqlite3
import json
from dotenv import load_dotenv
from src.y2026.youtube_agent_2.backend import db
from src.y2026.youtube_agent_2.backend import youtube_client
from src.y2026.youtube_agent_2.backend import config
from pathlib import Path

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

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
    description: Optional[str] = None
    url: Optional[str] = None
    sequence: int = 1
    thumbnail: str
    duration_secs: Optional[int] = None
    watched: bool = False
    labels: List[str] = Field(default_factory=list)

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    labels: List[str] = Field(default_factory=list)
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
    logo_url: str = ""
    labels: List[str] = Field(default_factory=list)
    last_played_video_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modules: List[Module] = Field(default_factory=list)
    source_channels: List[Channel]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LearningPlan(BaseModel):
    logo_url: str = ""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    courses: List[Course] = Field(default_factory=list)
    source_channels : List[Channel] = Field(default_factory=list)
    labels: List[str] = Field(default_factory=list)

class CourseDeleteRequest(BaseModel):
    course_ids: List[str] = Field(min_length=1)

class LabelsUpdateRequest(BaseModel):
    labels: List[str] = Field(default_factory=list)

class VideoReorderRequest(BaseModel):
    video_id: str
    source_module_id: str
    target_module_id: str
    target_index: int = Field(ge=0)

class MetadataUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    last_played_video_id: Optional[str] = None

class AiCourseRequest(BaseModel):
    videos: List[Video]
    source_channels: List[Channel] = Field(default_factory=list)

ALLOWED_LABELS = {"watched", "mark_for_delete", "bookmarked"}

def _update_labels(plan_id: str, course_id: str, module_id: Optional[str], video_id: Optional[str], labels: List[str]) -> LearningPlan:
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if module_id is None:
        # Courses may use predefined labels as well as user-created labels.
        course.labels = labels
    else:
        module = next((item for item in course.modules if item.id == module_id), None)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        if video_id is None:
            invalid_labels = (set(labels) - ALLOWED_LABELS) - (set(module.labels) - ALLOWED_LABELS)
            if invalid_labels:
                raise HTTPException(status_code=422, detail=f"Unsupported module labels: {', '.join(sorted(invalid_labels))}")
            module.labels = labels
        else:
            video = next((item for item in module.videos if item.video_id == video_id), None)
            if not video:
                raise HTTPException(status_code=404, detail="Video not found")
            invalid_labels = (set(labels) - ALLOWED_LABELS) - (set(video.labels) - ALLOWED_LABELS)
            if invalid_labels:
                raise HTTPException(status_code=422, detail=f"Unsupported video labels: {', '.join(sorted(invalid_labels))}")
            video.labels = labels
            video.watched = "watched" in labels
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return plan

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

@app.patch("/api/plans/{plan_id}", tags=["plans"])
def update_plan_metadata(plan_id: str, request: MetadataUpdateRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    if request.name is not None: plan.name = request.name
    if request.description is not None: plan.description = request.description
    if request.logo_url is not None: plan.logo_url = request.logo_url
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan}

@app.patch("/api/plans/{plan_id}/courses/{course_id}", tags=["courses"])
def update_course_metadata(plan_id: str, course_id: str, request: MetadataUpdateRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if request.title is not None: course.title = request.title
    if request.description is not None: course.description = request.description
    if request.logo_url is not None: course.logo_url = request.logo_url
    if request.last_played_video_id is not None:
        video_exists = any(
            video.video_id == request.last_played_video_id
            for module in course.modules
            for video in module.videos
        )
        if not video_exists:
            raise HTTPException(status_code=422, detail="Video does not belong to this course")
        course.last_played_video_id = request.last_played_video_id
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan}

###### VIEW ALL PLAN #######
@app.delete("/api/plans/{plan_id}", tags=["plans"])
def delete_plan(plan_id: str):
    if not db.delete_plan(plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted"}

@app.delete("/api/courses/{plan_id}", tags=["courses"])
def delete_courses(plan_id: str, request: CourseDeleteRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)
    course_ids = set(request.course_ids)
    existing_ids = {course.id for course in plan.courses}
    missing_ids = course_ids - existing_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Course not found: {', '.join(sorted(missing_ids))}")

    plan.courses = [course for course in plan.courses if course.id not in course_ids]
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"message": "Courses deleted", "plan": plan}

@app.patch("/api/plans/{plan_id}/courses/{course_id}/labels", tags=["labels"])
def update_course_labels(plan_id: str, course_id: str, request: LabelsUpdateRequest):
    plan = _update_labels(plan_id, course_id, None, None, request.labels)
    return {"plan": plan}

@app.patch("/api/plans/{plan_id}/labels", tags=["labels"])
def update_plan_labels(plan_id: str, request: LabelsUpdateRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    # Learning plans may use predefined labels as well as user-created labels.
    plan.labels = request.labels
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan}

@app.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/labels", tags=["labels"])
def update_module_labels(plan_id: str, course_id: str, module_id: str, request: LabelsUpdateRequest):
    plan = _update_labels(plan_id, course_id, module_id, None, request.labels)
    return {"plan": plan}

@app.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/labels", tags=["labels"])
def update_video_labels(plan_id: str, course_id: str, module_id: str, video_id: str, request: LabelsUpdateRequest):
    plan = _update_labels(plan_id, course_id, module_id, video_id, request.labels)
    return {"plan": plan}

@app.patch("/api/plans/{plan_id}/courses/{course_id}/videos/reorder", tags=["courses"])
def reorder_course_videos(plan_id: str, course_id: str, request: VideoReorderRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    source_module = next((item for item in course.modules if item.id == request.source_module_id), None)
    target_module = next((item for item in course.modules if item.id == request.target_module_id), None)
    if not source_module or not target_module:
        raise HTTPException(status_code=404, detail="Module not found")
    source_index = next((index for index, video in enumerate(source_module.videos) if video.video_id == request.video_id), None)
    if source_index is None:
        raise HTTPException(status_code=404, detail="Video not found in source module")

    video = source_module.videos.pop(source_index)
    target_index = request.target_index
    if source_module.id == target_module.id and source_index < target_index:
        target_index -= 1
    target_index = max(0, min(target_index, len(target_module.videos)))
    target_module.videos.insert(target_index, video)
    for module in course.modules:
        for index, item in enumerate(module.videos, start=1):
            item.sequence = index
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan}

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

###############
# DUMMY API
###############
# ###### DUMMY-1 : add-course-ai-suggested 1 #######
# @app.post("/api/plans/{plan_id}/add-course-ai-suggested", tags=["plans"])
def ai_suggest_1(plan_id: str, request: AiCourseRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)

    if not request.videos:
        raise HTTPException(status_code=400, detail="At least one video is required")

    # Temporary UI-test grouping: replace with LLM-generated modules later.
    modules = [
        Module(
            title=f"Chapter {index // 10 + 1}",
            sequence=index // 10 + 1,
            videos=request.videos[index:index + 10],
        )
        for index in range(0, len(request.videos), 10)
    ]

    course = Course(
        title="AI Suggested Course",
        sequence=len(plan.courses) + 1,
        description="Course generated from the selected YouTube videos.",
        source_channels=request.source_channels,
        modules=modules,
    )
    plan.courses.append(course)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"message": "AI suggested course created", "plan": plan}

# ###### DUMMY-2 : add-course-ai-suggested 2 #######
@app.post("/api/plans/{plan_id}/add-course-ai-suggested", tags=["plans"])
def ai_suggest_2(plan_id: str):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = LearningPlan.model_validate(row)

    json_file = BASE_DIR / "json-dumps" / "organized-learning-plan-2.json"
    try:
        with json_file.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Dummy course fixture file was not found")
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=500, detail=f"Dummy course fixture contains invalid JSON: {error.msg}")
    except OSError as error:
        raise HTTPException(status_code=500, detail=f"Unable to read dummy course fixture: {error}")

    courses = data.get("learning_plan", {}).get("courses")
    if not isinstance(courses, list) or not courses:
        raise HTTPException(status_code=422, detail="Dummy course fixture must contain at least one learning_plan course")

    imported_courses = []
    for course_index, course_data in enumerate(courses, start=1):
        if not isinstance(course_data, dict):
            raise HTTPException(status_code=422, detail=f"Dummy course at position {course_index} must be an object")

        # The fixture may be imported many times, so its course and module IDs must be new each time.
        course_data = dict(course_data)
        course_data["id"] = str(uuid.uuid4())
        course_data["sequence"] = len(plan.courses) + course_index
        raw_channels = course_data.get("source_channels", [])
        if not isinstance(raw_channels, list):
            raise HTTPException(status_code=422, detail=f"Source channels for dummy course at position {course_index} must be a list")
        course_data["source_channels"] = []
        for raw_channel_data in raw_channels:
            if not isinstance(raw_channel_data, dict):
                raise HTTPException(status_code=422, detail=f"Source channel for dummy course at position {course_index} must be an object")
            channel_data = dict(raw_channel_data)
            if "video_count" not in channel_data and "videos_count" in channel_data:
                channel_data["video_count"] = channel_data["videos_count"]
            raw_playlists = channel_data.get("playlists", [])
            if not isinstance(raw_playlists, list):
                raise HTTPException(status_code=422, detail=f"Playlists for a source channel in dummy course {course_index} must be a list")
            channel_data["playlists"] = []
            for raw_playlist_data in raw_playlists:
                if not isinstance(raw_playlist_data, dict):
                    raise HTTPException(status_code=422, detail=f"Playlist for a source channel in dummy course {course_index} must be an object")
                playlist_data = dict(raw_playlist_data)
                if "id" not in playlist_data and "playlist_id" in playlist_data:
                    playlist_data["id"] = playlist_data["playlist_id"]
                channel_data["playlists"].append(playlist_data)
            course_data["source_channels"].append(channel_data)
        raw_modules = course_data.get("modules", [])
        if not isinstance(raw_modules, list):
            raise HTTPException(status_code=422, detail=f"Modules for dummy course at position {course_index} must be a list")
        course_data["modules"] = []

        for module_index, raw_module_data in enumerate(raw_modules, start=1):
            if not isinstance(raw_module_data, dict):
                raise HTTPException(status_code=422, detail=f"Module {module_index} for dummy course at position {course_index} must be an object")
            module_data = dict(raw_module_data)
            module_data["id"] = str(uuid.uuid4())
            module_data["sequence"] = module_index
            raw_videos = module_data.get("videos", [])
            if not isinstance(raw_videos, list):
                raise HTTPException(status_code=422, detail=f"Videos for module {module_index} in dummy course {course_index} must be a list")
            module_data["videos"] = []
            for video_index, raw_video_data in enumerate(raw_videos, start=1):
                if not isinstance(raw_video_data, dict):
                    raise HTTPException(status_code=422, detail=f"Video {video_index} in module {module_index} of dummy course {course_index} must be an object")
                video_data = dict(raw_video_data)
                # Fixture exports do not need an AI-revised title; use the original title for the current model contract.
                video_data.setdefault("revised_title_from_ai", video_data.get("title", ""))
                video_data["sequence"] = video_index
                module_data["videos"].append(video_data)
            course_data["modules"].append(module_data)

        try:
            imported_courses.append(Course.model_validate(course_data))
        except ValidationError as error:
            raise HTTPException(status_code=422, detail=f"Invalid dummy course at position {course_index}: {error.errors()}")

    plan.courses.extend(imported_courses)
       
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"message": "AI suggested course created", "plan": plan}
