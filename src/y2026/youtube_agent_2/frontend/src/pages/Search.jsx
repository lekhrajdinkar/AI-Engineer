import React, { useState } from 'react'
import { searchVideos } from '../api/client'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchVideos(query)
      setResults(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const videos = results?.videos || results?.results || []

  return (
    <div>
      <div className="page-header">
        <h1>Search Videos</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search across all learning plans and channels..."
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Search'}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {results && !error && (
          <div>
            {videos.length === 0 ? (
              <div className="alert alert-info">No results found for "<strong>{query}</strong>"</div>
            ) : (
              <>
                <p style={{ color: '#64748b', marginBottom: '0.75rem' }}>
                  Found {videos.length} result(s) for "<strong>{query}</strong>"
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Channel</th>
                      <th>Duration</th>
                      <th>Plan / Course</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v, i) => (
                      <tr key={v.video_id || i}>
                        <td><strong>{v.title}</strong></td>
                        <td style={{ color: '#64748b' }}>{v.channel_title || v.channel || '-'}</td>
                        <td>
                          {v.duration_secs
                            ? `${Math.floor(v.duration_secs / 60)}:${String(v.duration_secs % 60).padStart(2, '0')}`
                            : '-'}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {v.plan_name && <span className="badge badge-blue">{v.plan_name}</span>}
                          {v.course_name && <span className="badge badge-green" style={{ marginLeft: '0.3rem' }}>{v.course_name}</span>}
                        </td>
                        <td>
                          {v.url && (
                            <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                              Watch
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {!results && !error && (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem' }}>Search across all your learning plans</p>
          <p style={{ marginTop: '0.5rem' }}>Type a keyword above to find videos by title, channel, or description.</p>
        </div>
      )}
    </div>
  )
}