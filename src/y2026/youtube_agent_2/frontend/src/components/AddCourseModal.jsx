import React, { useState, useEffect } from 'react'
import { getChannels, getPlaylists, getVideos } from '../api/client'

function ChannelAvatar({ title }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  return <div className="channel-avatar">{letter}</div>
}

export default function AddCourseModal({ plan, onClose, onCourseCreated }) {
  const [step, setStep] = useState(1) // 1=form, 2=channels, 3=playlists, 4=videos
  const [form, setForm] = useState({ name: '', description: '', logo: '' })
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [playlists, setPlaylists] = useState({})
  const [selectedPlaylists, setSelectedPlaylists] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    setStep(3)
  }

  function togglePlaylist(pl) {
    setSelectedPlaylists(prev =>
      prev.find(p => p.playlist_id === pl.playlist_id)
        ? prev.filter(p => p.playlist_id !== pl.playlist_id)
        : [...prev, pl]
    )
  }

  async function loadVideos() {
    setLoading(true)
    setError('')
    const allVideos = []
    for (const ch of selectedChannels) {
      const channelPlaylists = selectedPlaylists.filter(p =>
        channels.find(c => c.channel_id === ch.channel_id) &&
        playlists[ch.channel_id]?.find(pp => pp.playlist_id === p.playlist_id)
      )
      if (channelPlaylists.length > 0) {
        for (const pl of channelPlaylists) {
          try {
            const data = await getVideos(ch.channel_id, pl.playlist_id)
            allVideos.push(...(data.videos || []))
          } catch { /* skip */ }
        }
      } else {
        try {
          const data = await getVideos(ch.channel_id)
          allVideos.push(...(data.videos || []))
        } catch { /* skip */ }
      }
    }
    setVideos(allVideos)
    setLoading(false)
    setStep(4)
  }

  function handleCreateCourse() {
    if (!form.name.trim()) { setError('Course name is required'); return }
    const newCourse = {
      id: crypto.randomUUID(),
      title: form.name,
      description: form.description,
      logo: form.logo || null,
      modules: [{
        id: crypto.randomUUID(),
        title: 'Chapter 1',
        sequence: 1,
        videos: videos.map(v => ({
          video_id: v.video_id || v.id || crypto.randomUUID(),
          title: v.title,
          description: v.description || '',
          url: v.url || '',
          duration_secs: v.duration_secs || 0,
          watched: false,
        })),
      }],
    }
    const updated = {
      ...plan,
      courses: [...(plan.courses || []), newCourse],
    }
    onCourseCreated(updated)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Add Course Manually</h2>
        {error && <div className="alert alert-error">{error}</div>}

        {/* Step 1: Course details */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label>Course Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kubernetes Fundamentals" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Course description" />
            </div>
            <div className="form-group">
              <label>Logo (optional)</label>
              <div className="logo-upload">
                <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="Paste image URL" />
                {form.logo && <img src={form.logo} alt="preview" className="logo-preview" />}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { if (form.name.trim()) { setError(''); setStep(2) } else { setError('Course name is required') } }}>
                Next: Select Channels
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select channels */}
        {step === 2 && (
          <div>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>Select YouTube channels as content source:</p>
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
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Loading...</> : 'Next: Select Playlists'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select playlists */}
        {step === 3 && (
          <div>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>Select playlists (or leave empty to load all videos from channels):</p>
            {selectedChannels.map(ch => {
              const chPlaylists = playlists[ch.channel_id] || []
              if (chPlaylists.length === 0) return null
              return (
                <div key={ch.channel_id} style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#475569' }}>{ch.title}</h4>
                  <div className="tile-grid" style={{ maxHeight: 180 }}>
                    {chPlaylists.map(pl => {
                      const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                      return (
                        <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                          {pl.thumbnail ? (
                            <img src={pl.thumbnail} alt="" className="playlist-thumb" />
                          ) : (
                            <div className="playlist-thumb" />
                          )}
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{pl.title}</div>
                            {pl.description && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{pl.description}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {selectedChannels.every(ch => !playlists[ch.channel_id]?.length) && (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No playlists found for selected channels.</p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={loadVideos} disabled={loading}>
                {loading ? <><span className="spinner" /> Loading Videos...</> : 'Load Videos'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review videos & create */}
        {step === 4 && (
          <div>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>
              <strong>{videos.length}</strong> video(s) loaded. Review and create the course.
            </p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem' }}>
              {videos.map((v, i) => (
                <div className="video-card" key={v.video_id || i} style={{ marginBottom: '0.4rem' }}>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" className="video-thumb" />
                  ) : (
                    <div className="video-thumb" />
                  )}
                  <div className="video-info">
                    <h5>{v.title}</h5>
                    <p>{v.description || ''}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-success" onClick={handleCreateCourse} disabled={videos.length === 0}>
                Create Course
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}