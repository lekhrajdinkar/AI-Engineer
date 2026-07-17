import React, { useState, useEffect } from 'react'
import { getChannels, getPlaylists, getVideos, addManualCourse, getPlan } from '../api/client'

function ChannelAvatar({ title }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  return <div className="channel-avatar">{letter}</div>
}

export default function AddCourseModal({ plan, onClose, onCourseCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', description: '', logo: '' })
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [playlists, setPlaylists] = useState({})
  const [selectedPlaylists, setSelectedPlaylists] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search state
  const [channelSearch, setChannelSearch] = useState('')
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [activePlaylistTab, setActivePlaylistTab] = useState('ALL')

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

  async function handleCreateCourse() {
    if (!form.name.trim()) { setError('Course name is required'); return }
    const newCourse = {
      title: form.name,
      sequence: (plan.courses?.length || 0) + 1,
      description: form.description,
      source_channels: selectedChannels.map(channel => ({
        channel_id: channel.channel_id,
        title: channel.title,
        url: channel.url || '',
        video_count: channel.video_count || channel.videos_count || 0,
        playlists: selectedPlaylists.filter(playlist => playlists[channel.channel_id]?.some(item => item.playlist_id === playlist.playlist_id))
          .map(playlist => ({ id: playlist.playlist_id, title: playlist.title, thumbnail: playlist.thumbnail || '' })),
      })),
      modules: [{
        title: 'Chapter 1',
        sequence: 1,
        videos: videos.map(v => ({
          video_id: v.video_id || v.id || crypto.randomUUID(),
          title: v.title,
          revised_title_from_ai: v.title,
          description: v.description || '',
          url: v.url || '',
          thumbnail: v.thumbnail || '',
          duration_secs: v.duration_secs || 0,
          watched: false,
        })),
      }],
    }
    setLoading(true)
    setError('')
    try {
      await addManualCourse(plan.id, newCourse)
      const savedPlan = await getPlan(plan.id)
      onCourseCreated(savedPlan)
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to create course')
    } finally {
      setLoading(false)
    }
  }

  function closeDrawer() {
    setStep(1)
    setSelectedChannels([])
    setSelectedPlaylists([])
    setVideos([])
    setError('')
    setChannelSearch('')
    setPlaylistSearch('')
    setActivePlaylistTab('ALL')
    onClose()
  }

  // Filtered channels
  const filteredChannels = channels.filter(ch =>
    !channelSearch || ch.title.toLowerCase().includes(channelSearch.toLowerCase())
  )

  // Get playlists for active tab
  const channelPlaylists = activePlaylistTab === 'ALL'
    ? Object.values(playlists).flat()
    : (playlists[activePlaylistTab] || [])
  const filteredPlaylists = channelPlaylists.filter(pl =>
    !playlistSearch || pl.title.toLowerCase().includes(playlistSearch.toLowerCase())
  )

  return (
    <>
      <div className="drawer-overlay" onClick={closeDrawer} />
      <div className="drawer-wide">
        <div className="drawer-header">
          <h2>Add Course Manually</h2>
          <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-body">
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
            </div>
          )}

          {/* Step 2: Select channels with search */}
          {step === 2 && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Search and select YouTube channels as content source:
              </p>
              <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
                <input
                  value={channelSearch}
                  onChange={e => setChannelSearch(e.target.value)}
                  placeholder="Search channels by name..."
                />
              </div>
              <div className="tile-grid" style={{ maxHeight: 400 }}>
                {filteredChannels.map(ch => {
                  const isSelected = selectedChannels.find(c => c.channel_id === ch.channel_id)
                  return (
                    <div key={ch.channel_id} className={`channel-tile ${isSelected ? 'selected' : ''}`} onClick={() => toggleChannel(ch)}>
                      <ChannelAvatar title={ch.title} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ch.title}</span>
                    </div>
                  )
                })}
                {filteredChannels.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', padding: '1rem', textAlign: 'center' }}>
                    No channels found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Select playlists with search and tabs */}
          {step === 3 && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Select playlists (or leave empty to load all videos from channels):
              </p>
              {/* Sub tab bar per channel */}
              <div className="sub-tab-bar">
                <button className={`sub-tab-item ${activePlaylistTab === 'ALL' ? 'active' : ''}`} onClick={() => setActivePlaylistTab('ALL')}>
                  ALL
                </button>
                {selectedChannels.map(ch => (
                  <button key={ch.channel_id} className={`sub-tab-item ${activePlaylistTab === ch.channel_id ? 'active' : ''}`} onClick={() => setActivePlaylistTab(ch.channel_id)}>
                    {ch.title}
                  </button>
                ))}
              </div>
              {/* Search playlists */}
              <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
                <input
                  value={playlistSearch}
                  onChange={e => setPlaylistSearch(e.target.value)}
                  placeholder="Search playlists by name..."
                />
              </div>
              {/* Playlist tiles */}
              {filteredPlaylists.length > 0 ? (
                <div className="tile-grid" style={{ maxHeight: 350 }}>
                  {filteredPlaylists.map(pl => {
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
                          {pl.description && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pl.description}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                  No playlists found{playlistSearch ? ' matching your search' : ''}.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Review videos & create */}
          {step === 4 && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <strong>{videos.length}</strong> video(s) loaded. Review and create the course.
              </p>
              <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
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
            </div>
          )}
        </div>
        <div className="drawer-footer">
          {step === 1 && (
            <>
              <button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { if (form.name.trim()) { setError(''); setStep(2) } else { setError('Course name is required') } }}>
                Next: Select Channels
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Loading...</> : 'Next: Select Playlists'}
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={loadVideos} disabled={loading}>
                {loading ? <><span className="spinner" /> Loading Videos...</> : 'Load Videos'}
              </button>
            </>
          )}
          {step === 4 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-success" onClick={handleCreateCourse} disabled={videos.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Creating...</> : 'Create Course'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
