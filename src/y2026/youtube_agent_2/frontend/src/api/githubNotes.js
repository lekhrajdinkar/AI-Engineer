import { NOTE_INDEX_CACHE_MS, NOTE_REPOSITORIES } from '../config/noteRepositories'

const memoryCache = new Map()
const CACHE_PREFIX = 'learning-notes-index:v1:'

function repositoryById(repositoryId) {
  const repository = NOTE_REPOSITORIES.find(item => item.id === repositoryId)
  if (!repository) throw new Error('Notes repository is not configured.')
  return repository
}

function cacheKey(repository) {
  return `${CACHE_PREFIX}${repository.id}:${repository.branch}:${repository.path}`
}

function readCache(repository) {
  const key = cacheKey(repository)
  const memory = memoryCache.get(key)
  if (memory && Date.now() - memory.cachedAt < NOTE_INDEX_CACHE_MS) return memory.data
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (stored && Date.now() - stored.cachedAt < NOTE_INDEX_CACHE_MS) {
      memoryCache.set(key, stored)
      return stored.data
    }
  } catch {
    // Storage may be unavailable or contain an older invalid value.
  }
  return null
}

function writeCache(repository, data) {
  const entry = { cachedAt: Date.now(), data }
  const key = cacheKey(repository)
  memoryCache.set(key, entry)
  try { localStorage.setItem(key, JSON.stringify(entry)) } catch { /* Memory cache remains available. */ }
}

function displayTitle(path) {
  const filename = path.split('/').at(-1).replace(/\.(md|markdown)$/i, '')
  return filename.replace(/^\d+[_. -]*/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) || filename
}

function publicRepository(repository, noteCount) {
  return {
    ...repository,
    root_path: repository.path,
    note_count: noteCount,
    repository_url: `https://github.com/${repository.owner}/${repository.repo}`,
  }
}

function rawUrl(repository, path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${encodeURIComponent(repository.branch)}/${encodedPath}`
}

async function responseError(response, fallback) {
  try {
    const payload = await response.json()
    return payload.error || fallback
  } catch {
    return fallback
  }
}

export async function getLocalNoteAvailability() {
  try {
    const response = await fetch('/local-notes/status', { cache: 'no-store' })
    if (!response.ok) return []
    const payload = await response.json()
    return Array.isArray(payload.available) ? payload.available : []
  } catch {
    return []
  }
}

async function getLocalNotes(repository) {
  const response = await fetch(`/local-notes/${encodeURIComponent(repository.id)}/index`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await responseError(response, 'The local checkout could not be indexed.'))
  const payload = await response.json()
  return {
    ...publicRepository(repository, payload.notes?.length || 0),
    source: 'local',
    notes: payload.notes || [],
    allNotes: payload.allNotes || payload.notes || [],
  }
}

export async function getNotes(repositoryId, source = 'remote') {
  const repository = repositoryById(repositoryId)
  if (source === 'local') return getLocalNotes(repository)
  const cached = readCache(repository)
  if (cached) return cached

  const treeUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${encodeURIComponent(repository.branch)}?recursive=1`
  const response = await fetch(treeUrl)
  if (!response.ok) throw new Error(`GitHub could not load ${repository.name} (HTTP ${response.status}).`)
  const payload = await response.json()
  if (payload.truncated) throw new Error(`${repository.name} is too large for GitHub to list completely.`)

  const prefix = repository.path.replace(/^\/+|\/+$/g, '')
  const allNotes = (payload.tree || []).filter(item => {
    const path = item.path || ''
    const filename = path.split('/').at(-1).replace(/\.(md|markdown)$/i, '')
    return item.type === 'blob'
      && /\.(md|markdown)$/i.test(path)
      && !filename.toLowerCase().endsWith('__x')
  }).map(item => ({
    path: item.path,
    title: displayTitle(item.path),
    folder: item.path.split('/').slice(0, -1).join('/'),
    size: item.size || 0,
    sha: item.sha || '',
    github_url: `https://github.com/${repository.owner}/${repository.repo}/blob/${repository.branch}/${item.path}`,
  })).sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }))

  const notes = allNotes.filter(item => item.path.startsWith(`${prefix}/`))
  const result = {
    ...publicRepository(repository, notes.length),
    source: 'remote',
    notes,
    allNotes,
  }
  writeCache(repository, result)
  return result
}

export async function getNoteRepositories() {
  const localRepositories = new Set(await getLocalNoteAvailability())
  const results = await Promise.allSettled(NOTE_REPOSITORIES.map(repository => getNotes(repository.id)))
  const repositories = await Promise.all(results.map(async (result, index) => {
    const repository = NOTE_REPOSITORIES[index]
    if (result.status === 'fulfilled') return { ...publicRepository(repository, result.value.notes.length), local_available: localRepositories.has(repository.id) }
    if (localRepositories.has(repository.id)) {
      try {
        const local = await getLocalNotes(repository)
        return { ...publicRepository(repository, local.notes.length), local_available: true, remote_error: result.reason?.message || 'Unable to load GitHub.' }
      } catch {
        // Surface the original remote error when neither source can load.
      }
    }
    return { ...publicRepository(repository, 0), local_available: false, error: result.reason?.message || 'Unable to load repository.' }
  }))
  return {
    repositories,
  }
}

export async function getNoteContent(repositoryId, path, source = 'remote') {
  const repository = repositoryById(repositoryId)
  const index = await getNotes(repositoryId, source)
  const lastSegment = (path || '').split('/').at(-1) || ''
  const isFileWithExt = lastSegment.includes('.')
  const normalizedPath = isFileWithExt ? path : `${path.replace(/\/+$/, '')}/README.md`
  const selected = index.notes.find(note => note.path === path || note.path === normalizedPath)
  const noteMeta = selected || {
    path: normalizedPath,
    title: displayTitle(normalizedPath),
    github_url: `https://github.com/${repository.owner}/${repository.repo}/blob/${repository.branch}/${normalizedPath}`,
  }

  if (source === 'local') {
    const url = `/local-notes/${encodeURIComponent(repositoryId)}/content?path=${encodeURIComponent(path)}`
    const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/')
    const rawUrl = `${window.location.origin}/local-notes/${encodeURIComponent(repositoryId)}/raw/${encodedPath}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(await responseError(response, 'The local Markdown note could not be read.'))
    return {
      repository_id: repositoryId,
      path: normalizedPath,
      title: noteMeta.title,
      content: await response.text(),
      raw_url: rawUrl,
      github_url: noteMeta.github_url,
      source: 'local',
    }
  }

  const url = rawUrl(repository, normalizedPath)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GitHub could not load this note (HTTP ${response.status}).`)
  return {
    repository_id: repositoryId,
    path: normalizedPath,
    title: noteMeta.title,
    content: await response.text(),
    raw_url: url,
    github_url: noteMeta.github_url,
    source: 'remote',
  }
}
