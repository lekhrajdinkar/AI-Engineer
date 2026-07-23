"""Persistent AI course worker with leased queue claims and batch checkpoints."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import logging
import os
import re
import signal
import threading
import time
from typing import Callable
import uuid

from fastapi import HTTPException

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.api.ai import (
    _build_course_graph,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiCourseAttemptRecord,
    AiCourseBatchRecord,
    AiCourseRequest,
    AiCourseRequestDetails,
    AiCourseRequestRecord,
    Course,
    LearningPlan,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.domain.ai_capacity import (
    capacity_safe_batches,
    estimate_tokens,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import (
    store,
)
from src.y2026.youtube_agent_2.backend.shared.platform import identity


logger = logging.getLogger(__name__)
BatchProcessor = Callable[
    [AiCourseRequestRecord, AiCourseRequestDetails, AiCourseBatchRecord, LearningPlan],
    dict,
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _default_batch_processor(
    parent: AiCourseRequestRecord,
    details: AiCourseRequestDetails,
    batch: AiCourseBatchRecord,
    plan: LearningPlan,
) -> dict:
    video_by_id = {video.video_id: video for video in details.videos}
    request = AiCourseRequest(
        model_config_id=parent.model_config_id,
        processing={
            "mode": parent.processing_mode,
            "batch_size": parent.requested_batch_size,
        },
        organization_context=parent.organization_context,
        videos=[video_by_id[video_id] for video_id in batch.video_ids],
        source_channels=details.selected_sources,
    )
    result = _build_course_graph().invoke(
        {
            "plan": plan,
            "request": request,
            "model_snapshot": parent.model_snapshot,
        }
    )
    return {
        "courses": [course.model_dump() for course in result["courses"]],
        "generation_mode": result.get("generation_mode", "llm"),
    }


class AiCourseWorker:
    def __init__(
        self,
        *,
        worker_id: str | None = None,
        lease_seconds: int | None = None,
        poll_interval_seconds: float | None = None,
        batch_processor: BatchProcessor | None = None,
    ):
        self.worker_id = worker_id or (
            f"{os.getenv('HOSTNAME') or 'local'}-{os.getpid()}-{uuid.uuid4().hex[:8]}"
        )
        self.lease_seconds = lease_seconds or config.AI_WORKER_LEASE_SECS
        self.poll_interval_seconds = (
            poll_interval_seconds
            if poll_interval_seconds is not None
            else config.AI_WORKER_POLL_INTERVAL_SECS
        )
        self.batch_processor = batch_processor or _default_batch_processor

    def run_once(self) -> bool:
        claimed_row = store.claim_next_ai_course_request(
            self.worker_id, self.lease_seconds
        )
        if not claimed_row:
            return False
        parent = AiCourseRequestRecord.model_validate(claimed_row)
        context_token = identity.set_current_user(parent.user_id)
        try:
            self._process(parent)
        finally:
            identity.reset_current_user(context_token)
        return True

    def run_forever(self, stop_event: threading.Event | None = None) -> None:
        stop_event = stop_event or threading.Event()
        logger.info("AI course worker %s started", self.worker_id)
        while not stop_event.is_set():
            worked = self.run_once()
            if not worked:
                stop_event.wait(self.poll_interval_seconds)
        logger.info("AI course worker %s stopped", self.worker_id)

    def _load_parent(self, parent: AiCourseRequestRecord) -> AiCourseRequestRecord | None:
        row = store.load_ai_course_request(parent.id, parent.user_id)
        return AiCourseRequestRecord.model_validate(row) if row else None

    def _append_attempt(
        self,
        parent: AiCourseRequestRecord,
        event: str,
        status: str,
        *,
        batch_id: str | None = None,
        provider_message: str | None = None,
    ) -> None:
        attempts = store.list_ai_course_attempts(parent.id, parent.user_id)
        number = max((row.get("number", 0) for row in attempts), default=0) + 1
        store.save_ai_course_attempt(
            AiCourseAttemptRecord(
                request_id=parent.id,
                batch_id=batch_id,
                number=number,
                event=event,
                status=status,
                provider=parent.model_snapshot.get("provider"),
                model=parent.model_snapshot.get("model"),
                provider_message=provider_message,
                at=_utcnow(),
            ).model_dump(),
            parent.user_id,
        )

    @staticmethod
    def _is_rate_limit_error(error: Exception) -> bool:
        value = str(error).lower()
        return type(error).__name__ == "RateLimitError" or "rate_limit" in value or "429" in value

    @staticmethod
    def _retry_after_seconds(error: Exception) -> int:
        response = getattr(error, "response", None)
        headers = getattr(response, "headers", {}) or {}
        value = headers.get("retry-after") or headers.get("Retry-After")
        try:
            seconds = int(float(value)) if value is not None else 0
        except (TypeError, ValueError):
            seconds = 0
        if not seconds:
            match = re.search(r"(?:retry|try again)\D{0,20}(\d+)\s*s", str(error), re.I)
            seconds = int(match.group(1)) if match else config.AI_RATE_LIMIT_DEFAULT_WAIT_SECS
        return min(max(seconds, 1), config.AI_RATE_LIMIT_MAX_WAIT_SECS)

    def _wait_for_rate_limit(
        self,
        parent: AiCourseRequestRecord,
        batch: AiCourseBatchRecord,
        error: Exception,
    ) -> None:
        seconds = self._retry_after_seconds(error)
        retry_at = _utcnow() + timedelta(seconds=seconds)
        batch.status = "waiting_for_rate_limit"
        batch.next_attempt_at = retry_at
        batch.updated_at = _utcnow()
        store.save_ai_course_batch(batch.model_dump(), parent.user_id)
        parent.status = "waiting_for_rate_limit"
        parent.next_attempt_at = retry_at
        parent.updated_at = batch.updated_at
        parent.claimed_by = None
        parent.lease_expires_at = None
        store.save_ai_course_request(parent.model_dump())
        self._append_attempt(
            parent,
            f"Provider rate limit reached; resume in {seconds} seconds",
            "waiting_for_rate_limit",
            batch_id=batch.id,
        )

    def _ensure_batches(
        self,
        parent: AiCourseRequestRecord,
        details: AiCourseRequestDetails,
    ) -> list[AiCourseBatchRecord]:
        requested_size = (
            parent.requested_batch_size
            if parent.processing_mode == "batch"
            else len(details.videos)
        ) or len(details.videos)
        video_groups = (
            capacity_safe_batches(
                details.videos,
                parent.organization_context,
                parent.model_snapshot,
                requested_size,
            )
            if parent.processing_mode == "batch"
            else [details.videos]
        )
        existing = {
            row["number"]: AiCourseBatchRecord.model_validate(row)
            for row in store.list_ai_course_batches(parent.id, parent.user_id)
        }
        expected: list[AiCourseBatchRecord] = []
        for number, group in enumerate(video_groups, start=1):
            batch = existing.get(number) or AiCourseBatchRecord(
                id=f"{parent.id}:batch:{number}",
                request_id=parent.id,
                number=number,
                video_ids=[
                    video.video_id for video in group
                ],
                video_count=len(group),
                model=parent.model_snapshot.get("model", ""),
                estimated_input_tokens=estimate_tokens(
                    group, parent.organization_context
                ),
            )
            if number not in existing:
                store.save_ai_course_batch(batch.model_dump(), parent.user_id)
            expected.append(batch)
        parent.total_batches = len(expected)
        parent.effective_batch_size = max((len(group) for group in video_groups), default=0)
        parent.updated_at = _utcnow()
        store.save_ai_course_request(parent.model_dump())
        return expected

    def _process(self, parent: AiCourseRequestRecord) -> None:
        current_batch: AiCourseBatchRecord | None = None
        try:
            details_row = store.load_ai_course_request_details(
                parent.id, parent.user_id
            )
            if not details_row:
                raise RuntimeError("Captured AI request details are missing")
            details = AiCourseRequestDetails.model_validate(details_row)
            plan_row = store.load_plan(parent.plan_id)
            if not plan_row:
                raise RuntimeError("Learning plan no longer exists")
            plan = LearningPlan.model_validate(plan_row)
            self._append_attempt(parent, "Request claimed by worker", "running")
            batches = self._ensure_batches(parent, details)

            for batch in batches:
                current_batch = batch
                latest = self._load_parent(parent)
                if not latest or latest.status == "cancelled":
                    return
                parent = latest
                if batch.status == "completed":
                    continue
                if not store.renew_ai_course_request_lease(
                    parent.id,
                    self.worker_id,
                    self.lease_seconds,
                    parent.user_id,
                ):
                    logger.warning("Worker %s lost lease for %s", self.worker_id, parent.id)
                    return
                parent = self._load_parent(parent) or parent

                batch.status = "running"
                batch.started_at = batch.started_at or _utcnow()
                batch.updated_at = _utcnow()
                store.save_ai_course_batch(batch.model_dump(), parent.user_id)
                self._append_attempt(
                    parent,
                    f"Processing batch {batch.number}",
                    "running",
                    batch_id=batch.id,
                )
                started = time.monotonic()
                try:
                    result = self.batch_processor(parent, details, batch, plan)
                except Exception as error:
                    if self._is_rate_limit_error(error):
                        self._wait_for_rate_limit(parent, batch, error)
                        return
                    fallback_snapshot = parent.model_snapshot.get(
                        "fallback_model_snapshot"
                    )
                    if not fallback_snapshot:
                        raise
                    fallback_parent = parent.model_copy(deep=True)
                    fallback_parent.model_snapshot = fallback_snapshot
                    batch.model = fallback_snapshot.get("model", batch.model)
                    self._append_attempt(
                        parent,
                        f"Primary provider failed; trying fallback {batch.model}",
                        "running",
                        batch_id=batch.id,
                    )
                    result = self.batch_processor(
                        fallback_parent, details, batch, plan
                    )

                latest = self._load_parent(parent)
                if not latest or latest.status == "cancelled":
                    return
                parent = latest
                courses = [
                    Course.model_validate(course).model_dump()
                    for course in result.get("courses", [])
                ]
                if not courses:
                    raise RuntimeError("AI batch returned no courses")
                now = _utcnow()
                batch.status = "completed"
                batch.result = {
                    "courses": courses,
                    "generation_mode": result.get("generation_mode", "llm"),
                }
                batch.duration_secs = time.monotonic() - started
                batch.updated_at = now
                batch.completed_at = now
                store.save_ai_course_batch(batch.model_dump(), parent.user_id)

                completed = [
                    AiCourseBatchRecord.model_validate(row)
                    for row in store.list_ai_course_batches(parent.id, parent.user_id)
                    if row.get("status") == "completed"
                ]
                parent.completed_batches = len(completed)
                parent.processed_videos = sum(item.video_count for item in completed)
                parent.generation_mode = result.get("generation_mode", "llm")
                parent.updated_at = now
                store.save_ai_course_request(parent.model_dump())
                self._append_attempt(
                    parent,
                    f"Batch {batch.number} generated",
                    "completed",
                    batch_id=batch.id,
                )

            self._finalize(parent, details)
        except Exception as error:
            self._fail(parent, current_batch, error)

    def _finalize(
        self,
        parent: AiCourseRequestRecord,
        details: AiCourseRequestDetails,
    ) -> None:
        latest = self._load_parent(parent)
        if not latest or latest.status == "cancelled":
            return
        parent = latest
        batches = [
            AiCourseBatchRecord.model_validate(row)
            for row in store.list_ai_course_batches(parent.id, parent.user_id)
        ]
        generated = [
            Course.model_validate(course)
            for batch in batches
            for course in batch.result.get("courses", [])
        ]
        if not generated:
            raise RuntimeError("No generated courses were available to save")
        generated = self._consolidate_generated_courses(parent, generated)
        if len(batches) > 1:
            self._append_attempt(
                parent,
                f"Consolidated {len(batches)} batch results into {len(generated)} course(s)",
                "completed",
            )
        plan_row = store.load_plan(parent.plan_id)
        if not plan_row:
            raise RuntimeError("Learning plan no longer exists")
        plan = LearningPlan.model_validate(plan_row)
        existing_ids = {course.id for course in plan.courses}
        next_sequence = len(plan.courses) + 1
        for course in generated:
            if course.id not in existing_ids:
                course.sequence = next_sequence
                next_sequence += 1
                plan.courses.append(course)
                existing_ids.add(course.id)

        latest = self._load_parent(parent)
        if not latest or latest.status == "cancelled":
            return
        now = _utcnow()
        plan.updated_at = now
        store.save_plan(plan.model_dump())
        parent = latest
        parent.status = "completed"
        parent.processed_videos = parent.total_videos
        parent.completed_batches = parent.total_batches
        parent.created_course_ids = [course.id for course in generated]
        parent.generation_mode = (
            "deterministic_fallback"
            if any(
                batch.result.get("generation_mode") == "deterministic_fallback"
                for batch in batches
            )
            else "llm"
        )
        parent.updated_at = now
        parent.completed_at = now
        parent.claimed_by = None
        parent.lease_expires_at = None
        store.save_ai_course_request(parent.model_dump())
        details.completion_summary = {
            "courses_created": len(generated),
            "course_ids": parent.created_course_ids,
        }
        details.updated_at = now
        store.save_ai_course_request_details(details.model_dump(), parent.user_id)
        self._append_attempt(
            parent,
            f"{len(generated)} course(s) saved",
            "completed",
        )

    @staticmethod
    def _consolidate_generated_courses(
        parent: AiCourseRequestRecord,
        courses: list[Course],
    ) -> list[Course]:
        """Merge compact batch groups without resending captured metadata."""
        grouped: dict[str, list[Course]] = {}
        for course in courses:
            key = re.sub(r"[^a-z0-9]+", " ", course.title.lower()).strip()
            grouped.setdefault(key or course.id, []).append(course)
        consolidated: list[Course] = []
        for group_key, group in grouped.items():
            if len(group) == 1:
                consolidated.append(group[0])
                continue
            primary = group[0].model_copy(deep=True)
            primary.id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    f"{parent.id}:{group_key}:{','.join(sorted(item.id for item in group))}",
                )
            )
            module_by_title = {}
            source_by_id = {}
            for course in group:
                for source in course.source_channels:
                    source_by_id[source.channel_id] = source
                for module in course.modules:
                    module_key = re.sub(
                        r"[^a-z0-9]+", " ", module.title.lower()
                    ).strip() or module.id
                    if module_key not in module_by_title:
                        module_by_title[module_key] = module.model_copy(deep=True)
                    else:
                        existing_ids = {
                            video.video_id
                            for video in module_by_title[module_key].videos
                        }
                        module_by_title[module_key].videos.extend(
                            video.model_copy(deep=True)
                            for video in module.videos
                            if video.video_id not in existing_ids
                        )
            primary.modules = list(module_by_title.values())
            primary.source_channels = list(source_by_id.values())
            for module_index, module in enumerate(primary.modules, start=1):
                module.sequence = module_index
                for video_index, video in enumerate(module.videos, start=1):
                    video.sequence = video_index
            consolidated.append(primary)
        return consolidated

    def _fail(
        self,
        parent: AiCourseRequestRecord,
        batch: AiCourseBatchRecord | None,
        error: Exception,
    ) -> None:
        logger.exception("AI worker failed request %s", parent.id)
        latest = self._load_parent(parent)
        if not latest or latest.status == "cancelled":
            return
        now = _utcnow()
        safe_message = (
            str(error.detail)
            if isinstance(error, HTTPException) and isinstance(error.detail, str)
            else "AI course generation failed; review server logs and retry"
        )
        error_code = type(error).__name__.upper()
        if batch:
            stored_batches = {
                row["id"]: AiCourseBatchRecord.model_validate(row)
                for row in store.list_ai_course_batches(parent.id, parent.user_id)
            }
            failed_batch = stored_batches.get(batch.id, batch)
            if failed_batch.status != "completed":
                failed_batch.status = "failed"
                failed_batch.error_code = error_code
                failed_batch.error_message = safe_message
                failed_batch.updated_at = now
                failed_batch.completed_at = now
                store.save_ai_course_batch(failed_batch.model_dump(), parent.user_id)
        latest.status = "failed"
        latest.error_code = error_code
        latest.error_message = safe_message
        latest.updated_at = now
        latest.completed_at = now
        latest.claimed_by = None
        latest.lease_expires_at = None
        store.save_ai_course_request(latest.model_dump())
        self._append_attempt(
            latest,
            "Request failed",
            "failed",
            batch_id=batch.id if batch else None,
            provider_message=safe_message,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the persistent AI course worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process at most one available request and exit",
    )
    args = parser.parse_args()
    worker = AiCourseWorker()
    if args.once:
        worker.run_once()
        return

    stop_event = threading.Event()

    def stop(*_):
        stop_event.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    worker.run_forever(stop_event)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
