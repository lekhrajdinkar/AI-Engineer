import React, { useState } from 'react'

export default function App() {
  const [channels, setChannels] = useState([])
  const [message, setMessage] = useState('')

  async function fetchChannels() {
    try {
      const res = await fetch('/api/channels')
      const data = await res.json()
      setChannels(data.channels || [])
      setMessage('Fetched channels (demo)')
    } catch (err) {
      setMessage('Error fetching channels: ' + err.message)
    }
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial', padding: 20 }}>
      <h2>YouTube Learning — Frontend Stub</h2>
      <p>This is a very small UI stub to exercise the backend prototype.</p>
      <button onClick={fetchChannels}>Fetch Subscribed Channels (demo)</button>
      <div style={{ marginTop: 12 }}>{message}</div>

      <ul>
        {channels.map((c) => (
          <li key={c.channel_id}>{c.title} — {c.videos_count} videos</li>
        ))}
      </ul>
    </div>
  )
}

