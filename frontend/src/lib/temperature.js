// Per-agent temperature: draft (browser) -> pending (request sent) ->
// effective (only from a correlated runtime acknowledgment). Nothing here
// assumes a universal 0–2 range; the capability decides.

import { validateCapability, validateConfigAck, SCHEMA_VERSIONS } from './schema.js'

export function createAgentConfig({ agent_id, model, capability, revision = 0, effective = null }) {
  const cap = validateCapability(capability).ok ? capability : { support: 'unknown', provider: 'unknown', model, revision: 0, schema_version: SCHEMA_VERSIONS.capability }
  // effective: null means not applied / not reported by any runtime.
  return { agent_id, model, capability: cap, revision, effective, draft: null, pending: null, last: null }
}

export function temperatureEditable(cfg) {
  return cfg.capability.support === 'supported' && cfg.capability.model === cfg.model
}

export function capabilityExplanation(cfg) {
  const c = cfg.capability
  if (c.model !== cfg.model) return 'Capability was reported for a different model; temperature is disabled until the runtime reports the current model.'
  if (c.support === 'unsupported') return `${c.provider} / ${c.model} does not accept a temperature setting.`
  if (c.support === 'unknown') return 'No runtime has reported whether this model accepts temperature, so it cannot be set.'
  const def = c.default === 'provider_default' ? 'provider default' : String(c.default)
  return `${c.provider} / ${c.model} accepts ${c.min}–${c.max} in steps of ${c.step}; default: ${def}.${c.restrictions ? ' ' + c.restrictions : ''}`
}

/** Validate a candidate value. Accepts numbers or numeric strings; never clamps. */
export function validateTemperature(value, capability) {
  if (!capability || capability.support !== 'supported') return { ok: false, reason: 'Temperature is not supported or not known for this model.' }
  if (typeof value === 'string') {
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return { ok: false, reason: 'Enter a number.' }
    value = Number(value.trim())
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, reason: 'Enter a finite number.' }
  if (value < capability.min || value > capability.max) return { ok: false, reason: `Must be between ${capability.min} and ${capability.max}.` }
  const steps = (value - capability.min) / capability.step
  if (Math.abs(steps - Math.round(steps)) > 1e-9) return { ok: false, reason: `Must be a multiple of ${capability.step} from ${capability.min}.` }
  return { ok: true, value }
}

export function setDraft(cfg, raw) {
  return { ...cfg, draft: { raw, check: validateTemperature(raw, cfg.capability) } }
}

export function resetDraft(cfg) {
  return { ...cfg, draft: null }
}

/** Build a pending request. Returns { cfg, request } or { cfg, error }. */
export function requestApply(cfg, request_id) {
  if (!temperatureEditable(cfg)) return { cfg, error: 'Temperature cannot be set for this model.' }
  if (!cfg.draft || !cfg.draft.check.ok) return { cfg, error: 'Draft value is not valid.' }
  if (cfg.pending) return { cfg, error: 'A request is already pending.' }
  const request = { schema_version: SCHEMA_VERSIONS.config_ack, request_id, agent_id: cfg.agent_id, model: cfg.model, expected_revision: cfg.revision, changes: { temperature: cfg.draft.check.value } }
  return { cfg: { ...cfg, pending: request }, request }
}

/**
 * Apply a runtime acknowledgment. Only an ack that matches the pending
 * request id, agent, model and expected revision changes the effective
 * value; anything else is recorded as ignored.
 */
export function applyAck(cfg, ack) {
  const v = validateConfigAck(ack)
  if (!v.ok) return { ...cfg, last: { kind: 'ignored', reason: `Malformed acknowledgment: ${v.errors.join('; ')}` } }
  const p = cfg.pending
  if (!p || ack.request_id !== p.request_id) return { ...cfg, last: { kind: 'ignored', reason: 'Acknowledgment does not match a pending request.' } }
  if (ack.agent_id !== cfg.agent_id || ack.model !== cfg.model) return { ...cfg, last: { kind: 'ignored', reason: 'Acknowledgment is for a different agent or model (stale).' } }
  if (ack.expected_revision !== p.expected_revision || (ack.result === 'accepted' && ack.revision <= cfg.revision)) return { ...cfg, last: { kind: 'ignored', reason: 'Acknowledgment revision is stale.' } }
  if (ack.result === 'accepted') {
    const requested = p.changes.temperature
    const eff = ack.effective_temperature
    const adjusted = eff !== requested
    return { ...cfg, pending: null, draft: null, revision: ack.revision, effective: { temperature: eff, revision: ack.revision, requested, adjusted }, last: { kind: 'applied', reason: adjusted ? `Runtime applied ${eff} instead of requested ${requested}.` : null } }
  }
  // rejected / conflict: keep the draft so the user can see and fix it.
  return { ...cfg, pending: null, revision: ack.result === 'conflict' ? Math.max(cfg.revision, ack.revision) : cfg.revision, last: { kind: ack.result, reason: ack.reason } }
}

/** Model switch invalidates the capability, any pending request and the effective value. */
export function changeModel(cfg, model, capability) {
  return { ...createAgentConfig({ agent_id: cfg.agent_id, model, capability, revision: cfg.revision }), last: { kind: 'model_changed', reason: 'Model changed: earlier capability and applied value no longer hold.' } }
}

/** Demo-only: there is no runtime, so a demo "apply" is a labelled local simulation that is NOT applied to any model. */
export function demoApply(cfg) {
  if (!cfg.draft || !cfg.draft.check.ok) return { ...cfg, last: { kind: 'ignored', reason: 'Draft value is not valid.' } }
  return { ...cfg, last: { kind: 'not_applied', reason: `Demo: ${cfg.draft.check.value} kept as a local simulation only. No model received it.` } }
}

/** Human label for the three-way state. */
export function temperatureState(cfg) {
  return {
    requested: cfg.draft ? cfg.draft.raw : null,
    pending: cfg.pending ? cfg.pending.changes.temperature : null,
    effective: cfg.effective ? cfg.effective.temperature : null,
    effectiveLabel: cfg.effective ? (cfg.effective.temperature === 'provider_default' ? 'provider default' : String(cfg.effective.temperature)) : 'not_applied',
  }
}
