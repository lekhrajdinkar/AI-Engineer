import React from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { store } from './store'
import './App.css'
import Plans from './pages/Plans'
import Dashboard from './pages/Dashboard'
import PlanOverview from './pages/PlanOverview'
import CourseOverview from './pages/CourseOverview'
import CourseWorkspace from './pages/CourseWorkspace'
import Profile from './pages/Profile'
import AiRequests from './pages/AiRequests'
import { WorkspaceIcon } from './components/Icons'
import SourceFeedPreviewDialog from './components/SourceFeedPreviewDialog'
import AiModelConfigDrawer from './components/AiModelConfigDrawer'
import { confirmSourceFeedOrganization, getPlans, getSourceSyncMetadata, organizeNewSourceFeeds, pushNewSourceFeeds, setAccessTokenProvider, syncSourceMetadata } from './api/client'
import { setPlans } from './store/plansSlice'
import { setSourceSyncMetadata } from './store/sourcesSlice'
import { loadAiModels } from './store/aiModelsSlice'
import { firebaseAuth } from './firebase'

function useTheme() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('yt_theme') || 'light')

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('yt_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light')

  return { theme, setTheme, toggleTheme }
}

function useFontSize() {
  const [fontSize, setFontSize] = React.useState(() => localStorage.getItem('yt_font_size') || 'medium')

  React.useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('yt_font_size', fontSize)
  }, [fontSize])

  return { fontSize, setFontSize }
}

function ThemeIcon({ theme }) {
  if (theme === 'dark') return <svg viewBox="0 0 24 24"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" /></svg>
  if (theme === 'pale') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></svg>
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3" /></svg>
}

function SourceInboxIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 14h5l1.5 2h3L15 14h5M12 3v8m0 0-3-3m3 3 3-3" /></svg>
}

