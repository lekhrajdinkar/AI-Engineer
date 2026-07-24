import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import PlanDetail from '../components/PlanDetail'
import { WorkspaceIcon } from '../components/Icons'
import LearningPathNav from '../components/LearningPathNav'
import { submitCourseRefreshFeed } from '../api/client'
import { updatePlan } from '../store/plansSlice'
import { rememberLearningLocation, selectWorkspaceState } from '../store/learningUiSlice'

export default function CourseWorkspace() {
  const { planId, courseId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const plan = useSelector(state => state.plans.items.find(item => item.id === planId))
  const rememberedWorkspace = useSelector(state => selectWorkspaceState(state, planId, courseId))
  const syncMetadata = useSelector(state => state.sources.syncMetadata)
  const [showOverview, setShowOverview] = React.useState(false)
  const [isCourseEditing, setIsCourseEditing] = React.useState(false)
  const [refreshLoading, setRefreshLoading] = React.useState(false)
  const [refreshError, setRefreshError] = React.useState('')
  const [showFeedReview, setShowFeedReview] = React.useState(false)
  const [feedReviewTab, setFeedReviewTab] = React.useState('visual')
  const [feedReviewSearch, setFeedReviewSearch] = React.useState('')
  const [feedReviewSort, setFeedReviewSort] = React.useState('name')

  React.useEffect(() => {
    setShowOverview(false)
    setShowFeedReview(false)
    setIsCourseEditing(false)
    setRefreshError('')
  }, [planId, courseId])

  React.useEffect(() => {
    dispatch(rememberLearningLocation({
      planId,
      courseId,
      moduleId: rememberedWorkspace.activeModuleId,
      videoId: rememberedWorkspace.activeVideoId,
    }))
  }, [courseId, dispatch, planId, rememberedWorkspace.activeModuleId, rememberedWorkspace.activeVideoId])

  if (!plan || !plan.courses?.some(course => course.id === courseId)) return <div className="alert alert-info">Course not found.</div>

  const course = plan.courses.find(item => item.id === courseId)
  const videos = course.modules?.flatMap(module => module.videos || []) || []
  const watched = videos.filter(video => video.labels?.includes('watched') || video.watched).length
  const bookmarked = videos.filter(video => video.labels?.includes('bookmarked')).length
  const markedForDelete = videos.filter(video => video.labels?.includes('mark_for_delete')).length
  const progress = videos.length ? Math.round((watched / videos.length) * 100) : 0
  const refreshNeeded = course.labels?.includes('refresh_needed')
  const stagedFeeds = course.new_video_feeds || []
  const stagedVideoCount = stagedFeeds.reduce((count, feed) => count + (feed.videos?.length || 0), 0)
  const reviewVideos = stagedFeeds.flatMap(feed => (feed.videos || []).map(video => ({ ...video, feed })))
    .filter(video => `${video.title || ''} ${video.description || ''}`.toLowerCase().includes(feedReviewSearch.trim().toLowerCase()))
    .sort((left, right) => feedReviewSort === 'date'
      ? new Date(right.published_at || 0) - new Date(left.published_at || 0)
      : (left.title || '').localeCompare(right.title || ''))
  const formatDuration = seconds => seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '—'

  async function submitRefresh() {
    setRefreshLoading(true)
    setRefreshError('')
    try {
      const response = await submitCourseRefreshFeed(planId, courseId)
      dispatch(updatePlan(response.plan))
      setShowFeedReview(false)
    } catch (error) {
      setRefreshError(error.message || 'Unable to submit new video feed')
    } finally {
      setRefreshLoading(false)
    }
  }

  return <div className="course-workspace-page">
    <LearningPathNav className="workspace-detail-breadcrumb" plan={plan} course={course} mode="learn" showHome={false} actions={<div id="workspace-actions" className="workspace-action-panel"><button className={`btn btn-secondary btn-sm icon-button ${refreshNeeded ? 'refresh-needed' : ''}`} title={refreshNeeded ? 'Course refresh needed' : 'Course overview'} aria-label="Course overview" onClick={() => setShowOverview(true)}><WorkspaceIcon name="info" /></button></div>} />
    <PlanDetail key={`${planId}:${courseId}`} plan={plan} workspaceCourseId={courseId} isCourseEditing={isCourseEditing} onToggleCourseEditing={() => setIsCourseEditing(value => !value)} onUpdate={updated => dispatch(updatePlan(updated))} onDelete={() => {}} />
    {showOverview && <><div className="drawer-overlay" onClick={() => setShowOverview(false)} /><aside className="drawer"><div className="drawer-header course-overview-drawer-header"><div><h2>{course.title}</h2>{course.description && <p>{course.description}</p>}</div><button className="btn btn-secondary btn-sm" onClick={() => setShowOverview(false)}>×</button></div><div className="drawer-body">
      {refreshError && <div className="alert alert-error">{refreshError}</div>}
      {stagedVideoCount > 0 && <section className="refresh-review refresh-review-notification"><div><h3>⚠️ New video feed ready</h3><p>{stagedVideoCount} new video{stagedVideoCount === 1 ? '' : 's'} staged across {stagedFeeds.length} source{stagedFeeds.length === 1 ? '' : 's'}.</p></div><button className="btn btn-secondary btn-sm" onClick={() => { setFeedReviewTab('visual'); setFeedReviewSearch(''); setFeedReviewSort('name'); setShowFeedReview(true) }}>Review new videos</button></section>}
      <section className="overview-summary"><div className="overview-progress"><div className="plan-progress-heading"><span>Learning progress</span><strong>{progress}%</strong></div><div className="plan-progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="plan-card-counters"><span>{course.modules?.length || 0} modules</span><span>{watched}/{videos.length} watched</span><span>{bookmarked} bookmarked</span><span>{markedForDelete} marked</span></div></section>
      <section className="workspace-source-section"><div className="source-section-heading"><h3>Content sources</h3></div><p className="course-source-meta">Last sync: {syncMetadata?.updated_at ? new Date(syncMetadata.updated_at).toLocaleString() : 'Not synced yet'}</p>{course.source_channels?.length ? <div className="course-source-list">{course.source_channels.map(channel => { const logo = channel.thumbnail || channel.logo || channel.logo_url; return <div className="course-source-item" key={channel.channel_id}>{logo ? <img src={logo} alt="" className="course-source-logo" /> : <div className="course-source-logo course-source-logo-fallback">{channel.title?.charAt(0).toUpperCase() || '?'}</div>}<div className="course-source-details"><div className="course-source-title">{channel.url ? <a href={channel.url} target="_blank" rel="noreferrer">{channel.title}</a> : channel.title}</div><div className="course-source-meta">{channel.videos_count ?? channel.video_count ?? 0} videos</div><div className="course-source-playlists"><strong>Playlists</strong>{channel.playlists?.length ? channel.playlists.map(playlist => <div className="course-source-playlist" key={playlist.id || playlist.playlist_id}>{playlist.thumbnail && <img src={playlist.thumbnail} alt="" />}<span>{playlist.title}</span></div>) : <span className="course-source-meta">All channel videos</span>}</div></div></div> })}</div> : <p>No sources recorded.</p>}</section>
    </div></aside></>}
    {showFeedReview && <><div className="drawer-overlay" onClick={() => setShowFeedReview(false)} /><aside className="drawer left-refresh-feed-drawer"><div className="drawer-header"><h2>Review new video feed</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowFeedReview(false)}>×</button></div><div className="refresh-feed-tabs"><button className={feedReviewTab === 'visual' ? 'active' : ''} onClick={() => setFeedReviewTab('visual')}>Visual</button><button className={feedReviewTab === 'json' ? 'active' : ''} onClick={() => setFeedReviewTab('json')}>Raw JSON</button></div><div className="refresh-feed-dialog-body">{feedReviewTab === 'visual' ? <><div className="refresh-feed-toolbar"><input value={feedReviewSearch} onChange={event => setFeedReviewSearch(event.target.value)} placeholder="Search new videos..." /><div className="picker-sort-toggle"><button className={feedReviewSort === 'name' ? 'active' : ''} onClick={() => setFeedReviewSort('name')}>Name</button><button className={feedReviewSort === 'date' ? 'active' : ''} onClick={() => setFeedReviewSort('date')}>Date</button></div></div><div className="refresh-feed-visual-list">{reviewVideos.map(video => <article className="refresh-feed-video-card" key={video.video_id}>{video.thumbnail ? <img src={video.thumbnail} alt="" /> : <div className="refresh-feed-video-thumb" />}<div><strong><em>{video.sequence || '—'}.</em> {video.title || 'Untitled video'}</strong><span>{video.feed.playlist_id ? `Playlist: ${video.feed.playlist_id}` : 'Channel feed'} · {video.published_at ? new Date(video.published_at).toLocaleDateString() : 'Date unavailable'} · {formatDuration(video.duration_secs)}</span>{video.description && <p>{video.description}</p>}</div></article>)}{reviewVideos.length === 0 && <p className="refresh-feed-empty">No videos match this search.</p>}</div></> : <pre className="refresh-feed-json">{JSON.stringify(stagedFeeds, null, 2)}</pre>}</div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => setShowFeedReview(false)}>Cancel</button><button className="btn btn-success" disabled={refreshLoading} onClick={submitRefresh}>{refreshLoading ? 'Submitting…' : 'Submit to course'}</button></div></aside></>}
  </div>
}
