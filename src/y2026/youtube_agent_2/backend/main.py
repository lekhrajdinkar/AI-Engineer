from fastapi import FastAPI, HTTPException, Request
from starlette.responses import RedirectResponse
from starlette.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from typing import List, Optional
import uuid
import base64
import hashlib
import hmac
import secrets
import time
from datetime import datetime, timezone, timedelta
import os
import sqlite3
import json
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from src.y2026.youtube_agent_2.backend import db
from src.y2026.youtube_agent_2.backend import youtube_client
from src.y2026.youtube_agent_2.backend import config

from src.y2026.youtube_agent_2.backend.config import ALLOWED_PREBUILT_LABELS
from src.y2026.youtube_agent_2.backend.entities import Video, LearningPlan, Channel, MetadataUpdateRequest, \
    CourseDeleteRequest, LabelsUpdateRequest, VideoReorderRequest, PlaybackUpdateRequest, Course, AiCourseRequest, Module, NewVideoFeed

def _create_youtube_oauth_state(uid: str) -> str:
    if not config.YOUTUBE_OAUTH_STATE_SECRET:
        raise HTTPException(status_code=500, detail="YOUTUBE_OAUTH_STATE_SECRET not configured")
    payload = json.dumps({"uid": uid, "exp": int(time.time()) + 600, "nonce": secrets.token_urlsafe(16)}).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(config.YOUTUBE_OAUTH_STATE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def _verify_youtube_oauth_state(state: Optional[str]) -> str:
    if not state or not config.YOUTUBE_OAUTH_STATE_SECRET:
        raise HTTPException(status_code=400, detail="Missing or invalid OAuth state")
    try:
        encoded, signature = state.rsplit(".", 1)
        expected = hmac.new(config.YOUTUBE_OAUTH_STATE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if int(payload["exp"]) < time.time():
            raise ValueError("expired")
        return payload["uid"]
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Missing or invalid OAuth state")

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

def _video_from_source(raw_video: dict, sequence: int) -> Video:
    return Video(
        video_id=raw_video.get("video_id") or raw_video.get("id") or str(uuid.uuid4()),
        title=raw_video.get("title") or "Untitled video",
        revised_title_from_ai=raw_video.get("revised_title_from_ai") or raw_video.get("title") or "Untitled video",
        description=raw_video.get("description") or "",
        url=raw_video.get("url") or "",
        sequence=sequence,
        thumbnail=raw_video.get("thumbnail") or "",
        duration_secs=raw_video.get("duration_secs") or 0,
        published_at=raw_video.get("published_at") or None,
        tags=raw_video.get("tags") or [],
        category_id=raw_video.get("category_id"),
        caption_available=raw_video.get("caption_available", False),
        embeddable=raw_video.get("embeddable", True),
        view_count=raw_video.get("view_count") or 0,
        like_count=raw_video.get("like_count") or 0,
        recording_date=raw_video.get("recording_date") or None,
        watched=False,
        labels=[],
    )

def _source_targets() -> dict:
    """Build source-to-course links from the plans that currently use each source."""
    targets = {}
    for raw_plan in db.list_plans():
        plan = LearningPlan.model_validate(raw_plan)
        for course in sorted(plan.courses, key=lambda item: (item.sequence, item.id)):
            target = {"plan_id": plan.id, "course_id": course.id, "course_sequence": course.sequence}
            for source in course.source_channels:
                entry = targets.setdefault(source.channel_id, {"target_courses": [], "playlists": {}})
                if source.playlists:
                    for playlist in source.playlists:
                        playlist_id = playlist.playlist_id or playlist.id
                        entry["playlists"].setdefault(playlist_id, []).append(target)
                else:
                    entry["target_courses"].append(target)
    return targets

def _known_source_video_ids(target_courses: list) -> set:
    """Videos already in a plan or staged for it must never be pulled again."""
    known = set()
    for plan_id in {target["plan_id"] for target in target_courses}:
        raw_plan = db.load_plan(plan_id)
        if not raw_plan:
            continue
        plan = LearningPlan.model_validate(raw_plan)
        for course in plan.courses:
            for module in course.modules:
                known.update(video.video_id for video in module.videos)
            for feed in course.new_video_feeds:
                known.update(video.video_id for video in feed.videos)
    return known

def _new_source_videos(channel_id: str, playlist_id: Optional[str], target_courses: list, checkpoint) -> list:
    raw_videos = youtube_client.get_playlist_videos(playlist_id) if playlist_id else youtube_client.get_channel_videos(channel_id)
    known_ids = _known_source_video_ids(target_courses)
    earliest_candidate = _as_utc_datetime(checkpoint)
    if earliest_candidate:
        earliest_candidate -= timedelta(hours=24)
    videos = []
    for index, raw_video in enumerate(process_videos(raw_videos), start=1):
        video = _video_from_source(raw_video, index)
        if video.video_id in known_ids:
            continue
        if earliest_candidate and video.published_at and video.published_at <= earliest_candidate:
            continue
        videos.append(video.model_dump(mode="json"))
    return videos

def _sync_source_metadata() -> dict:
    previous = db.load_source_sync_metadata()
    previous_channels = {item.get("channel_id"): item for item in previous.get("channels", [])}
    now = datetime.now(timezone.utc).isoformat()
    target_map = _source_targets()
    synced_channels = []
    for channel in get_channels():
        channel_id = channel.get("channel_id")
        if not channel_id:
            continue
        playlists = youtube_client.get_channel_playlists(channel_id)
        previous_channel = previous_channels.get(channel_id, {})
        previous_playlists = {item.get("playlist_id") or item.get("id"): item for item in previous_channel.get("playlists", [])}
        target_entry = target_map.get(channel_id, {"target_courses": [], "playlists": {}})
        channel_targets = target_entry["target_courses"]
        channel_new_videos = _new_source_videos(channel_id, None, channel_targets, previous_channel.get("last_feed_checked_at")) if channel_targets else []
        synced_channels.append({
            **channel,
            "source_created_at": channel.get("source_created_at"),
            "last_synced_at": now,
            "last_feed_checked_at": now if channel_targets else previous_channel.get("last_feed_checked_at"),
            "target_courses": channel_targets,
            "new_videos": channel_new_videos,
            "playlists": [{
                **playlist,
                "source_created_at": playlist.get("source_created_at"),
                "last_synced_at": now,
                "last_feed_checked_at": now if target_entry["playlists"].get(playlist.get("playlist_id") or playlist.get("id")) else previous_playlists.get(playlist.get("playlist_id") or playlist.get("id"), {}).get("last_feed_checked_at"),
                "target_courses": target_entry["playlists"].get(playlist.get("playlist_id") or playlist.get("id"), []),
                "new_videos": _new_source_videos(channel_id, playlist.get("playlist_id") or playlist.get("id"), target_entry["playlists"].get(playlist.get("playlist_id") or playlist.get("id"), []), previous_playlists.get(playlist.get("playlist_id") or playlist.get("id"), {}).get("last_feed_checked_at")) if target_entry["playlists"].get(playlist.get("playlist_id") or playlist.get("id")) else [],
            } for playlist in playlists],
        })
    metadata = {"channels": synced_channels, "updated_at": now}
    db.save_source_sync_metadata(metadata)
    return metadata

def _apply_sync_to_courses(metadata: dict):
    channel_metadata = {item.get("channel_id"): item for item in metadata.get("channels", [])}
    for raw_plan in db.list_plans():
        plan = LearningPlan.model_validate(raw_plan)
        changed = False
        for course in plan.courses:
            for source in course.source_channels:
                synced = channel_metadata.get(source.channel_id)
                if not synced:
                    continue
                current_count = synced.get("videos_count", 0)
                source.thumbnail = synced.get("thumbnail") or source.thumbnail
                source.videos_count = current_count
                source.video_count = current_count
                source.source_created_at = synced.get("source_created_at") or None
                source.last_synced_at = synced.get("last_synced_at")
                source.last_feed_checked_at = synced.get("last_feed_checked_at") or source.last_feed_checked_at
                playlist_metadata = {item.get("playlist_id") or item.get("id"): item for item in synced.get("playlists", [])}
                for playlist in source.playlists:
                    playlist_id = playlist.playlist_id or playlist.id
                    playlist_synced = playlist_metadata.get(playlist_id)
                    if not playlist_synced:
                        continue
                    playlist.videos_count = playlist_synced.get("videos_count", 0)
                    playlist.last_synced_at = playlist_synced.get("last_synced_at")
                    playlist.source_created_at = playlist_synced.get("source_created_at") or None
                    playlist.last_feed_checked_at = playlist_synced.get("last_feed_checked_at") or playlist.last_feed_checked_at
                changed = True
            labels = set(course.labels)
            if course.new_video_feeds:
                labels.add("refresh_needed")
            else:
                labels.discard("refresh_needed")
            if labels != set(course.labels):
                course.labels = list(labels)
                changed = True
        if changed:
            plan.updated_at = datetime.now(timezone.utc)
            db.save_plan(plan.model_dump())

def _as_utc_datetime(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None

def _feed_checkpoint(metadata: dict, channel_id: str, playlist_id: Optional[str], fallback) -> Optional[datetime]:
    channel = next((item for item in metadata.get("channels", []) if item.get("channel_id") == channel_id), {})
    if playlist_id:
        playlist = next((item for item in channel.get("playlists", []) if (item.get("playlist_id") or item.get("id")) == playlist_id), {})
        return _as_utc_datetime(playlist.get("last_feed_checked_at") or fallback)
    return _as_utc_datetime(channel.get("last_feed_checked_at") or fallback)

def _mark_feed_checked(metadata: dict, channel_id: str, playlist_id: Optional[str], checked_at: str):
    channel = next((item for item in metadata.get("channels", []) if item.get("channel_id") == channel_id), None)
    if not channel:
        return
    if playlist_id:
        playlist = next((item for item in channel.get("playlists", []) if (item.get("playlist_id") or item.get("id")) == playlist_id), None)
        if playlist:
            playlist["last_feed_checked_at"] = checked_at
    else:
        channel["last_feed_checked_at"] = checked_at

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
            invalid_labels = (set(labels) - ALLOWED_PREBUILT_LABELS) - (set(module.labels) - ALLOWED_PREBUILT_LABELS)
            if invalid_labels:
                raise HTTPException(status_code=422, detail=f"Unsupported module labels: {', '.join(sorted(invalid_labels))}")
            module.labels = labels
        else:
            video = next((item for item in module.videos if item.video_id == video_id), None)
            if not video:
                raise HTTPException(status_code=404, detail="Video not found")
            invalid_labels = (set(labels) - ALLOWED_PREBUILT_LABELS) - (set(video.labels) - ALLOWED_PREBUILT_LABELS)
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_firebase_identity(request: Request, call_next):
    """Require a Firebase ID token for application API routes in production."""
    if request.method == "OPTIONS" or not config.FIREBASE_AUTH_REQUIRED or not request.url.path.startswith("/api/"):
        return await call_next(request)
    authorization = request.headers.get("Authorization", "")
    scheme, _, id_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not id_token:
        return JSONResponse(status_code=401, content={"detail": "Firebase ID token required"})
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(id_token, check_revoked=True)
        context_token = db.set_current_user(decoded["uid"])
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired Firebase ID token"})
    try:
        return await call_next(request)
    finally:
        db.reset_current_user(context_token)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "firebase_enabled": config.FIREBASE_ENABLED}

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

@app.get("/api/sources/sync-metadata", tags=["sources"])
def get_source_sync_metadata():
    """Return the last persisted source sync without making YouTube calls."""
    return db.load_source_sync_metadata()

@app.post("/api/sources/sync-metadata", tags=["sources"])
def sync_source_metadata():
    """Pull subscribed source metadata and stage newly discovered source feeds."""
    metadata = _sync_source_metadata()
    _apply_sync_to_courses(metadata)
    return metadata

@app.post("/api/sources/sync-metadata/push-new-feeds", tags=["sources"])
def push_new_source_feeds(channel_id: Optional[str] = None, playlist_id: Optional[str] = None):
    """Push each source feed to its first target course until LLM organization is added."""
    metadata = db.load_source_sync_metadata()
    updated_plans = {}
    pushed_videos = 0
    pushed_targets = []

    def push_scope(channel: dict, scope: dict, selected_playlist_id: Optional[str]):
        nonlocal pushed_videos
        if not scope.get("new_videos") or not scope.get("target_courses"):
            return
        target = sorted(scope["target_courses"], key=lambda item: (item.get("course_sequence", 0), item["course_id"]))[0]
        raw_plan = updated_plans.get(target["plan_id"])
        if raw_plan is None:
            stored = db.load_plan(target["plan_id"])
            if not stored:
                return
            raw_plan = LearningPlan.model_validate(stored)
        course = next((item for item in raw_plan.courses if item.id == target["course_id"]), None)
        if not course:
            return
        feed = next((item for item in course.new_video_feeds if item.channel_id == channel["channel_id"] and item.playlist_id == selected_playlist_id), None)
        if not feed:
            feed = NewVideoFeed(channel_id=channel["channel_id"], playlist_id=selected_playlist_id, videos=[])
            course.new_video_feeds.append(feed)
        existing_ids = {video.video_id for item in course.new_video_feeds for video in item.videos}
        additions = [_video_from_source(video, len(feed.videos) + index) for index, video in enumerate(scope["new_videos"], start=1) if (video.get("video_id") or video.get("id")) not in existing_ids]
        if additions:
            feed.videos.extend(additions)
            course.labels = list(set(course.labels) | {"refresh_needed"})
            course.updated_at = datetime.now(timezone.utc)
            raw_plan.updated_at = datetime.now(timezone.utc)
            updated_plans[target["plan_id"]] = raw_plan
            pushed_videos += len(additions)
            pushed_targets.append({**target, "channel_id": channel["channel_id"], "playlist_id": selected_playlist_id, "videos": len(additions)})
        scope["new_videos"] = []
        scope["last_pushed_at"] = datetime.now(timezone.utc).isoformat()

    for channel in metadata.get("channels", []):
        if channel_id and channel.get("channel_id") != channel_id:
            continue
        if not playlist_id:
            push_scope(channel, channel, None)
        for playlist in channel.get("playlists", []):
            current_playlist_id = playlist.get("playlist_id") or playlist.get("id")
            if playlist_id and current_playlist_id != playlist_id:
                continue
            if not playlist_id and channel_id is None:
                push_scope(channel, playlist, current_playlist_id)
            elif playlist_id:
                push_scope(channel, playlist, current_playlist_id)

    for plan in updated_plans.values():
        db.save_plan(plan.model_dump())
    metadata["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.save_source_sync_metadata(metadata)
    return {"metadata": metadata, "plans": list(updated_plans.values()), "pushed_videos": pushed_videos, "target_courses": pushed_targets}

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

@app.post("/api/plans/{plan_id}/courses/{course_id}/discover-new-videos", tags=["courses"])
def discover_new_videos(plan_id: str, course_id: str, channel_id: Optional[str] = None, playlist_id: Optional[str] = None):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    discovered_feeds = []
    sync_metadata = db.load_source_sync_metadata()
    checked_at = datetime.now(timezone.utc)
    eligible_sources = [source for source in course.source_channels if not channel_id or source.channel_id == channel_id]
    if channel_id and not eligible_sources:
        raise HTTPException(status_code=404, detail="Channel is not a course content source")

    target_scopes = set()
    for source in eligible_sources:
        if playlist_id:
            target_scopes.add((source.channel_id, playlist_id))
        elif source.playlists:
            target_scopes.update((source.channel_id, playlist.playlist_id or playlist.id) for playlist in source.playlists)
        else:
            target_scopes.add((source.channel_id, None))
    # Course modules may be AI-organized from the same channel across multiple
    # courses. A video is new only when it is absent from the entire plan.
    existing_videos = {
        video.video_id: video
        for item in plan.courses
        for module in item.modules
        for video in module.videos
    }
    existing_ids = set(existing_videos)
    # Re-loading a source replaces its prior staged feed, including its metadata.
    staged_ids = {
        video.video_id
        for item in plan.courses
        for feed in item.new_video_feeds
        if item.id != course.id or (feed.channel_id, feed.playlist_id) not in target_scopes
        for video in feed.videos
    }

    for source in eligible_sources:
        selections = []
        if playlist_id:
            selections = [playlist for playlist in source.playlists if (playlist.playlist_id or playlist.id) == playlist_id]
            if not selections:
                continue
        elif source.playlists:
            selections = source.playlists
        else:
            selections = [None]

        for playlist in selections:
            selected_playlist_id = (playlist.playlist_id or playlist.id) if playlist else None
            raw_videos = youtube_client.get_playlist_videos(selected_playlist_id) if selected_playlist_id else youtube_client.get_channel_videos(source.channel_id)
            fallback_checkpoint = playlist.last_feed_checked_at if playlist else source.last_feed_checked_at
            checkpoint = _feed_checkpoint(sync_metadata, source.channel_id, selected_playlist_id, fallback_checkpoint)
            # Keep a small overlap to account for delayed YouTube indexing; IDs
            # are still deduplicated against the complete learning plan.
            earliest_candidate = checkpoint - timedelta(hours=24) if checkpoint else None
            videos = []
            for index, raw_video in enumerate(process_videos(raw_videos), start=1):
                video = _video_from_source(raw_video, index)
                # Existing plans may have been created before we collected rich
                # YouTube metadata. Refresh it while scanning the shared feed.
                existing_video = existing_videos.get(video.video_id)
                if existing_video:
                    existing_video.thumbnail = video.thumbnail or existing_video.thumbnail
                    existing_video.duration_secs = video.duration_secs
                    existing_video.published_at = video.published_at
                    existing_video.tags = video.tags
                    existing_video.category_id = video.category_id
                    existing_video.caption_available = video.caption_available
                    existing_video.embeddable = video.embeddable
                    existing_video.view_count = video.view_count
                    existing_video.like_count = video.like_count
                    existing_video.recording_date = video.recording_date
                    continue
                if earliest_candidate and video.published_at and video.published_at <= earliest_candidate:
                    continue
                if video.video_id not in existing_ids and video.video_id not in staged_ids:
                    videos.append(video)
                    staged_ids.add(video.video_id)
            if videos:
                discovered_feeds.append(NewVideoFeed(channel_id=source.channel_id, playlist_id=selected_playlist_id, videos=videos))
            _mark_feed_checked(sync_metadata, source.channel_id, selected_playlist_id, checked_at.isoformat())
            if playlist:
                playlist.last_feed_checked_at = checked_at
            else:
                source.last_feed_checked_at = checked_at

    # Replace staging data for the scopes just discovered, while preserving other scopes.
    course.new_video_feeds = [feed for feed in course.new_video_feeds if (feed.channel_id, feed.playlist_id) not in target_scopes] + discovered_feeds
    if course.new_video_feeds:
        if "refresh_needed" not in course.labels:
            course.labels.append("refresh_needed")
    else:
        course.labels = [label for label in course.labels if label != "refresh_needed"]
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    db.save_source_sync_metadata(sync_metadata)
    return {"plan": plan, "discovered_videos": sum(len(feed.videos) for feed in discovered_feeds)}

@app.post("/api/plans/{plan_id}/courses/{course_id}/ai-suggest-refresh-feed", tags=["courses"])
def ai_suggest_refresh_feed(plan_id: str, course_id: str):
    """Temporary organizer: append staged feeds to a New videos module."""
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    incoming = [video for feed in course.new_video_feeds for video in feed.videos]
    if not incoming:
        raise HTTPException(status_code=422, detail="There are no staged new videos to organize")
    module = next((item for item in course.modules if item.title == "New videos"), None)
    if not module:
        module = Module(title="New videos", sequence=len(course.modules) + 1, videos=[])
        course.modules.append(module)
    seen_ids = {video.video_id for item in course.modules for video in item.videos}
    added = 0
    for video in incoming:
        if video.video_id not in seen_ids:
            video.sequence = len(module.videos) + 1
            module.videos.append(video)
            seen_ids.add(video.video_id)
            added += 1
    course.new_video_feeds = []
    course.labels = [label for label in course.labels if label != "refresh_needed"]
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    return {"plan": plan, "added_videos": added}


####################
### Authentication
####################
@app.post("/api/integrations/youtube/connect", tags=["integrations"])
def start_youtube_connection():
    uid = db.current_user_id()
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase identity required")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google YouTube OAuth is not configured")
    state = _create_youtube_oauth_state(uid)
    return {"authorize_url": youtube_client.get_oauth_authorize_url(client_id, redirect_uri, "https://www.googleapis.com/auth/youtube.readonly", state)}


@app.get("/api/integrations/youtube/status", tags=["integrations"])
def youtube_connection_status():
    tokens = db.load_latest_tokens("google")
    return {"connected": bool(tokens and tokens.get("refresh_token")), "scope": tokens.get("scope") if tokens else None, "connected_at": tokens.get("created_at") if tokens else None}

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
def google_callback(code: Optional[str] = None, error: Optional[str] = None, state: Optional[str] = None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code parameter")
    uid = _verify_youtube_oauth_state(state) if config.FIREBASE_ENABLED else None
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google/callback")
    context_token = db.set_current_user(uid) if uid else None
    try:
        tokens = youtube_client.exchange_code_for_tokens(code, client_id, client_secret, redirect_uri)
    finally:
        if context_token:
            db.reset_current_user(context_token)
    if not tokens:
        raise HTTPException(status_code=400, detail="Token exchange failed")
    # After saving tokens in DB, return a friendly message
    print(f"✅ [google_callback] Tokens saved. Scopes: {tokens.get('scope', 'NOT_PRESENT')}")
    if config.FIREBASE_ENABLED:
        return RedirectResponse(f"{config.FRONTEND_URL.rstrip('/')}/profile?youtube=connected")
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
    if request.icon_key is not None: plan.icon_key = request.icon_key
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
    if request.icon_key is not None: course.icon_key = request.icon_key
    if request.last_played_video_id is not None:
        video_exists = any(
            video.video_id == request.last_played_video_id
            for module in course.modules
            for video in module.videos
        )
        if not video_exists:
            raise HTTPException(status_code=422, detail="Video does not belong to this course")
        course.last_played_video_id = request.last_played_video_id
    if request.last_played_position_secs is not None:
        if not course.last_played_video_id:
            raise HTTPException(status_code=422, detail="A last played video is required before saving its position")
        course.last_played_position_secs = request.last_played_position_secs
    if request.last_played_at is not None:
        course.last_played_at = request.last_played_at
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

@app.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/playback", tags=["videos"])
def update_video_playback(plan_id: str, course_id: str, module_id: str, video_id: str, request: PlaybackUpdateRequest):
    row = db.load_plan(plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = LearningPlan.model_validate(row)
    course = next((item for item in plan.courses if item.id == course_id), None)
    module = next((item for item in course.modules if item.id == module_id), None) if course else None
    video = next((item for item in module.videos if item.video_id == video_id), None) if module else None
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    now = datetime.now(timezone.utc)
    video.last_played_position_secs = request.position_secs
    video.last_played_at = now
    course.last_played_video_id = video.video_id
    course.last_played_position_secs = request.position_secs
    course.last_played_at = now
    course.updated_at = now
    plan.updated_at = now
    db.save_plan(plan.model_dump())
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

    json_file = config.AI_DUMMY_LEARNING_PLAN
    
    try:
        with json_file.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Dummy course fixture file was not found")
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=500, detail=f"Dummy course fixture contains invalid JSON: {error.msg}")
    except OSError as error:
        raise HTTPException(status_code=500, detail=f"Unable to read dummy course fixture: {error}")

    # Fixtures may contain either a direct learning-plan object or the older
    # {"learning_plan": {...}} wrapper.
    fixture_plan = data.get("learning_plan", data)
    courses = fixture_plan.get("courses") if isinstance(fixture_plan, dict) else None
    if not isinstance(courses, list) or not courses:
        raise HTTPException(status_code=422, detail="Dummy course fixture must contain at least one course")

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
