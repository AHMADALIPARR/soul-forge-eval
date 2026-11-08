// Versioned client-side schemas for the Soul Forge messaging console.
// These validate envelopes the browser receives; they do not define or
// imply any backend endpoint. A runtime implementer must validate the
// same rules server-side.

export const SCHEMA_VERSIONS = Object.freeze({
  event: '1',
  capability: '1',
  config_ack: '1',
  recording: '1',
})

export const EVENT_KINDS = ['message', 'activity', 'config', 'worker', 'verdict']
export const EVENT_SOURCES = ['live', 'recorded', 'demo']
export const STATUS_BY_KIND = Object.freeze({
  message: ['queued', 'sent', 'delivered', 'failed', 'unknown'],
  activity: ['working', 'waiting', 'complete', 'failed', 'unknown'],
  config: ['queued', 'complete', 'failed', 'unknown'],
  worker: ['working', 'waiting', 'complete', 'failed', 'unknown'],
  verdict: ['complete', 'failed', 'unknown'],
})
export const ACTIVITY_LABELS = ['idle', 'thinking', 'working', 'sending', 'waiting', 'error', 'unknown']

// Fields that must never be rendered or retained, even if a runtime sends them.
export const FORBIDDEN_FIELDS = ['private_reasoning', 'reasoning', 'chain_of_thought', 'thoughts', 'raw_reasoning']

export const MAX_MESSAGE_CHARS = 8000
export const MAX_SUMMARY_CHARS = 600
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

const isStr = (v) => typeof v === 'string'
const isId = (v) => isStr(v) && ID_RE.test(v)
const isTs = (v) => isStr(v) && TS_RE.test(v) && !Number.isNaN(Date.parse(v))
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Validate an AgentEvent v1 envelope. Returns { ok, errors }. */
export function validateEvent(e) {
  const errors = []
  if (!isObj(e)) return { ok: false, errors: ['event is not an object'] }
  if (e.schema_version !== SCHEMA_VERSIONS.event) errors.push(`schema_version must be "${SCHEMA_VERSIONS.event}"`)
  for (const f of ['event_id', 'run_id', 'task_id', 'sender', 'correlation_id']) if (!isId(e[f])) errors.push(`${f} missing or malformed`)
  if (!Number.isSafeInteger(e.sequence) || e.sequence < 1) errors.push('sequence must be a positive integer')
  if (!isTs(e.occurred_at)) errors.push('occurred_at must be an ISO timestamp with offset')
  if (!isTs(e.received_at)) errors.push('received_at must be an ISO timestamp with offset')
  const r = e.recipient
  const recipientOk = r === 'broadcast' || isId(r) || (Array.isArray(r) && r.length > 0 && r.length <= 32 && r.every(isId))
  if (!recipientOk) errors.push('recipient must be an agent id, a non-empty id list, or "broadcast"')
  if (!EVENT_KINDS.includes(e.kind)) errors.push('kind not recognised')
  if (!EVENT_SOURCES.includes(e.source)) errors.push('source must be live, recorded or demo')
  if (EVENT_KINDS.includes(e.kind) && !(STATUS_BY_KIND[e.kind] || []).includes(e.status)) errors.push(`status "${e.status}" not allowed for kind ${e.kind}`)
  if (e.message !== null && !isStr(e.message)) errors.push('message must be plain text or null')
  if (isStr(e.message) && e.message.length > MAX_MESSAGE_CHARS) errors.push('message exceeds size limit')
  if (e.kind === 'message' && !isStr(e.message)) errors.push('message events need message text')
  if (e.kind === 'activity') {
    if (!ACTIVITY_LABELS.includes(e.activity_label)) errors.push('activity_label not recognised')
    if (e.expires_at !== undefined && !isTs(e.expires_at)) errors.push('expires_at malformed')
  }
  if (e.progress_summary !== undefined && e.progress_summary !== null) {
    if (!isStr(e.progress_summary)) errors.push('progress_summary must be text')
    else if (e.progress_summary.length > MAX_SUMMARY_CHARS) errors.push('progress_summary exceeds size limit')
  }
  if (e.evidence_refs !== undefined && !(Array.isArray(e.evidence_refs) && e.evidence_refs.every(isStr))) errors.push('evidence_refs must be strings')
  return { ok: errors.length === 0, errors }
}

/** Copy only the fields the UI is allowed to render. Forbidden fields are dropped. */
export function toRenderable(e) {
  const keep = ['schema_version', 'event_id', 'run_id', 'sequence', 'occurred_at', 'received_at', 'task_id', 'sender', 'recipient', 'kind', 'message', 'status', 'source', 'correlation_id', 'activity_label', 'progress_summary', 'configuration_revision', 'worker_id', 'evidence_refs', 'started_at', 'expires_at']
  const out = {}
  for (const k of keep) if (e[k] !== undefined) out[k] = e[k]
  if (EVENT_SOURCES.includes(e.original_source)) out.original_source = e.original_source
  const dropped = FORBIDDEN_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(e, f))
  if (dropped.length) out.redacted_fields = dropped
  return out
}

/** Validate a TemperatureCapability v1. */
export function validateCapability(c) {
  const errors = []
  if (!isObj(c)) return { ok: false, errors: ['capability is not an object'] }
  if (c.schema_version !== SCHEMA_VERSIONS.capability) errors.push(`schema_version must be "${SCHEMA_VERSIONS.capability}"`)
  if (!isStr(c.provider) || !c.provider) errors.push('provider required')
  if (!isStr(c.model) || !c.model) errors.push('model required')
  if (!['supported', 'unsupported', 'unknown'].includes(c.support)) errors.push('support must be supported/unsupported/unknown')
  if (!Number.isSafeInteger(c.revision) || c.revision < 0) errors.push('revision must be a non-negative integer')
  if (c.support === 'supported') {
    for (const f of ['min', 'max', 'step']) if (typeof c[f] !== 'number' || !Number.isFinite(c[f])) errors.push(`${f} must be finite`)
    if (Number.isFinite(c.min) && Number.isFinite(c.max) && c.min >= c.max) errors.push('min must be below max')
    if (Number.isFinite(c.step) && c.step <= 0) errors.push('step must be positive')
    if (!(c.default === 'provider_default' || (typeof c.default === 'number' && Number.isFinite(c.default)))) errors.push('default must be a number or "provider_default"')
  }
  return { ok: errors.length === 0, errors }
}

/** Validate a ConfigAck v1 (runtime acknowledgment of a configuration request). */
export function validateConfigAck(a) {
  const errors = []
  if (!isObj(a)) return { ok: false, errors: ['ack is not an object'] }
  if (a.schema_version !== SCHEMA_VERSIONS.config_ack) errors.push(`schema_version must be "${SCHEMA_VERSIONS.config_ack}"`)
  for (const f of ['request_id', 'agent_id', 'model']) if (!isId(a[f])) errors.push(`${f} missing or malformed`)
  if (!['accepted', 'rejected', 'conflict'].includes(a.result)) errors.push('result must be accepted/rejected/conflict')
  if (!Number.isSafeInteger(a.expected_revision)) errors.push('expected_revision required')
  if (!Number.isSafeInteger(a.revision)) errors.push('revision required')
  if (a.result === 'accepted') {
    const t = a.effective_temperature
    if (!(t === 'provider_default' || (typeof t === 'number' && Number.isFinite(t)))) errors.push('accepted ack needs effective_temperature')
  } else if (!isStr(a.reason) || !a.reason) errors.push('rejected/conflict ack needs a reason')
  return { ok: errors.length === 0, errors }
}
