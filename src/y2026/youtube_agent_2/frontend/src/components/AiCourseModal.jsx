import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getChannels, getPlaylists, getVideos, addAiSuggestedCourse, getPlan } from '../api/client'
import { setChannelPlaylists, setSubscribedChannels } from '../store/sourcesSlice'

function ChannelAvatar({ title, thumbnail }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  if (thumbnail) return <img src={thumbnail} alt="" className="source-picker-thumb" />
  return <div className="channel-avatar">{letter}</div>
}

function sourceDate(item) {
  return item.updated_at || item.last_updated || item.source_created_at || item.created_at || ''
}

function formatSourceDate(item) {
  const value = sourceDate(item)
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : `Created ${date.toLocaleDateString()}`
}

function sortSources(items, sortBy) {
  return [...items].sort((left, right) => sortBy === 'updated'
    ? new Date(sourceDate(right) || 0) - new Date(sourceDate(left) || 0)
    : (left.title || '').localeCompare(right.title || ''))
}

export default function AiCourseModal({ plan, onClose, onCourseCreated }) {
  const dispatch = useDispatch()
  const cachedChannels = useSelector(state => state.sources.subscribedChannels)
  const cachedPlaylists = useSelector(state => state.sources.playlistsByChannel)
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [playlists, setPlaylists] = useState({})
  const [selectedPlaylists, setSelectedPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channelSearch, setChannelSearch] = useState('')
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [activePlaylistTab, setActivePlaylistTab] = useState('ALL')
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [channelSortBy, setChannelSortBy] = useState('name')
  const [playlistSortBy, setPlaylistSortBy] = useState('name')

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

  function selectAllChannels(items) { setSelectedChannels(prev => [...prev, ...items.filter(item => !prev.some(selected => selected.channel_id === item.channel_id))]) }
  function deselectAllChannels(items) { const ids = new Set(items.map(item => item.channel_id)); setSelectedChannels(prev => prev.filter(item => !ids.has(item.channel_id))) }

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
    setShowPlaylists(true)
  }

  function togglePlaylist(pl) {
    setSelectedPlaylists(prev =>
      prev.find(p => p.playlist_id === pl.playlist_id)
        ? prev.filter(p => p.playlist_id !== pl.playlist_id)
        : [...prev, pl]
    )
  }

  function selectAllPlaylists(items) { setSelectedPlaylists(prev => [...prev, ...items.filter(item => !prev.some(selected => selected.playlist_id === item.playlist_id))]) }
  function deselectAllPlaylists(items) { const ids = new Set(items.map(item => item.playlist_id)); setSelectedPlaylists(prev => prev.filter(item => !ids.has(item.playlist_id))) }

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
            videos.push(...(data.videos || []).map(video => ({
              ...video,
              channel_id: data.channel_id || channel.channel_id,
              playlist_id: data.playlist_id || playlist.playlist_id,
            })))
          }
        } else {
          const data = await getVideos(channel.channel_id)
          videos.push(...(data.videos || []).map(video => ({
            ...video,
            channel_id: data.channel_id || channel.channel_id,
            playlist_id: null,
          })))
        }
      }
      if (!videos.length) throw new Error('No videos found for the selected sources')
      await addAiSuggestedCourse(plan.id, {
        videos: videos.map(video => ({
          video_id: video.video_id || video.id,
          title: video.title,
          revised_title_from_ai: video.title,
          description: video.description || null,
          thumbnail: video.thumbnail || '',
          url: video.url || null,
          duration_secs: video.duration_secs ?? null,
          published_at: video.published_at || null,
          tags: video.tags || [],
          category_id: video.category_id || null,
          caption_available: Boolean(video.caption_available),
          embeddable: video.embeddable !== false,
          view_count: video.view_count ?? 0,
          like_count: video.like_count ?? 0,
          recording_date: video.recording_date || null,
          channel_id: video.channel_id,
          playlist_id: video.playlist_id,
        })),
        source_channels: selectedChannels.map(channel => ({
          channel_id: channel.channel_id,
          title: channel.title,
          url: channel.url || '',
          video_count: channel.video_count || channel.videos_count || 0,
          videos_count: channel.videos_count || channel.video_count || 0,
          thumbnail: channel.thumbnail || channel.logo_url || channel.logo || '',
          source_created_at: channel.source_created_at || null,
          last_video_published_at: channel.last_video_published_at || null,
          playlists: selectedPlaylists.filter(playlist => playlists[channel.channel_id]?.some(item => item.playlist_id === playlist.playlist_id)).map(playlist => ({
            id: playlist.playlist_id,
            playlist_id: playlist.playlist_id,
            title: playlist.title,
            thumbnail: playlist.thumbnail || '',
            videos_count: playlist.videos_count || playlist.video_count || 0,
            source_created_at: playlist.source_created_at || null,
            last_video_published_at: playlist.last_video_published_at || null,
          })),
        })),
      })
      onCourseCreated(await getPlan(plan.id))
      onClose()
    } catch (err) {
      setError('AI suggest failed: ' + err.message)
    }
    setLoading(false)
  }

  function closeDrawer() {
    setSelectedChannels([])
    setSelectedPlaylists([])
    setError('')
    setChannelSearch('')
    setPlaylistSearch('')
    setShowPlaylists(false)
    setChannelSortBy('name')
    setPlaylistSortBy('name')
    onClose()
  }

  const filteredChannels = sortSources(channels.filter(ch =>
    !channelSearch || ch.title.toLowerCase().includes(channelSearch.toLowerCase())
  ), channelSortBy)

  const channelPlaylists = activePlaylistTab === 'ALL'
    ? Object.values(playlists).flat()
    : (playlists[activePlaylistTab] || [])
  const filteredPlaylists = sortSources(channelPlaylists.filter(pl =>
    !playlistSearch || pl.title.toLowerCase().includes(playlistSearch.toLowerCase())
  ), playlistSortBy)

  return (
    <>
      <div className="drawer-overlay" onClick={closeDrawer} />
      <div className="drawer-wide">
        <div className="drawer-header">
          <h2>AI Suggested Course Creation</h2>
          <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-body add-course-drawer-body">
          {error && <div className="alert alert-error">{error}</div>}

          {!showPlaylists && (
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
              <div className="source-picker-toolbar"><span>Sort channels</span><div className="source-picker-actions"><div className="picker-bulk-toggle"><button type="button" onClick={() => selectAllChannels(filteredChannels)}>Select all</button><button type="button" onClick={() => deselectAllChannels(filteredChannels)}>Deselect all</button></div><div className="picker-sort-toggle"><button type="button" className={channelSortBy === 'name' ? 'active' : ''} onClick={() => setChannelSortBy('name')}>Name</button><button type="button" className={channelSortBy === 'updated' ? 'active' : ''} onClick={() => setChannelSortBy('updated')}>Last updated</button></div></div></div>
              <div className="tile-grid source-picker-grid">
                {filteredChannels.map(ch => {
                  const isSelected = selectedChannels.find(c => c.channel_id === ch.channel_id)
                  return (
                    <div key={ch.channel_id} className={`channel-tile ${isSelected ? 'selected' : ''}`} onClick={() => toggleChannel(ch)}>
                      <ChannelAvatar title={ch.title} thumbnail={ch.thumbnail || ch.logo_url || ch.logo} />
                      <div className="source-picker-tile-content"><strong className="source-picker-tile-title">{ch.title}</strong><span className="source-picker-tile-meta">{formatSourceDate(ch)}</span></div>
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

          {showPlaylists && (
            <div className="add-course-source-step">
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
              <div className="source-picker-toolbar"><span>Sort playlists</span><div className="source-picker-actions"><div className="picker-bulk-toggle"><button type="button" onClick={() => selectAllPlaylists(filteredPlaylists)}>Select all</button><button type="button" onClick={() => deselectAllPlaylists(filteredPlaylists)}>Deselect all</button></div><div className="picker-sort-toggle"><button type="button" className={playlistSortBy === 'name' ? 'active' : ''} onClick={() => setPlaylistSortBy('name')}>Name</button><button type="button" className={playlistSortBy === 'updated' ? 'active' : ''} onClick={() => setPlaylistSortBy('updated')}>Last updated</button></div></div></div>
              {filteredPlaylists.length > 0 ? (
                <div className="tile-grid source-picker-grid">
                  {filteredPlaylists.map(pl => {
                    const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                    return (
                      <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                        {pl.thumbnail ? <img src={pl.thumbnail} alt="" className="playlist-thumb" /> : <div className="playlist-thumb" />}
                        <div className="source-picker-tile-content"><strong className="source-picker-tile-title">{pl.title}</strong><span className="source-picker-tile-meta">{formatSourceDate(pl)}</span></div>
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

        </div>
        <div className="drawer-footer">
          {!showPlaylists && (
            <>
              <button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
              <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading}>
                {loading ? <><span className="spinner" /> Loading...</> : 'Playlist Options'}
              </button>
            </>
          )}
          {showPlaylists && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowPlaylists(false)}>Back</button>
              <button className="btn btn-primary" onClick={handleAiGenerate} disabled={loading}>
                {loading ? <><span className="spinner" /> Generating...</> : 'Generate AI Suggestions'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
