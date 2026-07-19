import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getChannels, getPlaylists, getVideos, addManualCourse, getPlan } from '../api/client'
import { setChannelPlaylists, setSubscribedChannels } from '../store/sourcesSlice'

function ChannelAvatar({ title, thumbnail }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  if (thumbnail) return <img src={thumbnail} alt="" className="source-picker-thumb" />
  return <div className="channel-avatar">{letter}</div>
}

function getSourceDate(item) {
  if (item.updated_at || item.last_updated) return { value: item.updated_at || item.last_updated, label: 'Updated' }
  if (item.source_created_at) return { value: item.source_created_at, label: 'Created' }
  if (item.created_at) return { value: item.created_at, label: 'Created' }
  return { value: '', label: '' }
}

function formatLastUpdated(item) {
  const { value, label } = getSourceDate(item)
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : `${label} ${date.toLocaleDateString()}`
}

function sortSourceItems(items, sortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === 'updated') return new Date(getSourceDate(b).value || 0) - new Date(getSourceDate(a).value || 0)
    return (a.title || '').localeCompare(b.title || '')
  })
}

export default function AddCourseModal({ plan, onClose, onCourseCreated }) {
  const dispatch = useDispatch()
  const cachedChannels = useSelector(state => state.sources.subscribedChannels)
  const cachedPlaylists = useSelector(state => state.sources.playlistsByChannel)
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
  const [channelSortBy, setChannelSortBy] = useState('name')
  const [playlistSortBy, setPlaylistSortBy] = useState('name')
  const [showLoadVideosConfirm, setShowLoadVideosConfirm] = useState(false)

  useEffect(() => {
    if (cachedChannels !== null) {
      setChannels(cachedChannels)
      return
    }
    getChannels().then(data => {
      const fetchedChannels = data.channels || []
      dispatch(setSubscribedChannels(fetchedChannels))
      setChannels(fetchedChannels)
    }).catch(() => {})
  }, [cachedChannels, dispatch])

  function toggleChannel(ch) {
    setSelectedChannels(prev =>
      prev.find(c => c.channel_id === ch.channel_id)
        ? prev.filter(c => c.channel_id !== ch.channel_id)
        : [...prev, ch]
    )
  }

  function selectAllChannels(items) {
    setSelectedChannels(prev => [...prev, ...items.filter(item => !prev.some(selected => selected.channel_id === item.channel_id))])
  }

  function deselectAllChannels(items) {
    const ids = new Set(items.map(item => item.channel_id))
    setSelectedChannels(prev => prev.filter(item => !ids.has(item.channel_id)))
  }

  async function loadPlaylists() {
    setLoading(true)
    const all = { ...playlists }
    for (const ch of selectedChannels) {
      if (Object.prototype.hasOwnProperty.call(cachedPlaylists, ch.channel_id)) {
        all[ch.channel_id] = cachedPlaylists[ch.channel_id]
        continue
      }
      try {
        const data = await getPlaylists(ch.channel_id)
        all[ch.channel_id] = data.playlists || []
        dispatch(setChannelPlaylists({ channelId: ch.channel_id, playlists: all[ch.channel_id] }))
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

  function selectAllPlaylists(items) {
    setSelectedPlaylists(prev => [...prev, ...items.filter(item => !prev.some(selected => selected.playlist_id === item.playlist_id))])
  }

  function deselectAllPlaylists(items) {
    const ids = new Set(items.map(item => item.playlist_id))
    setSelectedPlaylists(prev => prev.filter(item => !ids.has(item.playlist_id)))
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
          labels: [],
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
    setChannelSortBy('name')
    setPlaylistSortBy('name')
    setShowLoadVideosConfirm(false)
    onClose()
  }

  // Filtered channels
  const filteredChannels = sortSourceItems(channels.filter(ch =>
    !channelSearch || ch.title.toLowerCase().includes(channelSearch.toLowerCase())
  ), channelSortBy)

  // Get playlists for active tab
  const channelPlaylists = activePlaylistTab === 'ALL'
    ? Object.values(playlists).flat()
    : (playlists[activePlaylistTab] || [])
  const filteredPlaylists = sortSourceItems(channelPlaylists.filter(pl =>
    !playlistSearch || pl.title.toLowerCase().includes(playlistSearch.toLowerCase())
  ), playlistSortBy)

  const selectedSourcesSummary = selectedChannels.map(channel => ({
    channel,
    playlists: (playlists[channel.channel_id] || []).filter(playlist =>
      selectedPlaylists.some(selected => selected.playlist_id === playlist.playlist_id)
    ),
  }))

  return (
    <>
      <div className="drawer-overlay" onClick={closeDrawer} />
      <div className="drawer-wide">
        <div className="drawer-header">
          <h2>Add Course Manually</h2>
          <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-body add-course-drawer-body">
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
                  <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://skillicons.dev/icons?i=" />
                  {form.logo && <img src={form.logo} alt="preview" className="logo-preview" />}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select channels with search */}
          {step === 2 && (
            <div className="add-course-source-step">
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
              <div className="source-picker-toolbar">
                <span>Channels</span>
                <div className="source-picker-actions">
                  <div className="picker-bulk-toggle" aria-label="Select channels">
                    <button type="button" onClick={() => selectAllChannels(filteredChannels)}>Select all</button>
                    <button type="button" onClick={() => deselectAllChannels(filteredChannels)}>Deselect all</button>
                  </div>
                  <div className="picker-sort-toggle" aria-label="Sort channels">
                    <button type="button" className={channelSortBy === 'name' ? 'active' : ''} onClick={() => setChannelSortBy('name')}>Name</button>
                    <button type="button" className={channelSortBy === 'updated' ? 'active' : ''} onClick={() => setChannelSortBy('updated')}>Last updated</button>
                  </div>
                </div>
              </div>
              <div className="tile-grid source-picker-grid">
                {filteredChannels.map(ch => {
                  const isSelected = selectedChannels.find(c => c.channel_id === ch.channel_id)
                  return (
                    <div key={ch.channel_id} className={`channel-tile ${isSelected ? 'selected' : ''}`} onClick={() => toggleChannel(ch)}>
                      <ChannelAvatar title={ch.title} thumbnail={ch.thumbnail || ch.logo_url || ch.logo} />
                      <div className="source-picker-tile-content">
                        <strong className="source-picker-tile-title">{ch.title}</strong>
                        <span className="source-picker-tile-meta">{formatLastUpdated(ch)}</span>
                      </div>
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
            <div className="add-course-source-step">
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
              <div className="source-picker-toolbar">
                <span>Playlists</span>
                <div className="source-picker-actions">
                  <div className="picker-bulk-toggle" aria-label="Select playlists">
                    <button type="button" onClick={() => selectAllPlaylists(filteredPlaylists)}>Select all</button>
                    <button type="button" onClick={() => deselectAllPlaylists(filteredPlaylists)}>Deselect all</button>
                  </div>
                  <div className="picker-sort-toggle" aria-label="Sort playlists">
                    <button type="button" className={playlistSortBy === 'name' ? 'active' : ''} onClick={() => setPlaylistSortBy('name')}>Name</button>
                    <button type="button" className={playlistSortBy === 'updated' ? 'active' : ''} onClick={() => setPlaylistSortBy('updated')}>Last updated</button>
                  </div>
                </div>
              </div>
              {/* Playlist tiles */}
              {filteredPlaylists.length > 0 ? (
                <div className="tile-grid source-picker-grid">
                  {filteredPlaylists.map(pl => {
                    const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                    return (
                      <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt="" className="playlist-thumb" />
                        ) : (
                          <div className="playlist-thumb" />
                        )}
                        <div className="source-picker-tile-content">
                          <strong className="source-picker-tile-title">{pl.title}</strong>
                          <span className="source-picker-tile-meta">{formatLastUpdated(pl)}</span>
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
            <div className="add-course-video-preview-step">
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <strong>{videos.length}</strong> video(s) loaded. Review and create the course.
              </p>
              <div className="add-course-video-preview-list">
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
              <button className="btn btn-primary" onClick={() => setShowLoadVideosConfirm(true)} disabled={loading}>
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
      {showLoadVideosConfirm && (
        <div className="confirm-overlay" onClick={() => setShowLoadVideosConfirm(false)}>
          <div className="confirm-dialog load-videos-confirm" onClick={event => event.stopPropagation()}>
            <h3>Load videos from selected sources?</h3>
            <p>Review the source selection before collecting videos for this course.</p>
            <div className="load-videos-source-list">
              {selectedSourcesSummary.map(({ channel, playlists: channelPlaylists }) => (
                <div className="load-videos-source" key={channel.channel_id}>
                  <strong>{channel.title} ({channelPlaylists.length} playlist{channelPlaylists.length === 1 ? '' : 's'})</strong>
                  {channelPlaylists.length > 0 ? (
                    <ul className="load-videos-playlist-list">
                      {channelPlaylists.map(playlist => <li key={playlist.playlist_id}>{playlist.title}</li>)}
                    </ul>
                  ) : (
                    <span className="load-videos-all-note">No playlist selected — all videos from this channel will be collected.</span>
                  )}
                </div>
              ))}
            </div>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowLoadVideosConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setShowLoadVideosConfirm(false); loadVideos() }}>Load Videos</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
