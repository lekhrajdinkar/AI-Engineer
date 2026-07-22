from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Any, List, Literal, Optional
import uuid
from datetime import datetime, timezone

#=====================================
# Plans service domain models and HTTP DTOs
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
    published_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    category_id: Optional[str] = None
    caption_available: bool = False
    embeddable: bool = True
    view_count: int = 0
    like_count: int = 0
    recording_date: Optional[datetime] = None
    watched: bool = False
    labels: List[str] = Field(default_factory=list)
    last_played_position_secs: Optional[float] = None
    last_played_at: Optional[datetime] = None

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    labels: List[str] = Field(default_factory=list)
    videos: List[Video] = Field(default_factory=list)

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    playlist_id: Optional[str] = None
    title: str
    thumbnail: str = ""
    videos_count: int = 0
    source_created_at: Optional[datetime] = None
    last_video_published_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    last_feed_checked_at: Optional[datetime] = None

class Channel(BaseModel):
    channel_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    video_count: int = 1
    videos_count: int = 0
    thumbnail: str = ""
    source_created_at: Optional[datetime] = None
    last_video_published_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    last_feed_checked_at: Optional[datetime] = None
    playlists: List[Playlist] = Field(default_factory=list)

class NewVideoFeed(BaseModel):
    channel_id: str
    playlist_id: Optional[str] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    videos: List[Video] = Field(default_factory=list)

class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    sequence: int = 1
    description: Optional[str] = None
    logo_url: str = ""
    icon_key: str = ""
    labels: List[str] = Field(default_factory=list)
    last_played_video_id: Optional[str] = None
    last_played_position_secs: Optional[float] = None
    last_played_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modules: List[Module] = Field(default_factory=list)
    source_channels: List[Channel]
    new_video_feeds: List[NewVideoFeed] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LearningPlan(BaseModel):
    logo_url: str = ""
    icon_key: str = ""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    courses: List[Course] = Field(default_factory=list)
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

class PlaybackUpdateRequest(BaseModel):
    position_secs: float = Field(ge=0)

class MetadataUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    icon_key: Optional[str] = None
    last_played_video_id: Optional[str] = None
    last_played_position_secs: Optional[float] = Field(default=None, ge=0)
    last_played_at: Optional[datetime] = None

class AiCourseVideo(Video):
    """Video metadata plus selection provenance used only by the AI workflow."""

    channel_id: Optional[str] = None
    playlist_id: Optional[str] = None


AiCourseRequestStatus = Literal[
    "queued",
    "running",
    "waiting_for_rate_limit",
    "completed",
    "failed",
    "cancelled",
]
AiCourseWorkStatus = Literal[
    "queued",
    "running",
    "waiting_for_rate_limit",
    "completed",
    "failed",
    "cancelled",
]


class AiCourseProcessingOptions(BaseModel):
    mode: Literal["batch", "whole"] = "batch"
    batch_size: Optional[int] = Field(default=30, ge=1)

    @model_validator(mode="after")
    def validate_batch_size(self):
        if self.mode == "batch" and self.batch_size is None:
            raise ValueError("batch_size is required in batch mode")
        if self.mode == "whole":
            self.batch_size = None
        return self


class AiCourseOrganizationContext(BaseModel):
    mode: Literal["title_only", "title_tags", "full_metadata"] = "title_only"
    description_max_words: int = Field(default=200, ge=1, le=200)
    max_tags_per_video: int = Field(default=12, ge=1, le=20)


class AiCourseRequest(BaseModel):
    """Creation payload shared by the legacy endpoint and the future job API."""

    model_config_id: Optional[str] = None
    processing: AiCourseProcessingOptions = Field(
        default_factory=AiCourseProcessingOptions
    )
    organization_context: AiCourseOrganizationContext = Field(
        default_factory=AiCourseOrganizationContext
    )
    videos: List[AiCourseVideo] = Field(min_length=1)
    source_channels: List[Channel] = Field(default_factory=list)


