import React from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { store } from './store'
import './App.css'
import Plans from './pages/Plans'
import PlanOverview from './pages/PlanOverview'
import CourseOverview from './pages/CourseOverview'
import CourseWorkspace from './pages/CourseWorkspace'
import { getAuthDebug, getPlans } from './api/client'
import { setPlans } from './store/plansSlice'

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

function AppLayout() {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const dispatch = useDispatch()
  const plans = useSelector(state => state.plans.items)
  const [auth, setAuth] = React.useState(null)
  const [newPlanRequest, setNewPlanRequest] = React.useState(0)
  const [plansLoading, setPlansLoading] = React.useState(false)
  const [showPlanSwitcher, setShowPlanSwitcher] = React.useState(false)
  const [expandedPlanIds, setExpandedPlanIds] = React.useState({})
  const [expandedCourseIds, setExpandedCourseIds] = React.useState({})
  const [planCourseSearches, setPlanCourseSearches] = React.useState({})
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
    getAuthDebug()
      .then(data => setAuth(data.has_access_token ? data : null))
      .catch(() => setAuth(null))
  }, [])

  React.useEffect(() => {
    if (plans.length === 0) loadPlans()
  }, [])

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

  return (
    <div className="app-layout">
      <aside className="right-nav">
        <div className="right-nav-actions">
          <div className="right-nav-top">
          {auth && <span className="auth-status" title="Signed in" aria-label="Signed in" />}
          <button type="button" className="home-nav-button" title="Learning Plans" aria-label="Learning Plans" onClick={() => navigate('/plans')}><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg></button>
          <button
            type="button"
            className="refresh-plans"
            onClick={loadPlans}
            disabled={plansLoading}
            aria-label="Refresh learning plans"
            title="Refresh learning plans"
          >
            {plansLoading ? <span className="spinner" /> : '↻'}
          </button>
          <button type="button" className="quick-plan-button" onClick={() => setShowPlanSwitcher(true)} aria-label="Switch learning plan" title="Switch learning plan">⇄</button>
          <button className="btn btn-primary nav-icon" title="New learning plan" aria-label="New learning plan" onClick={() => {
            navigate('/plans')
            setNewPlanRequest(request => request + 1)
          }}>
            +
          </button>
          </div>
          <div className="right-nav-bottom">
          <div className="font-size-selector" aria-label="Global font size">
            {[['small', 'small'], ['medium', 'medium'], ['large', 'large']].map(([size, label]) => <button key={size} className={fontSize === size ? 'active' : ''} onClick={() => setFontSize(size)} title={`${label} font size`} aria-label={`${label} font size`}>A</button>)}
          </div>
          <div className="theme-selector" aria-label="Theme">{['light', 'pale', 'dark'].map(value => <button key={value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)} title={`${value} theme`} aria-label={`${value} theme`}><ThemeIcon theme={value} /></button>)}</div>
          </div>
        </div>
      </aside>
      {showPlanSwitcher && <><div className="drawer-overlay" onClick={() => setShowPlanSwitcher(false)} /><aside className="drawer quick-plan-drawer"><div className="drawer-header"><h2>Learning Plans</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowPlanSwitcher(false)}>×</button></div><div className="drawer-body"><div className="quick-plan-list">{plans.length ? plans.map(plan => { const isExpanded = Boolean(expandedPlanIds[plan.id]); const query = (planCourseSearches[plan.id] || '').toLowerCase(); const courses = [...(plan.courses || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)).filter(course => !query || `${course.title} ${course.description || ''} ${(course.source_channels || []).map(channel => channel.title).join(' ')}`.toLowerCase().includes(query)); return <section className="quick-plan-accordion" key={plan.id}><div className="quick-plan-row"><button className="quick-plan-item" onClick={() => { navigate(`/plans/${plan.id}`); setShowPlanSwitcher(false) }}><strong>{plan.name}</strong><span>{plan.courses?.length || 0} courses</span></button><button className={`quick-plan-expand ${isExpanded ? 'expanded' : ''}`} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${plan.name}`} title={isExpanded ? 'Collapse courses' : 'Expand courses'} onClick={() => setExpandedPlanIds(current => ({ ...current, [plan.id]: !current[plan.id] }))}><span>›</span></button></div>{isExpanded && <div className="quick-course-list"><input className="quick-course-search" value={planCourseSearches[plan.id] || ''} onChange={event => setPlanCourseSearches(current => ({ ...current, [plan.id]: event.target.value }))} placeholder="Search courses..." aria-label={`Search courses in ${plan.name}`} />{courses.length ? courses.map(course => { const courseKey = `${plan.id}:${course.id}`; const courseExpanded = Boolean(expandedCourseIds[courseKey]); const modules = [...(course.modules || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)); return <section className="quick-course-accordion" key={course.id}><div className="quick-course-row"><button className="quick-course-item" onClick={() => { navigate(`/plans/${plan.id}/courses/${course.id}/learn`); setShowPlanSwitcher(false) }}><span>{course.sequence || '—'}</span><div><strong>{course.title}</strong>{course.description && <small>{course.description}</small>}{course.source_channels?.length > 0 && <em>{course.source_channels.map(channel => channel.title).join(', ')}</em>}</div></button><button className={`quick-course-expand ${courseExpanded ? 'expanded' : ''}`} onClick={() => setExpandedCourseIds(current => ({ ...current, [courseKey]: !current[courseKey] }))} title={courseExpanded ? 'Collapse modules' : 'Expand modules'} aria-label={`${courseExpanded ? 'Collapse' : 'Expand'} ${course.title} modules`}><span>›</span></button></div>{courseExpanded && <div className="quick-module-list">{modules.length ? modules.map(module => <div key={module.id}><span>{module.sequence || '—'}</span>{module.title}</div>) : <p>No modules in this course.</p>}</div>}</section> }) : <p>No courses match this search.</p>}</div>}</section> }) : <p>No learning plans yet.</p>}</div></div></aside></>}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/plans" replace />} />
          <Route path="/plans" element={<Plans newPlanRequest={newPlanRequest} />} />
          <Route path="/plans/:planId" element={<PlanOverview />} />
          <Route path="/plans/:planId/courses/:courseId" element={<CourseOverview />} />
          <Route path="/plans/:planId/courses/:courseId/learn" element={<CourseWorkspace />} />
          <Route path="*" element={<Navigate to="/plans" replace />} />
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
