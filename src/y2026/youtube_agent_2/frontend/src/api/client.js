export {
  AI_ORGANIZATION_CONTEXT_MODES,
  AI_PROCESSING_MODES,
  AI_REQUEST_STATUSES,
  AI_REQUEST_TERMINAL_STATUSES,
  DEFAULT_AI_COURSE_OPTIONS,
  buildAiCourseRequestPayload,
  isTerminalAiRequestStatus,
} from './aiContracts'

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

export function getYouTubeConnectionStatus() {
  return request('/api/integrations/youtube/status')
}

export function startYouTubeConnection() {
  return request('/api/integrations/youtube/connect', { method: 'POST' })
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
export function syncSourceMetadata({ channelId } = {}) {
  const params = new URLSearchParams()
  if (channelId) params.set('channel_id', channelId)
  const query = params.toString()
  return request(`/api/sources/sync-metadata${query ? `?${query}` : ''}`, { method: 'POST' })
}
export function pushNewSourceFeeds({ channelId, playlistId, planId, courseId, moduleId, newModuleTitle, videoIds }) {
  return request('/api/sources/sync-metadata/push-new-feeds', {
    method: 'POST',
    body: JSON.stringify({
      channel_id: channelId,
      playlist_id: playlistId || null,
      plan_id: planId,
      course_id: courseId,
      module_id: moduleId || null,
      new_module_title: newModuleTitle || null,
      video_ids: videoIds,
    }),
  })
}
export function organizeNewSourceFeeds({ channelId, playlistId, videoIds, modelConfigId, userPrompt, previousSuggestion }) {
  return request('/api/sources/sync-metadata/organize-new-feeds', {
    method: 'POST',
    body: JSON.stringify({
      channel_id: channelId,
      model_config_id: modelConfigId,
      playlist_id: playlistId || null,
      video_ids: videoIds,
      user_prompt: userPrompt || null,
      previous_suggestion: previousSuggestion || null,
    }),
  })
}
export function confirmSourceFeedOrganization({ channelId, playlistId, placements }) {
  return request('/api/sources/sync-metadata/confirm-organization', {
    method: 'POST',
    body: JSON.stringify({
      channel_id: channelId,
      playlist_id: playlistId || null,
      placements,
    }),
  })
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
export function replacePlan(planId, data) { return request(`/api/plans/${planId}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function updateCourseMetadata(planId, courseId, data) { return request(`/api/plans/${planId}/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(data) }) }

export function addManualCourse(planId, course) {
  return request(`/api/plans/${planId}/add-course-manually`, { method: 'PATCH', body: JSON.stringify(course) })
}

export function addAiSuggestedCourse(planId, data) {
  return request(`/api/plans/${planId}/add-course-ai-suggested`, { method: 'POST', body: JSON.stringify(data) })
}

// Persistent AI course request API blueprint. The legacy synchronous endpoint
// above remains available until the modal migrates to this contract.
export function submitAiCourseRequest(planId, data) {
  return request(`/api/plans/${planId}/ai-course-requests`, { method: 'POST', body: JSON.stringify(data) })
}

export function getAiCourseRequests(planId, { status, cursor, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return request(`/api/plans/${planId}/ai-course-requests${query ? `?${query}` : ''}`)
}

export function getAiCourseRequest(planId, requestId) {
  return request(`/api/plans/${planId}/ai-course-requests/${requestId}`)
}

export function retryAiCourseRequest(planId, requestId) {
  return request(`/api/plans/${planId}/ai-course-requests/${requestId}/retry`, { method: 'POST' })
}

export function cancelAiCourseRequest(planId, requestId) {
  return request(`/api/plans/${planId}/ai-course-requests/${requestId}/cancel`, { method: 'POST' })
}

export function getAiModelConfigs({ enabled } = {}) {
  const params = new URLSearchParams()
  if (typeof enabled === 'boolean') params.set('enabled', String(enabled))
  const query = params.toString()
  return request(`/api/ai-model-configs${query ? `?${query}` : ''}`)
}

export function getAiModelProviders() {
  return request('/api/ai-model-providers')
}

export function createAiModelConfig(data) {
  return request('/api/ai-model-configs', { method: 'POST', body: JSON.stringify(data) })
}

export function updateAiModelConfig(configId, data) {
  return request(`/api/ai-model-configs/${configId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteAiModelConfig(configId) {
  return request(`/api/ai-model-configs/${configId}`, { method: 'DELETE' })
}

export function testAiModelConfig(configId) {
  return request(`/api/ai-model-configs/${configId}/test`, { method: 'POST' })
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
