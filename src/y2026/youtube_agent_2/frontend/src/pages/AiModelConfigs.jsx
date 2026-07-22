import React from 'react'
import { createAiModelConfig, deleteAiModelConfig, getAiModelConfigs, getAiModelProviders, testAiModelConfig, updateAiModelConfig } from '../api/client'
import { EditIcon, WorkspaceIcon } from '../components/Icons'

const EMPTY = {
  name: '',
  provider: 'groq',
  model: '',
  enabled: true,
  is_default: false,
  temperature: 0,
  structured_output_mode: 'auto',
  max_input_tokens: 8000,
  default_batch_size: 30,
  max_batch_size: 50,
  max_whole_videos: 30,
  fallback_model_config_id: null,
}

const EDITABLE_FIELDS = Object.keys(EMPTY)

function editableValues(item = EMPTY) {
  return Object.fromEntries(EDITABLE_FIELDS.map(key => [key, item[key] ?? EMPTY[key]]))
}

function readable(value) {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value).replaceAll('_', ' ')
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

function DetailField({ label, value }) {
  return <div className="ai-model-detail-field"><span>{label}</span><strong>{readable(value)}</strong></div>
}

function ModelForm({ form, items, providers, currentId, onChange }) {
  const numberChange = key => event => onChange(key, Number(event.target.value))
  const selectedProvider = providers.find(provider => provider.id === form.provider)
  const providerOptions = selectedProvider || !form.provider
    ? providers
    : [{ id: form.provider, name: `${form.provider} (unavailable)` }, ...providers]
  const supportedModes = selectedProvider?.structured_output_modes || ['auto']
  const outputModes = supportedModes.includes(form.structured_output_mode)
    ? supportedModes
    : [form.structured_output_mode, ...supportedModes]
  return (
    <div className="ai-model-form-sections">
      <section className="ai-model-form-section">
        <div className="ai-model-section-heading"><span>01</span><div><h3>Model identity</h3><p>Name the configuration and connect it to a hosted provider model.</p></div></div>
        <div className="form-group"><label htmlFor="model-name">Configuration name *</label><input id="model-name" value={form.name} onChange={event => onChange('name', event.target.value)} placeholder="e.g. Groq production" required /></div>
        <div className="grid-2">
          <div className="form-group"><label htmlFor="model-provider">Provider</label><select id="model-provider" value={form.provider} onChange={event => { const provider = providers.find(item => item.id === event.target.value); onChange('provider', event.target.value); if (provider && !provider.structured_output_modes.includes(form.structured_output_mode)) onChange('structured_output_mode', provider.structured_output_modes[0] || 'auto') }}>{providerOptions.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></div>
          <div className="form-group"><label htmlFor="model-id">Model ID *</label><input id="model-id" value={form.model} onChange={event => onChange('model', event.target.value)} placeholder="e.g. openai/gpt-oss-20b" required /></div>
        </div>
      </section>

      <section className="ai-model-form-section">
        <div className="ai-model-section-heading"><span>02</span><div><h3>Generation</h3><p>Control response behavior and structured output compatibility.</p></div></div>
        <div className="grid-2">
          <div className="form-group"><label htmlFor="model-temperature">Temperature</label><input id="model-temperature" type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={numberChange('temperature')} /></div>
          <div className="form-group"><label htmlFor="model-output">Structured output</label><select id="model-output" value={form.structured_output_mode} onChange={event => onChange('structured_output_mode', event.target.value)}>{outputModes.map(mode => <option key={mode} value={mode}>{readable(mode)}</option>)}</select></div>
        </div>
      </section>

      <section className="ai-model-form-section">
        <div className="ai-model-section-heading"><span>03</span><div><h3>Capacity</h3><p>Keep jobs within the provider's token and request limits.</p></div></div>
        <div className="grid-2">
          <div className="form-group"><label htmlFor="model-tokens">Max input tokens</label><input id="model-tokens" type="number" min="256" value={form.max_input_tokens} onChange={numberChange('max_input_tokens')} /></div>
          <div className="form-group"><label htmlFor="model-whole-limit">Whole-mode video limit</label><input id="model-whole-limit" type="number" min="1" value={form.max_whole_videos} onChange={numberChange('max_whole_videos')} /></div>
          <div className="form-group"><label htmlFor="model-default-batch">Default batch size</label><input id="model-default-batch" type="number" min="1" value={form.default_batch_size} onChange={numberChange('default_batch_size')} /></div>
          <div className="form-group"><label htmlFor="model-max-batch">Maximum batch size</label><input id="model-max-batch" type="number" min="1" value={form.max_batch_size} onChange={numberChange('max_batch_size')} /></div>
        </div>
      </section>

      <section className="ai-model-form-section">
        <div className="ai-model-section-heading"><span>04</span><div><h3>Routing and availability</h3><p>Choose fallback behavior and where this model can be selected.</p></div></div>
        <div className="form-group"><label htmlFor="model-fallback">Fallback model</label><select id="model-fallback" value={form.fallback_model_config_id || ''} onChange={event => onChange('fallback_model_config_id', event.target.value || null)}><option value="">None</option>{items.filter(item => item.id !== currentId && item.enabled).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="ai-model-config-checks">
          <label><input type="checkbox" checked={form.enabled} onChange={event => onChange('enabled', event.target.checked)} /> <span><strong>Enabled</strong><small>Available when creating AI courses</small></span></label>
          <label><input type="checkbox" checked={form.is_default} onChange={event => onChange('is_default', event.target.checked)} /> <span><strong>Default model</strong><small>Preselected for new requests</small></span></label>
        </div>
      </section>
    </div>
  )
}

function ModelDetails({ model, items, providers }) {
  const fallback = items.find(item => item.id === model.fallback_model_config_id)
  const providerName = providers.find(provider => provider.id === model.provider)?.name || model.provider
  return (
    <div className="ai-model-detail-sections">
      <section>
        <h3>Connection</h3>
        <div className="ai-model-detail-grid"><DetailField label="Provider" value={providerName} /><DetailField label="Model ID" value={model.model} /><DetailField label="Credential" value={model.credential_status} /><DetailField label="Availability" value={model.enabled ? 'Enabled' : 'Disabled'} /></div>
      </section>
      <section>
        <h3>Generation</h3>
        <div className="ai-model-detail-grid"><DetailField label="Temperature" value={model.temperature} /><DetailField label="Structured output" value={model.structured_output_mode} /><DetailField label="Fallback model" value={fallback?.name || 'None'} /><DetailField label="Default" value={model.is_default ? 'Yes' : 'No'} /></div>
      </section>
      <section>
        <h3>Capacity</h3>
        <div className="ai-model-detail-grid"><DetailField label="Max input tokens" value={model.max_input_tokens?.toLocaleString()} /><DetailField label="Default batch" value={model.default_batch_size} /><DetailField label="Maximum batch" value={model.max_batch_size} /><DetailField label="Whole-mode limit" value={`${model.max_whole_videos} videos`} /></div>
      </section>
      <section>
        <h3>Connection test</h3>
        <div className={`ai-model-test-result ${model.test_status}`}><div><span className="ai-model-test-dot" /><strong>{readable(model.test_status)}</strong><small>{formatDate(model.last_tested_at)}</small></div><p>{model.test_message || 'This model has not been tested yet.'}</p></div>
      </section>
      <section>
        <h3>Record</h3>
        <div className="ai-model-detail-grid"><DetailField label="Created" value={formatDate(model.created_at)} /><DetailField label="Updated" value={formatDate(model.updated_at)} /></div>
      </section>
    </div>
  )
}

export default function AiModelConfigs() {
  const [items, setItems] = React.useState([])
  const [providers, setProviders] = React.useState([])
  const [form, setForm] = React.useState({ ...EMPTY })
  const [drawerMode, setDrawerMode] = React.useState(null)
  const [selectedModel, setSelectedModel] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [notification, setNotification] = React.useState(null)

  const notify = React.useCallback((message, type = 'success') => setNotification({ message, type, key: Date.now() }), [])
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [configResponse, providerResponse] = await Promise.all([getAiModelConfigs(), getAiModelProviders()])
      const nextItems = configResponse.items || []
      setItems(nextItems)
      setProviders(providerResponse.items || [])
      return nextItems
    } catch (error) {
      notify(error.message || 'Unable to load AI model configurations', 'error')
      return []
    } finally {
      setLoading(false)
    }
  }, [notify])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notification])
  React.useEffect(() => {
    if (!drawerMode) return undefined
    const closeOnEscape = event => { if (event.key === 'Escape' && !actionLoading) setDrawerMode(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [drawerMode, actionLoading])

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const closeDrawer = () => { if (!actionLoading) { setDrawerMode(null); setSelectedModel(null); setForm({ ...EMPTY }) } }
  const openView = item => { setSelectedModel(item); setDrawerMode('view') }
  const openEdit = item => { setSelectedModel(item); setForm(editableValues(item)); setDrawerMode('edit') }
  const openCreate = () => { setSelectedModel(null); setForm({ ...EMPTY }); setDrawerMode('create') }

  async function save(event) {
    event.preventDefault()
    if (form.default_batch_size > form.max_batch_size) {
      notify('Default batch size cannot exceed the maximum batch size.', 'error')
      return
    }
    setActionLoading(true)
    try {
      if (drawerMode === 'edit') {
        await updateAiModelConfig(selectedModel.id, form)
        notify('AI model configuration updated. Test it before use.')
      } else {
        await createAiModelConfig(form)
        notify('AI model configuration created. Test it before use.')
      }
      await load()
      setDrawerMode(null)
      setSelectedModel(null)
      setForm({ ...EMPTY })
    } catch (error) {
      notify(error.message || 'Unable to save AI model configuration', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function test(model = selectedModel) {
    if (!model) return
    setActionLoading(true)
    try {
      const result = await testAiModelConfig(model.id)
      setSelectedModel(result.config)
      setItems(current => current.map(item => item.id === result.config.id ? result.config : item))
      notify(result.message, result.success ? 'success' : 'error')
    } catch (error) {
      notify(error.message || 'Unable to test AI model configuration', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function remove() {
    if (!selectedModel || !window.confirm(`Delete “${selectedModel.name}”?`)) return
    setActionLoading(true)
    try {
      const result = await deleteAiModelConfig(selectedModel.id)
      await load()
      setDrawerMode(null)
      setSelectedModel(null)
      notify(result.message || 'AI model configuration deleted.')
    } catch (error) {
      notify(error.message || 'Unable to delete AI model configuration', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const drawerTitle = drawerMode === 'create' ? 'Add AI model' : drawerMode === 'edit' ? 'Edit AI model' : selectedModel?.name
  const selectedProviderName = providers.find(provider => provider.id === selectedModel?.provider)?.name || selectedModel?.provider
  const drawerSubtitle = drawerMode === 'view' ? `${selectedProviderName} · ${selectedModel?.model}` : drawerMode === 'edit' ? 'Update configuration and capacity settings.' : 'Configure a hosted model for AI course generation.'

  return (
    <div className="ai-model-config-page">
      {notification && <div key={notification.key} className={`ai-model-toast ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}><span>{notification.message}</span><button type="button" onClick={() => setNotification(null)} aria-label="Dismiss notification">×</button></div>}

      <div className="page-header plan-overview-header">
        <div><h1>AI Model Configurations</h1><p className="ai-model-page-description">Configure hosted providers. API keys remain in server environment variables.</p></div>
        <div className="plan-action-panel"><div className="add-course-group"><button className="btn btn-secondary btn-sm" onClick={openCreate}><WorkspaceIcon name="manual" />Add Model</button></div></div>
      </div>
      <div className="page-header course-toolbar"><h4>AI models <span className="badge badge-green">{items.length}</span></h4></div>

      {loading ? <div className="ai-model-loading"><span className="spinner" /> Loading configurations...</div> : items.length === 0 ? <div className="card ai-model-empty"><h3>No AI models configured</h3><p>Add a hosted model to start generating AI courses.</p><button className="btn btn-primary" onClick={openCreate}>Add your first model</button></div> : (
        <div className="ai-model-card-list">
          {items.map(item => (
            <article className={`card catalog-tile ai-model-tile ${item.is_default ? 'default' : ''} ${!item.enabled ? 'disabled' : ''}`} key={item.id}>
              <button type="button" className="ai-model-tile-open" onClick={() => openView(item)} aria-label={`View ${item.name} details`}>
                <header className="catalog-tile-header"><span className="ai-model-provider-mark">{item.provider?.charAt(0).toUpperCase()}</span><div><h3>{item.name}</h3><p>{providers.find(provider => provider.id === item.provider)?.name || item.provider} · {item.model}</p></div></header>
                <section className="ai-model-tile-status"><span className={`ai-model-status ${item.credential_status}`}>Credential {readable(item.credential_status)}</span><span className={`ai-model-status ${item.test_status}`}>Test {readable(item.test_status)}</span>{item.is_default && <span className="ai-model-status default">Default</span>}{!item.enabled && <span className="ai-model-status disabled">Disabled</span>}</section>
                <section className="ai-model-tile-metrics"><div><strong>{item.max_input_tokens?.toLocaleString()}</strong><span>input tokens</span></div><div><strong>{item.default_batch_size}/{item.max_batch_size}</strong><span>batch size</span></div><div><strong>{item.max_whole_videos}</strong><span>whole videos</span></div></section>
                <footer className="ai-model-tile-footer"><span>{readable(item.structured_output_mode)}</span><span>Updated {formatDate(item.updated_at)}</span></footer>
              </button>
              <button type="button" className="btn btn-secondary btn-sm icon-button ai-model-tile-edit" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><EditIcon /></button>
            </article>
          ))}
        </div>
      )}

      {drawerMode && (
        <><div className="drawer-overlay" onClick={closeDrawer} /><aside className="drawer ai-model-drawer" role="dialog" aria-modal="true" aria-labelledby="ai-model-drawer-title">
          <div className="drawer-header course-overview-drawer-header"><div><h2 id="ai-model-drawer-title">{drawerTitle}</h2><p>{drawerSubtitle}</p></div><button className="btn btn-secondary btn-sm" onClick={closeDrawer} disabled={actionLoading} aria-label="Close">×</button></div>
          {drawerMode === 'view' ? <div className="drawer-body"><ModelDetails model={selectedModel} items={items} providers={providers} /></div> : <form id="ai-model-config-form" className="drawer-body ai-model-config-form" onSubmit={save}><ModelForm form={form} items={items} providers={providers} currentId={selectedModel?.id} onChange={change} /></form>}
          <div className={`drawer-footer ${drawerMode === 'edit' ? 'ai-model-edit-footer' : ''}`}>
            {drawerMode === 'view' && <><button className="btn btn-secondary" onClick={() => openEdit(selectedModel)} disabled={actionLoading}>Edit</button><button className="btn btn-primary" onClick={() => test()} disabled={actionLoading}>{actionLoading ? <><span className="spinner" /> Testing...</> : 'Test connection'}</button></>}
            {drawerMode === 'edit' && <><button className="btn btn-danger ai-model-delete-action" onClick={remove} disabled={actionLoading}>Delete</button><button className="btn btn-secondary" onClick={closeDrawer} disabled={actionLoading}>Cancel</button><button className="btn btn-primary" type="submit" form="ai-model-config-form" disabled={actionLoading}>{actionLoading ? <><span className="spinner" /> Saving...</> : 'Save changes'}</button></>}
            {drawerMode === 'create' && <><button className="btn btn-secondary" onClick={closeDrawer} disabled={actionLoading}>Cancel</button><button className="btn btn-primary" type="submit" form="ai-model-config-form" disabled={actionLoading}>{actionLoading ? <><span className="spinner" /> Creating...</> : 'Create model'}</button></>}
          </div>
        </aside></>
      )}
    </div>
  )
}
