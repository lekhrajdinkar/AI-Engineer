import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import './App.css'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Search from './pages/Search'
import { googleLogin, googleLogout, getAuthDebug } from './api/client'

function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('yt_theme') || 'light'
  })

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('yt_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
}

function AppLayout({ children }) {
  const [auth, setAuth] = React.useState(null)
  const { theme, toggleTheme } = useTheme()

  React.useEffect(() => {
    getAuthDebug().then(setAuth).catch(() => setAuth(null))
  }, [])

  async function handleLogout() {
    try {
      await googleLogout()
      setAuth(null)
    } catch { /* ignore */ }
  }

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { theme })
    }
    return child
  })

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>YouTube</h2>
        <h2>Learning</h2>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/plans" className={({ isActive }) => isActive ? 'active' : ''}>
            <span style={{ fontSize: '1.2rem' }}>📚</span>
            <span>Plans</span>
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
            <span style={{ fontSize: '1.2rem' }}>🔍</span>
            <span>Search</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="theme-toggle" onClick={toggleTheme}>
            <span>{theme === 'light' ? '☀️' : '🌙'}</span>
            <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
          </div>
        </div>
      </aside>
      <main className="main-content">{childrenWithProps}</main>
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </Provider>
  )
}