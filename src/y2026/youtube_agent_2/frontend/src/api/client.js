const BASE = ''  // Vite proxy handles /api, /auth to backend

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  return res.json()
}

export function googleLogin() {
  window.location.href = `${BASE}/auth/google/login`
}

export function googleLogout() {
  return request('/auth/google/logout', { method: 'POST' })
}

export function getAuthDebug() {
  return request('/auth/google/debug')
}

export function getChannels() {
  return request('/api/channels')
}

export function getPlaylists(channelId) {
  return request(`/api/${channelId}/playlists`)
}

export function getVideos(channelId, playlistId) {
  let url = `/api/videos?channel_id=${channelId}`
  if (playlistId) url += `&playlist_id=${playlistId}`
  return request(url)
}

export function createPlan(data) {
  return request('/api/plans', { method: 'POST', body: JSON.stringify(data) })
}

export function getPlans() {
  return request('/api/plans')
}

export function deletePlan(planId) {
  return request(`/api/plans/${planId}`, { method: 'DELETE' })
}

export function getPlan(planId) {
  return request(`/api/plans/${planId}`)
}

export function refreshPlan(planId) {
  return request(`/api/plans/${planId}/refresh`, { method: 'PATCH' })
}

export function aiSuggest(planId) {
  return request(`/api/plans/${planId}/ai-suggest`, { method: 'POST' })
}

export function searchVideos(query) {
  return request(`/api/search?q=${encodeURIComponent(query)}`)
}
