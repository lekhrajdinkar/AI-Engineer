import React, { useState, useEffect } from 'react'
import { getChannels, getPlaylists, aiSuggest } from '../api/client'

function ChannelAvatar({ title }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  return <div className="channel-avatar">{letter}</div>
}

export default function AiCourseModal({ plan, onClose, onCourseCreated }) {
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [playlists, setPlaylists] = useState({})
  const [selectedPlaylists, setSelectedPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    getChannels().then(d => setChannels(d.channels || [])).catch(() => {})
  }, [])

  function toggleChannel(ch) {
    setSelectedChannels(prev =>
      prev.find(c => c.channel_id === ch.channel_id)
        ? prev.filter(c => c.channel_id !== ch.channel_id)
        : [...prev, ch]
    )
  }

  async function loadPlaylists() {
    setLoading(true)
    const all = {}
    for (const ch of selectedChannels) {
      try {
        const data = await getPlaylists(ch.channel_id)
        all[ch.channel_id] = data.playlists || []
      } catch { all[ch.channel_id] = [] }
    }
    setPlaylists(all)
    setLoading(false)
  }

  function togglePlaylist(pl) {
    setSelectedPlaylists(prev =>
      prev.find(p => p.playlist_id === pl.playlist_id)
        ? prev.filter(p => p.playlist_id !== pl.playlist_id)
        : [...prev, pl]
    )
  }

  async function handleAiGenerate() {
    if (selectedChannels.length === 0) { setError('Select at least one channel'); return }
    setLoading(true)
    setError('')
    try {
      const data = await aiSuggest(plan.id)
      const suggested = data.learning_plan || data
      if (suggested.courses && suggested.courses.length > 0) {
        setResult(suggested.courses)
      } else {
        setError('AI returned no courses. Try different channels.')
      }
    } catch (err) {
      setError('AI suggest failed: ' + err.message)
    }
    setLoading(false)
  }

  function handleAcceptAll() {
    if (!result) return
    const updated = {
      ...plan,
      courses: [...(plan.courses || []), ...result],
    }
    onCourseCreated(updated)
    onClose()
  }

  function handleAcceptCourse(course) {
    const updated = {
      ...plan,
      courses: [...(plan.courses || []), course],
    }
    onCourseCreated(updated)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <h2>AI Suggested Course Creation</h2>
        {error && <div className="alert alert-error">{error}</div>}

        {!result && (
          <div>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>Select channels (and optionally playlists) for AI to analyze and suggest course groupings:</p>

            <div className="form-group">
              <label>Channels</label>
              <div className="tile-grid">
                {channels.map(ch => {
                  const isSelected = selectedChannels.find(c => c.channel_id === ch.channel_id)
                  return (
                    <div key={ch.channel_id} className={`channel-tile ${isSelected ? 'selected' : ''}`} onClick={() => toggleChannel(ch)}>
                      <ChannelAvatar title={ch.title} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ch.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedChannels.length > 0 && (
              <div className="form-group">
                <label>Playlists (optional — leave empty to use all videos)</label>
                <button className="btn btn-secondary btn-sm" onClick={loadPlaylists} disabled={loading} style={{ marginBottom: '0.5rem' }}>
                  {loading ? <><span className="spinner" /> Loading...</> : 'Load Playlists'}
                </button>
                {Object.keys(playlists).length > 0 && (
                  <div className="tile-grid" style={{ maxHeight: 200 }}>
                    {Object.entries(playlists).map(([chId, pls]) =>
                      pls.map(pl => {
                        const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                        return (
                          <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                            {pl.thumbnail ? <img src={pl.thumbnail} alt="" className="playlist-thumb" /> : <div className="playlist-thumb" />}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{pl.title}</div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAiGenerate} disabled={selectedChannels.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Generating...</> : 'Generate AI Suggestions'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>
              AI suggested <strong>{result.length}</strong> course(s). Accept individually or all at once.
            </p>
            {result.map((course, i) => (
              <div className="card" key={course.id || i} style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                <h4>{course.title}</h4>
                {course.description && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{course.description}</p>}
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {course.modules?.length || 0} modules, {course.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0) || 0} videos
                </p>
                <button className="btn btn-success btn-sm" onClick={() => handleAcceptCourse(course)} style={{ marginTop: '0.5rem' }}>
                  Accept This Course
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setResult(null)}>Back</button>
              <button className="btn btn-primary" onClick={handleAcceptAll}>Accept All</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}