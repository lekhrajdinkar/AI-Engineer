import gc
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseAttemptRecord,
    AiCourseBatchRecord,
    AiCourseRequestDetails,
    AiCourseRequestRecord,
    AiCourseVideo,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store
from src.y2026.youtube_agent_2.backend.shared.platform import identity


class AiJobStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = config.DB_PATH
        self.original_firestore_store = store._firestore_store
        config.DB_PATH = Path(self.temp_dir.name) / "plans-test.sqlite3"
        store._firestore_store = None
        store.init_store()
        self.identity_token = identity.set_current_user("user-1")

    def tearDown(self):
        identity.reset_current_user(self.identity_token)
        store._firestore_store = self.original_firestore_store
        config.DB_PATH = self.original_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def _records(self):
        now = datetime.now(timezone.utc)
        request = AiCourseRequestRecord(
            id="request-1",
            plan_id="plan-1",
            user_id="user-1",
            model_config_id="model-groq",
            model_snapshot={
                "name": "Groq GPT-OSS",
                "provider": "groq",
                "model": "openai/gpt-oss-20b",
            },
            requested_batch_size=30,
            total_videos=1,
            total_batches=1,
            created_at=now,
            updated_at=now,
        )
        video = AiCourseVideo(
            video_id="video-1",
            title="LangGraph introduction",
            revised_title_from_ai="LangGraph introduction",
            thumbnail="",
            channel_id="channel-1",
            playlist_id="playlist-1",
        )
        details = AiCourseRequestDetails(
            request_id=request.id,
            request_options={"processing": {"mode": "batch", "batch_size": 30}},
            videos=[video],
            created_at=now,
            updated_at=now,
        )
        batch = AiCourseBatchRecord(
            id="batch-1",
            request_id=request.id,
            number=1,
            video_ids=[video.video_id],
            video_count=1,
            model="openai/gpt-oss-20b",
            created_at=now,
            updated_at=now,
        )
        return request, details, batch

    def test_initializes_separate_ai_job_tables(self):
        with sqlite3.connect(config.DB_PATH) as connection:
            table_names = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
            }

        self.assertTrue(
            {
                "ai_course_requests",
                "ai_course_request_details",
                "ai_course_batches",
                "ai_course_attempts",
            }.issubset(table_names)
        )

    def test_round_trips_parent_details_batches_and_attempts(self):
        request, details, batch = self._records()
        store.create_ai_course_request(
            request.model_dump(), details.model_dump(), [batch.model_dump()]
        )

        parent = store.load_ai_course_request(request.id)
        captured = store.load_ai_course_request_details(request.id)
        batches = store.list_ai_course_batches(request.id)

        self.assertEqual(parent["status"], "queued")
        self.assertNotIn("videos", parent)
        self.assertEqual(captured["videos"][0]["video_id"], "video-1")
        self.assertEqual(batches[0]["video_ids"], ["video-1"])
        self.assertEqual(store.list_ai_course_requests("plan-1")[0]["id"], request.id)
        self.assertIsNone(store.load_ai_course_request(request.id, "another-user"))

        request.status = "running"
        request.updated_at = datetime.now(timezone.utc)
        store.save_ai_course_request(request.model_dump())
        self.assertEqual(store.load_ai_course_request(request.id)["status"], "running")
        self.assertIsNotNone(store.load_ai_course_request_details(request.id))

        attempt = AiCourseAttemptRecord(
            id="attempt-1",
            request_id=request.id,
            batch_id=batch.id,
            number=1,
            event="Request claimed by worker",
            status="completed",
        )
        store.save_ai_course_attempt(attempt.model_dump())
        self.assertEqual(
            store.list_ai_course_attempts(request.id)[0]["event"],
            "Request claimed by worker",
        )

    def test_rejects_details_for_a_different_parent(self):
        request, details, _ = self._records()
        details.request_id = "request-2"

        with self.assertRaisesRegex(ValueError, "details must reference"):
            store.create_ai_course_request(request.model_dump(), details.model_dump())

        self.assertIsNone(store.load_ai_course_request(request.id))


if __name__ == "__main__":
    unittest.main()
