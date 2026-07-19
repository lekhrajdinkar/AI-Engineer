from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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

class AiCourseRequest(BaseModel):
    videos: List[Video]
    source_channels: List[Channel] = Field(default_factory=list)
