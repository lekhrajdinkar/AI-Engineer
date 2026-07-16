import React, { useState, useEffect } from 'react'
import { getChannels, getAuthDebug, googleLogin } from '../api/client'

export default function Dashboard() {
  const [auth, setAuth] = useState(null)
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuthDebug()
      .then(data => {
        if (data.has_access_token === true) setAuth(data)
        else setAuth(null)
      })
      .catch(() => setAuth(null))
  }, [])

  async function handleFetchChannels() {
    setLoading(true)
    setError('')
    try {
      const data = await getChannels()
      setChannels(data.channels || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {!auth && (
        <div className="alert alert-info">
          <strong>Not authenticated.</strong> Please sign in with Google to access your YouTube subscriptions.
          <br /><br />
          <button className="btn btn-primary" onClick={googleLogin}>
            Sign in with Google
          </button>
        </div>
      )}

      {auth && (
        <div className="alert alert-success">
          <strong>Signed in</strong> — token scopes: {auth.scopes?.join(', ') || 'N/A'}
        </div>
      )}

      <div className="card">
        <h3>Your Subscribed Channels</h3>
        <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Fetch channels from your YouTube account to start building learning plans.
        </p>
        <button className="btn btn-primary" onClick={handleFetchChannels} disabled={loading || !auth}>
          {loading ? <><span className="spinner" /> Loading...</> : 'Fetch Subscribed Channels'}
        </button>
        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

        {channels.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', color: '#475569' }}>{channels.length} channel(s)</h4>
            {channels.map((c) => (
              <div className="channel-item" key={c.channel_id}>
                <div>
                  <strong>{c.title}</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {c.videos_count} videos
                  </span>
                </div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  Open YouTube
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Quick Stats</h3>
        <div className="grid-3">
          <div><strong style={{ fontSize: '1.5rem' }}>{channels.length}</strong><br /><span style={{ color: '#64748b' }}>Channels</span></div>
          <div><strong style={{ fontSize: '1.5rem' }}>0</strong><br /><span style={{ color: '#64748b' }}>Learning Plans</span></div>
          <div><strong style={{ fontSize: '1.5rem' }}>{channels.reduce((s, c) => s + (c.videos_count || 0), 0)}</strong><br /><span style={{ color: '#64748b' }}>Videos</span></div>
        </div>
      </div>
    </div>
  )
}