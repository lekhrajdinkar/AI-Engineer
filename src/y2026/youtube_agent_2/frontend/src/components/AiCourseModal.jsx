import React, { useState, useEffect } from 'react'
import { getChannels, getPlaylists, getVideos, addAiSuggestedCourse, getPlan } from '../api/client'

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
  const [channelSearch, setChannelSearch] = useState('')
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [activePlaylistTab, setActivePlaylistTab] = useState('ALL')
  const [showPlaylists, setShowPlaylists] = useState(false)

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
    setShowPlaylists(true)
  }

  function togglePlaylist(pl) {
    setSelectedPlaylists(prev =>
      prev.find(p => p.playlist_id === pl.playlist_id)
        ? prev.filter(p => p.playlist_id === pl.playlist_id)
        : [...prev, pl]
    )
  }

  async function handleAiGenerate() {
    if (selectedChannels.length === 0) { setError('Select at least one channel'); return }
    setLoading(true)
    setError('')
    try {
      const videos = []
      for (const channel of selectedChannels) {
        const channelPlaylists = selectedPlaylists.filter(playlist =>
          playlists[channel.channel_id]?.some(item => item.playlist_id === playlist.playlist_id)
        )
        if (channelPlaylists.length) {
          for (const playlist of channelPlaylists) {
            const data = await getVideos(channel.channel_id, playlist.playlist_id)
            videos.push(...(data.videos || []))
          }
        } else {
          const data = await getVideos(channel.channel_id)
          videos.push(...(data.videos || []))
        }
      }
      if (!videos.length) throw new Error('No videos found for the selected sources')
      await addAiSuggestedCourse(plan.id, videos.map(video => ({
        video_id: video.video_id || video.id,
        title: video.title,
        revised_title_from_ai: video.title,
        thumbnail: video.thumbnail || '',
        url: video.url || null,
        duration_secs: video.duration_secs || null,
      })))
      onCourseCreated(await getPlan(plan.id))
      onClose()
    } catch (err) {
      setError('AI suggest failed: ' + err.message)
    }
    setLoading(false)
  }

  function handleAcceptAll() {
    if (!result) return
    const updated = {
      ...currentPlan,
      courses: [...(currentPlan.courses || []), ...result],
    }
    onClose()
  }

  function handleAcceptCourse(course) {
    const updated = {
      ...currentPlan,
      courses: [...(currentPlan.courses || []), course],
    }
    onClose()
  }

  function closeDrawer() {
    setSelectedChannels([])
    setSelectedPlaylists([])
    setResult(null)
    setError('')
    setChannelSearch('')
    setPlaylistSearch('')
    setShowPlaylists(false)
    onClose()
  }

  const filteredChannels = channels.filter(ch =>
    !channelSearch || ch.title.toLowerCase().includes(channelSearch.toLowerCase())
  )

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
          <h2>AI Suggested Course Creation</h2>
          <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-body">
          {error && <div className="alert alert-error">{error}</div>}

          {!result && !showPlaylists && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Search and select channels for AI to analyze and suggest course groupings:
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

          {!result && showPlaylists && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Select playlists (optional — leave empty to use all videos):
              </p>
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
              <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
                <input
                  value={playlistSearch}
                  onChange={e => setPlaylistSearch(e.target.value)}
                  placeholder="Search playlists by name..."
                />
              </div>
              {filteredPlaylists.length > 0 ? (
                <div className="tile-grid" style={{ maxHeight: 350 }}>
                  {filteredPlaylists.map(pl => {
                    const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                    return (
                      <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                        {pl.thumbnail ? <img src={pl.thumbnail} alt="" className="playlist-thumb" /> : <div className="playlist-thumb" />}
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{pl.title}</div>
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

          {result && (
            <div>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                AI suggested <strong>{result.length}</strong> course(s). Accept individually or all at once.
              </p>
              {result.map((course, i) => (
                <div className="card" key={course.id || i} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <h4>{course.title}</h4>
                  {course.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{course.description}</p>}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {course.modules?.length || 0} modules, {course.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0) || 0} videos
                  </p>
                  <button className="btn btn-success btn-sm" onClick={() => handleAcceptCourse(course)} style={{ marginTop: '0.5rem' }}>
                    Accept This Course
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="drawer-footer">
          {!result && !showPlaylists && (
            <>
              <button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
              <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Loading...</> : 'Playlist Options'}
              </button>
            </>
          )}
          {!result && showPlaylists && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowPlaylists(false)}>Back</button>
              <button className="btn btn-primary" onClick={handleAiGenerate} disabled={loading}>
                {loading ? <><span className="spinner" /> Generating...</> : 'Generate AI Suggestions'}
              </button>
            </>
          )}
          {result && (
            <>
              <button className="btn btn-secondary" onClick={() => setResult(null)}>Back</button>
              <button className="btn btn-primary" onClick={handleAcceptAll}>Accept All</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
