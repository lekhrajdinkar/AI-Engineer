import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import LearningPathNav from '../components/LearningPathNav'

export default function CourseOverview() {
  const { planId, courseId } = useParams()
  const navigate = useNavigate()
  const plan = useSelector(state => state.plans.items.find(item => item.id === planId))
  const course = plan?.courses?.find(item => item.id === courseId)
  if (!course) return <div className="alert alert-info">Course not found. <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/plans/${planId}`)}>Back to plan</button></div>
  const videos = course.modules?.flatMap(module => module.videos || []) || []
  const watched = videos.filter(video => video.labels?.includes('watched') || video.watched).length
  const bookmarked = videos.filter(video => video.labels?.includes('bookmarked')).length
  const markedForDelete = videos.filter(video => video.labels?.includes('mark_for_delete')).length
  return <div>
    <LearningPathNav plan={plan} course={course} />
    <div className="page-header"><h1>{course.title}</h1><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/plans/${planId}`)}>← {plan.name}</button></div>
    <div className="card"><h3>Course overview</h3><p>{course.description || 'No description provided.'}</p><div className="metadata-row"><span>Created: {course.created_at ? new Date(course.created_at).toLocaleString() : '—'}</span><span>Updated: {course.updated_at ? new Date(course.updated_at).toLocaleString() : '—'}</span></div><div className="grid-3"><div><strong>{course.modules?.length || 0}</strong><br />Modules</div><div><strong>{videos.length}</strong><br />Total videos</div><div><strong>{watched}</strong><br />✓ Watched</div><div><strong>{bookmarked}</strong><br />🔖 Bookmarked</div><div><strong>{markedForDelete}</strong><br />🗑 Marked for delete</div><div><strong>{videos.length - watched}</strong><br />Unwatched</div></div></div>
    <div className="card"><h3>Content sources</h3>{course.source_channels?.length ? <div className="course-source-list">{course.source_channels.map(channel => {
      const logo = channel.thumbnail || channel.logo || channel.logo_url
      const playlists = channel.playlists || []
      return <div className="course-source-item" key={channel.channel_id}>
        {logo ? <img src={logo} alt="" className="course-source-logo" /> : <div className="course-source-logo course-source-logo-fallback">{channel.title?.charAt(0).toUpperCase() || '?'}</div>}
        <div className="course-source-details"><div className="course-source-title">{channel.url ? <a href={channel.url} target="_blank" rel="noreferrer">{channel.title}</a> : channel.title}</div><div className="course-source-meta">{channel.video_count ?? channel.videos_count ?? 0} videos · {channel.channel_id}</div><div className="course-source-playlists"><strong>Playlists</strong>{playlists.length ? playlists.map(playlist => <div className="course-source-playlist" key={playlist.id || playlist.playlist_id}>{playlist.thumbnail && <img src={playlist.thumbnail} alt="" />}<span>{playlist.title}</span></div>) : <span className="course-source-meta">All channel videos</span>}</div></div>
      </div>
    })}</div> : <p>No sources recorded.</p>}</div>
    <button className="btn btn-primary" onClick={() => navigate(`/plans/${planId}/courses/${courseId}/learn`)}>Continue learning</button>
  </div>
}
