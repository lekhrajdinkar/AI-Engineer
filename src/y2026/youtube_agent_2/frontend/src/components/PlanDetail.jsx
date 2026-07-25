import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import AddCourseModal from './AddCourseModal'
import AiCourseModal from './AiCourseModal'
import DismissibleError from './DismissibleError'
import { deleteCourses, getPlan, reorderCourseVideos, updateCourseLabels, updateCourseMetadata, updateModuleLabels, updateVideoLabels, updateVideoPlayback } from '../api/client'
import { LabelIcon, WorkspaceIcon } from './Icons'
import {
  DEFAULT_WORKSPACE_STATE,
  rememberLearningLocation,
  selectWorkspaceState,
  updateWorkspace,
} from '../store/learningUiSlice'

function WorkspaceFilterDrawer({ modules, videoLabels, moduleIds, setVideoLabels, setModuleIds, deletedVideoVisibility, setDeletedVideoVisibility, onClose }) {
  const toggle = (values, value, setter) => setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value])
  return <><div className="drawer-overlay workspace-filter-overlay" onClick={onClose} /><aside className="drawer workspace-filter-drawer"><div className="drawer-header"><h2>Filters</h2><button className="btn btn-secondary btn-sm" onClick={onClose}>×</button></div><div className="drawer-body"><section className="workspace-filter-section"><label>Deleted videos</label><div className="sort-toggle"><button className={deletedVideoVisibility === 'hide' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('hide')}>Hide</button><button className={deletedVideoVisibility === 'include' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('include')}>Include</button><button className={deletedVideoVisibility === 'only' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('only')}>Only marked</button></div></section><section className="workspace-filter-section"><label>Filter by video label</label>{[['watched', 'Watched'], ['bookmarked', 'Bookmarked']].map(([value, text]) => <label className="filter-checkbox" key={value}><input type="checkbox" checked={videoLabels.includes(value)} onChange={() => toggle(videoLabels, value, setVideoLabels)} />{text}</label>)}</section><section className="workspace-filter-section workspace-module-filter"><label>Filter by modules</label>{modules.map((module, index) => <label className="filter-checkbox" key={module.id}><input type="checkbox" checked={moduleIds.includes(module.id)} onChange={() => toggle(moduleIds, module.id, setModuleIds)} /><span className="module-filter-label"><small>Module {module.sequence || index + 1}</small>{module.title}</span></label>)}</section></div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => { setVideoLabels([]); setModuleIds([]); setDeletedVideoVisibility('hide') }}>Clear</button><button className="btn btn-primary" onClick={onClose}>Apply</button></div></aside></>
}

let youtubeApiPromise
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise(resolve => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previousReady?.(); resolve(window.YT) }
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

function YouTubePlayer({ videoId, startSeconds = 0, onPause, onComplete }) {
  const hostRef = useRef(null)
  useEffect(() => {
    let player
    let disposed = false
    loadYouTubeApi().then(YT => {
      if (disposed || !hostRef.current) return
      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { autoplay: 1, start: Math.floor(startSeconds), enablejsapi: 1, origin: window.location.origin },
        events: {
          onStateChange: event => {
            if (event.data === YT.PlayerState.PAUSED) onPause?.(event.target.getCurrentTime())
            if (event.data === YT.PlayerState.ENDED) onComplete?.()
          },
        },
      })
    })
    return () => { disposed = true; player?.destroy() }
  }, [videoId])
  return <div ref={hostRef} className="youtube-player-host" />
}

