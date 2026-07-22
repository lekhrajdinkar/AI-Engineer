import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { AI_REQUEST_STATUSES, isTerminalAiRequestStatus } from '../api/client'
import { createMockAiRequests } from '../api/mockAiRequests'

const statusLabel = status => status?.replaceAll('_', ' ') || 'unknown'
const formatDate = value => value ? new Date(value).toLocaleString() : '—'
const requestProgress = request => request.total_videos
  ? Math.round((request.processed_videos / request.total_videos) * 100)
  : 0

function StatusBadge({ status }) {
  return <span className={`ai-request-status ai-request-status-${status}`}>{statusLabel(status)}</span>
}

function RequestListItem({ request, selected, onSelect }) {
  const progress = requestProgress(request)
  return (
    <button type="button" className={`ai-request-list-item ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="ai-request-list-heading">
        <strong>{request.id}</strong>
        <StatusBadge status={request.status} />
      </span>
      <span className="ai-request-model">{request.model_snapshot.name}<small>{request.model_snapshot.provider} / {request.model_snapshot.model}</small></span>
      <span className="ai-request-progress-copy"><span>{request.processed_videos}/{request.total_videos} videos</span><strong>{progress}%</strong></span>
      <span className="ai-request-progress-track"><span style={{ width: `${progress}%` }} /></span>
      <span className="ai-request-list-meta">{request.completed_batches}/{request.total_batches} batches · {formatDate(request.created_at)}</span>
    </button>
  )
}

function DetailField({ label, children }) {
  return <div className="ai-request-detail-field"><span>{label}</span><strong>{children ?? '—'}</strong></div>
}

function RequestDetails({ request }) {
  if (!request) return <section className="ai-request-detail-empty">Select a request to view captured details.</section>
  const progress = requestProgress(request)
  return (
    <section className="ai-request-detail">
      <header className="ai-request-detail-header">
        <div><span>Request</span><h2>{request.id}</h2></div>
        <StatusBadge status={request.status} />
      </header>

      <div className="ai-request-detail-progress">
        <div><span>Overall progress</span><strong>{request.processed_videos}/{request.total_videos} videos · {progress}%</strong></div>
        <span className="ai-request-progress-track"><span style={{ width: `${progress}%` }} /></span>
      </div>

      {request.error_message && <div className="alert alert-error"><strong>{request.error_code}</strong><br />{request.error_message}</div>}

      <section className="ai-request-detail-section">
        <h3>Captured options</h3>
        <div className="ai-request-detail-grid">
          <DetailField label="Model">{request.model_snapshot.name}</DetailField>
          <DetailField label="Provider">{request.model_snapshot.provider}</DetailField>
          <DetailField label="Processing">{statusLabel(request.processing_mode)}</DetailField>
          <DetailField label="Context">{statusLabel(request.organization_context.mode)}</DetailField>
          <DetailField label="Requested batch">{request.requested_batch_size ?? 'Not applicable'}</DetailField>
          <DetailField label="Effective batch">{request.effective_batch_size ?? 'Not applicable'}</DetailField>
          <DetailField label="Description limit">{request.organization_context.mode === 'full_metadata' ? `${request.organization_context.description_max_words} words` : 'Not included'}</DetailField>
          <DetailField label="Generation mode">{request.generation_mode ? statusLabel(request.generation_mode) : 'Not started'}</DetailField>
        </div>
      </section>

      <section className="ai-request-detail-section">
        <h3>Selected sources</h3>
        <div className="ai-request-source-list">{request.selected_sources.map(source => (
          <article key={source.channel_id}><div><strong>{source.title}</strong><span>{source.video_count} selected videos</span></div><small>{source.playlists.length ? source.playlists.join(' · ') : 'All channel videos'}</small></article>
        ))}</div>
      </section>

      <section className="ai-request-detail-section">
        <h3>Batch details</h3>
        {request.batches.length ? <div className="ai-request-batch-list">{request.batches.map(batch => (
          <article key={batch.number}><span className="ai-request-batch-number">{batch.number}</span><div><strong>Batch {batch.number}</strong><small>{batch.video_count} videos · {batch.model}</small></div><StatusBadge status={batch.status} /><span>{batch.duration_secs ? `${batch.duration_secs}s` : '—'}</span></article>
        ))}</div> : <p className="ai-request-muted">No provider batches were created.</p>}
      </section>

      <section className="ai-request-detail-section">
        <h3>Attempt history</h3>
        <div className="ai-request-attempt-list">{request.attempts.map(attempt => (
          <article key={attempt.number}><span className={`ai-request-attempt-dot ${attempt.status}`} /><div><strong>{attempt.event}</strong><small>{formatDate(attempt.at)}</small></div></article>
        ))}</div>
      </section>

      <section className="ai-request-detail-section ai-request-timestamps">
        <h3>Timestamps</h3>
        <div className="ai-request-detail-grid">
          <DetailField label="Created">{formatDate(request.created_at)}</DetailField>
          <DetailField label="Started">{formatDate(request.started_at)}</DetailField>
          <DetailField label="Updated">{formatDate(request.updated_at)}</DetailField>
          <DetailField label="Completed">{formatDate(request.completed_at)}</DetailField>
        </div>
      </section>

      {request.created_course_ids.length > 0 && <section className="ai-request-detail-section"><h3>Created courses</h3><div className="ai-request-result-list">{request.created_course_ids.map(id => <span key={id}>{id}</span>)}</div></section>}
    </section>
  )
}

export default function AiRequests() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const plan = useSelector(state => state.plans.items.find(item => item.id === planId))
  const [requests] = React.useState(() => createMockAiRequests(planId))
  const [selectedId, setSelectedId] = React.useState(() => requests[0]?.id || null)
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [lastCheckedAt, setLastCheckedAt] = React.useState(() => new Date())
  const [checking, setChecking] = React.useState(false)
  const checkingTimer = React.useRef(null)
  const selectedRequest = requests.find(request => request.id === selectedId)
  const hasActiveRequests = requests.some(request => !isTerminalAiRequestStatus(request.status))
  const visibleRequests = statusFilter === 'all' ? requests : requests.filter(request => request.status === statusFilter)

  const checkNow = React.useCallback(() => {
    setChecking(true)
    setLastCheckedAt(new Date())
    window.clearTimeout(checkingTimer.current)
    checkingTimer.current = window.setTimeout(() => setChecking(false), 350)
  }, [])

  React.useEffect(() => {
    if (!hasActiveRequests) return undefined
    const interval = window.setInterval(checkNow, 60_000)
    return () => window.clearInterval(interval)
  }, [checkNow, hasActiveRequests])

  React.useEffect(() => () => window.clearTimeout(checkingTimer.current), [])

  if (!plan) return <div className="alert alert-info">Learning plan not found. <button className="btn btn-secondary btn-sm" onClick={() => navigate('/plans')}>Back to plans</button></div>

  return (
    <div className="ai-requests-page">
      <header className="page-header ai-requests-header">
        <div><button type="button" className="ai-requests-back" onClick={() => navigate(`/plans/${planId}`)}>← {plan.name}</button><h1>AI Requests</h1><p>Monitor queued course-generation requests and inspect captured processing details.</p></div>
        <div className="ai-requests-refresh"><span>Last checked {lastCheckedAt.toLocaleTimeString()}<small>{hasActiveRequests ? 'Automatic check every 1 minute' : 'Automatic checks paused'}</small></span><button className="btn btn-secondary" type="button" onClick={checkNow} disabled={checking}>{checking ? <><span className="spinner" /> Checking...</> : 'Check now'}</button></div>
      </header>

      <div className="alert alert-info ai-requests-mock-notice">Mock data preview — backend request APIs are not connected yet.</div>

      <div className="ai-request-filter-bar">
        <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All <span>{requests.length}</span></button>
        {AI_REQUEST_STATUSES.map(status => {
          const count = requests.filter(request => request.status === status).length
          return count ? <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>{statusLabel(status)} <span>{count}</span></button> : null
        })}
      </div>

      <div className="ai-request-workspace">
        <aside className="ai-request-list" aria-label="AI request parent records">
          <header><div><h2>Requests</h2><span>{visibleRequests.length} records</span></div></header>
          <div>{visibleRequests.map(request => <RequestListItem key={request.id} request={request} selected={selectedId === request.id} onSelect={() => setSelectedId(request.id)} />)}{visibleRequests.length === 0 && <p className="ai-request-muted">No requests match this status.</p>}</div>
        </aside>
        <RequestDetails request={selectedRequest} />
      </div>
    </div>
  )
}
