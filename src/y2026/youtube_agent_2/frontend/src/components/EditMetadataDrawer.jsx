import React, { useState } from 'react'
import { LabelIcon } from './Icons'

export default function EditMetadataDrawer({ item, type, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: item.name || item.title || '',
    description: item.description || '',
    logo_url: item.logo_url || item.logo || '',
    labels: item.labels || [],
  })
  const [customLabel, setCustomLabel] = useState('')
  const label = type === 'plan' ? 'Learning Plan' : 'Course'
  const toggleLabel = value => setForm(current => ({ ...current, labels: current.labels.includes(value) ? current.labels.filter(item => item !== value) : [...current.labels, value] }))
  const addCustomLabel = () => {
    const value = customLabel.trim()
    if (!value || form.labels.includes(value)) return
    setForm(current => ({ ...current, labels: [...current.labels, value] }))
    setCustomLabel('')
  }

  return <><div className="drawer-overlay" onClick={onClose} /><aside className="drawer" onClick={event => event.stopPropagation()}><div className="drawer-header"><h2>Edit {label}</h2><button className="btn btn-secondary btn-sm" onClick={onClose}>×</button></div><div className="drawer-body"><div className="form-group"><label>Name</label><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="form-group"><label>Description</label><textarea rows="4" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div><div className="form-group"><label>Logo URL</label><input value={form.logo_url} onChange={event => setForm({ ...form, logo_url: event.target.value })} /></div><div className="form-group"><label>Labels</label><div className="metadata-label-toggles">{['watched', 'bookmarked', 'mark_for_delete'].map(value => <button key={value} type="button" className={form.labels.includes(value) ? 'active' : ''} title={value.replaceAll('_', ' ')} onClick={() => toggleLabel(value)}><LabelIcon label={value} /></button>)}</div><div className="custom-label-input"><input value={customLabel} onChange={event => setCustomLabel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustomLabel() } }} placeholder="Add custom label" /><button type="button" className="btn btn-secondary btn-sm" onClick={addCustomLabel}>Add</button></div><div className="metadata-label-list">{form.labels.map(value => <button type="button" key={value} onClick={() => toggleLabel(value)}>{value.replaceAll('_', ' ')} ×</button>)}</div></div></div><div className="drawer-footer"><button className="btn btn-danger" onClick={onDelete}>Delete {label}</button><button className="btn btn-primary" onClick={() => onSave(form)}>Save</button></div></aside></>
}
