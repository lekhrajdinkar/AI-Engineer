const BASE = import.meta.env.VITE_API_BASE_URL || ''
let accessTokenProvider = async () => null

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider || (async () => null)
}

async function request(path, options = {}) {
  const token = await accessTokenProvider()
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
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

export function getSourceSyncMetadata() { return request('/api/sources/sync-metadata') }
export function syncSourceMetadata() { return request('/api/sources/sync-metadata', { method: 'POST' }) }
export function pushNewSourceFeeds({ channelId, playlistId } = {}) {
  const params = new URLSearchParams()
  if (channelId) params.set('channel_id', channelId)
  if (playlistId) params.set('playlist_id', playlistId)
  const query = params.toString()
  return request(`/api/sources/sync-metadata/push-new-feeds${query ? `?${query}` : ''}`, { method: 'POST' })
}
export function discoverNewCourseVideos(planId, courseId, { channelId, playlistId } = {}) {
  const params = new URLSearchParams()
  if (channelId) params.set('channel_id', channelId)
  if (playlistId) params.set('playlist_id', playlistId)
  const query = params.toString()
  return request(`/api/plans/${planId}/courses/${courseId}/discover-new-videos${query ? `?${query}` : ''}`, { method: 'POST' })
}
export function submitCourseRefreshFeed(planId, courseId) { return request(`/api/plans/${planId}/courses/${courseId}/ai-suggest-refresh-feed`, { method: 'POST' }) }

export function getPlans() {
  return request('/api/plans')
}

export function deletePlan(planId) {
  return request(`/api/plans/${planId}`, { method: 'DELETE' })
}

export function updatePlanMetadata(planId, data) { return request(`/api/plans/${planId}`, { method: 'PATCH', body: JSON.stringify(data) }) }
export function updateCourseMetadata(planId, courseId, data) { return request(`/api/plans/${planId}/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(data) }) }

export function addManualCourse(planId, course) {
  return request(`/api/plans/${planId}/add-course-manually`, { method: 'PATCH', body: JSON.stringify(course) })
}

export function addAiSuggestedCourse(planId, data) {
  return request(`/api/plans/${planId}/add-course-ai-suggested`, { method: 'POST', body: JSON.stringify(data) })
}

export function deleteCourses(planId, courseIds) {
  return request(`/api/courses/${planId}`, { method: 'DELETE', body: JSON.stringify({ course_ids: courseIds }) })
}

export function updateCourseLabels(planId, courseId, labels) {
  return request(`/api/plans/${planId}/courses/${courseId}/labels`, { method: 'PATCH', body: JSON.stringify({ labels }) })
}

export function updatePlanLabels(planId, labels) {
  return request(`/api/plans/${planId}/labels`, { method: 'PATCH', body: JSON.stringify({ labels }) })
}

export function updateModuleLabels(planId, courseId, moduleId, labels) {
  return request(`/api/plans/${planId}/courses/${courseId}/modules/${moduleId}/labels`, { method: 'PATCH', body: JSON.stringify({ labels }) })
}

export function updateVideoLabels(planId, courseId, moduleId, videoId, labels) {
  return request(`/api/plans/${planId}/courses/${courseId}/modules/${moduleId}/videos/${videoId}/labels`, { method: 'PATCH', body: JSON.stringify({ labels }) })
}
export function updateVideoPlayback(planId, courseId, moduleId, videoId, positionSecs) {
  return request(`/api/plans/${planId}/courses/${courseId}/modules/${moduleId}/videos/${videoId}/playback`, { method: 'PATCH', body: JSON.stringify({ position_secs: positionSecs }) })
}

export function reorderCourseVideos(planId, courseId, data) {
  return request(`/api/plans/${planId}/courses/${courseId}/videos/reorder`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function getPlan(planId) {
  return request(`/api/plans/${planId}`)
}

export function refreshPlan(planId) {
  return request(`/api/plans/${planId}/refresh`, { method: 'PATCH' })
}

export function searchVideos(query) {
  return request(`/api/search?q=${encodeURIComponent(query)}`)
}
