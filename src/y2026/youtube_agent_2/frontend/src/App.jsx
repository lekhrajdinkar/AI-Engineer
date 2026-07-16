import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Search from './pages/Search'
import { googleLogin, googleLogout, getAuthDebug } from './api/client'

function AppLayout({ children }) {
  const [auth, setAuth] = React.useState(null)

  React.useEffect(() => {
    getAuthDebug().then(setAuth).catch(() => setAuth(null))
  }, [])

  async function handleLogout() {
    try {
      await googleLogout()
      setAuth(null)
    } catch { /* ignore */ }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>YouTube Learning</h2>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
          <NavLink to="/plans" className={({ isActive }) => isActive ? 'active' : ''}>
            Learning Plans
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
            Search
          </NavLink>
        </nav>
        <div style={{ padding: '1rem 1.2rem', marginTop: 'auto', borderTop: '1px solid #2d2d4a' }}>
          {auth ? (
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Signed in</p>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sign Out</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={googleLogin}>Sign In</button>
          )}
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
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
  )
}