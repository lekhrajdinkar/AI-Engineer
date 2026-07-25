import React from 'react'
import DismissibleError from './DismissibleError'
import { useDispatch, useSelector } from 'react-redux'
import {
  createAiModelConfig,
  deleteAiModelConfig,
  testAiModelConfig,
  updateAiModelConfig,
} from '../api/client'
import {
  EMPTY,
  ModelDetails,
  ModelForm,
  editableValues,
  formatDate,
  readable,
} from '../pages/AiModelConfigs'
import { loadAiModels, updateAiModelInStore } from '../store/aiModelsSlice'
import { WorkspaceIcon } from './Icons'

export default function AiModelConfigDrawer({ onClose }) {
  const dispatch = useDispatch()
  const { items, providers, status, error } = useSelector(state => state.aiModels)
  const [selectedId, setSelectedId] = React.useState(null)
  const [mode, setMode] = React.useState('view')
  const [detailTab, setDetailTab] = React.useState('visual')
  const [form, setForm] = React.useState({ ...EMPTY })
  const [actionLoading, setActionLoading] = React.useState(false)
  const [message, setMessage] = React.useState(null)
  const [slide, setSlide] = React.useState({ direction: 'next', key: 0 })

  React.useEffect(() => {
    if (status === 'idle') dispatch(loadAiModels())
  }, [dispatch, status])

  React.useEffect(() => {
    if (!items.length) {
      setSelectedId(null)
      return
    }
    if (!items.some(item => item.id === selectedId)) {
      setSelectedId((items.find(item => item.is_default) || items[0]).id)
    }
  }, [items, selectedId])

  React.useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !actionLoading) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [actionLoading, onClose])

  const selectedIndex = Math.max(items.findIndex(item => item.id === selectedId), 0)
  const selectedModel = items[selectedIndex] || null
  const selectedProvider = providers.find(provider => provider.id === selectedModel?.provider)

  const move = direction => {
    if (items.length < 2) return
    const nextIndex = (selectedIndex + direction + items.length) % items.length
    setSlide(current => ({ direction: direction > 0 ? 'next' : 'previous', key: current.key + 1 }))
    setSelectedId(items[nextIndex].id)
    setDetailTab('visual')
  }

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const startCreate = () => {
    setForm({ ...EMPTY })
    setMode('create')
    setMessage(null)
  }
  const startEdit = () => {
    if (!selectedModel) return
    setForm(editableValues(selectedModel))
    setMode('edit')
    setMessage(null)
  }

  async function save(event) {
    event.preventDefault()
    if (form.default_batch_size > form.max_batch_size) {
      setMessage({ type: 'error', text: 'Default batch size cannot exceed maximum batch size.' })
      return
    }
    setActionLoading(true)
    setMessage(null)
    try {
      if (mode === 'edit') {
        await updateAiModelConfig(selectedModel.id, form)
        setMessage({ type: 'success', text: 'AI model configuration updated.' })
      } else {
        await createAiModelConfig(form)
        setMessage({ type: 'success', text: 'AI model configuration created.' })
      }
      const result = await dispatch(loadAiModels()).unwrap()
      const nextSelected = mode === 'edit'
        ? result.items.find(item => item.id === selectedModel.id)
        : result.items.find(item => item.name === form.name)
      if (nextSelected) setSelectedId(nextSelected.id)
      setMode('view')
    } catch (saveError) {
      setMessage({ type: 'error', text: saveError.message || 'Unable to save AI model configuration.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function test() {
    if (!selectedModel) return
    setActionLoading(true)
    setMessage(null)
    try {
      const result = await testAiModelConfig(selectedModel.id)
      dispatch(updateAiModelInStore(result.config))
      setMessage({ type: result.success ? 'success' : 'error', text: result.message })
    } catch (testError) {
      setMessage({ type: 'error', text: testError.message || 'Unable to test AI model configuration.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function remove() {
    if (!selectedModel || !window.confirm(`Delete “${selectedModel.name}”?`)) return
    setActionLoading(true)
    try {
      await deleteAiModelConfig(selectedModel.id)
      await dispatch(loadAiModels()).unwrap()
      setMode('view')
      setMessage({ type: 'success', text: 'AI model configuration deleted.' })
    } catch (deleteError) {
      setMessage({ type: 'error', text: deleteError.message || 'Unable to delete AI model configuration.' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={() => !actionLoading && onClose()} />
      <aside className="drawer ai-model-library-drawer" role="dialog" aria-modal="true" aria-labelledby="ai-model-library-title">
        <header className="drawer-header course-overview-drawer-header">
          <div><h2 id="ai-model-library-title">AI Model Configurations</h2><p>Choose, inspect, and maintain the models used across your workspace.</p></div>
          <div className="ai-model-library-header-actions"><button className="btn btn-secondary btn-sm" onClick={startCreate}><WorkspaceIcon name="manual" /> Add model</button><button className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={onClose} aria-label="Close">×</button></div>
        </header>

        {message && <div className={`ai-model-drawer-message ${message.type}`}>{message.text}</div>}

        {mode === 'view' ? (
          <div className="drawer-body ai-model-library-body">
            {status === 'loading' ? <div className="ai-model-loading"><span className="spinner" /> Loading configurations…</div> : error ? <DismissibleError message={error} /> : selectedModel ? (
              <>
                <section className="ai-model-carousel">
                  <div className="ai-model-carousel-heading"><div><span>Configured models</span><strong>{selectedIndex + 1} of {items.length}</strong></div></div>
                  <div className="ai-model-carousel-track">
                    <button type="button" className="ai-model-carousel-arrow previous" onClick={() => move(-1)} disabled={items.length < 2} aria-label="Previous AI model">‹</button>
                    <article key={`${selectedModel.id}:${slide.key}`} className={`ai-model-carousel-card slide-${slide.direction} ${selectedModel.is_default ? 'default' : ''} ${!selectedModel.enabled ? 'disabled' : ''}`}>
                      <header><span className="ai-model-provider-mark">{selectedModel.provider?.charAt(0).toUpperCase()}</span><div><h3>{selectedModel.name}</h3><p>{selectedProvider?.name || selectedModel.provider} · {selectedModel.model}</p></div></header>
                      <div className="ai-model-carousel-status"><span className={`ai-model-status ${selectedModel.credential_status}`}>Credential {readable(selectedModel.credential_status)}</span><span className={`ai-model-status ${selectedModel.test_status}`}>Test {readable(selectedModel.test_status)}</span>{selectedModel.is_default && <span className="ai-model-status default">Default</span>}{!selectedModel.enabled && <span className="ai-model-status disabled">Disabled</span>}</div>
                      <footer><div><span>Created {formatDate(selectedModel.created_at)}</span><span>Updated {formatDate(selectedModel.updated_at)}</span></div><button type="button" onClick={startEdit}>Edit configuration</button></footer>
                    </article>
                    <button type="button" className="ai-model-carousel-arrow next" onClick={() => move(1)} disabled={items.length < 2} aria-label="Next AI model">›</button>
                  </div>
                </section>

                <section className="ai-model-selected-details">
                  <div className="ai-model-detail-tabs" role="tablist" aria-label="AI model configuration detail format"><button type="button" role="tab" aria-selected={detailTab === 'visual'} className={detailTab === 'visual' ? 'active' : ''} onClick={() => setDetailTab('visual')}>Visual</button><button type="button" role="tab" aria-selected={detailTab === 'json'} className={detailTab === 'json' ? 'active' : ''} onClick={() => setDetailTab('json')}>Raw JSON</button></div>
                  {detailTab === 'visual' ? <ModelDetails model={selectedModel} items={items} providers={providers} compactHeader /> : <pre className="ai-model-raw-json">{JSON.stringify(selectedModel, null, 2)}</pre>}
                </section>
              </>
            ) : <div className="ai-model-empty"><h3>No AI models configured</h3><p>Add a hosted model to enable AI-assisted organization.</p><button className="btn btn-primary" onClick={startCreate}>Add your first model</button></div>}
          </div>
        ) : (
          <form id="ai-model-library-form" className="drawer-body ai-model-config-form" onSubmit={save}>
            <div className="ai-model-library-form-heading"><button type="button" onClick={() => setMode('view')}>← Back</button><div><span>{mode === 'edit' ? 'Edit model' : 'New model'}</span><h3>{mode === 'edit' ? selectedModel?.name : 'Add AI model'}</h3></div></div>
            <ModelForm form={form} items={items} providers={providers} currentId={selectedModel?.id} onChange={change} />
          </form>
        )}

        <footer className={`drawer-footer ${mode === 'edit' ? 'ai-model-edit-footer' : ''}`}>
          {mode === 'view' && selectedModel && <><button className="btn btn-secondary" onClick={startEdit} disabled={actionLoading}>Edit</button><button className="btn btn-primary" onClick={test} disabled={actionLoading}>{actionLoading ? 'Testing…' : 'Test connection'}</button></>}
          {mode === 'edit' && <><button className="btn btn-danger ai-model-delete-action" onClick={remove} disabled={actionLoading}>Delete</button><button className="btn btn-secondary" onClick={() => setMode('view')} disabled={actionLoading}>Cancel</button><button className="btn btn-primary" type="submit" form="ai-model-library-form" disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save changes'}</button></>}
          {mode === 'create' && <><button className="btn btn-secondary" onClick={() => setMode('view')} disabled={actionLoading}>Cancel</button><button className="btn btn-primary" type="submit" form="ai-model-library-form" disabled={actionLoading}>{actionLoading ? 'Creating…' : 'Create model'}</button></>}
        </footer>
      </aside>
    </>
  )
}
