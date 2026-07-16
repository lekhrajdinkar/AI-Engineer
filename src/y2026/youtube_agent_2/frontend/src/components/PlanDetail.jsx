import React, { useState } from 'react'
import { refreshPlan, aiSuggest } from '../api/client'

export default function PlanDetail({ plan, onUpdate, onDelete }) {
  const [loading, setLoading] = useState({ refresh: false, ai: false })
  const [message, setMessage] = useState('')
  const [editingCourse, setEditingCourse] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })

  async function handleRefresh() {
    setLoading(prev => ({ ...prev, refresh: true }))
    setMessage('')
    try {
      const result = await refreshPlan(plan.id)
      const updated = result.learning_plan || result
      onUpdate(updated)
      setMessage('Plan refreshed successfully!')
    } catch (err) {
      setMessage('Refresh failed: ' + err.message)
    }
    setLoading(prev => ({ ...prev, refresh: false }))
  }

  async function handleAiSuggest() {
    setLoading(prev => ({ ...prev, ai: true }))
    setMessage('')
    try {
      const result = await aiSuggest(plan.id)
      const updated = result.learning_plan || result
      onUpdate(updated)
      setMessage('AI suggestions applied!')
    } catch (err) {
      setMessage('AI suggest failed: ' + err.message)
    }
    setLoading(prev => ({ ...prev, ai: false }))
  }

  function startEditCourse(course) {
    setEditingCourse(course.id)
    setEditForm({ title: course.title, description: course.description })
  }

  function saveCourseEdit() {
    const updated = {
      ...plan,
      courses: plan.courses.map(c =>
        c.id === editingCourse
          ? { ...c, title: editForm.title, description: editForm.description }
          : c
      )
    }
    onUpdate(updated)
    setEditingCourse(null)
  }

  function deleteCourse(courseId) {
    const updated = { ...plan, courses: plan.courses.filter(c => c.id !== courseId) }
    onUpdate(updated)
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={loading.refresh}>
              {loading.refresh ? <><span className="spinner" /> Refreshing...</> : 'Refresh'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAiSuggest} disabled={loading.ai}>
              {loading.ai ? <><span className="spinner" /> Suggesting...</> : 'AI Suggest'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(plan.id)}>Delete</button>
          </div>
        </div>
        {message && <div className={`alert ${message.includes('failed') ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '0.75rem' }}>{message}</div>}
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
              {editingCourse === course.id ? (
                <div>
                  <div className="form-group">
                    <label>Course Title</label>
                    <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-success btn-sm" onClick={saveCourseEdit}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingCourse(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{course.title}</h3>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEditCourse(course)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(course.id)}>Remove</button>
                    </div>
                  </div>
                  {course.description && <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem' }}>{course.description}</p>}
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>{course.modules?.length || 0} modules</p>

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
              )}
            </div>
          ))}
        </div>
      )}

      {(!plan.courses || plan.courses.length === 0) && (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
          <p>No courses yet. Click <strong>AI Suggest</strong> to auto-generate course groupings from your videos.</p>
        </div>
      )}
    </div>
  )
}