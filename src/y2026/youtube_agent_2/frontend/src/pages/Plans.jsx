import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createPlan, deletePlan as deletePlanRequest } from '../api/client'
import { updatePlanMetadata } from '../api/client'
import EditMetadataDrawer from '../components/EditMetadataDrawer'
import { EditIcon, WorkspaceIcon } from '../components/Icons'
import { addPlan, updatePlan, deletePlan, selectPlan, clearSelection } from '../store/plansSlice'

export default function Plans({ newPlanRequest }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const plans = useSelector(state => state.plans.items)
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '' })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [planToDelete, setPlanToDelete] = useState(null)
  const [planToEdit, setPlanToEdit] = useState(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [showSort, setShowSort] = useState(false)
  const visiblePlans = [...plans].filter(plan => `${plan.name} ${plan.description || ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : new Date(b.updated_at) - new Date(a.updated_at))

  useEffect(() => {
    if (newPlanRequest > 0) setShowDrawer(true)
  }, [newPlanRequest])


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

      <div>
          <div className="page-header plan-overview-header"><h1>YouTube Learning</h1><div className="plan-action-panel"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search learning plans..." aria-label="Search learning plans" /><button className="btn btn-secondary btn-sm icon-button" title="Sort learning plans" aria-label="Sort learning plans" onClick={() => setShowSort(true)}><WorkspaceIcon name="sort" /></button><div className="add-course-group"><button className="btn btn-secondary btn-sm" onClick={() => setShowDrawer(true)}><WorkspaceIcon name="manual" />New plan</button></div></div></div>
          <div className="page-header course-toolbar"><h4>Learning plans <span className="badge badge-green">{plans.length}</span></h4></div>
          {plans.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No learning plans yet</p>
              <p>Click "+ New Plan" to create your first learning plan.</p>
            </div>
          )}
          <div className="plan-card-list">{visiblePlans.map(plan => {
            const logoUrl = plan.logo_url || plan.logo
            return (
              <article className="card catalog-tile" key={plan.id} onClick={() => navigate(`/plans/${plan.id}`)}>
                <header className="catalog-tile-header">
                    {logoUrl ? <img src={logoUrl} alt="" className="tile-logo" /> : <div className="tile-logo tile-logo-fallback">{plan.name?.charAt(0).toUpperCase() || '?'}</div>}
                    <div><h3>{plan.name}</h3><p>{plan.description || 'No description provided.'}</p></div>
                </header>
                <footer className="catalog-tile-footer"><div><span className="badge badge-green">{plan.courses?.length || 0} courses</span><span className="badge badge-gray">{new Date(plan.created_at).toLocaleDateString()}</span></div><button className="btn btn-secondary btn-sm icon-button" title="Edit" onClick={event => { event.stopPropagation(); setPlanToEdit(plan) }}><EditIcon /></button>
                </footer>
              </article>
            )
          })}</div>
      </div>
      {showSort && <><div className="drawer-overlay" onClick={() => setShowSort(false)} /><aside className="drawer"><div className="drawer-header"><h2>Sort learning plans</h2><button className="btn btn-secondary btn-sm" onClick={() => setShowSort(false)}>×</button></div><div className="drawer-body"><div className="material-select"><label>Sort learning plans</label><div className="sort-toggle" role="group" aria-label="Sort learning plans"><button className={sortBy === 'updated' ? 'active' : ''} onClick={() => setSortBy('updated')}>Recently updated</button><button className={sortBy === 'name' ? 'active' : ''} onClick={() => setSortBy('name')}>Name</button></div></div></div><div className="drawer-footer"><button className="btn btn-secondary" onClick={() => setSortBy('updated')}>Reset</button><button className="btn btn-primary" onClick={() => setShowSort(false)}>Apply</button></div></aside></>}
      {planToEdit && <EditMetadataDrawer item={planToEdit} type="plan" onClose={() => setPlanToEdit(null)} onSave={async form => { const response = await updatePlanMetadata(planToEdit.id, form); dispatch(updatePlan(response.plan)); setPlanToEdit(null) }} onDelete={() => { setPlanToEdit(null); setPlanToDelete(planToEdit) }} />}
      {planToDelete && (
        <div className="confirm-overlay" onClick={() => setPlanToDelete(null)}>
          <div className="confirm-dialog" onClick={event => event.stopPropagation()}>
            <h3>Delete Learning Plan</h3>
            <p>Delete “{planToDelete.name}”? This permanently removes the plan and all of its courses.</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setPlanToDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => {
                if (await handleDelete(planToDelete.id)) setPlanToDelete(null)
              }}>Delete Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
