import React from 'react'
import { getAiModelConfigs } from '../api/client'

function formatDuration(seconds) {
  if (!seconds) return 'Duration unavailable'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export default function SourceFeedPreviewDialog({
  preview,
  plans,
  loading,
  aiLoading,
  error,
  onClose,
  onPush,
  onOrganize,
  onConfirmOrganization,
}) {
  const destinations = (preview.targets || []).map(target => {
    const plan = plans.find(item => item.id === target.plan_id)
    const course = plan?.courses?.find(item => item.id === target.course_id)
    return plan && course ? { target, plan, course } : null
  }).filter(Boolean)
  const [courseKey, setCourseKey] = React.useState('')
  const [destinationType, setDestinationType] = React.useState('existing')
  const [moduleId, setModuleId] = React.useState('')
  const [newModuleTitle, setNewModuleTitle] = React.useState('')
  const [selectedVideoIds, setSelectedVideoIds] = React.useState([])
  const [aiProposal, setAiProposal] = React.useState(null)
  const [aiError, setAiError] = React.useState('')
  const [rethinkPrompt, setRethinkPrompt] = React.useState('')
  const [aiModels, setAiModels] = React.useState([])
  const [aiModelsLoading, setAiModelsLoading] = React.useState(true)
  const [selectedModelId, setSelectedModelId] = React.useState('')
  const [showManualConfirmation, setShowManualConfirmation] = React.useState(false)

  React.useEffect(() => {
    let active = true
    getAiModelConfigs({ enabled: true }).then(data => {
      if (!active) return
      const available = data.items || []
      const defaultModel = available.find(model => model.is_default) || available[0]
      setAiModels(available)
      setSelectedModelId(defaultModel?.id || '')
    }).catch(requestError => {
      if (active) setAiError(`Unable to load AI models: ${requestError.message}`)
    }).finally(() => {
      if (active) setAiModelsLoading(false)
    })
    return () => { active = false }
  }, [])

  React.useEffect(() => {
    const first = destinations[0]
    setCourseKey(first ? `${first.plan.id}:${first.course.id}` : '')
    setDestinationType(first?.course.modules?.length ? 'existing' : 'new')
    setModuleId(first?.course.modules?.[0]?.id || '')
    setNewModuleTitle('')
  }, [preview.channelId, preview.playlistId])

  React.useEffect(() => {
    setSelectedVideoIds([])
    setAiProposal(null)
    setAiError('')
    setRethinkPrompt('')
    setShowManualConfirmation(false)
  }, [preview.videos])

  React.useEffect(() => {
    setShowManualConfirmation(false)
  }, [courseKey, destinationType, moduleId, newModuleTitle])

  const selected = destinations.find(
    item => `${item.plan.id}:${item.course.id}` === courseKey
  )
  const modules = [...(selected?.course.modules || [])]
    .sort((left, right) => (left.sequence || 0) - (right.sequence || 0))

  const selectCourse = value => {
    setCourseKey(value)
    const next = destinations.find(
      item => `${item.plan.id}:${item.course.id}` === value
    )
    const firstModule = [...(next?.course.modules || [])]
      .sort((left, right) => (left.sequence || 0) - (right.sequence || 0))[0]
    setDestinationType(firstModule ? 'existing' : 'new')
    setModuleId(firstModule?.id || '')
    setNewModuleTitle('')
  }

  const canPush = selected && (
    (destinationType === 'existing' && moduleId)
    || (destinationType === 'new' && newModuleTitle.trim())
  ) && selectedVideoIds.length > 0

  const allSelected = selectedVideoIds.length === preview.videos.length
  const changeSelection = updater => {
    setSelectedVideoIds(updater)
    setAiProposal(null)
    setAiError('')
    setRethinkPrompt('')
    setShowManualConfirmation(false)
  }
  const toggleAll = () => changeSelection(
    allSelected
      ? []
      : preview.videos.map(video => video.video_id || video.id).filter(Boolean)
  )
  const toggleVideo = videoId => changeSelection(current => (
    current.includes(videoId)
      ? current.filter(item => item !== videoId)
      : [...current, videoId]
  ))

  const submit = () => {
    if (!canPush) return
    setShowManualConfirmation(false)
    onPush({
      channelId: preview.channelId,
      playlistId: preview.playlistId,
      planId: selected.plan.id,
      courseId: selected.course.id,
      moduleId: destinationType === 'existing' ? moduleId : null,
      newModuleTitle: destinationType === 'new' ? newModuleTitle.trim() : null,
      videoIds: selectedVideoIds,
    })
  }

  const requestOrganization = async ({ rethink = false } = {}) => {
    if (!selectedVideoIds.length) return
    setAiError('')
    try {
      const response = await onOrganize({
        channelId: preview.channelId,
        playlistId: preview.playlistId,
        videoIds: selectedVideoIds,
        modelConfigId: selectedModelId,
        userPrompt: rethink ? rethinkPrompt.trim() : null,
        previousSuggestion: rethink ? aiProposal?.proposal : null,
      })
      setAiProposal(response)
      setRethinkPrompt('')
    } catch (requestError) {
      setAiError(requestError.message || 'Unable to generate an AI organization proposal.')
    }
  }

  const proceedWithOrganization = async () => {
    if (!aiProposal?.proposal?.placements?.length) return
    setAiError('')
    try {
      await onConfirmOrganization({
        channelId: preview.channelId,
        playlistId: preview.playlistId,
        placements: aiProposal.proposal.placements,
      })
      setAiProposal(null)
    } catch (requestError) {
      setAiError(requestError.message || 'Unable to apply the AI organization proposal.')
    }
  }

  const destinationName = placement => {
    const plan = plans.find(item => item.id === placement.plan_id)
    const course = plan?.courses?.find(item => item.id === placement.course_id)
    const module = course?.modules?.find(item => item.id === placement.module_id)
    return {
      course: course ? `${plan.name} → ${course.title}` : placement.course_id,
      module: module?.title || placement.module_id,
    }
  }
  const selectedModel = aiModels.find(model => model.id === selectedModelId)
  const manualDestination = destinationType === 'existing'
    ? modules.find(module => module.id === moduleId)?.title
    : newModuleTitle.trim()

  return <div className="modal-overlay source-feed-preview-overlay" onMouseDown={event => {
    if (event.target === event.currentTarget && !loading && !aiLoading) onClose()
  }}>
    <section className="source-feed-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="source-feed-preview-title">
      <header className="source-feed-preview-header">
        <div>
          <h2 id="source-feed-preview-title">Preview new feed</h2>
          <p>{preview.title} · {preview.videos.length} new video{preview.videos.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-secondary btn-sm" disabled={loading || aiLoading} onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="source-feed-preview-body">
        <div className="source-feed-preview-list-pane">
          <div className="source-feed-selection-toolbar">
            <label><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all</label>
            <span>{selectedVideoIds.length} of {preview.videos.length} selected</span>
          </div>
          <div className="source-feed-preview-videos">
            {preview.videos.map(video => {
              const videoId = video.video_id || video.id
              const checked = selectedVideoIds.includes(videoId)
              return <article className={`source-feed-video-tile ${checked ? 'selected' : ''}`} key={videoId}>
                <label className="source-feed-video-select" aria-label={`Select ${video.title || 'video'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleVideo(videoId)} />
                  <span />
                </label>
                {video.thumbnail ? <img src={video.thumbnail} alt="" /> : <div className="source-feed-video-thumb" />}
                <div className="source-feed-video-copy">
                  <strong title={video.title || 'Untitled video'}>{video.title || 'Untitled video'}</strong>
                  <p>{video.description || 'No description available.'}</p>
                  <span>{video.published_at ? new Date(video.published_at).toLocaleDateString() : 'Date unavailable'} · {formatDuration(video.duration_secs)}{video.view_count ? ` · ${Number(video.view_count).toLocaleString()} views` : ''}</span>
                </div>
                {video.url && <a href={video.url} target="_blank" rel="noreferrer" aria-label={`Open ${video.title || 'video'} on YouTube`}>↗</a>}
              </article>
            })}
          </div>
        </div>

        <aside className="source-feed-destination">
          <h3>Manual push</h3>
          <p>Choose where these videos should be added.</p>
          <label>
            Course
            <span className="source-feed-modern-select">
              <select value={courseKey} onChange={event => selectCourse(event.target.value)}>
                {destinations.map(({ plan, course }) => <option key={`${plan.id}:${course.id}`} value={`${plan.id}:${course.id}`}>
                  {plan.name} → {course.title}
                </option>)}
              </select>
            </span>
          </label>

          {destinations.length === 0 && <div className="alert alert-error">This feed has no available target courses.</div>}
          {selected && <>
            <div className="source-feed-destination-tabs" role="group" aria-label="Module destination">
              <button type="button" className={destinationType === 'existing' ? 'active' : ''} disabled={!modules.length} onClick={() => setDestinationType('existing')}>Existing module</button>
              <button type="button" className={destinationType === 'new' ? 'active' : ''} onClick={() => setDestinationType('new')}>Create module</button>
            </div>
            {destinationType === 'existing'
              ? <label>
                  Module
                  <span className="source-feed-modern-select">
                    <select value={moduleId} onChange={event => setModuleId(event.target.value)}>
                      {modules.map(module => <option key={module.id} value={module.id}>{module.sequence}. {module.title}</option>)}
                    </select>
                  </span>
                </label>
              : <label>
                  New module name
                  <input value={newModuleTitle} onChange={event => setNewModuleTitle(event.target.value)} placeholder="e.g. New videos" autoFocus />
                </label>}
          </>}
          {showManualConfirmation && selected && <section className="source-feed-manual-confirmation">
            <span>Confirm manual push</span>
            <strong>{selectedVideoIds.length} video{selectedVideoIds.length === 1 ? '' : 's'}</strong>
            <p>Move to {selected.plan.name} → {selected.course.title} → {manualDestination}?</p>
            <div>
              <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => setShowManualConfirmation(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={loading} onClick={submit}>{loading ? 'Pushing…' : 'Confirm push'}</button>
            </div>
          </section>}
          <section className="source-feed-ai-config">
            <h4>AI organization</h4>
            <label>
              AI model
              <span className="source-feed-modern-select">
                <select value={selectedModelId} disabled={aiModelsLoading || aiLoading} onChange={event => { setSelectedModelId(event.target.value); setAiProposal(null); setAiError('') }}>
                  {aiModels.length === 0 && <option value="">{aiModelsLoading ? 'Loading configured models…' : 'No enabled models'}</option>}
                  {aiModels.map(model => <option key={model.id} value={model.id}>{model.name} · {model.model}</option>)}
                </select>
              </span>
            </label>
            {selectedModel && <small>{selectedModel.provider} · {selectedModel.structured_output_mode === 'auto' ? 'automatic structured output' : selectedModel.structured_output_mode}</small>}
          </section>
          {aiProposal && <section className="source-feed-ai-proposal">
            <span className="source-feed-ai-kicker">AI suggestion · {aiProposal.model?.name}</span>
            <h4>Review before proceeding</h4>
            <p>{aiProposal.proposal.summary}</p>
            <div className="source-feed-ai-placements">
              {aiProposal.proposal.placements.map(placement => {
                const destination = destinationName(placement)
                const video = preview.videos.find(item => (item.video_id || item.id) === placement.video_id)
                return <article key={placement.video_id}>
                  <strong>{video?.title || placement.video_id}</strong>
                  <span>{destination.course}</span>
                  <span>Module: {destination.module}</span>
                  {placement.reason && <small>{placement.reason}</small>}
                </article>
              })}
            </div>
            <label>
              Re-think instructions
              <textarea value={rethinkPrompt} onChange={event => setRethinkPrompt(event.target.value)} placeholder="Example: Put architecture videos together and keep beginner content first." rows="3" />
            </label>
            <div className="source-feed-ai-actions">
              <button className="btn btn-secondary btn-sm" disabled={aiLoading || !rethinkPrompt.trim()} onClick={() => requestOrganization({ rethink: true })}>{aiLoading ? 'Thinking…' : 'Re-think'}</button>
              <button className="btn btn-primary btn-sm" disabled={aiLoading} onClick={proceedWithOrganization}>{aiLoading ? 'Applying…' : 'Proceed'}</button>
            </div>
          </section>}
          {aiLoading && !aiProposal && <div className="source-feed-ai-thinking"><span className="spinner" /> Organising selected videos…</div>}
          {aiError && <div className="alert alert-error">{aiError}</div>}
          {error && <div className="alert alert-error">{error}</div>}
        </aside>
      </div>

      <footer className="source-feed-preview-footer">
        <span>{selectedVideoIds.length} video{selectedVideoIds.length === 1 ? '' : 's'} selected</span>
        <button className="btn btn-secondary" disabled={loading || aiLoading || !selectedVideoIds.length || !selectedModelId} onClick={() => requestOrganization()}>{aiLoading ? 'Organising…' : 'Organise with AI'}</button>
        <button className="btn btn-primary" disabled={loading || aiLoading || !canPush} onClick={() => setShowManualConfirmation(true)}>{loading ? 'Pushing…' : `Push ${selectedVideoIds.length || ''} manually`}</button>
      </footer>
    </section>
  </div>
}
