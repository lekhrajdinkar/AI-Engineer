"""Firestore persistence for the learning platform.

The current API still uses a transitional default user. Step 3 will set the
verified Firebase Auth uid for each request before calling this repository.
"""
from __future__ import annotations

import json
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore

from src.y2026.youtube_agent_2.backend import config


def _json_value(value):
    """Firestore accepts native JSON-like values; stringify datetime objects."""
    return json.loads(json.dumps(value, default=str))


class FirestoreStore:
    def __init__(self):
        if not firebase_admin._apps:
            options = {"projectId": config.FIREBASE_PROJECT_ID}
            if config.FIREBASE_SERVICE_ACCOUNT_JSON:
                service_account = json.loads(config.FIREBASE_SERVICE_ACCOUNT_JSON)
                firebase_admin.initialize_app(credentials.Certificate(service_account), options)
            else:
                firebase_admin.initialize_app(options=options)
        self.client = firestore.client()

    def _user(self, user_id: Optional[str] = None):
        return self.client.collection("users").document(user_id or config.FIREBASE_DEFAULT_USER_ID)

    def save_plan(self, plan: dict, user_id: Optional[str] = None):
        """Store large plans in course/module/video documents, not one document."""
        user = self._user(user_id)
        plan_id = plan["id"]
        plan_ref = user.collection("plans").document(plan_id)
        plan_data = {key: value for key, value in plan.items() if key != "courses"}
        plan_ref.set(_json_value(plan_data), merge=False)
        current_course_ids = set()
        for course in plan.get("courses", []):
            course_id = course["id"]
            current_course_ids.add(course_id)
            course_ref = plan_ref.collection("courses").document(course_id)
            course_data = {key: value for key, value in course.items() if key not in {"modules", "new_video_feeds"}}
            course_ref.set(_json_value(course_data), merge=False)
            self._save_modules(course_ref, course.get("modules", []))
            self._save_feeds(course_ref, course.get("new_video_feeds", []))
        for existing in plan_ref.collection("courses").stream():
            if existing.id not in current_course_ids:
                self._delete_document_tree(existing.reference)

    def _save_modules(self, course_ref, modules: list):
        expected = set()
        for module in modules:
            module_id = module["id"]
            expected.add(module_id)
            module_ref = course_ref.collection("modules").document(module_id)
            module_ref.set(_json_value({key: value for key, value in module.items() if key != "videos"}), merge=False)
            video_ids = set()
            for video in module.get("videos", []):
                video_id = video["video_id"]
                video_ids.add(video_id)
                module_ref.collection("videos").document(video_id).set(_json_value(video), merge=False)
            for existing in module_ref.collection("videos").stream():
                if existing.id not in video_ids:
                    existing.reference.delete()
        for existing in course_ref.collection("modules").stream():
            if existing.id not in expected:
                self._delete_document_tree(existing.reference)

    def _save_feeds(self, course_ref, feeds: list):
        expected = set()
        for index, feed in enumerate(feeds):
            feed_id = f"{feed.get('channel_id', 'channel')}--{feed.get('playlist_id') or 'all'}--{index}"
            expected.add(feed_id)
            feed_ref = course_ref.collection("new_video_feeds").document(feed_id)
            feed_ref.set(_json_value({key: value for key, value in feed.items() if key != "videos"}), merge=False)
            video_ids = set()
            for video in feed.get("videos", []):
                video_id = video["video_id"]
                video_ids.add(video_id)
                feed_ref.collection("videos").document(video_id).set(_json_value(video), merge=False)
            for existing in feed_ref.collection("videos").stream():
                if existing.id not in video_ids:
                    existing.reference.delete()
        for existing in course_ref.collection("new_video_feeds").stream():
            if existing.id not in expected:
                self._delete_document_tree(existing.reference)

    def load_plan(self, plan_id: str, user_id: Optional[str] = None) -> Optional[dict]:
        plan_ref = self._user(user_id).collection("plans").document(plan_id)
        snapshot = plan_ref.get()
        if not snapshot.exists:
            return None
        plan = snapshot.to_dict()
        courses = []
        for course_snapshot in plan_ref.collection("courses").stream():
            course = course_snapshot.to_dict()
            course_ref = course_snapshot.reference
            modules = []
            for module_snapshot in course_ref.collection("modules").stream():
                module = module_snapshot.to_dict()
                videos = [video.to_dict() for video in module_snapshot.reference.collection("videos").stream()]
                module["videos"] = sorted(videos, key=lambda video: (video.get("sequence", 0), video.get("video_id", "")))
                modules.append(module)
            feeds = []
            for feed_snapshot in course_ref.collection("new_video_feeds").stream():
                feed = feed_snapshot.to_dict()
                feed["videos"] = [video.to_dict() for video in feed_snapshot.reference.collection("videos").stream()]
                feeds.append(feed)
            course["modules"] = sorted(modules, key=lambda module: (module.get("sequence", 0), module.get("id", "")))
            course["new_video_feeds"] = feeds
            courses.append(course)
        plan["courses"] = sorted(courses, key=lambda course: (course.get("sequence", 0), course.get("id", "")))
        return plan

    def list_plans(self, user_id: Optional[str] = None) -> list[dict]:
        plans = [self.load_plan(snapshot.id, user_id) for snapshot in self._user(user_id).collection("plans").stream()]
        return sorted((plan for plan in plans if plan), key=lambda plan: str(plan.get("updated_at") or ""), reverse=True)

    def delete_plan(self, plan_id: str, user_id: Optional[str] = None) -> bool:
        ref = self._user(user_id).collection("plans").document(plan_id)
        if not ref.get().exists:
            return False
        self._delete_document_tree(ref)
        return True

    def save_tokens(self, provider: str, tokens: dict, user_id: Optional[str] = None):
        self._user(user_id).collection("integrations").document(provider).set(_json_value(tokens), merge=False)

    def load_latest_tokens(self, provider: str, user_id: Optional[str] = None) -> Optional[dict]:
        snapshot = self._user(user_id).collection("integrations").document(provider).get()
        return snapshot.to_dict() if snapshot.exists else None

    def save_source_sync_metadata(self, metadata: dict, user_id: Optional[str] = None):
        # Source metadata is normally much smaller than plans. Large staged feeds
        # are already moved to course.new_video_feeds before they become sizeable.
        self._user(user_id).collection("source_sync").document("current").set(_json_value(metadata), merge=False)

    def load_source_sync_metadata(self, user_id: Optional[str] = None) -> dict:
        snapshot = self._user(user_id).collection("source_sync").document("current").get()
        return snapshot.to_dict() if snapshot.exists else {"channels": [], "updated_at": None}

    def _delete_document_tree(self, ref):
        for collection in ref.collections():
            for child in collection.stream():
                self._delete_document_tree(child.reference)
        ref.delete()
