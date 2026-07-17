import React from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from './store'
import './App.css'
import Plans from './pages/Plans'
import { getAuthDebug, getPlans } from './api/client'
import { setPlans } from './store/plansSlice'

function useTheme() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('yt_theme') || 'light')

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('yt_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light')

  return { theme, toggleTheme }
}

function AppLayout() {
  const { theme, toggleTheme } = useTheme()
  const dispatch = useDispatch()
  const plans = useSelector(state => state.plans.items)
  const [auth, setAuth] = React.useState(null)
  const [newPlanRequest, setNewPlanRequest] = React.useState(0)
  const [plansLoading, setPlansLoading] = React.useState(false)

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

  return (
    <div className="app-layout">
      <header className="top-bar">
        <img src="https://cdn.simpleicons.org/youtube/FF0000" alt="YouTube Logo" height="24"/>
        <div className="top-bar-actions">
          {auth && <span className="auth-status">Signed in</span>}
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
          <button className="btn btn-primary" onClick={() => setNewPlanRequest(request => request + 1)}>
            + New Plan
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <span aria-hidden="true">{theme === 'light' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
            <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>
      <main className="main-content">
        <Plans newPlanRequest={newPlanRequest} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <AppLayout />
    </Provider>
  )
}
