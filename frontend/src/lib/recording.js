// Recording files: { schema_version: "1", agents: [...], events: [...] }.
// Imported recordings are always displayed as Recorded, even when an
// event was originally live; the original source is preserved separately.

import { SCHEMA_VERSIONS, validateCapability } from './schema.js'

export const MAX_RECORDING_BYTES = 2_000_000
export const MAX_RECORDING_EVENTS = 5000

function sanitizeAgent(a) {
  if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(a.id)) return null
  const str = (v, d) => (typeof v === 'string' && v.length <= 120 ? v : d)
  return {
    id: a.id,
    name: str(a.name, a.id),
    role: str(a.role, ''),
    provider: str(a.provider, 'unknown'),
    model: str(a.model, 'unknown'),
    capability: validateCapability(a.capability).ok ? a.capability : null,
  }
}

/**
 * Parse recording text. `as` is 'recorded' (user import) or 'demo' (bundled demo).
 * Returns { ok, agents, events, error }.
 */
export function parseRecording(text, as) {
  if (typeof text !== 'string') return { ok: false, error: 'Recording must be text.' }
  if (text.length > MAX_RECORDING_BYTES) return { ok: false, error: 'Recording is too large.' }
  let data
  try { data = JSON.parse(text) } catch { return { ok: false, error: 'Recording is not valid JSON.' } }
  if (!data || data.schema_version !== SCHEMA_VERSIONS.recording) return { ok: false, error: `Recording schema_version must be "${SCHEMA_VERSIONS.recording}".` }
  if (!Array.isArray(data.events)) return { ok: false, error: 'Recording has no events array.' }
  if (data.events.length > MAX_RECORDING_EVENTS) return { ok: false, error: 'Recording has too many events.' }
  const agents = (Array.isArray(data.agents) ? data.agents : []).map(sanitizeAgent).filter(Boolean)
  const events = data.events.map((e) => (e && typeof e === 'object' && !Array.isArray(e) ? { ...e, original_source: e.source, source: as } : e))
  return { ok: true, agents, events }
}
