import React, { useState } from 'react'
import PlanDetail from '../components/PlanDetail'

export default function Plans() {
  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yt_plans') || '[]') }
    catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', logo: '' })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [error, setError] = useState('')

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
      channels: [],
      courses: [],
    }
    persist([...plans, newPlan])
    setForm({ name: '', description: '', logo: '' })
    setShowForm(false)
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
            <label>Plan Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kubernetes Deep Dive" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will this plan cover?" />
          </div>
          <div className="form-group">
            <label>Logo (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="Paste image URL" />
              {form.logo && <img src={form.logo} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {plan.logo && <img src={plan.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                  <div>
                    <h3 style={{ margin: 0 }}>{plan.name}</h3>
                    {plan.description && <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem' }}>{plan.description}</p>}
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