import React from 'react'
import { Provider } from 'react-redux'
import { store } from './store'
import './App.css'
import Plans from './pages/Plans'
import { getAuthDebug } from './api/client'

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
  const [auth, setAuth] = React.useState(null)

  React.useEffect(() => {
    getAuthDebug()
      .then(data => setAuth(data.has_access_token ? data : null))
      .catch(() => setAuth(null))
  }, [])

  return (
    <div className="app-layout">
      <header className="top-bar">
        <h2>YouTube Learning</h2>
        <div className="top-bar-actions">
          {auth && <span className="auth-status">Signed in</span>}
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
        <Plans />
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
