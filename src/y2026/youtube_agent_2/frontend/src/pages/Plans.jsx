import React, { useState, useEffect } from 'react'
import PlanDetail from '../components/PlanDetail'
import { getChannels, getPlaylists, getVideos } from '../api/client'

function ChannelAvatar({ title }) {
  const letter = (title || '?').charAt(0).toUpperCase()
  return <div className="channel-avatar">{letter}</div>
}

export default function Plans() {
  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yt_plans') || '[]') }
    catch { return [] }
  })
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', logo: '' })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [error, setError] = useState('')

  // Drawer state for channel/playlist selection
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [playlists, setPlaylists] = useState({})
  const [selectedPlaylists, setSelectedPlaylists] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeChannelTab, setActiveChannelTab] = useState('ALL')
  const [activePlaylistTab, setActivePlaylistTab] = useState('ALL')
  const [drawerStep, setDrawerStep] = useState('form') // form, channels, playlists, videos

  useEffect(() => {
    if (showDrawer) {
      getChannels().then(d => setChannels(d.channels || [])).catch(() => {})
    }
  }, [showDrawer])

  function persist(updated) {
    setPlans(updated)
    localStorage.setItem('yt_plans', JSON.stringify(updated))
  }

  function handleCreate() {
    if (!form.name.trim()) { setError('Plan name is required'); return }
    setError('')
    const newPlan = {
      id: crypto.randomUUID(),
      name: form.name,
      description: form.description,
      logo: form.logo || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      channels: selectedChannels,
      courses: [],
    }
    persist([...plans, newPlan])
    setForm({ name: '', description: '', logo: '' })
    setSelectedChannels([])
    setSelectedPlaylists([])
    setVideos([])
    setDrawerStep('form')
    setShowDrawer(false)
  }

  function handleDelete(planId) {
    persist(plans.filter(p => p.id !== planId))
    if (selectedPlan?.id === planId) setSelectedPlan(null)
  }

  function handleUpdatePlan(updatedPlan) {
    persist(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p))
    setSelectedPlan(updatedPlan)
  }

  function toggleChannel(ch) {
    setSelectedChannels(prev =>
      prev.find(c => c.channel_id === ch.channel_id)
        ? prev.filter(c => c.channel_id !== ch.channel_id)
        : [...prev, ch]
    )
  }

  async function loadPlaylists() {
    setLoading(true)
    const all = {}
    for (const ch of selectedChannels) {
      try {
        const data = await getPlaylists(ch.channel_id)
        all[ch.channel_id] = data.playlists || []
      } catch { all[ch.channel_id] = [] }
    }
    setPlaylists(all)
    setLoading(false)
    setDrawerStep('playlists')
  }

  function togglePlaylist(pl) {
    setSelectedPlaylists(prev =>
      prev.find(p => p.playlist_id === pl.playlist_id)
        ? prev.filter(p => p.playlist_id !== pl.playlist_id)
        : [...prev, pl]
    )
  }

  async function loadVideos() {
    setLoading(true)
    setError('')
    const allVideos = []
    for (const ch of selectedChannels) {
      const channelPlaylists = selectedPlaylists.filter(p =>
        channels.find(c => c.channel_id === ch.channel_id) &&
        playlists[ch.channel_id]?.find(pp => pp.playlist_id === p.playlist_id)
      )
      if (channelPlaylists.length > 0) {
        for (const pl of channelPlaylists) {
          try {
            const data = await getVideos(ch.channel_id, pl.playlist_id)
            allVideos.push(...(data.videos || []))
          } catch { /* skip */ }
        }
      } else {
        try {
          const data = await getVideos(ch.channel_id)
          allVideos.push(...(data.videos || []))
        } catch { /* skip */ }
      }
    }
    setVideos(allVideos)
    setLoading(false)
    setDrawerStep('videos')
  }

  // Filter channels by active tab
  const filteredChannels = activeChannelTab === 'ALL'
    ? channels
    : channels.filter(c => c.channel_id === activeChannelTab)

  // Get playlists for active channel tab
  const channelPlaylists = activePlaylistTab === 'ALL'
    ? Object.values(playlists).flat()
    : (playlists[activePlaylistTab] || [])

  function closeDrawer() {
    setShowDrawer(false)
    setDrawerStep('form')
    setSelectedChannels([])
    setSelectedPlaylists([])
    setVideos([])
    setError('')
  }

  return (
    <div>
      <div className="page-header">
        <h1>Learning Plans</h1>
        <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
          + New Plan
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Side Drawer for Create Plan */}
      {showDrawer && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            <div className="drawer-header">
              <h2>Create Learning Plan</h2>
              <button className="btn btn-secondary btn-sm" onClick={closeDrawer}>✕</button>
            </div>
            <div className="drawer-body">
              {/* Step: Form */}
              {drawerStep === 'form' && (
                <div>
                  <div className="form-group">
                    <label>Plan Name *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kubernetes Deep Dive" />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will this plan cover?" />
                  </div>
                  <div className="form-group">
                    <label>Logo (optional)</label>
                    <div className="logo-upload">
                      <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="Paste image URL" />
                      {form.logo && <img src={form.logo} alt="preview" className="logo-preview" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Channels */}
              {drawerStep === 'channels' && (
                <div>
                  <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Select YouTube channels as content source:
                  </p>
                  {/* Parent tab: Channels */}
                  <div className="tab-bar">
                    <button className={`tab-item ${activeChannelTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveChannelTab('ALL')}>
                      ALL
                    </button>
                    {channels.map(ch => (
                      <button key={ch.channel_id} className={`tab-item ${activeChannelTab === ch.channel_id ? 'active' : ''}`} onClick={() => setActiveChannelTab(ch.channel_id)}>
                        {ch.title}
                      </button>
                    ))}
                  </div>
                  {/* Channel tiles */}
                  <div className="tile-grid" style={{ maxHeight: 350 }}>
                    {filteredChannels.map(ch => {
                      const isSelected = selectedChannels.find(c => c.channel_id === ch.channel_id)
                      return (
                        <div key={ch.channel_id} className={`channel-tile ${isSelected ? 'selected' : ''}`} onClick={() => toggleChannel(ch)}>
                          <ChannelAvatar title={ch.title} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ch.title}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step: Playlists */}
              {drawerStep === 'playlists' && (
                <div>
                  <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Select playlists (or leave empty to load all videos from channels):
                  </p>
                  {/* Child tab: Playlists */}
                  <div className="sub-tab-bar">
                    <button className={`sub-tab-item ${activePlaylistTab === 'ALL' ? 'active' : ''}`} onClick={() => setActivePlaylistTab('ALL')}>
                      ALL
                    </button>
                    {selectedChannels.map(ch => (
                      <button key={ch.channel_id} className={`sub-tab-item ${activePlaylistTab === ch.channel_id ? 'active' : ''}`} onClick={() => setActivePlaylistTab(ch.channel_id)}>
                        {ch.title}
                      </button>
                    ))}
                  </div>
                  {/* Playlist tiles */}
                  {channelPlaylists.length > 0 ? (
                    <div className="tile-grid" style={{ maxHeight: 300 }}>
                      {channelPlaylists.map(pl => {
                        const isSelected = selectedPlaylists.find(p => p.playlist_id === pl.playlist_id)
                        return (
                          <div key={pl.playlist_id} className={`playlist-tile ${isSelected ? 'selected' : ''}`} onClick={() => togglePlaylist(pl)}>
                            {pl.thumbnail ? (
                              <img src={pl.thumbnail} alt="" className="playlist-thumb" />
                            ) : (
                              <div className="playlist-thumb" />
                            )}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{pl.title}</div>
                              {pl.description && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pl.description}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                      No playlists found for selected channels. Click "Load Videos" to fetch all videos.
                    </p>
                  )}
                </div>
              )}

              {/* Step: Videos */}
              {drawerStep === 'videos' && (
                <div>
                  <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <strong>{videos.length}</strong> video(s) loaded. These will be available when adding courses.
                  </p>
                  <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.5rem' }}>
                    {videos.map((v, i) => (
                      <div className="video-card" key={v.video_id || i} style={{ marginBottom: '0.4rem' }}>
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt="" className="video-thumb" />
                        ) : (
                          <div className="video-thumb" />
                        )}
                        <div className="video-info">
                          <h5>{v.title}</h5>
                          <p>{v.description || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="drawer-footer">
              {drawerStep === 'form' && (
                <>
                  <button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => {
                    if (!form.name.trim()) { setError('Plan name is required'); return }
                    setError('')
                    setDrawerStep('channels')
                  }}>
                    Next: Channels
                  </button>
                </>
              )}
              {drawerStep === 'channels' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setDrawerStep('form')}>Back</button>
                  <button className="btn btn-primary" onClick={loadPlaylists} disabled={selectedChannels.length === 0 || loading}>
                    {loading ? <><span className="spinner" /> Loading...</> : 'Next: Playlists'}
                  </button>
                </>
              )}
              {drawerStep === 'playlists' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setDrawerStep('channels')}>Back</button>
                  <button className="btn btn-primary" onClick={loadVideos} disabled={loading}>
                    {loading ? <><span className="spinner" /> Loading Videos...</> : 'Load Videos'}
                  </button>
                </>
              )}
              {drawerStep === 'videos' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setDrawerStep('playlists')}>Back</button>
                  <button className="btn btn-success" onClick={handleCreate}>
                    Create Plan
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {selectedPlan ? (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPlan(null)} style={{ marginBottom: '1rem' }}>
            &larr; Back to Plans
          </button>
          <PlanDetail plan={selectedPlan} onUpdate={handleUpdatePlan} onDelete={handleDelete} />
        </div>
      ) : (
        <div>
          {plans.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No learning plans yet</p>
              <p>Click "+ New Plan" to create your first organized course from YouTube subscriptions.</p>
            </div>
          )}
          {plans.map(plan => (
            <div className="card" key={plan.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPlan(plan)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {plan.logo && <img src={plan.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                  <div>
                    <h3 style={{ margin: 0 }}>{plan.name}</h3>
                    {plan.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>{plan.description}</p>}
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-blue">{plan.channels?.length || 0} channels</span>
                      <span className="badge badge-green">{plan.courses?.length || 0} courses</span>
                      <span className="badge badge-gray">{new Date(plan.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(plan.id) }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}