export default function PlanDetail({ plan, onUpdate, onDelete, workspaceCourseId, isCourseEditing = false, onToggleCourseEditing, onActiveModuleChange, onActiveVideoChange }) {
  const dispatch = useDispatch()
  const rememberedWorkspace = useSelector(state => workspaceCourseId
    ? selectWorkspaceState(state, plan.id, workspaceCourseId)
    : DEFAULT_WORKSPACE_STATE)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState(workspaceCourseId || null)
  const [expandedModules, setExpandedModules] = useState(() => Object.fromEntries(rememberedWorkspace.expandedModuleIds.map(id => [id, true])))
  const [activeVideo, setActiveVideo] = useState(() => plan.courses
    ?.flatMap(course => course.modules || [])
    .flatMap(module => module.videos || [])
    .find(video => video.video_id === rememberedWorkspace.activeVideoId) || null)
  const [courseSearch, setCourseSearch] = useState(rememberedWorkspace.search)
  const [selectedVideoIds, setSelectedVideoIds] = useState([])
  const [labelError, setLabelError] = useState('')
  const [videoLabelFilters, setVideoLabelFilters] = useState(rememberedWorkspace.videoLabelFilters)
  const [deletedVideoVisibility, setDeletedVideoVisibility] = useState(rememberedWorkspace.deletedVideoVisibility)
  const [showVideoFilter, setShowVideoFilter] = useState(false)
  const [moduleFilters, setModuleFilters] = useState(rememberedWorkspace.moduleFilters)
  const [showDescriptionDrawer, setShowDescriptionDrawer] = useState(false)
  const [showModuleTree, setShowModuleTree] = useState(false)
  const [draggedVideo, setDraggedVideo] = useState(null)
  const [pendingVideoMove, setPendingVideoMove] = useState(null)

  useEffect(() => {
    if (!isCourseEditing) setSelectedVideoIds([])
  }, [isCourseEditing])

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
      if (module) {
        setExpandedModules(previous => ({ ...previous, [module.id]: true }))
        window.setTimeout(() => document.querySelector('.module-video-item.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0)
      }
      onActiveModuleChange?.(module ? { sequence: module.sequence || activeCourse.modules.indexOf(module) + 1, total: activeCourse.modules.length, title: module.title } : null)
      onActiveVideoChange?.(module ? { sequence: lastPlayedVideo.sequence || module.videos.indexOf(lastPlayedVideo) + 1, total: module.videos.length, title: lastPlayedVideo.title } : null)
    }
  }, [workspaceCourseId, activeCourse, activeVideo, onActiveModuleChange])
  const normalizedCourseSearch = courseSearch.trim().toLowerCase()
  const visibleModules = activeCourse?.modules
    ?.map(module => {
      const moduleMatches = module.title?.toLowerCase().includes(normalizedCourseSearch)
      const matchingVideos = module.videos?.filter(video => {
        const markedForDelete = video.labels?.includes('mark_for_delete')
        const matchesDeleteVisibility = deletedVideoVisibility === 'include' || (deletedVideoVisibility === 'only' ? markedForDelete : !markedForDelete)
        return (!normalizedCourseSearch || moduleMatches || video.title?.toLowerCase().includes(normalizedCourseSearch)) &&
          matchesDeleteVisibility &&
          (videoLabelFilters.length === 0 || videoLabelFilters.every(label => video.labels?.includes(label)))
      }) || []
      return { ...module, videos: matchingVideos }
    })
    .filter(module => module.videos?.length > 0 && (moduleFilters.length === 0 || moduleFilters.includes(module.id))) || []

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

  function toggleModule(moduleId) {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
    const module = activeCourse?.modules?.find(item => item.id === moduleId)
    onActiveModuleChange?.(module ? { sequence: module.sequence || activeCourse.modules.indexOf(module) + 1, total: activeCourse.modules.length, title: module.title } : null)
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
      onUpdate(await getPlan(plan.id))
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
      const response = await updateVideoLabels(plan.id, location.course.id, location.module.id, video.video_id, withToggledLabel(video.labels, label))
      onUpdate(response.plan)
    } catch (error) {
      setLabelError(error.message || 'Unable to update video labels')
    }
  }

  async function toggleCourseLabel(label) {
    if (!activeCourse) return
    try {
      setLabelError('')
      const response = await updateCourseLabels(plan.id, activeCourse.id, withToggledLabel(activeCourse.labels, label))
      onUpdate(response.plan)
    } catch (error) {
      setLabelError(error.message || 'Unable to update course labels')
    }
  }

  async function toggleModuleLabel(module, label) {
    try {
      setLabelError('')
      const response = await updateModuleLabels(plan.id, activeCourse.id, module.id, withToggledLabel(module.labels, label))
      onUpdate(response.plan)
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
    setShowModuleTree(false)
    const course = plan.courses?.find(c =>
      c.modules?.some(m => m.videos?.some(v => v.video_id === video.video_id))
    )
    if (course) {
      setActiveTab(course.id)
      setActiveCourseId(course.id)
      const module = course.modules?.find(item => item.videos?.some(item => item.video_id === video.video_id))
      onActiveModuleChange?.(module ? { sequence: module.sequence || course.modules.indexOf(module) + 1, total: course.modules.length, title: module.title } : null)
      onActiveVideoChange?.(module ? { sequence: video.sequence || module.videos.indexOf(video) + 1, total: module.videos.length, title: video.title } : null)
    }
  }

  async function savePlaybackPosition(seconds) {
    if (!activeCourse || !activeModule || !activeVideo) return
    try {
      const response = await updateVideoPlayback(plan.id, activeCourse.id, activeModule.id, activeVideo.video_id, Math.max(0, Math.floor(seconds || 0)))
      onUpdate(response.plan)
    } catch (error) {
      setLabelError(error.message || 'Unable to save playback position')
    }
  }

  async function markActiveVideoWatched() {
    if (!activeCourse || !activeModule || !activeVideo || activeVideo.labels?.includes('watched')) return
    try {
      const response = await updateVideoLabels(plan.id, activeCourse.id, activeModule.id, activeVideo.video_id, [...(activeVideo.labels || []), 'watched'])
      onUpdate(response.plan)
    } catch (error) {
      setLabelError(error.message || 'Unable to mark video as watched')
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

  function getYoutubeVideoId(url) {
    if (!url) return null
    let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
    match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) return url
    return null
  }

  function formatDuration(secs) {
    if (!secs || secs <= 0) return ''
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    const seconds = secs % 60
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const totalVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.length || 0), 0), 0
  ) || 0

  const watchedVideos = plan.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.videos?.filter(v => v.watched)?.length || 0), 0), 0
  ) || 0

  const youtubeVideoId = activeVideo ? getYoutubeVideoId(activeVideo.url || activeVideo.video_id) : null
  const restorePosition = activeVideo?.last_played_position_secs || (activeVideo?.video_id === activeCourse?.last_played_video_id ? activeCourse.last_played_position_secs || 0 : 0)
  const activeModule = activeCourse?.modules?.find(module => module.videos?.some(video => video.video_id === activeVideo?.video_id))
  const activeModuleSequence = activeModule ? (activeModule.sequence || activeCourse.modules.indexOf(activeModule) + 1) : null
  const activeVideoSequence = activeVideo && activeModule ? (activeVideo.sequence || activeModule.videos.findIndex(video => video.video_id === activeVideo.video_id) + 1) : null
  useEffect(() => {
    if (!workspaceCourseId) return
    const activeModuleId = activeModule?.id || rememberedWorkspace.activeModuleId || null
    dispatch(updateWorkspace({
      planId: plan.id,
      courseId: workspaceCourseId,
      changes: {
        activeModuleId,
        activeVideoId: activeVideo?.video_id || null,
        expandedModuleIds: Object.keys(expandedModules).filter(id => expandedModules[id]),
        search: courseSearch,
        videoLabelFilters,
        moduleFilters,
        deletedVideoVisibility,
      },
    }))
    dispatch(rememberLearningLocation({
      planId: plan.id,
      courseId: workspaceCourseId,
      moduleId: activeModuleId,
      videoId: activeVideo?.video_id || null,
    }))
  }, [
    activeModule?.id,
    activeVideo?.video_id,
    courseSearch,
    deletedVideoVisibility,
    dispatch,
    expandedModules,
    moduleFilters,
    plan.id,
    rememberedWorkspace.activeModuleId,
    videoLabelFilters,
    workspaceCourseId,
  ])
  const workspaceActionHost = typeof document !== 'undefined' ? document.getElementById('workspace-actions') : null
  const allModulesExpanded = Boolean(activeCourse?.modules?.length) && activeCourse.modules.every(module => expandedModules[module.id])
  const workspaceActions = activeCourse && <><button className="btn btn-secondary btn-sm icon-button workspace-module-tree-button" title="Open modules and chapters" aria-label="Open modules and chapters" aria-expanded={showModuleTree} onClick={() => setShowModuleTree(true)}><WorkspaceIcon name="menu" /></button><button className="btn btn-secondary btn-sm icon-button" title="Filter videos" aria-label="Filter videos" onClick={() => setShowVideoFilter(true)}><WorkspaceIcon name="filter" /></button></>

  return (
    <div>{workspaceCourseId && workspaceActionHost && createPortal(workspaceActions, workspaceActionHost)}{showDescriptionDrawer && activeVideo && <><div className="drawer-overlay" onClick={() => setShowDescriptionDrawer(false)} /><aside className="drawer left-description-drawer"><div className="drawer-header"><h2>{activeVideo.title}</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowDescriptionDrawer(false)}>×</button></div><div className="drawer-body"><p className="full-video-description">{activeVideo.description || 'No description provided.'}</p></div></aside></>}{showVideoFilter && <><div className="drawer-overlay" onClick={() => setShowVideoFilter(false)} /><aside className="drawer"><div className="drawer-header"><h2>Filters</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowVideoFilter(false)}>×</button></div><div className="drawer-body"><section className="workspace-filter-section"><label>Deleted videos</label><div className="sort-toggle"><button className={deletedVideoVisibility === 'hide' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('hide')}>Hide</button><button className={deletedVideoVisibility === 'include' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('include')}>Include</button><button className={deletedVideoVisibility === 'only' ? 'active' : ''} onClick={() => setDeletedVideoVisibility('only')}>Only marked</button></div></section><div className="material-select"><label>Filter by video label</label><select multiple value={videoLabelFilters} onChange={event => setVideoLabelFilters([...event.target.selectedOptions].map(option => option.value))}><option value="watched">Watched</option><option value="bookmarked">Bookmarked</option></select></div><div className="material-select"><label>Filter by modules</label><select multiple value={moduleFilters} onChange={event => setModuleFilters([...event.target.selectedOptions].map(option => option.value))}>{activeCourse?.modules?.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div></div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => { setVideoLabelFilters([]); setModuleFilters([]); setDeletedVideoVisibility('hide') }}>Clear</button><button className="btn btn-primary" onClick={() => setShowVideoFilter(false)}>Apply</button></div></aside></>}{pendingVideoMove && <><div className="drawer-overlay" onClick={() => setPendingVideoMove(null)} /><div className="confirm-dialog"><h2>Move video to another module?</h2><p>“{pendingVideoMove.video.title}” will be moved to a different module.</p><div className="confirm-actions"><button className="btn btn-secondary" onClick={() => setPendingVideoMove(null)}>Cancel</button><button className="btn btn-primary" onClick={() => persistVideoMove(pendingVideoMove)}>Move video</button></div></div></>}
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
      <DismissibleError message={labelError} />

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
            {youtubeVideoId ? (
              <div className="video-player-container">
                <YouTubePlayer videoId={youtubeVideoId} startSeconds={restorePosition} onPause={savePlaybackPosition} onComplete={markActiveVideoWatched} />
                <div className="video-player-info">
                  {activeModule && <div className="video-player-sequence">
                    <span>Module {activeModuleSequence}: {activeModule.title} <i>·</i> Video {activeVideoSequence}</span>
                    {activeVideo?.url && <a href={activeVideo.url} target="_blank" rel="noopener noreferrer">YouTube ↗</a>}
                  </div>}
                  <h3>{activeVideo?.title}</h3>
                  <p>{activeVideo?.description || ''}</p>
                  {activeVideo?.description && <button className="video-description-more" onClick={() => setShowDescriptionDrawer(true)}>Show more</button>}
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
          {workspaceCourseId && showModuleTree && <button type="button" className="workspace-module-tree-overlay" aria-label="Close modules and chapters" onClick={() => setShowModuleTree(false)} />}
          <div className={`course-right ${workspaceCourseId ? 'workspace-module-tree' : ''} ${showModuleTree ? 'mobile-open' : ''} ${isCourseEditing ? 'editing' : ''}`}>
            {workspaceCourseId && <div className="workspace-module-tree-header"><div><span>Course outline</span><strong>{activeCourse.title}</strong></div><button type="button" className="btn btn-secondary btn-sm icon-button" aria-label="Close modules and chapters" onClick={() => setShowModuleTree(false)}>×</button></div>}
            {workspaceCourseId && <div className="workspace-tree-toolbar">
              <div className="workspace-module-search"><input type="search" value={courseSearch} onChange={event => setCourseSearch(event.target.value)} placeholder="Search modules or videos..." aria-label="Search modules or videos" /></div>
              <button type="button" className={`btn btn-secondary btn-sm icon-button ${isCourseEditing ? 'active' : ''}`} title={isCourseEditing ? 'Finish editing course order' : 'Edit course order'} aria-label={isCourseEditing ? 'Finish editing course order' : 'Edit course order'} aria-pressed={isCourseEditing} onClick={onToggleCourseEditing}><WorkspaceIcon name="edit" /></button>
              <button type="button" className="btn btn-secondary btn-sm icon-button" title={allModulesExpanded ? 'Collapse all modules' : 'Expand all modules'} aria-label={allModulesExpanded ? 'Collapse all modules' : 'Expand all modules'} onClick={allModulesExpanded ? collapseAllModules : expandAllModules}><WorkspaceIcon name={allModulesExpanded ? 'collapse' : 'expand'} /></button>
            </div>}
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
            {isCourseEditing && (
              <div className="bulk-video-actions">
                <span>{selectedVideoIds.length} selected</span>
                <button className="btn btn-secondary btn-sm" disabled={selectedVideoIds.length === 0} onClick={() => applyBulkVideoLabel('bookmarked')}>
                  <LabelIcon label="bookmarked" /><span>Bookmark</span>
                </button>
                <button className="btn btn-success btn-sm" disabled={selectedVideoIds.length === 0} onClick={() => applyBulkVideoLabel('watched')}>
                  <LabelIcon label="watched" /><span>Mark complete</span>
                </button>
                <button className="btn btn-danger btn-sm" disabled={selectedVideoIds.length === 0} onClick={() => applyBulkVideoLabel('mark_for_delete')}>
                  <LabelIcon label="mark_for_delete" /><span>Mark for delete</span>
                </button>
              </div>
            )}
            {visibleModules.map((module, moduleIndex) => {
              const isExpanded = expandedModules[module.id] || Boolean(normalizedCourseSearch)
              const moduleTotal = module.videos?.length || 0
              const moduleWatched = module.videos?.filter(video => video.watched || video.labels?.includes('watched')).length || 0
              const moduleProgress = moduleTotal ? Math.round((moduleWatched / moduleTotal) * 100) : 0
              return (
              <div key={module.id} className={`module-tree-group ${isExpanded ? 'expanded' : ''}`}>
                <div className="module-header" onClick={() => toggleModule(module.id)}>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                  <span className="module-tree-title"><small>Module {module.sequence || moduleIndex + 1} · {moduleWatched}/{moduleTotal} watched</small>{module.title}</span>
                  <div className="module-label-actions" onClick={event => event.stopPropagation()}>
                    {['watched', 'bookmarked', 'mark_for_delete'].map(label => (
                      <button key={label} className={module.labels?.includes(label) ? 'active' : ''} onClick={() => toggleModuleLabel(module, label)} aria-label={`Toggle ${label.replaceAll('_', ' ')}`} title={label.replaceAll('_', ' ')}>
                        <LabelIcon label={label} />
                      </button>
                    ))}
                  </div>
                  <span className="module-progress-ring" style={{ '--module-progress': `${moduleProgress}%` }} title={`${moduleWatched} of ${moduleTotal} videos watched`} aria-label={`${moduleProgress}% complete`}>
                    <span>{moduleProgress}%</span>
                  </span>
                </div>
                <div className={`module-videos ${isExpanded ? 'expanded' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => handleVideoDrop(event, module.id, module.videos?.length || 0)}>
                  <div className="module-videos-inner">
                    {module.videos?.map((video, videoIndex) => (
                      <div
                        key={video.video_id}
                        className={`module-video-item ${activeVideo?.video_id === video.video_id ? 'active' : ''} ${video.labels?.includes('mark_for_delete') ? 'marked-for-delete' : video.labels?.includes('bookmarked') ? 'bookmarked-video' : video.labels?.includes('watched') ? 'watched-video' : ''}`}
                        onClick={() => handleVideoSelect(video)}
                        draggable={isCourseEditing}
                        onDragStart={isCourseEditing ? event => handleVideoDragStart(event, module.id, video) : undefined}
                        onDragEnd={isCourseEditing ? () => setDraggedVideo(null) : undefined}
                        onDragOver={isCourseEditing ? event => event.preventDefault() : undefined}
                        onDrop={isCourseEditing ? event => handleVideoDrop(event, module.id, videoIndex) : undefined}
                      >
                        {isCourseEditing && <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(video.video_id)}
                          onClick={event => event.stopPropagation()}
                          onChange={() => toggleVideoSelection(video.video_id)}
                          aria-label={`Select ${video.title}`}
                          style={{ flexShrink: 0 }}
                        />}
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="module-video-thumbnail" />
                        ) : (
                          <div className="module-video-thumbnail module-video-thumbnail-placeholder" />
                        )}
                        <div className="module-video-content">
                          <div className="video-tree-title">{video.sequence || videoIndex + 1}. {video.title}</div>
                          <div className="video-tree-metadata">
                            <span className="video-meta-published" title="Published"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="1" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>{video.published_at ? new Date(video.published_at).toLocaleDateString() : '—'}</span>
                            <span className="video-meta-duration" title="Duration"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>{formatDuration(video.duration_secs) || '—'}</span>
                            <span className="video-meta-count" title="Views"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>{video.view_count ? video.view_count.toLocaleString() : '—'}</span>
                            <span className="video-meta-count" title="Likes"><svg viewBox="0 0 24 24"><path d="M7 10v10H4V10h3Zm2 10h8.1a2 2 0 0 0 1.95-1.55l1.35-6A2 2 0 0 0 18.45 10H15l.55-3.25A2.3 2.3 0 0 0 13.3 4L9 10v10Z" /></svg>{video.like_count ? video.like_count.toLocaleString() : '—'}</span>
                            <span className="video-meta-labels">{(video.labels || []).filter(label => ['watched', 'bookmarked', 'mark_for_delete'].includes(label)).map(label => <span className={`video-label-badge ${label}`} key={label} title={label.replaceAll('_', ' ')}><LabelIcon label={label} /></span>)}</span>
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
                      </div>
                    ))}
                  </div>
                </div>
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
        />
      )}
      {showVideoFilter && <WorkspaceFilterDrawer modules={activeCourse?.modules || []} videoLabels={videoLabelFilters} moduleIds={moduleFilters} setVideoLabels={setVideoLabelFilters} setModuleIds={setModuleFilters} deletedVideoVisibility={deletedVideoVisibility} setDeletedVideoVisibility={setDeletedVideoVisibility} onClose={() => setShowVideoFilter(false)} />}
    </div>
  )
}
