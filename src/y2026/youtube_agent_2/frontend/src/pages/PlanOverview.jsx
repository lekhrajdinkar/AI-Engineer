import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import AddCourseModal from '../components/AddCourseModal'
import AiCourseModal from '../components/AiCourseModal'
import { updatePlan } from '../store/plansSlice'
import { deleteCourses, updateCourseLabels, updateCourseMetadata } from '../api/client'
import EditMetadataDrawer from '../components/EditMetadataDrawer'
import { EditIcon, LabelIcon, WorkspaceIcon } from '../components/Icons'

function LearningPlanOverviewDrawer({ plan, sourceChannels, onClose }) {
  const [tab, setTab] = React.useState('visual')
  const modules = plan.courses?.flatMap(course => course.modules || []) || []
  const videos = modules.flatMap(module => module.videos || [])
  const watched = videos.filter(video => video.watched || video.labels?.includes('watched')).length
  const bookmarked = videos.filter(video => video.labels?.includes('bookmarked')).length
  const markedForDelete = videos.filter(video => video.labels?.includes('mark_for_delete')).length
  const progress = videos.length ? Math.round((watched / videos.length) * 100) : 0
  const downloadJson = () => {
    const file = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(plan.name || 'learning-plan').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'learning-plan'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <><div className="drawer-overlay" onClick={onClose} /><aside className="drawer learning-plan-overview-drawer"><div className="drawer-header"><h2>{plan.name}</h2><button className="btn btn-secondary btn-sm" onClick={onClose}>×</button></div><div className="refresh-feed-tabs"><button className={tab === 'visual' ? 'active' : ''} onClick={() => setTab('visual')}>Visual</button><button className={tab === 'json' ? 'active' : ''} onClick={() => setTab('json')}>Raw JSON</button>{tab === 'json' && <button className="overview-download-json" onClick={downloadJson}>Download JSON</button>}</div><div className="drawer-body">{tab === 'visual' ? <><section className="overview-summary"><h3>Learning plan overview</h3><p>{plan.description || 'No description provided.'}</p><div className="overview-progress"><div className="plan-progress-heading"><span>Learning progress</span><strong>{progress}%</strong></div><div className="plan-progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="plan-card-counters"><span>{plan.courses?.length || 0} courses</span><span>{modules.length} modules</span><span>{watched}/{videos.length} watched</span><span>{bookmarked} bookmarked</span><span>{markedForDelete} marked</span></div><div className="plan-card-labels">{plan.labels?.length ? plan.labels.map(label => <span className="badge badge-green" key={label}>{label.replaceAll('_', ' ')}</span>) : <span className="tile-date">No labels</span>}</div><div className="plan-card-timestamps"><span>Created: {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'}</span><span>Updated: {plan.updated_at ? new Date(plan.updated_at).toLocaleString() : '—'}</span></div></section><hr className="overview-section-divider" /><section className="workspace-source-section plan-overview-sources"><h3>Content sources</h3>{sourceChannels.length ? <div className="course-source-list">{sourceChannels.map(channel => <article className="course-source-card" key={channel.channel_id || channel.title}><div className="source-channel-header">{channel.logo_url || channel.thumbnail ? <img src={channel.logo_url || channel.thumbnail} alt="" className="tile-logo" /> : <div className="tile-logo tile-logo-fallback">{channel.title?.charAt(0).toUpperCase() || '?'}</div>}<div><strong>{channel.title}</strong><span>{channel.courseCount} course{channel.courseCount === 1 ? '' : 's'} · {channel.video_count || channel.videos_count || 0} videos</span></div></div>{channel.playlists?.length > 0 ? <div className="course-source-playlists">{channel.playlists.map(playlist => <div className="course-source-playlist" key={playlist.id || playlist.playlist_id}>{playlist.thumbnail && <img src={playlist.thumbnail} alt="" />}<span>{playlist.title}</span></div>)}</div> : <span className="course-source-meta">All channel videos</span>}</article>)}</div> : <p>No content sources recorded.</p>}</section></> : <pre className="refresh-feed-json">{JSON.stringify(plan, null, 2)}</pre>}</div></aside></>
}

export default function PlanOverview() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const plan = useSelector(state => state.plans.items.find(item => item.id === planId))
  const [showManual, setShowManual] = React.useState(false)
  const [showAi, setShowAi] = React.useState(false)
  const [courseToEdit, setCourseToEdit] = React.useState(null)
  const [showOverview, setShowOverview] = React.useState(false)
  const [showSortFilter, setShowSortFilter] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState('updated')
  const [labelFilters, setLabelFilters] = React.useState([])
  const [courseLabelTab, setCourseLabelTab] = React.useState('ALL')
  const courseLabels = [...new Set((plan?.courses || []).flatMap(course => course.labels || []))]
  const visibleCourses = [...(plan?.courses || [])].filter(course => `${course.title} ${course.description || ''}`.toLowerCase().includes(query.toLowerCase()) && (courseLabelTab === 'ALL' || course.labels?.includes(courseLabelTab)) && (labelFilters.length === 0 || labelFilters.some(label => course.labels?.includes(label)))).sort((a, b) => sortBy === 'name' ? a.title.localeCompare(b.title) : new Date(b.updated_at) - new Date(a.updated_at))
  const sourceChannels = Object.values((plan?.courses || []).reduce((sources, course) => {
    const courseVideos = course.modules?.flatMap(module => module.videos || []) || []
    for (const channel of course.source_channels || []) {
      const key = channel.channel_id || channel.url || channel.title
      if (!sources[key]) sources[key] = { ...channel, courseCount: 0, playlists: [], videoIds: new Set() }
      sources[key].courseCount += 1
      courseVideos.forEach(video => sources[key].videoIds.add(video.video_id))
      for (const playlist of channel.playlists || []) {
        if (!sources[key].playlists.some(item => (item.id || item.playlist_id) === (playlist.id || playlist.playlist_id))) sources[key].playlists.push(playlist)
      }
    }
    return sources
  }, {})).map(({ videoIds, ...channel }) => ({ ...channel, videos_count: videoIds.size }))

  if (!plan) return <div className="alert alert-info">Learning plan not found. <button className="btn btn-secondary btn-sm" onClick={() => navigate('/plans')}>Back to plans</button></div>

  return <div className="plan-overview-page">
    <div className="page-header plan-overview-header"><h1 className="plan-overview-title"><span>Learning plan:</span>{plan.logo_url || plan.logo ? <img src={plan.logo_url || plan.logo} alt="" /> : <span className="plan-overview-logo-fallback">{plan.name?.charAt(0).toUpperCase() || '?'}</span>}<span>{plan.name}</span></h1><div className="plan-action-panel"><button className="btn btn-secondary btn-sm icon-button" title="Learning plan overview" aria-label="Learning plan overview" onClick={() => setShowOverview(true)}><WorkspaceIcon name="info" /></button><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search courses..." aria-label="Search courses" /><button className={`btn btn-secondary btn-sm icon-button ${labelFilters.length ? 'active' : ''}`} title="Sort and filter courses" aria-label="Sort and filter courses" onClick={() => setShowSortFilter(true)}><WorkspaceIcon name="sort" /></button><div className="add-course-group"><button className="btn btn-secondary btn-sm" onClick={() => setShowManual(true)}><WorkspaceIcon name="manual" />Manual</button><button className="btn btn-secondary btn-sm" onClick={() => setShowAi(true)}><WorkspaceIcon name="ai" />AI</button></div></div></div>
    <div className="page-header course-toolbar"><h4>Courses <span className="badge badge-green">{plan.courses?.length || 0}</span></h4></div>
    <div className="label-tabs" role="tablist"><button className={courseLabelTab === 'ALL' ? 'active' : ''} onClick={() => setCourseLabelTab('ALL')}>All <span>{plan.courses?.length || 0}</span></button>{courseLabels.map(label => <button key={label} className={courseLabelTab === label ? 'active' : ''} onClick={() => setCourseLabelTab(label)}>{label.replaceAll('_', ' ')} <span>{plan.courses.filter(course => course.labels?.includes(label)).length}</span></button>)}</div>
    <div className="plan-course-list">{visibleCourses.length ? visibleCourses.map(course => {
      const courseVideos = course.modules?.flatMap(module => module.videos || []) || []
      const videos = courseVideos.length
      const watched = courseVideos.filter(video => video.watched || video.labels?.includes('watched')).length
      const bookmarked = courseVideos.filter(video => video.labels?.includes('bookmarked')).length
      const markedForDelete = courseVideos.filter(video => video.labels?.includes('mark_for_delete')).length
      const progress = videos ? Math.round((watched / videos) * 100) : 0
      const logoUrl = course.logo_url || course.logo
      return <article className={`card catalog-tile ${course.labels?.includes('refresh_needed') ? 'refresh-needed-course' : ''}`} key={course.id} onClick={() => navigate(`/plans/${planId}/courses/${course.id}/learn`)}>
        <header className="catalog-tile-header">
          {logoUrl ? <img src={logoUrl} alt="" className="tile-logo" /> : <div className="tile-logo tile-logo-fallback">{course.title?.charAt(0).toUpperCase() || '?'}</div>}
          <div><h3>{course.title}</h3><p>{course.description || 'No description provided.'}</p></div>
        </header>
        <section className="course-card-progress"><div className="plan-progress-heading"><span>Learning progress</span><strong>{progress}%</strong></div><div className="plan-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="plan-card-counters"><span>{course.modules?.length || 0} modules</span><span>{watched}/{videos} watched</span><span>{bookmarked} bookmarked</span><span>{markedForDelete} marked</span></div><div className="plan-card-timestamps"><span>Created: {course.created_at ? new Date(course.created_at).toLocaleString() : '—'}</span><span>Updated: {course.updated_at ? new Date(course.updated_at).toLocaleString() : '—'}</span></div></section>
        <section className="plan-card-labels">{course.labels?.length ? course.labels.map(label => <span className="badge badge-green" key={label}>{label.replaceAll('_', ' ')}</span>) : <span className="tile-date">No labels</span>}</section>
        <footer className="catalog-tile-footer course-card-actions"><div className="course-label-toggle">{['watched', 'bookmarked', 'mark_for_delete'].map(label => <button key={label} className={course.labels?.includes(label) ? 'active' : ''} title={label.replaceAll('_', ' ')} onClick={async event => { event.stopPropagation(); const labels = course.labels?.includes(label) ? course.labels.filter(item => item !== label) : [...(course.labels || []), label]; const response = await updateCourseLabels(plan.id, course.id, labels); dispatch(updatePlan(response.plan)) }}><LabelIcon label={label} /></button>)}</div><button className="btn btn-secondary btn-sm icon-button" title="Edit" onClick={event => { event.stopPropagation(); setCourseToEdit(course) }}><EditIcon /></button></footer>
      </article>
    }) : <div className="card"><p>No courses yet. Add a course from this plan.</p></div>}</div>
    {showManual && <AddCourseModal plan={plan} onClose={() => setShowManual(false)} onCourseCreated={updated => dispatch(updatePlan(updated))} />}
    {showAi && <AiCourseModal plan={plan} onClose={() => setShowAi(false)} onCourseCreated={updated => dispatch(updatePlan(updated))} />}
    {showOverview && <LearningPlanOverviewDrawer plan={plan} sourceChannels={sourceChannels} onClose={() => setShowOverview(false)} />}
    {showSortFilter && <><div className="drawer-overlay" onClick={() => setShowSortFilter(false)} /><aside className="drawer"><div className="drawer-header"><h2>Sort and filter courses</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowSortFilter(false)}>×</button></div><div className="drawer-body"><div className="material-select"><label>Filter by course labels</label><select multiple value={labelFilters} onChange={event => setLabelFilters([...event.target.selectedOptions].map(option => option.value))}><option value="watched">Watched</option><option value="bookmarked">Bookmarked</option><option value="mark_for_delete">Marked for delete</option></select></div><div className="material-select"><label>Sort courses</label><div className="sort-toggle" role="group" aria-label="Sort courses"><button className={sortBy === 'updated' ? 'active' : ''} onClick={() => setSortBy('updated')}>Recently updated</button><button className={sortBy === 'name' ? 'active' : ''} onClick={() => setSortBy('name')}>Name</button></div></div></div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => { setLabelFilters([]); setSortBy('updated') }}>Reset</button><button className="btn btn-primary" onClick={() => setShowSortFilter(false)}>Apply</button></div></aside></>}
    {courseToEdit && <EditMetadataDrawer item={courseToEdit} type="course" onClose={() => setCourseToEdit(null)} onSave={async form => { await updateCourseMetadata(plan.id, courseToEdit.id, { title: form.name, description: form.description, logo_url: form.logo_url }); const response = await updateCourseLabels(plan.id, courseToEdit.id, form.labels); dispatch(updatePlan(response.plan)); setCourseToEdit(null) }} onDelete={async () => { if (!window.confirm(`Delete course “${courseToEdit.title}”? This cannot be undone.`)) return; const response = await deleteCourses(plan.id, [courseToEdit.id]); dispatch(updatePlan(response.plan)); setCourseToEdit(null) }} />}
  </div>
}
