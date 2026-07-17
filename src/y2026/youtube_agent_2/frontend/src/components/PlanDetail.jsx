import React, { useState } from 'react'
import AddCourseModal from './AddCourseModal'
import AiCourseModal from './AiCourseModal'

export default function PlanDetail({ plan, onUpdate, onDelete }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [expandedModules, setExpandedModules] = useState({})
  const [activeVideo, setActiveVideo] = useState(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedVideoIds, setSelectedVideoIds] = useState([])

  // Build tab list: Overview + each course
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(plan.courses || []).map(c => ({ id: c.id, label: c.title }))
  ]
  const [activeTab, setActiveTab] = useState('overview')

  const activeCourse = plan.courses?.find(c => c.id === activeCourseId) || null
  const normalizedCourseSearch = courseSearch.trim().toLowerCase()
  const visibleModules = activeCourse?.modules
    ?.map(module => {
      const moduleMatches = module.title?.toLowerCase().includes(normalizedCourseSearch)
      const matchingVideos = module.videos?.filter(video =>
        video.title?.toLowerCase().includes(normalizedCourseSearch)
      ) || []

      return moduleMatches ? module : { ...module, videos: matchingVideos }
    })
    .filter(module => !normalizedCourseSearch || module.videos?.length > 0) || []

  function handleCourseCreated(updatedPlan) {
    onUpdate(updatedPlan)
  }

  function toggleWatched(videoId) {
    const updated = {
      ...plan,
      courses: plan.courses.map(c => ({
        ...c,
        modules: c.modules.map(m => ({
          ...m,
          videos: m.videos.map(v =>
            v.video_id === videoId ? { ...v, watched: !v.watched } : v
          )
        }))
      }))
    }
    onUpdate(updated)
    if (activeVideo?.video_id === videoId) {
      const updatedV = updated.courses
        .flatMap(c => c.modules)
        .flatMap(m => m.videos)
        .find(v => v.video_id === videoId)
      if (updatedV) setActiveVideo(updatedV)
    }
  }

  function toggleModule(moduleId) {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  function toggleVideoSelection(videoId) {
    setSelectedVideoIds(previous =>
      previous.includes(videoId)
        ? previous.filter(id => id !== videoId)
        : [...previous, videoId]
    )
  }

  function applyBulkVideoUpdate(changes) {
    if (selectedVideoIds.length === 0) return
    const selectedIds = new Set(selectedVideoIds)
    const updated = {
      ...plan,
      courses: plan.courses.map(course => ({
        ...course,
        modules: course.modules.map(module => ({
          ...module,
          videos: module.videos.map(video =>
            selectedIds.has(video.video_id) ? { ...video, ...changes } : video
          )
        }))
      }))
    }
    onUpdate(updated)
    if (activeVideo && selectedIds.has(activeVideo.video_id)) {
      setActiveVideo({ ...activeVideo, ...changes })
    }
    setSelectedVideoIds([])
  }

  function handleVideoSelect(video) {
    setActiveVideo(video)
    const course = plan.courses?.find(c =>
      c.modules?.some(m => m.videos?.some(v => v.video_id === video.video_id))
    )
    if (course) {
      setActiveTab(course.id)
      setActiveCourseId(course.id)
    }
  }

  function getYoutubeEmbedUrl(url) {
    if (!url) return null
    let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
    match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) return `https://www.youtube.com/embed/${url}?autoplay=1`
    return null
  }

  function formatDuration(secs) {
    if (!secs || secs <= 0) return ''
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const totalVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0), 0
  ) || 0

  const watchedVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0), 0
  ) || 0

  const embedUrl = activeVideo ? getYoutubeEmbedUrl(activeVideo.url || activeVideo.video_id) : null

  return (
    <div>
      {/* Tab bar: Overview + per-course tabs */}
      <div className="plan-tab-bar" style={{ overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`plan-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id !== 'overview') {
                setActiveCourseId(tab.id)
                setSelectedVideoIds([])
              } else {
                setActiveCourseId(null)
                setSelectedVideoIds([])
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="overview-layout">
          {/* Top 20%: Plan info */}
          <div className="overview-top">
            <div className="card" style={{ marginBottom: 0 }}>
              {plan.description && <p style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>}
            </div>
          </div>

          {/* Middle scrollable 70%: Courses + source channels */}
          <div className="overview-middle">
            {/* Course details list */}
            {plan.courses && plan.courses.length > 0 && (
              <div className="card">
                <h3>Courses ({plan.courses.length})</h3>
                {plan.courses.map(course => {
                  const courseVideos = course.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0) || 0
                  const courseWatched = course.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0) || 0
                  const initial = (course.title || '?').charAt(0).toUpperCase()
                  return (
                    <div
                      key={course.id}
                      className="course-tile"
                      onClick={() => {
                        setActiveTab(course.id)
                        setActiveCourseId(course.id)
                      }}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        marginBottom: '0.5rem',
                        background: 'var(--card-bg)',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {course.logo ? (
                        <img src={course.logo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div className="channel-avatar" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: '0.9rem' }}>{initial}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</h4>
                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-blue">{course.modules?.length || 0} modules</span>
                          <span className="badge badge-gray">{courseVideos} videos</span>
                          <span className="badge badge-green">{courseWatched} watched</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Source Channels */}
            {plan.channels && plan.channels.length > 0 && (
              <div className="card">
                <h3>Content Source</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {plan.channels.map(c => (
                    <span key={c.channel_id} className="badge badge-gray" style={{ padding: '0.4rem 0.8rem' }}>
                      {c.title} ({c.videos_count} videos)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!plan.courses || plan.courses.length === 0) && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <p>No courses yet. Use the action buttons below to add courses.</p>
              </div>
            )}
          </div>

          {/* Bottom 10%: Fixed action bar */}
          <div className="overview-bottom">
            <div className="action-bar" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Course Manually
              </button>
              <button className="btn btn-warning" onClick={() => setShowAiModal(true)}>
                ✨ AI Suggested Course Creation
              </button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete Plan
              </button>
              {showDeleteConfirm && (
                <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                    <h3>Delete Learning Plan</h3>
                    <p>Are you sure you want to delete "<strong>{plan.name}</strong>"? This action cannot be undone.</p>
                    <div className="confirm-actions">
                      <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="btn btn-danger" onClick={async () => {
                        if (await onDelete(plan.id)) setShowDeleteConfirm(false)
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PER-COURSE TABS */}
      {activeTab !== 'overview' && activeCourse && (
        <div className="course-layout">
          {/* Left panel: YouTube video player */}
          <div className="course-left">
            {embedUrl ? (
              <div className="video-player-container">
                <iframe
                  src={embedUrl}
                  title={activeVideo?.title || 'YouTube Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="video-player-info">
                  <h3>{activeVideo?.title}</h3>
                  <p>{activeVideo?.description || ''}</p>
                  <div className="video-player-actions">
                    <button
                      className={`btn btn-sm ${activeVideo?.watched ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => activeVideo && toggleWatched(activeVideo.video_id)}
                    >
                      {activeVideo?.watched ? '✓ Watched' : 'Mark as Watched'}
                    </button>
                    {activeVideo?.url && (
                      <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        Open in YouTube ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-video-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" />
                </svg>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select a Video</h3>
                <p>Expand a module and click a video to start watching.</p>
              </div>
            )}
          </div>

          {/* Right panel: Course modules with expandable videos */}
          <div className="course-right">
            <div className="course-module-search">
              <input
                type="search"
                value={courseSearch}
                onChange={event => setCourseSearch(event.target.value)}
                placeholder="Search modules or videos..."
                aria-label="Search modules or videos"
              />
            </div>
            {selectedVideoIds.length > 0 && (
              <div className="bulk-video-actions">
                <span>{selectedVideoIds.length} selected</span>
                <button className="btn btn-secondary btn-sm" onClick={() => applyBulkVideoUpdate({ bookmarked: true })}>
                  Bookmark
                </button>
                <button className="btn btn-success btn-sm" onClick={() => applyBulkVideoUpdate({ watched: true })}>
                  Mark complete
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => applyBulkVideoUpdate({ marked_for_delete: true })}>
                  Mark for delete
                </button>
              </div>
            )}
            {visibleModules.map(module => {
              const isExpanded = expandedModules[module.id] || Boolean(normalizedCourseSearch)
              return (
              <div key={module.id}>
                <div className="module-header" onClick={() => toggleModule(module.id)}>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                  <span>{module.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {module.videos?.length || 0}
                  </span>
                </div>
                {isExpanded && (
                  <div className="module-videos" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {module.videos?.map(video => (
                      <div
                        key={video.video_id}
                        className={`module-video-item ${activeVideo?.video_id === video.video_id ? 'active' : ''} ${video.marked_for_delete ? 'marked-for-delete' : ''}`}
                        onClick={() => handleVideoSelect(video)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(video.video_id)}
                          onClick={event => event.stopPropagation()}
                          onChange={() => toggleVideoSelection(video.video_id)}
                          aria-label={`Select ${video.title}`}
                          style={{ flexShrink: 0 }}
                        />
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="module-video-thumbnail" />
                        ) : (
                          <div className="module-video-thumbnail module-video-thumbnail-placeholder" />
                        )}
                        <div className="module-video-content">
                          <div className={video.watched ? 'watched' : ''}>{video.title}</div>
                          {video.description && <p>{video.description}</p>}
                          <div className="module-video-flags">
                            {video.bookmarked && <span>Bookmarked</span>}
                            {video.marked_for_delete && <span>Marked for deletion</span>}
                          </div>
                        </div>
                        {video.duration_secs > 0 && (
                          <span className="video-duration">{formatDuration(video.duration_secs)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
            {normalizedCourseSearch && visibleModules.length === 0 && (
              <p className="course-search-empty">No modules or videos match “{courseSearch}”.</p>
            )}
            {(!activeCourse.modules || activeCourse.modules.length === 0) && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No modules in this course.</p>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddCourseModal
          plan={plan}
          onClose={() => setShowAddModal(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}
      {showAiModal && (
        <AiCourseModal
          plan={plan}
          onClose={() => setShowAiModal(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}
    </div>
  )
}
