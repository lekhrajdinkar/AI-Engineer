import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AI_ORGANIZATION_CONTEXT_MODES,
  AI_PROCESSING_MODES,
  DEFAULT_AI_COURSE_OPTIONS,
  buildAiCourseRequestPayload,
  getChannels,
  getAiModelConfigs,
  getPlaylists,
  getVideos,
  submitAiCourseRequest,
} from '../api/client'
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

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Duration unavailable'
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function AiRequestPreview({ payload, model, tab, onTabChange, onDownload }) {
  const videos = payload.videos || []
  const sources = payload.source_channels || []
  const contextMode = payload.organization_context.mode
  const batchSize = payload.processing.batch_size
  const estimatedBatches = payload.processing.mode === AI_PROCESSING_MODES.BATCH
    ? Math.ceil(videos.length / batchSize)
    : 1
  const channelNames = new Map(sources.map(source => [source.channel_id, source.title]))
  const playlistNames = new Map(sources.flatMap(source =>
    (source.playlists || []).map(playlist => [playlist.playlist_id || playlist.id, playlist.title])
  ))

  return (
    <div className="ai-request-preview">
      <div className="refresh-feed-tabs ai-request-preview-tabs">
        <button type="button" className={tab === 'visual' ? 'active' : ''} onClick={() => onTabChange('visual')}>Visual</button>
        <button type="button" className={tab === 'json' ? 'active' : ''} onClick={() => onTabChange('json')}>Request JSON</button>
        <button type="button" className="overview-download-json" onClick={onDownload}>Download JSON</button>
      </div>

      {tab === 'json' ? (
        <pre className="refresh-feed-json ai-request-preview-json">{JSON.stringify(payload, null, 2)}</pre>
      ) : (
        <div className="ai-request-preview-visual">
          <section className="ai-request-preview-metrics">
            <div><span>Model</span><strong>{model?.name || payload.model_config_id}</strong><small>{model?.model || payload.model_config_id}</small></div>
            <div><span>Processing</span><strong>{payload.processing.mode}</strong><small>{batchSize ? `${batchSize} videos per batch` : 'One model call'}</small></div>
            <div><span>Prompt context</span><strong>{contextMode.replaceAll('_', ' ')}</strong><small>{contextMode === AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY ? 'Titles only' : contextMode === AI_ORGANIZATION_CONTEXT_MODES.TITLE_TAGS ? `Up to ${payload.organization_context.max_tags_per_video} tags` : `Descriptions up to ${payload.organization_context.description_max_words} words`}</small></div>
            <div><span>Request size</span><strong>{videos.length} videos</strong><small>{sources.length} channels · {estimatedBatches} estimated {estimatedBatches === 1 ? 'call' : 'calls'}</small></div>
          </section>

          <p className="ai-request-preview-note">This is the exact API request. Full video metadata is retained in the job record; the prompt-context setting controls which fields are sent to the model.</p>

          <section className="ai-request-preview-section">
            <header><div><span>Content sources</span><h3>{sources.length} selected {sources.length === 1 ? 'channel' : 'channels'}</h3></div></header>
            <div className="ai-request-preview-sources">
              {sources.map(source => {
                const sourceVideoCount = videos.filter(video => video.channel_id === source.channel_id).length
                return (
                  <article key={source.channel_id}>
                    <ChannelAvatar title={source.title} thumbnail={source.thumbnail} />
                    <div><strong>{source.title}</strong><small>{sourceVideoCount} request videos</small></div>
                    <span>{source.playlists?.length ? `${source.playlists.length} selected playlists` : 'All channel videos'}</span>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="ai-request-preview-section ai-request-preview-video-section">
            <header><div><span>Videos</span><h3>{videos.length} items in request order</h3></div><small>Scroll to inspect all items</small></header>
            <div className="ai-request-preview-videos">
              {videos.map((video, index) => (
                <article key={`${video.video_id}-${index}`}>
                  <span className="ai-request-preview-video-number">{index + 1}</span>
                  {video.thumbnail ? <img src={video.thumbnail} alt="" /> : <div className="ai-request-preview-video-thumb" />}
                  <div className="ai-request-preview-video-copy">
                    <strong>{video.title || 'Untitled video'}</strong>
                    <small>{channelNames.get(video.channel_id) || video.channel_id}{video.playlist_id ? ` · ${playlistNames.get(video.playlist_id) || video.playlist_id}` : ''}</small>
                    <code>{video.video_id}</code>
                  </div>
                  <div className="ai-request-preview-video-meta">
                    <span>{formatDuration(video.duration_secs)}</span>
                    <small>{video.tags?.length || 0} tags{video.description ? ' · description available' : ''}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default function AiCourseModal({ plan, onClose, onRequestSubmitted }) {
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
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [processingMode, setProcessingMode] = useState(DEFAULT_AI_COURSE_OPTIONS.processingMode)
  const [batchSize, setBatchSize] = useState(DEFAULT_AI_COURSE_OPTIONS.batchSize)
  const [organizationContextMode, setOrganizationContextMode] = useState(DEFAULT_AI_COURSE_OPTIONS.organizationContextMode)
  const [descriptionMaxWords, setDescriptionMaxWords] = useState(DEFAULT_AI_COURSE_OPTIONS.descriptionMaxWords)
  const [maxTagsPerVideo, setMaxTagsPerVideo] = useState(DEFAULT_AI_COURSE_OPTIONS.maxTagsPerVideo)
  const [loadingAction, setLoadingAction] = useState('')
  const [previewPayload, setPreviewPayload] = useState(null)
  const [previewTab, setPreviewTab] = useState('visual')
  const selectedModel = models.find(model => model.id === selectedModelId)

  useEffect(() => {
    let active = true
    getAiModelConfigs({ enabled: true }).then(data => {
      if (!active) return
      const available = data.items || []
      const defaultModel = available.find(model => model.is_default) || available[0]
      setModels(available)
      setSelectedModelId(defaultModel?.id || '')
      setBatchSize(defaultModel?.default_batch_size || DEFAULT_AI_COURSE_OPTIONS.batchSize)
    }).catch(err => {
      if (active) setError(`Unable to load AI models: ${err.message}`)
    }).finally(() => {
      if (active) setModelsLoading(false)
    })
    return () => { active = false }
  }, [])

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
    setLoadingAction('playlists')
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
    setLoadingAction('')
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

  function selectModel(modelId) {
    const model = models.find(item => item.id === modelId)
    setSelectedModelId(modelId)
    if (model) setBatchSize(model.default_batch_size)
  }

  function validateGenerationOptions() {
    if (!selectedModel) return 'Select an AI model'
    if (processingMode === AI_PROCESSING_MODES.BATCH && (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > selectedModel.max_batch_size)) {
      return `Batch size must be between 1 and ${selectedModel.max_batch_size} for ${selectedModel.name}`
    }
    if (processingMode === AI_PROCESSING_MODES.WHOLE && estimatedSelectedVideos > selectedModel.max_whole_videos) {
      return `${selectedModel.name} supports up to ${selectedModel.max_whole_videos} estimated videos in whole mode. Choose batch mode.`
    }
    if (organizationContextMode === AI_ORGANIZATION_CONTEXT_MODES.FULL_METADATA && (!Number.isInteger(descriptionMaxWords) || descriptionMaxWords < 1 || descriptionMaxWords > 200)) {
      return 'Description limit must be between 1 and 200 words'
    }
    if (organizationContextMode !== AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY && (!Number.isInteger(maxTagsPerVideo) || maxTagsPerVideo < 1 || maxTagsPerVideo > 20)) {
      return 'Tag limit must be between 1 and 20 per video'
    }
    return ''
  }

  function requestValidationError() {
    if (selectedChannels.length === 0) return 'Select at least one channel'
    return validateGenerationOptions()
  }

  async function prepareRequestPayload() {
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
    if (processingMode === AI_PROCESSING_MODES.WHOLE && videos.length > selectedModel.max_whole_videos) {
      throw new Error(`${selectedModel.name} supports up to ${selectedModel.max_whole_videos} videos in whole mode; ${videos.length} were found. Choose batch mode.`)
    }
    const requestVideos = videos.map(video => ({
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
    }))
    const requestSources = selectedChannels.map(channel => ({
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
    }))
    return buildAiCourseRequestPayload({
      modelConfigId: selectedModelId,
      processingMode,
      batchSize,
      organizationContextMode,
      descriptionMaxWords,
      maxTagsPerVideo,
      videos: requestVideos,
      sourceChannels: requestSources,
    })
  }

  async function handlePreviewRequest() {
    const validationError = requestValidationError()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setLoadingAction('preview')
    setError('')
    try {
      setPreviewPayload(await prepareRequestPayload())
      setPreviewTab('visual')
    } catch (err) {
      setError('Unable to prepare request: ' + err.message)
    } finally {
      setLoading(false)
      setLoadingAction('')
    }
  }

  async function handleAiGenerate() {
    const validationError = requestValidationError()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setLoadingAction('submit')
    setError('')
    try {
      const payload = previewPayload || await prepareRequestPayload()
      const accepted = await submitAiCourseRequest(plan.id, payload)
      onRequestSubmitted?.(accepted)
      onClose()
    } catch (err) {
      setError('AI suggest failed: ' + err.message)
    } finally {
      setLoading(false)
      setLoadingAction('')
    }
  }

  function downloadPreviewJson() {
    if (!previewPayload) return
    const file = new Blob([JSON.stringify(previewPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-course-request-${plan.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function closePreview() {
    setPreviewPayload(null)
    setPreviewTab('visual')
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
    setPreviewPayload(null)
    setPreviewTab('visual')
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
  const estimatedSelectedVideos = selectedPlaylists.length
    ? selectedPlaylists.reduce((count, playlist) => count + (playlist.videos_count || playlist.video_count || 0), 0)
    : selectedChannels.reduce((count, channel) => count + (channel.videos_count || channel.video_count || 0), 0)
  const wholeLikelyUnsafe = processingMode === AI_PROCESSING_MODES.WHOLE
    && selectedModel
    && estimatedSelectedVideos > selectedModel.max_whole_videos

  return (
    <>
      <div className="drawer-overlay" onClick={closeDrawer} />
      <div className="drawer-wide">
        <div className="drawer-header">
          <h2>{previewPayload ? 'Preview AI Request' : 'AI Suggested Course Creation'}</h2>
          <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-body add-course-drawer-body">
          {error && <div className="alert alert-error">{error}</div>}

          {!showPlaylists && !previewPayload && (
            <div className="add-course-source-step">
              <section className="ai-course-settings">
                <header><div><span>Generation settings</span><h3>Choose how AI organizes this course</h3></div><small>{modelsLoading ? 'Loading models...' : `${models.length} ready`}</small></header>
                <div className="ai-course-settings-grid">
                  <label className="ai-course-setting-field ai-course-model-field">
                    <span>AI model</span>
                    <select value={selectedModelId} onChange={event => selectModel(event.target.value)}>
                      {!models.length && <option value="">No tested models available</option>}
                      {models.map(model => <option key={model.id} value={model.id}>{model.name} · {model.provider}</option>)}
                    </select>
                    <small>{selectedModel ? `${selectedModel.model} · ${selectedModel.max_input_tokens} token limit` : 'Test and enable a model configuration first.'}</small>
                  </label>

                  <div className="ai-course-setting-field">
                    <span>Processing mode</span>
                    <div className="ai-course-option-toggle">
                      <button type="button" className={processingMode === AI_PROCESSING_MODES.BATCH ? 'active' : ''} onClick={() => setProcessingMode(AI_PROCESSING_MODES.BATCH)}><strong>Batch</strong><small>Recommended</small></button>
                      <button type="button" className={processingMode === AI_PROCESSING_MODES.WHOLE ? 'active' : ''} onClick={() => setProcessingMode(AI_PROCESSING_MODES.WHOLE)}><strong>Whole</strong><small>One model call</small></button>
                    </div>
                  </div>

                  <label className="ai-course-setting-field">
                    <span>Batch size</span>
                    <input type="number" min="1" max={selectedModel?.max_batch_size || 1} value={batchSize} disabled={processingMode !== AI_PROCESSING_MODES.BATCH} onChange={event => setBatchSize(Number(event.target.value))} />
                    <small>{processingMode === AI_PROCESSING_MODES.BATCH ? `Maximum ${selectedModel?.max_batch_size}; worker may reduce it` : 'Not used in whole mode'}</small>
                  </label>

                  <label className="ai-course-setting-field ai-course-context-field">
                    <span>Organization context</span>
                    <select value={organizationContextMode} onChange={event => setOrganizationContextMode(event.target.value)}>
                      <option value={AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY}>Title only — default</option>
                      <option value={AI_ORGANIZATION_CONTEXT_MODES.TITLE_TAGS}>Title + tags</option>
                      <option value={AI_ORGANIZATION_CONTEXT_MODES.FULL_METADATA}>Title + tags + description</option>
                    </select>
                    <small>{organizationContextMode === AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY ? 'Smallest prompt and safest provider capacity.' : organizationContextMode === AI_ORGANIZATION_CONTEXT_MODES.TITLE_TAGS ? 'Adds up to the configured tag limit.' : 'Description is trimmed and may reduce effective batch size.'}</small>
                  </label>

                  {organizationContextMode !== AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY && <label className="ai-course-setting-field"><span>Tags per video</span><input type="number" min="1" max="20" value={maxTagsPerVideo} onChange={event => setMaxTagsPerVideo(Number(event.target.value))} /><small>Maximum 20 tags</small></label>}
                  {organizationContextMode === AI_ORGANIZATION_CONTEXT_MODES.FULL_METADATA && <label className="ai-course-setting-field"><span>Description words</span><input type="number" min="1" max="200" value={descriptionMaxWords} onChange={event => setDescriptionMaxWords(Number(event.target.value))} /><small>Maximum 200 words per video</small></label>}
                </div>
                {wholeLikelyUnsafe && <div className="ai-course-capacity-warning">Estimated {estimatedSelectedVideos} videos exceeds this model's whole-mode preview limit of {selectedModel.max_whole_videos}. Choose batch mode.</div>}
              </section>
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

          {showPlaylists && !previewPayload && (
            <div className="add-course-source-step">
              <div className="ai-course-settings-summary"><span><strong>{selectedModel?.name}</strong><small>{processingMode === AI_PROCESSING_MODES.BATCH ? `Batch · up to ${batchSize} videos` : 'Whole · one model call'}</small></span><span><strong>{organizationContextMode.replaceAll('_', ' ')}</strong><small>{estimatedSelectedVideos || 'Unknown'} estimated videos</small></span></div>
              {wholeLikelyUnsafe && <div className="ai-course-capacity-warning">Whole mode exceeds this model's estimated capacity. Go back and choose batch mode.</div>}
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

          {previewPayload && (
            <AiRequestPreview
              payload={previewPayload}
              model={selectedModel}
              tab={previewTab}
              onTabChange={setPreviewTab}
              onDownload={downloadPreviewJson}
            />
          )}

        </div>
        <div className="drawer-footer">
          {!showPlaylists && !previewPayload && (
            <>
              <button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
              <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading || !selectedModel}>
                {loadingAction === 'playlists' ? <><span className="spinner" /> Loading...</> : 'Playlist Options'}
              </button>
            </>
          )}
          {showPlaylists && !previewPayload && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowPlaylists(false)}>Back</button>
              <button className="btn btn-secondary" onClick={handlePreviewRequest} disabled={loading}>
                {loadingAction === 'preview' ? <><span className="spinner" /> Preparing...</> : 'Preview Request'}
              </button>
              <button className="btn btn-primary" onClick={handleAiGenerate} disabled={loading}>
                {loadingAction === 'submit' ? <><span className="spinner" /> Submitting...</> : 'Submit AI Request'}
              </button>
            </>
          )}
          {previewPayload && (
            <>
              <button className="btn btn-secondary" onClick={closePreview} disabled={loading}>Edit Request</button>
              <button className="btn btn-primary" onClick={handleAiGenerate} disabled={loading}>
                {loadingAction === 'submit' ? <><span className="spinner" /> Submitting...</> : 'Submit AI Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
