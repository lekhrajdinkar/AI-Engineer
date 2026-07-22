"""Firestore persistence for the learning platform.

The current API still uses a transitional default user. Step 3 will set the
verified Firebase Auth uid for each request before calling this repository.
"""
from __future__ import annotations

import json
from typing import Optional

from src.y2026.youtube_agent_2.backend.shared.platform import settings
from src.y2026.youtube_agent_2.backend.shared.platform.firebase import firestore_client


AI_INPUT_VIDEO_CHUNK_SIZE = 100


def _json_value(value):
    """Firestore accepts native JSON-like values; stringify datetime objects."""
    return json.loads(json.dumps(value, default=str))


class FirestoreStore:
    def __init__(self):
        self.client = firestore_client()

    def _user(self, user_id: Optional[str] = None):
        return self.client.collection("users").document(
            user_id or settings.FIREBASE_DEFAULT_USER_ID
        )

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

    def update_plan_fields(self, plan_id: str, fields: dict, user_id: Optional[str] = None) -> bool:
        """Update plan metadata without rewriting its course hierarchy."""
        plan_ref = self._user(user_id).collection("plans").document(plan_id)
        if not plan_ref.get().exists:
            return False
        plan_ref.update(_json_value(fields))
        return True

    def update_course_fields(self, plan_id: str, course_id: str, fields: dict, user_id: Optional[str] = None) -> bool:
        """Update one course and its parent timestamp in one Firestore batch."""
        plan_ref = self._user(user_id).collection("plans").document(plan_id)
        course_ref = plan_ref.collection("courses").document(course_id)
        if not plan_ref.get().exists or not course_ref.get().exists:
            return False
        updated_at = fields.get("updated_at")
        batch = self.client.batch()
        batch.update(course_ref, _json_value(fields))
        if updated_at is not None:
            batch.update(plan_ref, {"updated_at": updated_at})
        batch.commit()
        return True

    def update_module_fields(self, plan_id: str, course_id: str, module_id: str, fields: dict, user_id: Optional[str] = None) -> bool:
        """Update one module and parent timestamps without rewriting videos."""
        plan_ref = self._user(user_id).collection("plans").document(plan_id)
        course_ref = plan_ref.collection("courses").document(course_id)
        module_ref = course_ref.collection("modules").document(module_id)
        if not plan_ref.get().exists or not course_ref.get().exists or not module_ref.get().exists:
            return False
        fields = dict(fields)
        updated_at = fields.pop("_updated_at", None)
        batch = self.client.batch()
        batch.update(module_ref, _json_value(fields))
        if updated_at is not None:
            batch.update(course_ref, {"updated_at": updated_at})
            batch.update(plan_ref, {"updated_at": updated_at})
        batch.commit()
        return True

    def update_video_fields(self, plan_id: str, course_id: str, module_id: str, video_id: str, fields: dict, user_id: Optional[str] = None) -> bool:
        """Update one video and parent timestamps without rewriting the plan."""
        plan_ref = self._user(user_id).collection("plans").document(plan_id)
        course_ref = plan_ref.collection("courses").document(course_id)
        module_ref = course_ref.collection("modules").document(module_id)
        video_ref = module_ref.collection("videos").document(video_id)
        if not plan_ref.get().exists or not course_ref.get().exists or not module_ref.get().exists or not video_ref.get().exists:
            return False
        fields = dict(fields)
        updated_at = fields.pop("_updated_at", None)
        course_fields = {
            key.removeprefix("_course_"): value
            for key, value in list(fields.items())
            if key.startswith("_course_")
        }
        for key in [key for key in fields if key.startswith("_course_")]:
            fields.pop(key)
        batch = self.client.batch()
        batch.update(video_ref, _json_value(fields))
        if updated_at is not None or course_fields:
            batch.update(course_ref, {**course_fields, **({"updated_at": updated_at} if updated_at is not None else {})})
        if updated_at is not None:
            batch.update(plan_ref, {"updated_at": updated_at})
        batch.commit()
        return True

    def list_plans(self, user_id: Optional[str] = None) -> list[dict]:
        plans = [self.load_plan(snapshot.id, user_id) for snapshot in self._user(user_id).collection("plans").stream()]
        return sorted((plan for plan in plans if plan), key=lambda plan: str(plan.get("updated_at") or ""), reverse=True)

    def delete_plan(self, plan_id: str, user_id: Optional[str] = None) -> bool:
        ref = self._user(user_id).collection("plans").document(plan_id)
        if not ref.get().exists:
            return False
        self._delete_document_tree(ref)
        return True

    def save_source_sync_metadata(self, metadata: dict, user_id: Optional[str] = None):
        # Source metadata is normally much smaller than plans. Large staged feeds
        # are already moved to course.new_video_feeds before they become sizeable.
        self._user(user_id).collection("source_sync").document("current").set(_json_value(metadata), merge=False)

    def load_source_sync_metadata(self, user_id: Optional[str] = None) -> dict:
        snapshot = self._user(user_id).collection("source_sync").document("current").get()
        return snapshot.to_dict() if snapshot.exists else {"channels": [], "updated_at": None}

    def _ai_request(self, request_id: str, user_id: Optional[str] = None):
        return self._user(user_id).collection("ai_course_requests").document(request_id)

    def create_ai_course_request(
        self,
        request: dict,
        details: dict,
        batches: list,
        user_id: Optional[str] = None,
    ):
        """Create the durable job snapshot before the API acknowledges it."""
        request_ref = self._ai_request(request["id"], user_id)
        detail_data = {key: value for key, value in details.items() if key != "videos"}
        write_batch = self.client.batch()
        write_batch.set(request_ref, _json_value(request), merge=False)
        write_batch.set(
            request_ref.collection("details").document("captured"),
            _json_value(detail_data),
            merge=False,
        )
        videos = details.get("videos", [])
        for start in range(0, len(videos), AI_INPUT_VIDEO_CHUNK_SIZE):
            chunk_number = start // AI_INPUT_VIDEO_CHUNK_SIZE
            write_batch.set(
                request_ref.collection("input_video_chunks").document(
                    f"{chunk_number:05d}"
                ),
                _json_value({"number": chunk_number, "videos": videos[start:start + AI_INPUT_VIDEO_CHUNK_SIZE]}),
                merge=False,
            )
        for item in batches:
            write_batch.set(
                request_ref.collection("batches").document(item["id"]),
                _json_value(item),
                merge=False,
            )
        write_batch.commit()

    def save_ai_course_request(self, request: dict, user_id: Optional[str] = None):
        self._ai_request(request["id"], user_id).set(
            _json_value(request), merge=False
        )

    def load_ai_course_request(
        self, request_id: str, user_id: Optional[str] = None
    ) -> Optional[dict]:
        snapshot = self._ai_request(request_id, user_id).get()
        return snapshot.to_dict() if snapshot.exists else None

    def list_ai_course_requests(
        self, plan_id: str, user_id: Optional[str] = None
    ) -> list[dict]:
        collection = self._user(user_id).collection("ai_course_requests")
        requests = [
            snapshot.to_dict()
            for snapshot in collection.where("plan_id", "==", plan_id).stream()
        ]
        return sorted(
            requests,
            key=lambda request: (
                str(request.get("created_at") or ""),
                request.get("id", ""),
            ),
            reverse=True,
        )

    def save_ai_course_request_details(
        self, details: dict, user_id: Optional[str] = None
    ):
        request_ref = self._ai_request(details["request_id"], user_id)
        detail_data = {key: value for key, value in details.items() if key != "videos"}
        request_ref.collection("details").document("captured").set(
            _json_value(detail_data), merge=False
        )
        videos = details.get("videos", [])
        expected_chunks = set()
        for start in range(0, len(videos), AI_INPUT_VIDEO_CHUNK_SIZE):
            chunk_number = start // AI_INPUT_VIDEO_CHUNK_SIZE
            chunk_id = f"{chunk_number:05d}"
            expected_chunks.add(chunk_id)
            request_ref.collection("input_video_chunks").document(chunk_id).set(
                _json_value(
                    {
                        "number": chunk_number,
                        "videos": videos[start:start + AI_INPUT_VIDEO_CHUNK_SIZE],
                    }
                ),
                merge=False,
            )
        for existing in request_ref.collection("input_video_chunks").stream():
            if existing.id not in expected_chunks:
                existing.reference.delete()

    def load_ai_course_request_details(
        self, request_id: str, user_id: Optional[str] = None
    ) -> Optional[dict]:
        request_ref = self._ai_request(request_id, user_id)
        snapshot = request_ref.collection("details").document("captured").get()
        if not snapshot.exists:
            return None
        details = snapshot.to_dict()
        chunks = [
            chunk.to_dict()
            for chunk in request_ref.collection("input_video_chunks").stream()
        ]
        chunks.sort(key=lambda chunk: chunk.get("number", 0))
        details["videos"] = [
            video for chunk in chunks for video in chunk.get("videos", [])
        ]
        return details

    def save_ai_course_batch(self, batch: dict, user_id: Optional[str] = None):
        self._ai_request(batch["request_id"], user_id).collection("batches").document(
            batch["id"]
        ).set(_json_value(batch), merge=False)

    def list_ai_course_batches(
        self, request_id: str, user_id: Optional[str] = None
    ) -> list[dict]:
        rows = [
            snapshot.to_dict()
            for snapshot in self._ai_request(request_id, user_id)
            .collection("batches")
            .stream()
        ]
        return sorted(rows, key=lambda row: (row.get("number", 0), row.get("id", "")))

    def save_ai_course_attempt(self, attempt: dict, user_id: Optional[str] = None):
        self._ai_request(attempt["request_id"], user_id).collection("attempts").document(
            attempt["id"]
        ).set(_json_value(attempt), merge=False)

    def list_ai_course_attempts(
        self, request_id: str, user_id: Optional[str] = None
    ) -> list[dict]:
        rows = [
            snapshot.to_dict()
            for snapshot in self._ai_request(request_id, user_id)
            .collection("attempts")
            .stream()
        ]
        return sorted(rows, key=lambda row: (row.get("number", 0), row.get("id", "")))

    def _ai_model_configs(self):
        return self.client.collection("ai_model_configs")

    def ensure_default_ai_model_config(self, default_config: dict):
        collection = self._ai_model_configs()
        if next(collection.limit(1).stream(), None) is None:
            collection.document(default_config["id"]).set(
                _json_value(default_config), merge=False
            )

    def save_ai_model_config(self, config: dict):
        self._ai_model_configs().document(config["id"]).set(
            _json_value(config), merge=False
        )

    def load_ai_model_config(
        self, config_id: str, *, include_deleted: bool = False
    ) -> Optional[dict]:
        snapshot = self._ai_model_configs().document(config_id).get()
        if not snapshot.exists:
            return None
        config = snapshot.to_dict()
        if config.get("deleted_at") and not include_deleted:
            return None
        return config

    def list_ai_model_configs(self, *, include_deleted: bool = False) -> list[dict]:
        configs = [snapshot.to_dict() for snapshot in self._ai_model_configs().stream()]
        if not include_deleted:
            configs = [config for config in configs if not config.get("deleted_at")]
        return sorted(
            configs,
            key=lambda config: (
                not config.get("is_default", False),
                config.get("provider", ""),
                config.get("name", ""),
                config.get("id", ""),
            ),
        )

    def delete_ai_model_config(self, config_id: str) -> bool:
        ref = self._ai_model_configs().document(config_id)
        if not ref.get().exists:
            return False
        ref.delete()
        return True

    def is_ai_model_config_referenced(self, config_id: str) -> bool:
        query = self.client.collection_group("ai_course_requests").where(
            "model_config_id", "==", config_id
        ).limit(1)
        return next(query.stream(), None) is not None

    def _delete_document_tree(self, ref):
        for collection in ref.collections():
            for child in collection.stream():
                self._delete_document_tree(child.reference)
        ref.delete()
