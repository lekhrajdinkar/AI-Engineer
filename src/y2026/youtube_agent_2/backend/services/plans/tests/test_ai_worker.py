import gc
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseOrganizationContext,
    AiCourseRequestDetails,
    AiCourseRequestRecord,
    AiCourseVideo,
    Course,
    LearningPlan,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.domain.ai_capacity import capacity_safe_batches
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store
from src.y2026.youtube_agent_2.backend.services.plans.app.worker import AiCourseWorker


class AiCourseWorkerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = config.DB_PATH
        self.original_firestore_store = store._firestore_store
        config.DB_PATH = Path(self.temp_dir.name) / "worker-test.sqlite3"
        store._firestore_store = None
        store.init_store()
        store.save_plan(LearningPlan(id="plan-1", name="Worker Plan").model_dump())

    def tearDown(self):
        store._firestore_store = self.original_firestore_store
        config.DB_PATH = self.original_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def _create_request(self, request_id="request-1", video_count=3):
        now = datetime.now(timezone.utc)
        videos = [
            AiCourseVideo(
                video_id=f"video-{index}",
                title=f"Lesson {index}",
                revised_title_from_ai=f"Lesson {index}",
                thumbnail="",
                channel_id="channel-1",
            )
            for index in range(video_count)
        ]
        parent = AiCourseRequestRecord(
            id=request_id,
            plan_id="plan-1",
            user_id="worker-user",
            model_config_id="model-test",
            model_snapshot={
                "id": "model-test",
                "name": "Test Model",
                "provider": "groq",
                "model": "test/model",
            },
            processing_mode="batch",
            requested_batch_size=2,
            total_videos=video_count,
            total_batches=2,
            created_at=now,
            updated_at=now,
        )
        details = AiCourseRequestDetails(
            request_id=request_id,
            request_options={"processing": {"mode": "batch", "batch_size": 2}},
            videos=videos,
            created_at=now,
            updated_at=now,
        )
        store.create_ai_course_request(parent.model_dump(), details.model_dump())
        return parent

    @staticmethod
    def _processor(parent, details, batch, plan):
        return {
            "courses": [
                Course(
                    id=f"course-{batch.number}",
                    title=f"Generated course {batch.number}",
                    source_channels=[],
                ).model_dump()
            ],
            "generation_mode": "llm",
        }

    def test_worker_checkpoints_batches_and_completes_request(self):
        parent = self._create_request()
        worker = AiCourseWorker(
            worker_id="worker-1",
            lease_seconds=60,
            batch_processor=self._processor,
        )

        self.assertTrue(worker.run_once())
        self.assertFalse(worker.run_once())

        completed = store.load_ai_course_request(parent.id, parent.user_id)
        self.assertEqual(completed["status"], "completed")
        self.assertEqual(completed["processed_videos"], 3)
        self.assertEqual(completed["completed_batches"], 2)
        self.assertIsNone(completed["claimed_by"])
        batches = store.list_ai_course_batches(parent.id, parent.user_id)
        self.assertEqual([batch["status"] for batch in batches], ["completed", "completed"])
        self.assertTrue(all(batch["result"]["courses"] for batch in batches))
        attempts = store.list_ai_course_attempts(parent.id, parent.user_id)
        self.assertEqual(attempts[0]["event"], "Request claimed by worker")
        self.assertEqual(attempts[-1]["status"], "completed")
        plan = store.load_plan(parent.plan_id)
        self.assertEqual([course["id"] for course in plan["courses"]], ["course-1", "course-2"])

    def test_expired_lease_is_recovered_by_another_worker(self):
        parent = self._create_request()
        first_claim = store.claim_next_ai_course_request("worker-1", 60)
        self.assertEqual(first_claim["id"], parent.id)
        self.assertIsNone(store.claim_next_ai_course_request("worker-2", 60))

        expired = AiCourseRequestRecord.model_validate(
            store.load_ai_course_request(parent.id, parent.user_id)
        )
        expired.lease_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        store.save_ai_course_request(expired.model_dump())

        recovered = store.claim_next_ai_course_request("worker-2", 60)
        self.assertEqual(recovered["id"], parent.id)
        self.assertEqual(recovered["claimed_by"], "worker-2")

    def test_cancellation_during_provider_call_discards_result(self):
        parent = self._create_request(video_count=1)

        def cancel_then_return(parent_record, details, batch, plan):
            current = AiCourseRequestRecord.model_validate(
                store.load_ai_course_request(parent_record.id, parent_record.user_id)
            )
            current.status = "cancelled"
            current.completed_at = datetime.now(timezone.utc)
            current.updated_at = current.completed_at
            current.claimed_by = None
            current.lease_expires_at = None
            store.save_ai_course_request(current.model_dump())
            return self._processor(parent_record, details, batch, plan)

        worker = AiCourseWorker(
            worker_id="worker-1",
            lease_seconds=60,
            batch_processor=cancel_then_return,
        )
        self.assertTrue(worker.run_once())

        cancelled = store.load_ai_course_request(parent.id, parent.user_id)
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(store.load_plan(parent.plan_id)["courses"], [])
        batch = store.list_ai_course_batches(parent.id, parent.user_id)[0]
        self.assertEqual(batch["result"], {})

    def test_capacity_budget_reduces_requested_batch_size(self):
        videos = [
            AiCourseVideo(
                video_id=f"long-{index}", title=f"Lesson {index}",
                revised_title_from_ai=f"Lesson {index}", thumbnail="",
                description=" ".join(["metadata"] * 200),
            )
            for index in range(8)
        ]
        batches = capacity_safe_batches(
            videos,
            AiCourseOrganizationContext(mode="full_metadata"),
            {"max_input_tokens": 1800},
            requested_maximum=8,
        )
        self.assertGreater(len(batches), 1)
        self.assertLess(max(map(len, batches)), 8)

    def test_rate_limit_moves_request_to_waiting_state(self):
        parent = self._create_request(video_count=1)

        class RateLimitError(Exception):
            response = type("Response", (), {"headers": {"retry-after": "12"}})()

        def rate_limited(*_):
            raise RateLimitError("429 rate_limit_exceeded")

        worker = AiCourseWorker(worker_id="worker-1", lease_seconds=60, batch_processor=rate_limited)
        self.assertTrue(worker.run_once())
        waiting = store.load_ai_course_request(parent.id, parent.user_id)
        self.assertEqual(waiting["status"], "waiting_for_rate_limit")
        self.assertIsNotNone(waiting["next_attempt_at"])
        self.assertIsNone(waiting["claimed_by"])
        self.assertEqual(
            store.list_ai_course_batches(parent.id, parent.user_id)[0]["status"],
            "waiting_for_rate_limit",
        )

    def test_multiple_batch_groups_are_consolidated(self):
        parent = self._create_request(video_count=3)

        def same_course(parent_record, details, batch, plan):
            return {
                "courses": [Course(id=f"batch-course-{batch.number}", title="Shared Learning Path", source_channels=[]).model_dump()],
                "generation_mode": "llm",
            }

        worker = AiCourseWorker(worker_id="worker-1", lease_seconds=60, batch_processor=same_course)
        self.assertTrue(worker.run_once())
        plan = store.load_plan(parent.plan_id)
        self.assertEqual(len(plan["courses"]), 1)
        attempts = store.list_ai_course_attempts(parent.id, parent.user_id)
        self.assertTrue(any("Consolidated" in attempt["event"] for attempt in attempts))


if __name__ == "__main__":
    unittest.main()
