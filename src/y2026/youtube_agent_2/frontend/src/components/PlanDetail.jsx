import React, { useState } from 'react'
import AddCourseModal from './AddCourseModal'
import AiCourseModal from './AiCourseModal'

export default function PlanDetail({ plan, onUpdate, onDelete }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)

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
  }

  const totalVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0), 0
  ) || 0

  const watchedVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0), 0
  ) || 0

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>{plan.name}</h2>
            {plan.description && <p style={{ color: '#64748b', marginTop: '0.3rem' }}>{plan.description}</p>}
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{plan.channels?.length || 0} channels</span>
              <span className="badge badge-green">{plan.courses?.length || 0} courses</span>
              <span className="badge badge-blue">{totalVideos} videos</span>
              <span className="badge badge-green">{watchedVideos} watched</span>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(plan.id)}>Delete Plan</button>
        </div>
      </div>

      {/* Action bar */}
      <div className="action-bar">
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Course Manually
        </button>
        <button className="btn btn-warning" onClick={() => setShowAiModal(true)}>
          ✨ AI Suggested Course Creation
        </button>
      </div>

      {plan.channels && plan.channels.length > 0 && (
        <div className="card">
          <h3>Source Channels</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {plan.channels.map(c => (
              <span key={c.channel_id} className="badge badge-gray" style={{ padding: '0.4rem 0.8rem' }}>
                {c.title} ({c.videos_count} videos)
              </span>
            ))}
          </div>
        </div>
      )}

      {plan.courses && plan.courses.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Courses ({plan.courses.length})</h3>
          {plan.courses.map(course => (
            <div className="card" key={course.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{course.title}</h3>
                  {course.description && <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem' }}>{course.description}</p>}
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>{course.modules?.length || 0} modules</p>
                </div>
              </div>

              {course.modules?.map(module => (
                <div className="module-card" key={module.id}>
                  <h4>{module.title} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem' }}>— {module.videos?.length || 0} videos</span></h4>
                  {module.videos?.map(video => (
                    <div className="video-row" key={video.video_id}>
                      <input type="checkbox" checked={!!video.watched} onChange={() => toggleWatched(video.video_id)} />
                      <span className={video.watched ? 'watched' : ''}>
                        {video.title}
                      </span>
                      {video.duration_secs > 0 && (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: 'auto' }}>
                          {Math.floor(video.duration_secs / 60)}:{String(video.duration_secs % 60).padStart(2, '0')}
                        </span>
                      )}
                      {video.url && (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginLeft: '0.5rem' }}>
                          Watch
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {(!plan.courses || plan.courses.length === 0) && (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
          <p>No courses yet. Click <strong>+ Add Course Manually</strong> to build from your YouTube channels, or <strong>AI Suggested Course Creation</strong> to auto-generate.</p>
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