function formatRelativeAge(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  const units = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  for (const [unit, seconds] of units) {
    if (elapsedSeconds >= seconds) {
      const count = Math.floor(elapsedSeconds / seconds)
      return `${count} ${unit}${count === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}

function AppLayout() {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const dispatch = useDispatch()
  const plans = useSelector(state => state.plans.items)
  const syncMetadata = useSelector(state => state.sources.syncMetadata)
  const [auth, setAuth] = React.useState(null)
  const [newPlanRequest, setNewPlanRequest] = React.useState(0)
  const [plansLoading, setPlansLoading] = React.useState(false)
  const [sourcePullingChannelIds, setSourcePullingChannelIds] = React.useState({})
  const [sourcePushLoading, setSourcePushLoading] = React.useState(false)
  const [sourceAiLoading, setSourceAiLoading] = React.useState(false)
  const [sourceSyncError, setSourceSyncError] = React.useState('')
  const [sourceMetadataLoaded, setSourceMetadataLoaded] = React.useState(false)
  const [sourceSyncBootstrapping, setSourceSyncBootstrapping] = React.useState(false)
  const [sourceSyncChannelErrors, setSourceSyncChannelErrors] = React.useState({})
  const [showSourceSyncDrawer, setShowSourceSyncDrawer] = React.useState(false)
  const [sourceSyncSearch, setSourceSyncSearch] = React.useState('')
  const [sourceSyncSort, setSourceSyncSort] = React.useState('name')
  const [sourceSyncFilter, setSourceSyncFilter] = React.useState('all')
  const [sourceSyncTargetsOnly, setSourceSyncTargetsOnly] = React.useState(true)
  const [sourcePreview, setSourcePreview] = React.useState(null)
  const [sourcePreviewError, setSourcePreviewError] = React.useState('')
  const [expandedSyncChannels, setExpandedSyncChannels] = React.useState({})
  const [showPlanSwitcher, setShowPlanSwitcher] = React.useState(false)
  const [showSettingsDrawer, setShowSettingsDrawer] = React.useState(false)
  const [showAiModelDrawer, setShowAiModelDrawer] = React.useState(false)
  const [expandedPlanIds, setExpandedPlanIds] = React.useState({})
  const [expandedCourseIds, setExpandedCourseIds] = React.useState({})
  const [planCourseSearches, setPlanCourseSearches] = React.useState({})
  const sourceBootstrapUserRef = React.useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [lastAccessedCourse, setLastAccessedCourse] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('yt_last_accessed_course') || 'null') } catch { return null }
  })

  const loadPlans = React.useCallback(async () => {
    setPlansLoading(true)
    try {
      const data = await getPlans()
      dispatch(setPlans(Array.isArray(data) ? data : data.plans || []))
    } catch (error) {
      console.error('Unable to load learning plans:', error)
    } finally {
      setPlansLoading(false)
    }
  }, [dispatch])

  React.useEffect(() => {
    if (!firebaseAuth) return undefined
    setAccessTokenProvider(() => firebaseAuth.currentUser?.getIdToken() || Promise.resolve(null))
    return firebaseAuth.onIdTokenChanged(user => setAuth(user))
  }, [])

  React.useEffect(() => {
    if (auth && plans.length === 0) loadPlans()
  }, [auth?.uid])

  React.useEffect(() => {
    if (auth) dispatch(loadAiModels())
  }, [auth?.uid, dispatch])

  React.useEffect(() => {
    if (location.pathname !== '/ai-model-configs') return
    setShowAiModelDrawer(true)
    navigate('/', { replace: true })
  }, [location.pathname, navigate])

  React.useEffect(() => {
    if (!auth) return
    let cancelled = false
    setSourceMetadataLoaded(false)
    getSourceSyncMetadata()
      .then(data => {
        if (!cancelled) dispatch(setSourceSyncMetadata(data))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSourceMetadataLoaded(true)
      })
    return () => { cancelled = true }
  }, [auth?.uid, dispatch])

  React.useEffect(() => {
    if (!auth || !showSourceSyncDrawer) return
    let cancelled = false
    setSourceMetadataLoaded(false)
    getSourceSyncMetadata()
      .then(data => {
        if (!cancelled) dispatch(setSourceSyncMetadata(data))
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Unable to refresh source targets:', error)
          setSourceSyncError(error.message || 'Unable to refresh source targets.')
        }
      })
      .finally(() => {
        if (!cancelled) setSourceMetadataLoaded(true)
      })
    return () => { cancelled = true }
  }, [auth?.uid, dispatch, showSourceSyncDrawer])

  React.useEffect(() => {
    if (
      !showSourceSyncDrawer
      || !sourceMetadataLoaded
      || (syncMetadata?.channels?.length || 0) > 0
      || !auth
    ) return

    const userKey = auth.uid
    if (sourceBootstrapUserRef.current === userKey) return
    sourceBootstrapUserRef.current = userKey
    let cancelled = false

    const bootstrapSourceInbox = async () => {
      setSourceSyncBootstrapping(true)
      setSourceSyncError('')
      try {
        const metadata = await syncSourceMetadata()
        if (cancelled) return
        setSourceSyncBootstrapping(false)
        dispatch(setSourceSyncMetadata(metadata))
        await loadPlans()
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to initialize source metadata:', error)
          setSourceSyncError(error.message || 'Unable to load subscribed channels.')
        }
      } finally {
        if (!cancelled) setSourceSyncBootstrapping(false)
      }
    }

    bootstrapSourceInbox()
    return () => { cancelled = true }
  }, [
    auth?.uid,
    dispatch,
    loadPlans,
    showSourceSyncDrawer,
    sourceMetadataLoaded,
    syncMetadata?.channels?.length,
  ])

  const refreshSourceMetadata = async channelId => {
    setSourcePullingChannelIds(current => ({ ...current, [channelId]: true }))
    setSourceSyncChannelErrors(current => ({ ...current, [channelId]: '' }))
    try {
      const metadata = await syncSourceMetadata({ channelId })
      dispatch(setSourceSyncMetadata(metadata))
      await loadPlans()
    } catch (error) {
      console.error('Unable to refresh source metadata:', error)
      setSourceSyncChannelErrors(current => ({ ...current, [channelId]: error.message || 'Unable to check this channel.' }))
    } finally {
      setSourcePullingChannelIds(current => ({ ...current, [channelId]: false }))
    }
  }

  const pushSourceFeeds = async (scope = {}) => {
    setSourcePushLoading(true)
    setSourcePreviewError('')
    try {
      const response = await pushNewSourceFeeds(scope)
      dispatch(setSourceSyncMetadata(response.metadata))
      await loadPlans()
      if (response.remaining_videos?.length) {
        setSourcePreview(current => current
          ? { ...current, videos: response.remaining_videos }
          : current)
      } else {
        setSourcePreview(null)
      }
    } catch (error) {
      setSourcePreviewError(error.message || 'Unable to push this feed to the selected module.')
    } finally {
      setSourcePushLoading(false)
    }
  }

  const previewSourceFeed = (channel, playlist = null) => {
    const scope = playlist || channel
    setSourcePreviewError('')
    setSourcePreview({
      channelId: channel.channel_id,
      playlistId: playlist ? (playlist.playlist_id || playlist.id) : null,
      title: playlist ? `${channel.title} · ${playlist.title}` : `${channel.title} · Channel feed`,
      targets: scope.target_courses || [],
      videos: scope.new_videos || [],
    })
  }

  const organizeSourceFeeds = async request => {
    setSourceAiLoading(true)
    try {
      return await organizeNewSourceFeeds(request)
    } finally {
      setSourceAiLoading(false)
    }
  }

  const confirmSourceOrganization = async request => {
    setSourceAiLoading(true)
    try {
      const response = await confirmSourceFeedOrganization(request)
      dispatch(setSourceSyncMetadata(response.metadata))
      await loadPlans()
      if (response.remaining_videos?.length) {
        setSourcePreview(current => current
          ? { ...current, videos: response.remaining_videos }
          : current)
      } else {
        setSourcePreview(null)
      }
      return response
    } finally {
      setSourceAiLoading(false)
    }
  }

  React.useEffect(() => {
    const match = location.pathname.match(/^\/plans\/([^/]+)\/courses\/([^/]+)/)
    if (!match) return
    const accessedCourse = { planId: match[1], courseId: match[2] }
    setLastAccessedCourse(accessedCourse)
    localStorage.setItem('yt_last_accessed_course', JSON.stringify(accessedCourse))
  }, [location.pathname])

  React.useEffect(() => {
    if (!showPlanSwitcher || !lastAccessedCourse) return
    const courseKey = `${lastAccessedCourse.planId}:${lastAccessedCourse.courseId}`
    setExpandedPlanIds(current => ({ ...current, [lastAccessedCourse.planId]: true }))
    setExpandedCourseIds(current => ({ ...current, [courseKey]: true }))
    const timer = window.setTimeout(() => {
      const course = plans.find(plan => plan.id === lastAccessedCourse.planId)?.courses?.find(item => item.id === lastAccessedCourse.courseId)
      const target = course && [...document.querySelectorAll('.quick-course-accordion')].find(element => element.textContent.includes(course.title))
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        target.querySelector('.quick-course-item')?.focus()
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [showPlanSwitcher, lastAccessedCourse, plans])

  React.useEffect(() => {
    if (!showPlanSwitcher) return
    const drawerBody = document.querySelector('.quick-plan-drawer .drawer-body')
    const planList = drawerBody?.querySelector('.quick-plan-list')
    if (!drawerBody || !planList) return

    const search = document.createElement('input')
    search.className = 'quick-plan-global-search'
    search.type = 'search'
    search.placeholder = 'Search course title or description...'
    search.setAttribute('aria-label', 'Search course title or description across all learning plans')
    const toolbar = document.createElement('div')
    toolbar.className = 'quick-plan-search-toolbar'
    const toggleTree = document.createElement('button')
    toggleTree.type = 'button'
    toggleTree.className = 'quick-plan-tree-button'
    const setTreeToggleIcon = expanded => {
      const action = expanded ? 'Collapse' : 'Expand'
      toggleTree.title = `${action} all learning plans`
      toggleTree.setAttribute('aria-label', `${action} all learning plans`)
      toggleTree.innerHTML = expanded
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>'
    }
    setTreeToggleIcon(plans.length > 0 && plans.every(plan => expandedPlanIds[plan.id]))
    const togglePlans = () => setExpandedPlanIds(current => {
      const shouldExpand = plans.some(plan => !current[plan.id])
      setTreeToggleIcon(shouldExpand)
      return shouldExpand ? Object.fromEntries(plans.map(plan => [plan.id, true])) : {}
    })
    toggleTree.addEventListener('click', togglePlans)
    toolbar.append(search, toggleTree)
    const filterPlans = () => {
      const query = search.value.trim().toLowerCase()
      drawerBody.querySelectorAll('.quick-plan-accordion').forEach((item, index) => {
        const plan = plans[index]
        const searchable = [
          plan?.name,
          plan?.description,
          ...(plan?.courses || []).flatMap(course => [
            course.title,
            course.description,
            ...(course.source_channels || []).flatMap(channel => [channel.title, ...(channel.playlists || []).map(playlist => playlist.title)]),
          ]),
        ].filter(Boolean).join(' ').toLowerCase()
        const matchingCourseIds = (plan?.courses || [])
          .filter(course => `${course.title || ''} ${course.description || ''}`.toLowerCase().includes(query))
          .map(course => course.id)
        item.hidden = Boolean(query && !searchable.includes(query))
        if (query && searchable.includes(query) && plan?.id) {
          setExpandedPlanIds(current => current[plan.id] ? current : { ...current, [plan.id]: true })
          window.setTimeout(() => {
            const courses = [...(plan.courses || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
            item.querySelectorAll('.quick-course-accordion').forEach((courseItem, courseIndex) => {
              courseItem.hidden = matchingCourseIds.length > 0 && !matchingCourseIds.includes(courses[courseIndex]?.id)
            })
          }, 0)
        }
        if (!query) item.querySelectorAll('.quick-course-accordion').forEach(courseItem => { courseItem.hidden = false })
      })
    }
    search.addEventListener('input', filterPlans)
    drawerBody.insertBefore(toolbar, planList)
    return () => {
      search.removeEventListener('input', filterPlans)
      toggleTree.removeEventListener('click', togglePlans)
      toolbar.remove()
    }
  }, [showPlanSwitcher, plans])

  React.useEffect(() => {
    if (!showPlanSwitcher) return
    const timer = window.setTimeout(() => {
      document.querySelectorAll('.quick-plan-item').forEach((button, index) => {
        const plan = plans[index]
        if (!plan || button.querySelector('.quick-plan-logo')) return
        const title = button.querySelector('strong')
        const count = button.querySelector(':scope > span')
        if (!title || !count) return

        const copy = document.createElement('span')
        copy.className = 'quick-plan-item-copy'
        copy.append(title, count)
        const logo = plan.logo_url || plan.logo
        const logoElement = logo ? document.createElement('img') : document.createElement('span')
        logoElement.className = `quick-plan-logo${logo ? '' : ' quick-plan-logo-fallback'}`
        if (logo) {
          logoElement.src = logo
          logoElement.alt = ''
          logoElement.onerror = () => {
            const fallback = document.createElement('span')
            fallback.className = 'quick-plan-logo quick-plan-logo-fallback'
            fallback.textContent = plan.name?.charAt(0).toUpperCase() || '?'
            logoElement.replaceWith(fallback)
          }
        } else {
          logoElement.textContent = plan.name?.charAt(0).toUpperCase() || '?'
        }
        const logoWrap = document.createElement('span')
        logoWrap.className = 'quick-plan-logo-wrap'
        logoWrap.append(logoElement)
        button.replaceChildren(logoWrap, copy)
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [showPlanSwitcher, plans, expandedPlanIds])

  const pendingVideosForChannel = channel => (channel.new_videos?.length || 0) + (channel.playlists || []).reduce((count, playlist) => count + (playlist.new_videos?.length || 0), 0)
  const targetsForChannel = channel => (channel.target_courses?.length || 0) + (channel.playlists || []).reduce((count, playlist) => count + (playlist.target_courses?.length || 0), 0)
  const renderTargetCourses = (targets = [], label = 'target course') => {
    const names = [...new Set(targets.map(target => {
      const plan = plans.find(item => item.id === target.plan_id)
      const course = plan?.courses?.find(item => item.id === target.course_id)
      if (plan && course) return `${plan.name} → ${course.title}`
      if (course) return course.title
      return `Plan ${target.plan_id || 'unknown'} → Course ${target.course_id || 'unknown'}`
    }))]
    const count = targets.length
    return <span className={`source-sync-target-tooltip ${count ? 'has-targets' : ''}`}><span className="source-sync-target-trigger">{count} {label}{count === 1 ? '' : 's'}</span>{count > 0 && <span className="source-sync-target-tooltip-content" role="tooltip"><strong>Targets</strong>{names.map(name => <span key={name}>• {name}</span>)}</span>}</span>
  }
  const sourceSyncPendingCount = (syncMetadata?.channels || []).reduce((count, channel) => count + pendingVideosForChannel(channel), 0)
  const sourceSyncChannels = [...(syncMetadata?.channels || [])]
    .filter(channel => `${channel.title || ''} ${(channel.playlists || []).map(playlist => playlist.title || '').join(' ')}`.toLowerCase().includes(sourceSyncSearch.trim().toLowerCase()))
    .filter(channel => sourceSyncFilter === 'all' || pendingVideosForChannel(channel) > 0)
    .filter(channel => !sourceSyncTargetsOnly || targetsForChannel(channel) > 0)
    .sort((left, right) => sourceSyncSort === 'date'
      ? new Date(right.last_synced_at || 0) - new Date(left.last_synced_at || 0)
      : (left.title || '').localeCompare(right.title || ''))

  return (
    <div className="app-layout">
      <aside className="right-nav">
        <div className="right-nav-actions">
          <div className="right-nav-top">
          <button type="button" className={`home-nav-button ${location.pathname === '/' ? 'active' : ''}`} title="Home" aria-label="Home" onClick={() => navigate('/')}><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg></button>
          <button type="button" className={`home-nav-button ${location.pathname.startsWith('/plans') ? 'active' : ''}`} title="Learning Plans" aria-label="Learning Plans" onClick={() => navigate('/plans')}><svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2V4Zm2 0v14a2 2 0 0 0-2-2m4-7h5m-5 4h5" /></svg></button>
          <button type="button" className="refresh-plans" onClick={() => { setSourceSyncError(''); setShowSourceSyncDrawer(true) }} aria-label="Open source feed inbox" title="Source feed inbox">
            <SourceInboxIcon />
          </button>
          <button type="button" className="quick-plan-button" onClick={() => setShowPlanSwitcher(true)} aria-label="Open global search" title="Global search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg></button>
          </div>
          <div className="right-nav-bottom">
          <button type="button" className={`home-nav-button ${showAiModelDrawer ? 'active' : ''}`} title="AI model configurations" aria-label="AI model configurations" onClick={() => setShowAiModelDrawer(true)}>AI</button>
          <button type="button" className="home-nav-button settings-nav-button" title="Settings" aria-label="Settings" onClick={() => setShowSettingsDrawer(true)}><WorkspaceIcon name="settings" /></button>
          <button type="button" className="profile-nav-button" title={auth?.displayName || auth?.email || 'Profile'} aria-label="Profile" onClick={() => navigate('/profile')}>{auth?.photoURL ? <img src={auth.photoURL} alt="" /> : <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}</button>
          </div>
        </div>
      </aside>
      {showAiModelDrawer && <AiModelConfigDrawer onClose={() => setShowAiModelDrawer(false)} />}
      {showSettingsDrawer && <><div className="drawer-overlay" onClick={() => setShowSettingsDrawer(false)} /><aside className="drawer settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title"><div className="drawer-header"><div><h2 id="settings-drawer-title">Settings</h2><p>Personalize your learning workspace.</p></div><button className="btn btn-secondary btn-sm" onClick={() => setShowSettingsDrawer(false)} aria-label="Close">×</button></div><div className="drawer-body settings-drawer-body"><section className="settings-section"><div><h3>Font size</h3><p>Adjust text sizing across the application.</p></div><div className="settings-option-grid" role="group" aria-label="Global font size">{[['small', 'Small', 'Aa'], ['medium', 'Medium', 'Aa'], ['large', 'Large', 'Aa']].map(([size, label, sample]) => <button type="button" key={size} className={fontSize === size ? 'active' : ''} onClick={() => setFontSize(size)} aria-pressed={fontSize === size}><span className={`settings-font-sample ${size}`}>{sample}</span><strong>{label}</strong></button>)}</div></section><section className="settings-section"><div><h3>Theme</h3><p>Choose the color theme used throughout the application.</p></div><div className="settings-option-grid" role="group" aria-label="Theme">{['light', 'pale', 'dark'].map(value => <button type="button" key={value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)} aria-pressed={theme === value}><span className={`settings-theme-preview ${value}`}><ThemeIcon theme={value} /></span><strong>{value}</strong></button>)}</div></section></div><div className="drawer-footer"><button className="btn btn-primary" onClick={() => setShowSettingsDrawer(false)}>Done</button></div></aside></>}
      {showSourceSyncDrawer && <><div className="drawer-overlay" onClick={() => setShowSourceSyncDrawer(false)} /><aside className="drawer source-sync-drawer"><div className="drawer-header"><div><h2>Source feed inbox</h2><p>Pull new YouTube feeds, then route them to a course for review.</p></div><button className="btn btn-secondary btn-sm" onClick={() => setShowSourceSyncDrawer(false)} aria-label="Close">×</button></div><div className="drawer-body source-sync-body">
        {sourceSyncError && <div className="alert alert-error">{sourceSyncError}</div>}
        <section className="source-sync-channel-section">
          <div className="source-sync-channel-controls"><input value={sourceSyncSearch} onChange={event => setSourceSyncSearch(event.target.value)} placeholder="Search channels or playlists..." aria-label="Search content sources" /><div className="picker-sort-toggle"><button className={sourceSyncFilter === 'all' ? 'active' : ''} onClick={() => setSourceSyncFilter('all')}>All ({syncMetadata?.channels?.length || 0})</button><button className={sourceSyncFilter === 'pending' ? 'active' : ''} onClick={() => setSourceSyncFilter('pending')}>Pending ({sourceSyncPendingCount})</button></div><label className="source-sync-target-switch"><input type="checkbox" checked={sourceSyncTargetsOnly} onChange={event => setSourceSyncTargetsOnly(event.target.checked)} /><span className="source-sync-target-switch-track" aria-hidden="true" /><span>Targets only</span></label><div className="picker-sort-toggle"><button className={sourceSyncSort === 'name' ? 'active' : ''} onClick={() => setSourceSyncSort('name')}>Name</button><button className={sourceSyncSort === 'date' ? 'active' : ''} onClick={() => setSourceSyncSort('date')}>Last sync</button></div></div>
          <div className="source-sync-channel-list">{sourceSyncBootstrapping ? <p className="source-sync-empty">Loading subscribed channels…</p> : sourceSyncChannels.length ? sourceSyncChannels.map(channel => {
            const expanded = Boolean(expandedSyncChannels[channel.channel_id])
            const channelNewCount = channel.new_videos?.length || 0
            const pendingCount = pendingVideosForChannel(channel)
            const channelPulling = Boolean(sourcePullingChannelIds[channel.channel_id])
            const visiblePlaylists = (channel.playlists || []).filter(playlist => !sourceSyncTargetsOnly || (playlist.target_courses?.length || 0) > 0)
            return <article className={`source-sync-channel-card ${pendingCount ? 'has-pending-feed' : ''}`} key={channel.channel_id}>
              <button className="source-sync-channel-heading" onClick={() => setExpandedSyncChannels(current => ({ ...current, [channel.channel_id]: !current[channel.channel_id] }))} aria-expanded={expanded}>{channel.thumbnail ? <img src={channel.thumbnail} alt="" /> : <span className="source-sync-fallback">{channel.title?.charAt(0).toUpperCase() || '?'}</span>}<span className="source-sync-channel-title"><strong>{channel.title || 'Untitled channel'}</strong><small>{channel.videos_count ?? 0} videos · {renderTargetCourses(channel.target_courses, 'direct target course')}</small><small className="source-sync-last-sync">Last sync: {channel.last_synced_at ? new Date(channel.last_synced_at).toLocaleString() : 'not yet'}{channel.last_synced_at && <span className="source-sync-age-badge">{formatRelativeAge(channel.last_synced_at)}</span>}</small></span>{pendingCount > 0 && <span className="source-sync-pending-badge" aria-label={`${pendingCount} new videos`}>{pendingCount} new</span>}<span className={`source-sync-expand ${expanded ? 'expanded' : ''}`} aria-hidden="true">›</span></button>
              {expanded && <div className="source-sync-channel-details">
                <div className="source-sync-push-row"><span>{channelNewCount} new channel-feed videos</span><div className="source-sync-channel-quick-actions"><button className="btn btn-primary btn-sm" disabled={channelPulling} onClick={() => refreshSourceMetadata(channel.channel_id)}>{channelPulling ? 'Pulling…' : 'Pull new feeds'}</button>{channel.url && <a className="btn btn-secondary btn-sm" href={channel.url} target="_blank" rel="noreferrer">Open YouTube ↗</a>}<button className="btn btn-secondary btn-sm" disabled={!channelNewCount} onClick={() => previewSourceFeed(channel)}>Preview</button></div></div>
                {sourceSyncChannelErrors[channel.channel_id] && <div className="alert alert-error">{sourceSyncChannelErrors[channel.channel_id]}</div>}
                {visiblePlaylists.length > 0 && <div className="source-sync-playlists"><strong>Playlists</strong>{visiblePlaylists.map(playlist => { const playlistId = playlist.playlist_id || playlist.id; const newCount = playlist.new_videos?.length || 0; return <div key={playlistId}><span>{playlist.title || 'Untitled playlist'}<small>{playlist.videos_count ?? 0} videos · {newCount} ready · {renderTargetCourses(playlist.target_courses)}</small></span><button className="btn btn-secondary btn-sm" disabled={!newCount} onClick={() => previewSourceFeed(channel, playlist)}>Preview</button></div> })}</div>}
                <small className="source-sync-checkpoint">Last source check: {channel.last_feed_checked_at ? new Date(channel.last_feed_checked_at).toLocaleString() : 'not yet'}</small>
              </div>}
            </article>
          }) : <p className="source-sync-empty">{syncMetadata?.channels?.length ? 'No channels match this filter.' : 'No subscribed-channel metadata is stored yet. Pull new feeds from YouTube to start.'}</p>}</div>
        </section>
      </div></aside></>}
      {sourcePreview && <SourceFeedPreviewDialog preview={sourcePreview} plans={plans} loading={sourcePushLoading} aiLoading={sourceAiLoading} error={sourcePreviewError} onClose={() => { setSourcePreview(null); setSourcePreviewError('') }} onPush={pushSourceFeeds} onOrganize={organizeSourceFeeds} onConfirmOrganization={confirmSourceOrganization} />}
      {showPlanSwitcher && <><div className="drawer-overlay" onClick={() => setShowPlanSwitcher(false)} /><aside className="drawer quick-plan-drawer"><div className="drawer-header"><div><h2>Global search</h2><p>Find learning plans, courses, modules, and sources.</p></div><button className="btn btn-secondary btn-sm" onClick={() => setShowPlanSwitcher(false)}>×</button></div><div className="drawer-body"><div className="quick-plan-list">{plans.length ? plans.map(plan => { const isExpanded = Boolean(expandedPlanIds[plan.id]); const query = (planCourseSearches[plan.id] || '').toLowerCase(); const courses = [...(plan.courses || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)).filter(course => !query || `${course.title} ${course.description || ''} ${(course.source_channels || []).map(channel => channel.title).join(' ')}`.toLowerCase().includes(query)); return <section className="quick-plan-accordion" key={plan.id}><div className="quick-plan-row"><button className="quick-plan-item" onClick={() => { navigate(`/plans/${plan.id}`); setShowPlanSwitcher(false) }}><strong>{plan.name}</strong><span>{plan.courses?.length || 0} courses</span></button><button className={`quick-plan-expand ${isExpanded ? 'expanded' : ''}`} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${plan.name}`} title={isExpanded ? 'Collapse courses' : 'Expand courses'} onClick={() => setExpandedPlanIds(current => ({ ...current, [plan.id]: !current[plan.id] }))}><span>›</span></button></div>{isExpanded && <div className="quick-course-list"><input className="quick-course-search" value={planCourseSearches[plan.id] || ''} onChange={event => setPlanCourseSearches(current => ({ ...current, [plan.id]: event.target.value }))} placeholder="Search courses..." aria-label={`Search courses in ${plan.name}`} />{courses.length ? courses.map(course => { const courseKey = `${plan.id}:${course.id}`; const courseExpanded = Boolean(expandedCourseIds[courseKey]); const modules = [...(course.modules || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)); return <section className="quick-course-accordion" key={course.id}><div className="quick-course-row"><button className="quick-course-item" onClick={() => { navigate(`/plans/${plan.id}/courses/${course.id}/learn`); setShowPlanSwitcher(false) }}><span>{course.sequence || '—'}</span><div><strong>{course.title}</strong>{course.description && <small>{course.description}</small>}{course.source_channels?.length > 0 && <em>{course.source_channels.map(channel => channel.title).join(', ')}</em>}</div></button><button className={`quick-course-expand ${courseExpanded ? 'expanded' : ''}`} onClick={() => setExpandedCourseIds(current => ({ ...current, [courseKey]: !current[courseKey] }))} title={courseExpanded ? 'Collapse modules' : 'Expand modules'} aria-label={`${courseExpanded ? 'Collapse' : 'Expand'} ${course.title} modules`}><span>›</span></button></div>{courseExpanded && <div className="quick-module-list">{modules.length ? modules.map(module => <div key={module.id}><span>{module.sequence || '—'}</span>{module.title}</div>) : <p>No modules in this course.</p>}</div>}</section> }) : <p>No courses match this search.</p>}</div>}</section> }) : <p>No learning plans yet.</p>}</div></div></aside></>}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard onOpenAiModels={() => setShowAiModelDrawer(true)} />} />
          <Route path="/plans" element={<Plans newPlanRequest={newPlanRequest} onRefresh={loadPlans} refreshing={plansLoading} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ai-model-configs" element={<Navigate to="/" replace />} />
          <Route path="/plans/:planId" element={<PlanOverview />} />
          <Route path="/plans/:planId/ai-requests" element={<AiRequests />} />
          <Route path="/plans/:planId/courses/:courseId" element={<CourseOverview />} />
          <Route path="/plans/:planId/courses/:courseId/learn" element={<CourseWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter><AppLayout /></BrowserRouter>
    </Provider>
  )
}
