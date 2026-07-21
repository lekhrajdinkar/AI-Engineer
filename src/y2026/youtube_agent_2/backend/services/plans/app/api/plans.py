"""HTTP routes for learning plans, courses, and workspace mutations."""

from fastapi import APIRouter

from src.y2026.youtube_agent_2.backend.services.plans.app.domain import plans as service
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    CourseDeleteRequest,
    Course,
    LabelsUpdateRequest,
    LearningPlan,
    MetadataUpdateRequest,
    PlaybackUpdateRequest,
    VideoReorderRequest,
)

router = APIRouter(tags=["plans"])


@router.post("/api/plans")
def create_plan(plan: LearningPlan):
    created = service.create_plan(plan)
    return {"plan_id": created.id, "plan": created}


@router.get("/api/plans")
def list_plans():
    return service.list_plans()


@router.get("/api/plans/{plan_id}")
def get_plan(plan_id: str):
    return service.get_plan(plan_id)


@router.patch("/api/plans/{plan_id}")
def update_plan_metadata(plan_id: str, request: MetadataUpdateRequest):
    return {"plan": service.update_plan_metadata(plan_id, request)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}", tags=["courses"])
def update_course_metadata(plan_id: str, course_id: str, request: MetadataUpdateRequest):
    return {"plan": service.update_course_metadata(plan_id, course_id, request)}


@router.delete("/api/plans/{plan_id}")
def delete_plan(plan_id: str):
    service.delete_plan(plan_id)
    return {"message": "Plan deleted"}


@router.delete("/api/courses/{plan_id}", tags=["courses"])
def delete_courses(plan_id: str, request: CourseDeleteRequest):
    return {"message": "Courses deleted", "plan": service.delete_courses(plan_id, request)}


@router.patch("/api/plans/{plan_id}/add-course-manually")
def add_course_manually(plan_id: str, course: Course):
    return {"message": "created course", "plan": service.add_manual_course(plan_id, course)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}/labels", tags=["labels"])
def update_course_labels(plan_id: str, course_id: str, request: LabelsUpdateRequest):
    return {"plan": service.update_course_labels(plan_id, course_id, request.labels)}


@router.patch("/api/plans/{plan_id}/labels", tags=["labels"])
def update_plan_labels(plan_id: str, request: LabelsUpdateRequest):
    return {"plan": service.update_plan_labels(plan_id, request.labels)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/labels", tags=["labels"])
def update_module_labels(plan_id: str, course_id: str, module_id: str, request: LabelsUpdateRequest):
    return {"plan": service.update_module_labels(plan_id, course_id, module_id, request.labels)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/labels", tags=["labels"])
def update_video_labels(plan_id: str, course_id: str, module_id: str, video_id: str, request: LabelsUpdateRequest):
    return {"plan": service.update_video_labels(plan_id, course_id, module_id, video_id, request.labels)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}/modules/{module_id}/videos/{video_id}/playback", tags=["videos"])
def update_video_playback(plan_id: str, course_id: str, module_id: str, video_id: str, request: PlaybackUpdateRequest):
    return {"plan": service.update_video_playback(plan_id, course_id, module_id, video_id, request)}


@router.patch("/api/plans/{plan_id}/courses/{course_id}/videos/reorder", tags=["courses"])
def reorder_course_videos(plan_id: str, course_id: str, request: VideoReorderRequest):
    return {"plan": service.reorder_course_videos(plan_id, course_id, request)}