class AiCourseRequestRecord(BaseModel):
    """Small parent record used by request lists and worker claiming."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    user_id: str
    status: AiCourseRequestStatus = "queued"
    model_config_id: str
    model_snapshot: dict[str, Any]
    processing_mode: Literal["batch", "whole"] = "batch"
    requested_batch_size: Optional[int] = Field(default=None, ge=1)
    effective_batch_size: Optional[int] = Field(default=None, ge=1)
    organization_context: AiCourseOrganizationContext = Field(
        default_factory=AiCourseOrganizationContext
    )
    total_videos: int = Field(default=0, ge=0)
    processed_videos: int = Field(default=0, ge=0)
    total_batches: int = Field(default=0, ge=0)
    completed_batches: int = Field(default=0, ge=0)
    generation_mode: Optional[
        Literal["llm", "json_fallback", "deterministic_fallback"]
    ] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_course_ids: List[str] = Field(default_factory=list)
    retried_from_request_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    next_attempt_at: Optional[datetime] = None
    claimed_by: Optional[str] = None
    lease_expires_at: Optional[datetime] = None


class AiCourseRequestDetails(BaseModel):
    """Large immutable input snapshot stored separately from the parent record."""

    request_id: str
    request_options: dict[str, Any] = Field(default_factory=dict)
    selected_sources: List[Channel] = Field(default_factory=list)
    videos: List[AiCourseVideo] = Field(default_factory=list)
    completion_summary: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AiCourseBatchRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    number: int = Field(ge=1)
    status: AiCourseWorkStatus = "queued"
    video_ids: List[str] = Field(default_factory=list)
    video_count: int = Field(default=0, ge=0)
    model: str = ""
    estimated_input_tokens: Optional[int] = Field(default=None, ge=0)
    estimated_output_tokens: Optional[int] = Field(default=None, ge=0)
    result: dict[str, Any] = Field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    duration_secs: Optional[float] = Field(default=None, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    next_attempt_at: Optional[datetime] = None


class AiCourseAttemptRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    batch_id: Optional[str] = None
    number: int = Field(ge=1)
    event: str
    status: AiCourseWorkStatus
    provider: Optional[str] = None
    model: Optional[str] = None
    input_tokens: Optional[int] = Field(default=None, ge=0)
    output_tokens: Optional[int] = Field(default=None, ge=0)
    rate_limit: dict[str, Any] = Field(default_factory=dict)
    provider_message: Optional[str] = None
    retry_at: Optional[datetime] = None
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


AiModelProvider = Literal["groq", "google", "openai"]
AiStructuredOutputMode = Literal[
    "auto", "json_schema", "json_mode", "function_calling"
]


class AiModelConfigFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    provider: AiModelProvider
    model: str = Field(min_length=1, max_length=200)
    enabled: bool = True
    is_default: bool = False
    temperature: float = Field(default=0, ge=0, le=2)
    structured_output_mode: AiStructuredOutputMode = "auto"
    max_input_tokens: int = Field(default=8000, ge=256)
    default_batch_size: int = Field(default=30, ge=1)
    max_batch_size: int = Field(default=50, ge=1)
    max_whole_videos: int = Field(default=30, ge=1)
    fallback_model_config_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_capacity(self):
        if self.default_batch_size > self.max_batch_size:
            raise ValueError("default_batch_size must not exceed max_batch_size")
        if self.is_default and not self.enabled:
            raise ValueError("the default model configuration must be enabled")
        return self


class AiModelConfigCreate(AiModelConfigFields):
    pass


class AiModelConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    provider: Optional[AiModelProvider] = None
    model: Optional[str] = Field(default=None, min_length=1, max_length=200)
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    structured_output_mode: Optional[AiStructuredOutputMode] = None
    max_input_tokens: Optional[int] = Field(default=None, ge=256)
    default_batch_size: Optional[int] = Field(default=None, ge=1)
    max_batch_size: Optional[int] = Field(default=None, ge=1)
    max_whole_videos: Optional[int] = Field(default=None, ge=1)
    fallback_model_config_id: Optional[str] = None

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("at least one model configuration field is required")
        return self


class AiModelConfigRecord(AiModelConfigFields):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    credential_status: Literal["configured", "missing"] = "missing"
    test_status: Literal["untested", "passed", "failed"] = "untested"
    test_message: Optional[str] = None
    last_tested_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
