// Presentation semantics for the existing evaluation templates. This file
// does NOT change engine behaviour; it describes it honestly.
//
// - Reliability: the engine records two batch booleans per case:
//   "any trial passed" (reported as pass@k) and "every trial passed"
//   (pass^k, the gate). They are observations of one batch, not
//   statistical estimators of a pass probability.
// - Zero trials: the engine starts wins at 0, so wins == trials is true
//   with no trial run. The console marks this INVALID / UNVERIFIED instead
//   of showing it as a pass.
// - Ledger: SHA-256 links in an in-memory chain. Internal consistency
//   only; not durable, not replay-safe, not authenticated.

export const ENGINE_KINDS = ['assertions', 'reliability', 'metrology', 'judge']

export const LEDGER_SCOPE = 'Hash-linked in memory within one engine run. Links show internal consistency only: the chain is not durable, not replay-safe (no event-id dedup), and does not authenticate who wrote a verdict.'

export function reliabilityConfigStatus(template) {
  if (template.kind !== 'reliability') return null
  const t = template.trials
  if (t === undefined) return { status: 'UNVERIFIED', reason: 'No trials field: the engine falls back to 4 trials (eval_engine.gd default).' }
  if (!Number.isInteger(t) || t < 1) return { status: 'INVALID', reason: `trials = ${JSON.stringify(t)}: with zero trials the engine's "every trial passed" check is vacuously true, so any result is unverified.` }
  return { status: 'OK', reason: `${t} trials per case. The gate reads "every trial passed".` }
}

/** Describe a reliability case result (as the engine reports it). */
export function describeReliabilityCase({ trials, wins, pass_at_k, pass_pow_k }) {
  if (!Number.isInteger(trials) || trials < 1) return { status: 'INVALID', label: 'Unverified: zero trials (vacuous pass)', any: null, every: null }
  return {
    status: pass_pow_k ? 'PASS' : 'HELD',
    label: `${wins}/${trials} trials passed in this batch`,
    any: { name: 'any trial passed (pass@k, observed)', value: !!pass_at_k },
    every: { name: 'every trial passed (pass^k, observed, gate)', value: !!pass_pow_k },
  }
}

export function templateNote(template) {
  switch (template.kind) {
    case 'assertions': return 'Deterministic checks; no judge.'
    case 'reliability': return 'Batch booleans, not probability estimates. Gate: every trial passed.'
    case 'metrology': return 'Elapsed microseconds and output size per case. Not currency; wall-clock, so not deterministic.'
    case 'judge': return 'Refused by the engine when enabled: no judge is trusted yet.'
    default: return 'Kind not spoken by the engine.'
  }
}

export function thresholdNote(template) {
  return template.threshold === undefined ? null : `threshold ${template.threshold} (metadata; the engine does not read it)`
}
