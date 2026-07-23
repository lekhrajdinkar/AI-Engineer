/**
 * UI-facing contracts for persistent AI course requests.
 *
 * These names and snake_case wire fields are the API blueprint. The backend
 * DTOs should implement this contract without requiring UI changes.
 */

export const AI_REQUEST_STATUSES = Object.freeze([
  'queued',
  'running',
  'waiting_for_rate_limit',
  'completed',
  'failed',
  'cancelled',
])

export const AI_REQUEST_TERMINAL_STATUSES = Object.freeze([
  'completed',
  'failed',
  'cancelled',
])

export const AI_PROCESSING_MODES = Object.freeze({
  BATCH: 'batch',
  WHOLE: 'whole',
})

export const AI_ORGANIZATION_CONTEXT_MODES = Object.freeze({
  TITLE_ONLY: 'title_only',
  TITLE_TAGS: 'title_tags',
  FULL_METADATA: 'full_metadata',
})

export const DEFAULT_AI_COURSE_OPTIONS = Object.freeze({
  processingMode: AI_PROCESSING_MODES.BATCH,
  batchSize: 30,
  organizationContextMode: AI_ORGANIZATION_CONTEXT_MODES.TITLE_ONLY,
  descriptionMaxWords: 200,
  maxTagsPerVideo: 12,
})

/**
 * @typedef {Object} AiCourseRequestCreate
 * @property {string} model_config_id
 * @property {{mode: 'batch'|'whole', batch_size: number|null}} processing
 * @property {{mode: 'title_only'|'title_tags'|'full_metadata', description_max_words: number, max_tags_per_video: number}} organization_context
 * @property {Array<Object>} videos
 * @property {Array<Object>} source_channels
 */

/**
 * @typedef {Object} AiCourseRequestAccepted
 * @property {string} request_id
 * @property {'queued'} status
 * @property {string} status_url
 */

/**
 * @typedef {Object} AiCourseRequestSummary
 * @property {string} id
 * @property {string} plan_id
 * @property {string} status
 * @property {Object} model_snapshot
 * @property {'batch'|'whole'} processing_mode
 * @property {number} total_videos
 * @property {number} processed_videos
 * @property {number} total_batches
 * @property {number} completed_batches
 * @property {string|null} error_code
 * @property {string|null} error_message
 * @property {Array<string>} created_course_ids
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {AiCourseRequestSummary & {
 *   request_options: Object,
 *   selected_sources: Array<Object>,
 *   batches: Array<Object>,
 *   attempts: Array<Object>,
 *   started_at: string|null,
 *   completed_at: string|null
 * }} AiCourseRequestDetail
 */

/**
 * @typedef {Object} AiModelConfig
 * @property {string} id
 * @property {string} name
 * @property {string} provider
 * @property {string} model
 * @property {boolean} enabled
 * @property {boolean} is_default
 * @property {number} temperature
 * @property {'auto'|'json_schema'|'json_mode'|'function_calling'} structured_output_mode
 * @property {number} max_input_tokens
 * @property {number} default_batch_size
 * @property {number} max_batch_size
 * @property {number} max_whole_videos
 * @property {string|null} fallback_model_config_id
 * @property {'configured'|'missing'} credential_status
 * @property {'untested'|'passed'|'failed'} test_status
 * @property {string|null} test_message
 * @property {string|null} last_tested_at
 */

/**
 * Build the canonical wire payload used by the AI Course Modal.
 *
 * @returns {AiCourseRequestCreate}
 */
export function buildAiCourseRequestPayload({
  modelConfigId,
  processingMode = DEFAULT_AI_COURSE_OPTIONS.processingMode,
  batchSize = DEFAULT_AI_COURSE_OPTIONS.batchSize,
  organizationContextMode = DEFAULT_AI_COURSE_OPTIONS.organizationContextMode,
  descriptionMaxWords = DEFAULT_AI_COURSE_OPTIONS.descriptionMaxWords,
  maxTagsPerVideo = DEFAULT_AI_COURSE_OPTIONS.maxTagsPerVideo,
  videos = [],
  sourceChannels = [],
}) {
  return {
    model_config_id: modelConfigId,
    processing: {
      mode: processingMode,
      batch_size: processingMode === AI_PROCESSING_MODES.BATCH ? batchSize : null,
    },
    organization_context: {
      mode: organizationContextMode,
      description_max_words: descriptionMaxWords,
      max_tags_per_video: maxTagsPerVideo,
    },
    videos,
    source_channels: sourceChannels,
  }
}

export function isTerminalAiRequestStatus(status) {
  return AI_REQUEST_TERMINAL_STATUSES.includes(status)
}
