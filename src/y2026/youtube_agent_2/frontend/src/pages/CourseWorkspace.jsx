import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import PlanDetail from '../components/PlanDetail'
import { WorkspaceIcon } from '../components/Icons'
import { updatePlan } from '../store/plansSlice'

export default function CourseWorkspace() {
  const { planId, courseId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const plan = useSelector(state => state.plans.items.find(item => item.id === planId))
  const [showOverview, setShowOverview] = React.useState(false)
  const [isCourseEditing, setIsCourseEditing] = React.useState(false)
  const [activeModuleName, setActiveModuleName] = React.useState('')
  const [activeVideoTitle, setActiveVideoTitle] = React.useState('')

  if (!plan || !plan.courses?.some(course => course.id === courseId)) return <div className="alert alert-info">Course not found.</div>

  const course = plan.courses.find(item => item.id === courseId)
  const videos = course.modules?.flatMap(module => module.videos || []) || []
  const watched = videos.filter(video => video.labels?.includes('watched') || video.watched).length
  const bookmarked = videos.filter(video => video.labels?.includes('bookmarked')).length
  const markedForDelete = videos.filter(video => video.labels?.includes('mark_for_delete')).length
  const progress = videos.length ? Math.round((watched / videos.length) * 100) : 0
  const breadcrumbLabel = value => value?.length > 100 ? `${value.slice(0, 100)}…` : value

  return <div>
    <div className="page-header workspace-header"><nav className="workspace-breadcrumb" aria-label="Workspace breadcrumb"><span>Learning Workspace</span><span aria-hidden="true">›</span><button type="button" className="workspace-breadcrumb-link" onClick={() => navigate(`/plans/${planId}`)}>{breadcrumbLabel(plan.name)}</button><span aria-hidden="true">›</span><button type="button" className="workspace-breadcrumb-link" onClick={() => navigate(`/plans/${planId}/courses/${courseId}`)}>{breadcrumbLabel(course.title)}</button><span aria-hidden="true">›</span><span>{breadcrumbLabel(activeModuleName || 'Module')}</span><span aria-hidden="true">›</span><strong>{breadcrumbLabel(activeVideoTitle || 'Video')}</strong></nav><div id="workspace-actions" className="workspace-action-panel"><button className="btn btn-secondary btn-sm icon-button" title="Course overview" aria-label="Course overview" onClick={() => setShowOverview(true)}><WorkspaceIcon name="info" /></button><button className={`btn btn-secondary btn-sm icon-button course-edit-mode-button ${isCourseEditing ? 'active' : ''}`} title={isCourseEditing ? 'Finish editing course order' : 'Edit course order'} aria-label={isCourseEditing ? 'Finish editing course order' : 'Edit course order'} aria-pressed={isCourseEditing} onClick={() => setIsCourseEditing(value => !value)}><WorkspaceIcon name="edit" /></button></div></div>
    <PlanDetail plan={plan} workspaceCourseId={courseId} isCourseEditing={isCourseEditing} onActiveModuleChange={setActiveModuleName} onActiveVideoChange={setActiveVideoTitle} onUpdate={updated => dispatch(updatePlan(updated))} onDelete={() => {}} />
    {showOverview && <><div className="drawer-overlay" onClick={() => setShowOverview(false)} /><aside className="drawer"><div className="drawer-header"><h2>{course.title}</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowOverview(false)}>×</button></div><div className="drawer-body"><section className="overview-summary"><h3>Course overview</h3><p>{course.description || 'No description provided.'}</p><div className="overview-progress"><div className="plan-progress-heading"><span>Learning progress</span><strong>{progress}%</strong></div><div className="plan-progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="plan-card-counters"><span>{course.modules?.length || 0} modules</span><span>{watched}/{videos.length} watched</span><span>{bookmarked} bookmarked</span><span>{markedForDelete} marked</span></div><div className="plan-card-labels">{course.labels?.length ? course.labels.map(label => <span className="badge badge-green" key={label}>{label.replaceAll('_', ' ')}</span>) : <span className="tile-date">No labels</span>}</div><div className="plan-card-timestamps"><span>Created: {course.created_at ? new Date(course.created_at).toLocaleString() : '—'}</span><span>Updated: {course.updated_at ? new Date(course.updated_at).toLocaleString() : '—'}</span></div></section><div className="workspace-source-section"><h3>Content sources</h3>{course.source_channels?.length ? <div className="course-source-list">{course.source_channels.map(channel => { const logo = channel.thumbnail || channel.logo || channel.logo_url; return <div className="course-source-item" key={channel.channel_id}>{logo ? <img src={logo} alt="" className="course-source-logo" /> : <div className="course-source-logo course-source-logo-fallback">{channel.title?.charAt(0).toUpperCase() || '?'}</div>}<div className="course-source-details"><div className="course-source-title">{channel.url ? <a href={channel.url} target="_blank" rel="noreferrer">{channel.title}</a> : channel.title}</div><div className="course-source-meta">{channel.video_count ?? channel.videos_count ?? 0} videos</div><div className="course-source-playlists"><strong>Playlists</strong>{channel.playlists?.length ? channel.playlists.map(playlist => <div className="course-source-playlist" key={playlist.id || playlist.playlist_id}>{playlist.thumbnail && <img src={playlist.thumbnail} alt="" />}<span>{playlist.title}</span></div>) : <span className="course-source-meta">All channel videos</span>}</div></div></div> })}</div> : <p>No sources recorded.</p>}</div></div></aside></>}
  </div>
}
