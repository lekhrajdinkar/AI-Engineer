"""Source synchronization and new-video staging workflows."""

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.infrastructure.youtube_provider import get_source_provider
from src.y2026.youtube_agent_2.backend.services.plans.app.models import LearningPlan, NewVideoFeed, Video
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store as db


def _trim_description(description: Optional[str]) -> Optional[str]:
    if not config.TRIM_VIDEO_DESC or not description:
        return description
    return description.split("\n\n")[0]


def _process_videos(videos: list[dict]) -> list[dict]:
    processed = []
    for raw_video in videos:
        video = raw_video.copy()
        if "description" in video:
            video["description"] = _trim_description(video["description"])
        processed.append(video)
    return processed


def _video_from_source(raw_video: dict, sequence: int) -> Video:
    return Video(
        video_id=raw_video.get("video_id") or raw_video.get("id") or str(uuid.uuid4()),
        title=raw_video.get("title") or "Untitled video",
        revised_title_from_ai=raw_video.get("revised_title_from_ai")
        or raw_video.get("title")
        or "Untitled video",
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
    targets = {}
    for raw_plan in db.list_plans():
        plan = LearningPlan.model_validate(raw_plan)
        for course in sorted(plan.courses, key=lambda item: (item.sequence, item.id)):
            target = {
                "plan_id": plan.id,
                "course_id": course.id,
                "course_sequence": course.sequence,
            }
            for source in course.source_channels:
                entry = targets.setdefault(
                    source.channel_id, {"target_courses": [], "playlists": {}}
                )
                if source.playlists:
                    for playlist in source.playlists:
                        playlist_id = playlist.playlist_id or playlist.id
                        entry["playlists"].setdefault(playlist_id, []).append(target)
                else:
                    entry["target_courses"].append(target)
    return targets


def _known_source_video_ids(target_courses: list) -> set:
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


def _as_utc_datetime(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _new_source_videos(
    channel_id: str, playlist_id: Optional[str], target_courses: list, checkpoint
) -> list:
    source = get_source_provider()
    raw_videos = (
        source.get_playlist_videos(playlist_id)
        if playlist_id
        else source.get_channel_videos(channel_id)
    )
    known_ids = _known_source_video_ids(target_courses)
    earliest_candidate = _as_utc_datetime(checkpoint)
    if earliest_candidate:
        earliest_candidate -= timedelta(hours=24)
    videos = []
    for index, raw_video in enumerate(_process_videos(raw_videos), start=1):
        video = _video_from_source(raw_video, index)
        if video.video_id in known_ids:
            continue
        if earliest_candidate and video.published_at and video.published_at <= earliest_candidate:
            continue
        videos.append(video.model_dump(mode="json"))
    return videos


def _pull_source_metadata() -> dict:
    source = get_source_provider()
    previous = db.load_source_sync_metadata()
    previous_channels = {
        item.get("channel_id"): item for item in previous.get("channels", [])
    }
    now = datetime.now(timezone.utc).isoformat()
    target_map = _source_targets()
    synced_channels = []
    for channel in source.list_channels():
        channel_id = channel.get("channel_id")
        if not channel_id:
            continue
        playlists = source.get_channel_playlists(channel_id)
        previous_channel = previous_channels.get(channel_id, {})
        previous_playlists = {
            item.get("playlist_id") or item.get("id"): item
            for item in previous_channel.get("playlists", [])
        }
        target_entry = target_map.get(
            channel_id, {"target_courses": [], "playlists": {}}
        )
        channel_targets = target_entry["target_courses"]
        channel_new_videos = (
            _new_source_videos(
                channel_id,
                None,
                channel_targets,
                previous_channel.get("last_feed_checked_at"),
            )
            if channel_targets
            else []
        )
        synced_playlists = []
        for playlist in playlists:
            playlist_id = playlist.get("playlist_id") or playlist.get("id")
            playlist_targets = target_entry["playlists"].get(playlist_id, [])
            previous_playlist = previous_playlists.get(playlist_id, {})
            synced_playlists.append(
                {
                    **playlist,
                    "source_created_at": playlist.get("source_created_at"),
                    "last_synced_at": now,
                    "last_feed_checked_at": now
                    if playlist_targets
                    else previous_playlist.get("last_feed_checked_at"),
                    "target_courses": playlist_targets,
                    "new_videos": _new_source_videos(
                        channel_id,
                        playlist_id,
                        playlist_targets,
                        previous_playlist.get("last_feed_checked_at"),
                    )
                    if playlist_targets
                    else [],
                }
            )
        synced_channels.append(
            {
                **channel,
                "source_created_at": channel.get("source_created_at"),
                "last_synced_at": now,
                "last_feed_checked_at": now
                if channel_targets
                else previous_channel.get("last_feed_checked_at"),
                "target_courses": channel_targets,
                "new_videos": channel_new_videos,
                "playlists": synced_playlists,
            }
        )
    metadata = {"channels": synced_channels, "updated_at": now}
    db.save_source_sync_metadata(metadata)
    return metadata


def _apply_sync_to_courses(metadata: dict) -> None:
    channel_metadata = {
        item.get("channel_id"): item for item in metadata.get("channels", [])
    }
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
                source.last_feed_checked_at = (
                    synced.get("last_feed_checked_at") or source.last_feed_checked_at
                )
                playlist_metadata = {
                    item.get("playlist_id") or item.get("id"): item
                    for item in synced.get("playlists", [])
                }
                for playlist in source.playlists:
                    playlist_synced = playlist_metadata.get(
                        playlist.playlist_id or playlist.id
                    )
                    if not playlist_synced:
                        continue
                    playlist.videos_count = playlist_synced.get("videos_count", 0)
                    playlist.last_synced_at = playlist_synced.get("last_synced_at")
                    playlist.source_created_at = (
                        playlist_synced.get("source_created_at") or None
                    )
                    playlist.last_feed_checked_at = (
                        playlist_synced.get("last_feed_checked_at")
                        or playlist.last_feed_checked_at
                    )
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


def get_sync_metadata() -> dict:
    return db.load_source_sync_metadata()


def sync_metadata() -> dict:
    metadata = _pull_source_metadata()
    _apply_sync_to_courses(metadata)
    return metadata


def push_new_feeds(
    channel_id: Optional[str] = None, playlist_id: Optional[str] = None
) -> dict:
    metadata = db.load_source_sync_metadata()
    updated_plans = {}
    pushed_videos = 0
    pushed_targets = []

    def push_scope(channel: dict, scope: dict, selected_playlist_id: Optional[str]):
        nonlocal pushed_videos
        if not scope.get("new_videos") or not scope.get("target_courses"):
            return
        target = sorted(
            scope["target_courses"],
            key=lambda item: (item.get("course_sequence", 0), item["course_id"]),
        )[0]
        plan = updated_plans.get(target["plan_id"])
        if plan is None:
            stored = db.load_plan(target["plan_id"])
            if not stored:
                return
            plan = LearningPlan.model_validate(stored)
        course = next(
            (item for item in plan.courses if item.id == target["course_id"]), None
        )
        if not course:
            return
        feed = next(
            (
                item
                for item in course.new_video_feeds
                if item.channel_id == channel["channel_id"]
                and item.playlist_id == selected_playlist_id
            ),
            None,
        )
        if not feed:
            feed = NewVideoFeed(
                channel_id=channel["channel_id"],
                playlist_id=selected_playlist_id,
                videos=[],
            )
            course.new_video_feeds.append(feed)
        existing_ids = {
            video.video_id
            for item in course.new_video_feeds
            for video in item.videos
        }
        additions = [
            _video_from_source(video, len(feed.videos) + index)
            for index, video in enumerate(scope["new_videos"], start=1)
            if (video.get("video_id") or video.get("id")) not in existing_ids
        ]
        if additions:
            feed.videos.extend(additions)
            course.labels = list(set(course.labels) | {"refresh_needed"})
            course.updated_at = datetime.now(timezone.utc)
            plan.updated_at = datetime.now(timezone.utc)
            updated_plans[target["plan_id"]] = plan
            pushed_videos += len(additions)
            pushed_targets.append(
                {
                    **target,
                    "channel_id": channel["channel_id"],
                    "playlist_id": selected_playlist_id,
                    "videos": len(additions),
                }
            )
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
            if (not playlist_id and channel_id is None) or playlist_id:
                push_scope(channel, playlist, current_playlist_id)

    for plan in updated_plans.values():
        db.save_plan(plan.model_dump())
    metadata["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.save_source_sync_metadata(metadata)
    return {
        "metadata": metadata,
        "plans": list(updated_plans.values()),
        "pushed_videos": pushed_videos,
        "target_courses": pushed_targets,
    }


def _feed_checkpoint(
    metadata: dict, channel_id: str, playlist_id: Optional[str], fallback
) -> Optional[datetime]:
    channel = next(
        (
            item
            for item in metadata.get("channels", [])
            if item.get("channel_id") == channel_id
        ),
        {},
    )
    if playlist_id:
        playlist = next(
            (
                item
                for item in channel.get("playlists", [])
                if (item.get("playlist_id") or item.get("id")) == playlist_id
            ),
            {},
        )
        return _as_utc_datetime(playlist.get("last_feed_checked_at") or fallback)
    return _as_utc_datetime(channel.get("last_feed_checked_at") or fallback)


def _mark_feed_checked(
    metadata: dict, channel_id: str, playlist_id: Optional[str], checked_at: str
) -> None:
    channel = next(
        (
            item
            for item in metadata.get("channels", [])
            if item.get("channel_id") == channel_id
        ),
        None,
    )
    if not channel:
        return
    if playlist_id:
        playlist = next(
            (
                item
                for item in channel.get("playlists", [])
                if (item.get("playlist_id") or item.get("id")) == playlist_id
            ),
            None,
        )
        if playlist:
            playlist["last_feed_checked_at"] = checked_at
    else:
        channel["last_feed_checked_at"] = checked_at


def discover_new_videos(
    plan_id: str,
    course_id: str,
    channel_id: Optional[str] = None,
    playlist_id: Optional[str] = None,
) -> dict:
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
    eligible_sources = [
        source
        for source in course.source_channels
        if not channel_id or source.channel_id == channel_id
    ]
    if channel_id and not eligible_sources:
        raise HTTPException(
            status_code=404, detail="Channel is not a course content source"
        )

    target_scopes = set()
    for source in eligible_sources:
        if playlist_id:
            target_scopes.add((source.channel_id, playlist_id))
        elif source.playlists:
            target_scopes.update(
                (source.channel_id, playlist.playlist_id or playlist.id)
                for playlist in source.playlists
            )
        else:
            target_scopes.add((source.channel_id, None))
    existing_videos = {
        video.video_id: video
        for item in plan.courses
        for module in item.modules
        for video in module.videos
    }
    existing_ids = set(existing_videos)
    staged_ids = {
        video.video_id
        for item in plan.courses
        for feed in item.new_video_feeds
        if item.id != course.id
        or (feed.channel_id, feed.playlist_id) not in target_scopes
        for video in feed.videos
    }
    source_provider = get_source_provider()

    for source in eligible_sources:
        if playlist_id:
            selections = [
                playlist
                for playlist in source.playlists
                if (playlist.playlist_id or playlist.id) == playlist_id
            ]
            if not selections:
                continue
        elif source.playlists:
            selections = source.playlists
        else:
            selections = [None]

        for playlist in selections:
            selected_playlist_id = (
                (playlist.playlist_id or playlist.id) if playlist else None
            )
            raw_videos = (
                source_provider.get_playlist_videos(selected_playlist_id)
                if selected_playlist_id
                else source_provider.get_channel_videos(source.channel_id)
            )
            fallback_checkpoint = (
                playlist.last_feed_checked_at
                if playlist
                else source.last_feed_checked_at
            )
            checkpoint = _feed_checkpoint(
                sync_metadata,
                source.channel_id,
                selected_playlist_id,
                fallback_checkpoint,
            )
            earliest_candidate = (
                checkpoint - timedelta(hours=24) if checkpoint else None
            )
            videos = []
            for index, raw_video in enumerate(
                _process_videos(raw_videos), start=1
            ):
                video = _video_from_source(raw_video, index)
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
                if (
                    earliest_candidate
                    and video.published_at
                    and video.published_at <= earliest_candidate
                ):
                    continue
                if video.video_id not in existing_ids and video.video_id not in staged_ids:
                    videos.append(video)
                    staged_ids.add(video.video_id)
            if videos:
                discovered_feeds.append(
                    NewVideoFeed(
                        channel_id=source.channel_id,
                        playlist_id=selected_playlist_id,
                        videos=videos,
                    )
                )
            _mark_feed_checked(
                sync_metadata,
                source.channel_id,
                selected_playlist_id,
                checked_at.isoformat(),
            )
            if playlist:
                playlist.last_feed_checked_at = checked_at
            else:
                source.last_feed_checked_at = checked_at

    course.new_video_feeds = [
        feed
        for feed in course.new_video_feeds
        if (feed.channel_id, feed.playlist_id) not in target_scopes
    ] + discovered_feeds
    if course.new_video_feeds:
        if "refresh_needed" not in course.labels:
            course.labels.append("refresh_needed")
    else:
        course.labels = [
            label for label in course.labels if label != "refresh_needed"
        ]
    course.updated_at = datetime.now(timezone.utc)
    plan.updated_at = datetime.now(timezone.utc)
    db.save_plan(plan.model_dump())
    db.save_source_sync_metadata(sync_metadata)
    return {
        "plan": plan,
        "discovered_videos": sum(len(feed.videos) for feed in discovered_feeds),
    }
