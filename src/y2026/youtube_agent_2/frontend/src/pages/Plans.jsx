import React, { useState, useEffect } from 'react'
import { createPlan, getChannels } from '../api/client'
import PlanDetail from '../components/PlanDetail'

export default function Plans() {
  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yt_plans') || '[]') }
    catch { return [] }
  })
  const [channels, setChannels] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', selectedChannels: [] })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [error, setError] = useState('')

  function persist(updated) {
    setPlans(updated)
    localStorage.setItem('yt_plans', JSON.stringify(updated))
  }

  async function handleFetchChannels() {
    try {
      const data = await getChannels()
      setChannels(data.channels || [])
    } catch {
      setError('Could not fetch channels. Is the backend running?')
    }
  }

  function toggleChannel(channelId) {
    setForm(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(channelId)
        ? prev.selectedChannels.filter(id => id !== channelId)
        : [...prev.selectedChannels, channelId]
    }))
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Plan name is required'); return }
    setError('')
    try {
      const result = await createPlan({
        name: form.name,
        description: form.description,
        channel_ids: form.selectedChannels,
      })
      const newPlan = result.learning_plan || result
      persist([...plans, newPlan])
      setForm({ name: '', description: '', selectedChannels: [] })
      setShowForm(false)
    } catch (err) {
      // fallback: create locally
      const localPlan = {
        id: crypto.randomUUID(),
        name: form.name,
        description: form.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        channels: channels.filter(c => form.selectedChannels.includes(c.channel_id)),
        courses: [],
      }
      persist([...plans, localPlan])
      setForm({ name: '', description: '', selectedChannels: [] })
      setShowForm(false)
    }
  }

  function handleDelete(planId) {
    persist(plans.filter(p => p.id !== planId))
    if (selectedPlan?.id === planId) setSelectedPlan(null)
  }

  function handleUpdatePlan(updatedPlan) {
    persist(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p))
    setSelectedPlan(updatedPlan)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Learning Plans</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card">
          <h3>Create Learning Plan</h3>
          <div className="form-group">
            <label>Plan Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kubernetes Deep Dive" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will this plan cover?" />
          </div>
          <div className="form-group">
            <label>Source Channels</label>
            <button className="btn btn-secondary btn-sm" onClick={handleFetchChannels} style={{ marginBottom: '0.5rem' }}>
              Load My Channels
            </button>
            {channels.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click "Load My Channels" to fetch your YouTube subscriptions.</p>}
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem' }}>
              {channels.map(c => (
                <label key={c.channel_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={form.selectedChannels.includes(c.channel_id)} onChange={() => toggleChannel(c.channel_id)} />
                  {c.title}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-success" onClick={handleCreate}>
            Create Plan
          </button>
        </div>
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
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No learning plans yet</p>
              <p>Click "+ New Plan" to create your first organized course from YouTube subscriptions.</p>
            </div>
          )}
          {plans.map(plan => (
            <div className="card" key={plan.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPlan(plan)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{plan.name}</h3>
                  {plan.description && <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem' }}>{plan.description}</p>}
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{plan.channels?.length || 0} channels</span>
                    <span className="badge badge-green">{plan.courses?.length || 0} courses</span>
                    <span className="badge badge-gray">{new Date(plan.created_at).toLocaleDateString()}</span>
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