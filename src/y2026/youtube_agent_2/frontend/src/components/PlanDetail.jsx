import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddCourseModal from './AddCourseModal'
import AiCourseModal from './AiCourseModal'
import { deleteCourses, getPlan, reorderCourseVideos, updateCourseLabels, updateCourseMetadata, updateModuleLabels, updateVideoLabels } from '../api/client'
import { LabelIcon, WorkspaceIcon } from './Icons'

export default function PlanDetail({ plan, onUpdate, onDelete, workspaceCourseId, isCourseEditing = false, onActiveModuleChange, onActiveVideoChange }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState(workspaceCourseId || null)
  const [expandedModules, setExpandedModules] = useState({})
  const [activeVideo, setActiveVideo] = useState(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedVideoIds, setSelectedVideoIds] = useState([])
  const [labelError, setLabelError] = useState('')
  const [videoLabelFilters, setVideoLabelFilters] = useState([])
  const [showVideoFilter, setShowVideoFilter] = useState(false)
  const [moduleFilters, setModuleFilters] = useState([])
  const [draggedVideo, setDraggedVideo] = useState(null)
  const [pendingVideoMove, setPendingVideoMove] = useState(null)

  // Build tab list: Overview + each course
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(plan.courses || []).map(c => ({ id: c.id, label: c.title }))
  ]
  const [activeTab, setActiveTab] = useState(workspaceCourseId || 'overview')

  const activeCourse = plan.courses?.find(c => c.id === activeCourseId) || null
  useEffect(() => {
    if (!workspaceCourseId || activeVideo || !activeCourse?.last_played_video_id) return
    const lastPlayedVideo = activeCourse.modules
      ?.flatMap(module => module.videos || [])
      .find(video => video.video_id === activeCourse.last_played_video_id)
    if (lastPlayedVideo) {
      setActiveVideo(lastPlayedVideo)
      const module = activeCourse.modules?.find(item => item.videos?.some(video => video.video_id === lastPlayedVideo.video_id))
      onActiveModuleChange?.(module ? `${module.sequence || activeCourse.modules.indexOf(module) + 1}. ${module.title}` : '')
      onActiveVideoChange?.(`${lastPlayedVideo.sequence || module?.videos?.indexOf(lastPlayedVideo) + 1}. ${lastPlayedVideo.title || ''}`)
    }
  }, [workspaceCourseId, activeCourse, activeVideo, onActiveModuleChange])
  const normalizedCourseSearch = courseSearch.trim().toLowerCase()
  const visibleModules = activeCourse?.modules
    ?.map(module => {
      const moduleMatches = module.title?.toLowerCase().includes(normalizedCourseSearch)
      const matchingVideos = module.videos?.filter(video =>
        video.title?.toLowerCase().includes(normalizedCourseSearch) &&
        (videoLabelFilters.length === 0 || videoLabelFilters.every(label => video.labels?.includes(label)))
      ) || []

      return moduleMatches && videoLabelFilters.length === 0 ? module : { ...module, videos: matchingVideos }
    })
    .filter(module => (!normalizedCourseSearch || module.videos?.length > 0) && (moduleFilters.length === 0 || moduleFilters.includes(module.id))) || []

  function handleCourseCreated(updatedPlan) {
    onUpdate(updatedPlan)
  }

  function withToggledLabel(labels = [], label) {
    return labels.includes(label) ? labels.filter(item => item !== label) : [...labels, label]
  }

  async function refreshPlanAfterChange() {
    const savedPlan = await getPlan(plan.id)
    onUpdate(savedPlan)
    if (activeVideo) {
      const refreshedVideo = savedPlan.courses.flatMap(course => course.modules).flatMap(module => module.videos)
        .find(video => video.video_id === activeVideo.video_id)
      if (refreshedVideo) setActiveVideo(refreshedVideo)
    }
  }

  async function toggleWatched(videoId) {
    const location = plan.courses.flatMap(course => course.modules.map(module => ({ course, module })))
      .find(({ module }) => module.videos.some(video => video.video_id === videoId))
    const video = location?.module.videos.find(item => item.video_id === videoId)
    if (!location || !video) return
    try {
      setLabelError('')
      await updateVideoLabels(plan.id, location.course.id, location.module.id, videoId, withToggledLabel(video.labels, 'watched'))
      await refreshPlanAfterChange()
    } catch (error) {
      setLabelError(error.message || 'Unable to update video labels')
    }
  }

  function toggleModule(moduleId) {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
    const module = activeCourse?.modules?.find(item => item.id === moduleId)
    onActiveModuleChange?.(module ? `${module.sequence || activeCourse.modules.indexOf(module) + 1}. ${module.title}` : '')
  }

  function expandAllModules() {
    setExpandedModules(Object.fromEntries((activeCourse?.modules || []).map(module => [module.id, true])))
  }

  function collapseAllModules() {
    setExpandedModules({})
  }

  function toggleVideoSelection(videoId) {
    setSelectedVideoIds(previous =>
      previous.includes(videoId)
        ? previous.filter(id => id !== videoId)
        : [...previous, videoId]
    )
  }

  async function applyBulkVideoLabel(label) {
    if (selectedVideoIds.length === 0) return
    try {
      setLabelError('')
      const selectedIds = new Set(selectedVideoIds)
      for (const course of plan.courses) {
        for (const module of course.modules) {
          for (const video of module.videos) {
            if (selectedIds.has(video.video_id)) {
              await updateVideoLabels(plan.id, course.id, module.id, video.video_id, withToggledLabel(video.labels, label))
            }
          }
        }
      }
      await refreshPlanAfterChange()
      setSelectedVideoIds([])
    } catch (error) {
      setLabelError(error.message || 'Unable to update video labels')
    }
  }

  async function toggleVideoLabel(video, label) {
    const location = plan.courses.flatMap(course => course.modules.map(module => ({ course, module })))
      .find(({ module }) => module.videos.some(item => item.video_id === video.video_id))
    if (!location) return
    try {
      setLabelError('')
      await updateVideoLabels(plan.id, location.course.id, location.module.id, video.video_id, withToggledLabel(video.labels, label))
      await refreshPlanAfterChange()
    } catch (error) {
      setLabelError(error.message || 'Unable to update video labels')
    }
  }

  async function toggleCourseLabel(label) {
    if (!activeCourse) return
    try {
      setLabelError('')
      await updateCourseLabels(plan.id, activeCourse.id, withToggledLabel(activeCourse.labels, label))
      await refreshPlanAfterChange()
    } catch (error) {
      setLabelError(error.message || 'Unable to update course labels')
    }
  }

  async function toggleModuleLabel(module, label) {
    try {
      setLabelError('')
      await updateModuleLabels(plan.id, activeCourse.id, module.id, withToggledLabel(module.labels, label))
      await refreshPlanAfterChange()
    } catch (error) {
      setLabelError(error.message || 'Unable to update module labels')
    }
  }

  async function handleDeleteCourse(courseId) {
    try {
      setLabelError('')
      const response = await deleteCourses(plan.id, [courseId])
      onUpdate(response.plan)
      setActiveTab('overview')
      setActiveCourseId(null)
    } catch (error) {
      setLabelError(error.message || 'Unable to delete course')
    }
  }

  async function handleVideoSelect(video) {
    setActiveVideo(video)
    const course = plan.courses?.find(c =>
      c.modules?.some(m => m.videos?.some(v => v.video_id === video.video_id))
    )
    if (course) {
      setActiveTab(course.id)
      setActiveCourseId(course.id)
      const module = course.modules?.find(item => item.videos?.some(item => item.video_id === video.video_id))
      onActiveModuleChange?.(module ? `${module.sequence || course.modules.indexOf(module) + 1}. ${module.title}` : '')
      onActiveVideoChange?.(`${video.sequence || module?.videos?.indexOf(video) + 1}. ${video.title || ''}`)
      try {
        const response = await updateCourseMetadata(plan.id, course.id, { last_played_video_id: video.video_id })
        onUpdate(response.plan)
      } catch (error) {
        setLabelError(error.message || 'Unable to save the last played video')
      }
    }
  }

  function handleVideoDragStart(event, sourceModuleId, video) {
    setDraggedVideo({ sourceModuleId, video })
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', video.video_id)
  }

  async function persistVideoMove(move) {
    if (!activeCourse) return
    try {
      setLabelError('')
      const response = await reorderCourseVideos(plan.id, activeCourse.id, {
        video_id: move.video.video_id,
        source_module_id: move.sourceModuleId,
        target_module_id: move.targetModuleId,
        target_index: move.targetIndex,
      })
      onUpdate(response.plan)
    } catch (error) {
      setLabelError(error.message || 'Unable to reorder video')
    } finally {
      setDraggedVideo(null)
      setPendingVideoMove(null)
    }
  }

  function handleVideoDrop(event, targetModuleId, targetIndex) {
    event.preventDefault()
    event.stopPropagation()
    if (!draggedVideo || draggedVideo.sourceModuleId === targetModuleId && draggedVideo.video.video_id === activeCourse?.modules?.find(module => module.id === targetModuleId)?.videos?.[targetIndex]?.video_id) return
    const move = { ...draggedVideo, targetModuleId, targetIndex }
    if (move.sourceModuleId === targetModuleId) {
      persistVideoMove(move)
    } else {
      setPendingVideoMove(move)
    }
  }

  function getYoutubeEmbedUrl(url) {
    if (!url) return null
    let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
    match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) return `https://www.youtube.com/embed/${url}?autoplay=1`
    return null
  }

  function formatDuration(secs) {
    if (!secs || secs <= 0) return ''
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const totalVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0), 0
  ) || 0

  const watchedVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0), 0
  ) || 0

  const embedUrl = activeVideo ? getYoutubeEmbedUrl(activeVideo.url || activeVideo.video_id) : null
  const activeModule = activeCourse?.modules?.find(module => module.videos?.some(video => video.video_id === activeVideo?.video_id))
  const activeModuleSequence = activeModule ? (activeModule.sequence || activeCourse.modules.indexOf(activeModule) + 1) : null
  const activeVideoSequence = activeVideo && activeModule ? (activeVideo.sequence || activeModule.videos.findIndex(video => video.video_id === activeVideo.video_id) + 1) : null
  const workspaceActionHost = typeof document !== 'undefined' ? document.getElementById('workspace-actions') : null
  const allModulesExpanded = Boolean(activeCourse?.modules?.length) && activeCourse.modules.every(module => expandedModules[module.id])
  const workspaceActions = activeCourse && <><div className="workspace-module-search"><input type="search" value={courseSearch} onChange={event => setCourseSearch(event.target.value)} placeholder="Search modules or videos..." aria-label="Search modules or videos" /></div><div className="workspace-course-labels">{['watched', 'bookmarked', 'mark_for_delete'].map(label => <button key={label} className={activeCourse.labels?.includes(label) ? 'active' : ''} onClick={() => toggleCourseLabel(label)} title={label.replaceAll('_', ' ')}><LabelIcon label={label} /></button>)}</div><button className="btn btn-secondary btn-sm workspace-action-button" title={allModulesExpanded ? 'Collapse all modules' : 'Expand all modules'} onClick={allModulesExpanded ? collapseAllModules : expandAllModules}><WorkspaceIcon name={allModulesExpanded ? 'collapse' : 'expand'} /></button><button className="btn btn-secondary btn-sm icon-button" title="Filter videos" onClick={() => setShowVideoFilter(true)}><WorkspaceIcon name="filter" /></button></>

  return (
    <div>{workspaceCourseId && workspaceActionHost && createPortal(workspaceActions, workspaceActionHost)}{showVideoFilter && <><div className="drawer-overlay" onClick={() => setShowVideoFilter(false)} /><aside className="drawer"><div className="drawer-header"><h2>Filters</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowVideoFilter(false)}>×</button></div><div className="drawer-body"><div className="material-select"><label>Filter by video label</label><select multiple value={videoLabelFilters} onChange={event => setVideoLabelFilters([...event.target.selectedOptions].map(option => option.value))}><option value="watched">Watched</option><option value="bookmarked">Bookmarked</option><option value="mark_for_delete">Marked for delete</option></select></div><div className="material-select"><label>Filter by modules</label><select multiple value={moduleFilters} onChange={event => setModuleFilters([...event.target.selectedOptions].map(option => option.value))}>{activeCourse?.modules?.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div></div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => { setVideoLabelFilters([]); setModuleFilters([]) }}>Clear</button><button className="btn btn-primary" onClick={() => setShowVideoFilter(false)}>Apply</button></div></aside></>}{pendingVideoMove && <><div className="drawer-overlay" onClick={() => setPendingVideoMove(null)} /><div className="confirm-dialog"><h2>Move video to another module?</h2><p>“{pendingVideoMove.video.title}” will be moved to a different module.</p><div className="confirm-actions"><button className="btn btn-secondary" onClick={() => setPendingVideoMove(null)}>Cancel</button><button className="btn btn-primary" onClick={() => persistVideoMove(pendingVideoMove)}>Move video</button></div></div></>}
      {/* Tab bar: Overview + per-course tabs */}
      {!workspaceCourseId && <div className="plan-tab-bar" style={{ overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`plan-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id !== 'overview') {
                setActiveCourseId(tab.id)
                setSelectedVideoIds([])
              } else {
                setActiveCourseId(null)
                setSelectedVideoIds([])
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>}
      {labelError && <div className="alert alert-error">{labelError}</div>}

      {/* OVERVIEW TAB */}
      {!workspaceCourseId && activeTab === 'overview' && (
        <div className="overview-layout">
          <div>
            {plan.description && <p style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>}
          </div>

          {/* Middle scrollable 70%: Courses + source channels */}
          <div className="overview-middle">
            {/* Course details list */}
            {plan.courses && plan.courses.length > 0 && (
              <div className="course-tile-container">
                {plan.courses.map(course => {
                  const courseVideos = course.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0) || 0
                  const courseWatched = course.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0) || 0
                  const initial = (course.title || '?').charAt(0).toUpperCase()
                  return (
                    <div
                      key={course.id}
                      className="course-tile"
                      onClick={() => {
                        setActiveTab(course.id)
                        setActiveCourseId(course.id)
                      }}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        marginBottom: '0.5rem',
                        background: 'var(--card-bg)',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {course.logo ? (
                        <img src={course.logo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div className="channel-avatar" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: '0.9rem' }}>{initial}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</h4>
                        <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' , fontSize: '0.7rem' }}>{course.description}</p>
                      <details style={{ marginTop: '0.35rem' }}  onClick={e => e.stopPropagation()} >
                        <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#666' }}>
                          Course Source  ({course.source_channels?.length || 0})
                        </summary>

                        {course.source_channels?.map(channel => (
                          <a
                            key={channel.channel_id}
                            href={channel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit', marginTop: '0.3rem' }}
                          >
                            <img src="https://cdn.simpleicons.org/youtube/FF0000" alt="" height="14" />
                            <span>{channel.title}</span>
                          </a>
                        ))}
                      </details>
                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-blue">{course.modules?.length || 0} modules</span>
                          <span className="badge badge-gray">{courseVideos} videos</span>
                          <span className="badge badge-green">{courseWatched} watched</span>
                        </div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={event => { event.stopPropagation(); handleDeleteCourse(course.id) }}>
                        Delete Course
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Source Channels */}
            {plan.channels && plan.channels.length > 0 && (
              <div className="card">
                <h3>Content Source</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {plan.channels.map(c => (
                    <span key={c.channel_id} className="badge badge-gray" style={{ padding: '0.4rem 0.8rem' }}>
                      {c.title} ({c.videos_count} videos)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!plan.courses || plan.courses.length === 0) && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <p>No courses yet. Use the action buttons below to add courses.</p>
              </div>
            )}
          </div>

          {/* Bottom 10%: Fixed action bar */}
          <div className="overview-bottom">
            <div className="action-bar" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Course Manually
              </button>
              <button className="btn btn-warning" onClick={() => setShowAiModal(true)}>
                ✨ AI Suggested Course Creation
              </button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete Plan
              </button>
              {showDeleteConfirm && (
                <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                    <h3>Delete Learning Plan</h3>
                    <p>Are you sure you want to delete "<strong>{plan.name}</strong>"? This action cannot be undone.</p>
                    <div className="confirm-actions">
                      <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="btn btn-danger" onClick={async () => {
                        if (await onDelete(plan.id)) setShowDeleteConfirm(false)
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PER-COURSE TABS */}
      {activeTab !== 'overview' && activeCourse && (
        <div className="course-layout">
          {/* Left panel: YouTube video player */}
          <div className="course-left">
            {embedUrl ? (
              <div className="video-player-container">
                <iframe
                  src={embedUrl}
                  title={activeVideo?.title || 'YouTube Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="video-player-info">
                  {activeModule && <div className="video-player-sequence">Module {activeModuleSequence}: {activeModule.title} <span>·</span> Video {activeVideoSequence}</div>}
                  <h3>{activeVideo?.title}</h3>
                  <p>{activeVideo?.description || ''}</p>
                  <div className="video-player-actions">
                    <button
                      className={`btn btn-sm ${activeVideo?.watched ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => activeVideo && toggleWatched(activeVideo.video_id)}
                    >
                      {activeVideo?.watched ? '✓ Watched' : 'Mark as Watched'}
                    </button>
                    {activeVideo?.url && (
                      <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        Open in YouTube ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-video-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" />
                </svg>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select a Video</h3>
                <p>Expand a module and click a video to start watching.</p>
              </div>
            )}
          </div>

          {/* Right panel: Course modules with expandable videos */}
          <div className="course-right">
            {!workspaceCourseId && <div className="course-module-search">
              <input
                type="search"
                value={courseSearch}
                onChange={event => setCourseSearch(event.target.value)}
                placeholder="Search modules or videos..."
                aria-label="Search modules or videos"
              />
            </div>}
            {!workspaceCourseId && <div className="label-actions">
              <span>Course labels</span>
              {['watched', 'bookmarked', 'mark_for_delete'].map(label => (
                <button key={label} className={activeCourse.labels?.includes(label) ? 'active' : ''} onClick={() => toggleCourseLabel(label)} aria-label={`Toggle ${label.replaceAll('_', ' ')}`} title={label.replaceAll('_', ' ')}>
                  <LabelIcon label={label} />
                </button>
              ))}
            </div>}
            {selectedVideoIds.length > 0 && (
              <div className="bulk-video-actions">
                <span>{selectedVideoIds.length} selected</span>
                <button className="btn btn-secondary btn-sm" onClick={() => applyBulkVideoLabel('bookmarked')}>
                  Bookmark
                </button>
                <button className="btn btn-success btn-sm" onClick={() => applyBulkVideoLabel('watched')}>
                  Mark complete
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => applyBulkVideoLabel('mark_for_delete')}>
                  Mark for delete
                </button>
              </div>
            )}
            {visibleModules.map((module, moduleIndex) => {
              const isExpanded = expandedModules[module.id] || Boolean(normalizedCourseSearch)
              return (
              <div key={module.id}>
                <div className="module-header" onClick={() => toggleModule(module.id)}>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                  <span className="module-tree-title"><small>Module {module.sequence || moduleIndex + 1}</small>{module.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {module.videos?.length || 0}
                  </span>
                  <div className="module-label-actions" onClick={event => event.stopPropagation()}>
                    {['watched', 'bookmarked', 'mark_for_delete'].map(label => (
                      <button key={label} className={module.labels?.includes(label) ? 'active' : ''} onClick={() => toggleModuleLabel(module, label)} aria-label={`Toggle ${label.replaceAll('_', ' ')}`} title={label.replaceAll('_', ' ')}>
                        <LabelIcon label={label} />
                      </button>
                    ))}
                  </div>
                </div>
                {isExpanded && (
                  <div className="module-videos" onDragOver={event => event.preventDefault()} onDrop={event => handleVideoDrop(event, module.id, module.videos?.length || 0)}>
                    {module.videos?.map((video, videoIndex) => (
                      <div
                        key={video.video_id}
                        className={`module-video-item ${activeVideo?.video_id === video.video_id ? 'active' : ''} ${video.labels?.includes('mark_for_delete') ? 'marked-for-delete' : ''}`}
                        onClick={() => handleVideoSelect(video)}
                        draggable={isCourseEditing}
                        onDragStart={isCourseEditing ? event => handleVideoDragStart(event, module.id, video) : undefined}
                        onDragEnd={isCourseEditing ? () => setDraggedVideo(null) : undefined}
                        onDragOver={isCourseEditing ? event => event.preventDefault() : undefined}
                        onDrop={isCourseEditing ? event => handleVideoDrop(event, module.id, videoIndex) : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(video.video_id)}
                          onClick={event => event.stopPropagation()}
                          onChange={() => toggleVideoSelection(video.video_id)}
                          aria-label={`Select ${video.title}`}
                          style={{ flexShrink: 0 }}
                        />
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="module-video-thumbnail" />
                        ) : (
                          <div className="module-video-thumbnail module-video-thumbnail-placeholder" />
                        )}
                        <div className="module-video-content">
                          <div className={`video-tree-title ${video.labels?.includes('watched') ? 'watched' : ''}`}>{video.sequence || videoIndex + 1}. {video.title}</div>
                          {video.description && <p>{video.description}</p>}
                          <div className="module-video-flags">
                            {video.labels?.includes('bookmarked') && <span>Bookmarked</span>}
                            {video.labels?.includes('mark_for_delete') && <span>Marked for deletion</span>}
                          </div>
                        </div>
                        <div className="video-label-actions" onClick={event => event.stopPropagation()}>
                          {['watched', 'bookmarked', 'mark_for_delete'].map(label => (
                            <button
                              key={label}
                              className={video.labels?.includes(label) ? 'active' : ''}
                              onClick={() => toggleVideoLabel(video, label)}
                              aria-label={`Toggle ${label.replaceAll('_', ' ')} for ${video.title}`}
                              title={label.replaceAll('_', ' ')}
                            >
                              <LabelIcon label={label} />
                            </button>
                          ))}
                        </div>
                        {video.duration_secs > 0 && (
                          <span className="video-duration">{formatDuration(video.duration_secs)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
            {normalizedCourseSearch && visibleModules.length === 0 && (
              <p className="course-search-empty">No modules or videos match “{courseSearch}”.</p>
            )}
            {(!activeCourse.modules || activeCourse.modules.length === 0) && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No modules in this course.</p>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddCourseModal
          plan={plan}
          onClose={() => setShowAddModal(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}
      {showAiModal && (
        <AiCourseModal
          plan={plan}
          onClose={() => setShowAiModal(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}
    </div>
  )
}
