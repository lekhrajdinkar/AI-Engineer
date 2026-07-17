import React, { useState } from 'react'
import AddCourseModal from './AddCourseModal'
import AiCourseModal from './AiCourseModal'

export default function PlanDetail({ plan, onUpdate, onDelete }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [expandedModules, setExpandedModules] = useState({})
  const [activeVideo, setActiveVideo] = useState(null)

  // Build tab list: Overview + each course
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(plan.courses || []).map(c => ({ id: c.id, label: c.title }))
  ]
  const [activeTab, setActiveTab] = useState('overview')

  const activeCourse = plan.courses?.find(c => c.id === activeCourseId) || null

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

  function handleVideoSelect(video) {
    setActiveVideo(video)
    // Navigate to the course tab containing this video
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
              } else {
                setActiveCourseId(null)
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* Panel 1: Plan info + course details */}
          <div className="card">
            <h2 style={{ margin: 0 }}>{plan.name}</h2>
            {plan.description && <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{plan.description}</p>}
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{plan.channels?.length || 0} channels</span>
              <span className="badge badge-green">{plan.courses?.length || 0} courses</span>
              <span className="badge badge-blue">{totalVideos} videos</span>
              <span className="badge badge-green">{watchedVideos} watched</span>
            </div>
          </div>

          {/* Course details list */}
          {plan.courses && plan.courses.length > 0 && (
            <div className="card">
              <h3>Courses ({plan.courses.length})</h3>
              {plan.courses.map(course => {
                const courseVideos = course.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0) || 0
                const courseWatched = course.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0) || 0
                return (
                  <div key={course.id} style={{
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    marginBottom: '0.75rem',
                    background: 'var(--card-bg)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      {course.logo && (
                        <img src={course.logo} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>{course.title}</h4>
                        {course.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{course.description}</p>}
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-blue">{course.modules?.length || 0} modules</span>
                          <span className="badge badge-gray">{courseVideos} videos</span>
                          <span className="badge badge-green">{courseWatched} watched</span>
                        </div>
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

          {/* Panel 2: Action buttons at bottom */}
          <div className="action-bar" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Course Manually
            </button>
            <button className="btn btn-warning" onClick={() => setShowAiModal(true)}>
              ✨ AI Suggested Course Creation
            </button>
            <button className="btn btn-danger" onClick={() => onDelete(plan.id)}>
              Delete Plan
            </button>
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
            {activeCourse.modules?.map(module => (
              <div key={module.id}>
                <div className="module-header" onClick={() => toggleModule(module.id)}>
                  <span className={`expand-icon ${expandedModules[module.id] ? 'expanded' : ''}`}>▶</span>
                  <span>{module.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {module.videos?.length || 0}
                  </span>
                </div>
                {expandedModules[module.id] && (
                  <div className="module-videos" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {module.videos?.map(video => (
                      <div
                        key={video.video_id}
                        className={`module-video-item ${activeVideo?.video_id === video.video_id ? 'active' : ''}`}
                        onClick={() => handleVideoSelect(video)}
                      >
                        <input
                          type="checkbox"
                          checked={!!video.watched}
                          onChange={(e) => { e.stopPropagation(); toggleWatched(video.video_id) }}
                          style={{ flexShrink: 0 }}
                        />
                        <span className={video.watched ? 'watched' : ''} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {video.title}
                        </span>
                        {video.duration_secs > 0 && (
                          <span className="video-duration">{formatDuration(video.duration_secs)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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