import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PlanDetail from '../components/PlanDetail'
import { createPlan, deletePlan as deletePlanRequest } from '../api/client'
import { addPlan, updatePlan, deletePlan, selectPlan, clearSelection } from '../store/plansSlice'

export default function Plans({ newPlanRequest }) {
  const dispatch = useDispatch()
  const plans = useSelector(state => state.plans.items)
  const selectedId = useSelector(state => state.plans.selectedId)
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '' })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (newPlanRequest > 0) setShowDrawer(true)
  }, [newPlanRequest])

  const selectedPlan = selectedId ? plans.find(plan => plan.id === selectedId) : null

  function closeDrawer() {
    setShowDrawer(false)
    setForm({ name: '', description: '', logoUrl: '' })
    setError('')
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setError('Plan name is required')
      return
    }

    setCreating(true)
    setError('')
    try {
      const response = await createPlan({
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logoUrl.trim(),
        courses: [],
        source_channels: [],
      })
      dispatch(addPlan(response.plan))
      closeDrawer()
    } catch (err) {
      setError(err.message || 'Unable to create learning plan')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(planId) {
    setError('')
    try {
      await deletePlanRequest(planId)
      dispatch(deletePlan(planId))
      dispatch(clearSelection())
      return true
    } catch (err) {
      setError(err.message || 'Unable to delete learning plan')
      return false
    }
  }

  function handleUpdatePlan(updatedPlan) {
    dispatch(updatePlan(updatedPlan))
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {showDrawer && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            <div className="drawer-header">
              <h2>Create Learning Plan</h2>
              <button className="btn btn-secondary btn-sm" onClick={closeDrawer} aria-label="Close">×</button>
            </div>
            <div className="drawer-body">
              <div className="form-group">
                <label>Plan Name *</label>
                <input
                  value={form.name}
                  onChange={event => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Kubernetes Deep Dive"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={event => setForm({ ...form, description: event.target.value })}
                  placeholder="What will this plan cover?"
                />
              </div>
              <div className="form-group">
                <label>Logo URL (optional)</label>
                <div className="logo-upload">
                  <input
                    value={form.logoUrl}
                    onChange={event => setForm({ ...form, logoUrl: event.target.value })}
                    placeholder="Paste image URL"
                  />
                  {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="logo-preview" />}
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn btn-secondary" onClick={closeDrawer} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <><span className="spinner" /> Creating...</> : 'Create Plan'}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedPlan ? (
        <div>
          <div className="page-header">
            <h1>{selectedPlan.name}</h1>
            <button className="btn btn-secondary btn-sm" onClick={() => dispatch(clearSelection())}>
              &larr; Back to Plans
            </button>
          </div>
          <PlanDetail plan={selectedPlan} onUpdate={handleUpdatePlan} onDelete={handleDelete} />
        </div>
      ) : (
        <div>
          {plans.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No learning plans yet</p>
              <p>Click "+ New Plan" to create your first learning plan.</p>
            </div>
          )}
          {plans.map(plan => {
            const logoUrl = plan.logo_url || plan.logo
            return (
              <div className="card" key={plan.id} style={{ cursor: 'pointer' }} onClick={() => dispatch(selectPlan(plan.id))}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {logoUrl && <img src={logoUrl} alt="" style={{ width: 40, height: 40, border: '1px solid var(--border-color)', objectFit: 'cover' }} />}
                    <div>
                      <h3 style={{ margin: 0 }}>{plan.name}</h3>
                      {plan.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>{plan.description}</p>}
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-green">{plan.courses?.length || 0} courses</span>
                        <span className="badge badge-gray">{new Date(plan.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={event => { event.stopPropagation(); handleDelete(plan.id) }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
