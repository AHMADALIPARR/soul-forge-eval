// Ordered, deduplicated, partitioned event store. Pure functions over a
// plain state object so the same logic runs in unit tests and the UI.
//
// Authoritative order is the runtime-assigned `sequence` per partition
// (source + run_id), never wall clock. Duplicates (same id, same body) are
// dropped; conflicts (same id different body, or same sequence different
// id) are quarantined. Out-of-order events are buffered (bounded) and a gap
// is reported until it fills or the cursor is explicitly reset.

import { validateEvent, toRenderable } from './schema.js'

export const MAX_BUFFER = 256
export const MAX_QUARANTINE = 200

export function createStore() {
  return { partitions: {}, quarantine: [], notices: [] }
}

export const partitionKey = (e) => `${e.source}:${e.run_id}`

// Stable serialisation (sorted keys) used to compare duplicate bodies.
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
  return JSON.stringify(v)
}

function emptyPartition(source, run_id) {
  return { source, run_id, cursor: 0, delivered: [], buffer: {}, ids: {}, seqToId: {}, gap: null }
}

function quarantine(store, raw, reason) {
  const q = [...store.quarantine, { reason, event_id: raw && typeof raw === 'object' ? String(raw.event_id ?? '') : '', at_sequence: raw && raw.sequence }]
  return { ...store, quarantine: q.slice(-MAX_QUARANTINE) }
}

function computeGap(p) {
  const pending = Object.keys(p.buffer).map(Number)
  if (!pending.length) return null
  const lowest = Math.min(...pending)
  return { from: p.cursor + 1, to: lowest - 1, buffered: pending.length }
}

/** Ingest one raw event. Returns the next store (never mutates). */
export function ingest(store, raw) {
  const v = validateEvent(raw)
  if (!v.ok) return quarantine(store, raw, `malformed: ${v.errors.join('; ')}`)
  const e = toRenderable(raw)
  const key = partitionKey(e)
  const p0 = store.partitions[key] || emptyPartition(e.source, e.run_id)
  const body = canonical(e)

  if (p0.ids[e.event_id] !== undefined) {
    if (p0.ids[e.event_id] === body) return store // exact duplicate: exactly-once display
    return quarantine(store, raw, 'conflict: event_id reused with a different body')
  }
  if (e.sequence <= p0.cursor) return quarantine(store, raw, `stale: sequence ${e.sequence} is at or behind cursor ${p0.cursor}`)
  const seqOwner = p0.seqToId[e.sequence]
  if (seqOwner !== undefined && seqOwner !== e.event_id) return quarantine(store, raw, `conflict: sequence ${e.sequence} already assigned to ${seqOwner}`)
  if (Object.keys(p0.buffer).length >= MAX_BUFFER && e.sequence !== p0.cursor + 1) return quarantine(store, raw, 'overflow: out-of-order buffer full; reset cursor to recover')

  const p = { ...p0, buffer: { ...p0.buffer, [e.sequence]: e }, ids: { ...p0.ids, [e.event_id]: body }, seqToId: { ...p0.seqToId, [e.sequence]: e.event_id }, delivered: p0.delivered }
  // Drain contiguous events in sequence order.
  const delivered = [...p.delivered]
  let cursor = p.cursor
  while (p.buffer[cursor + 1]) {
    delivered.push(p.buffer[cursor + 1])
    const { [cursor + 1]: _drop, ...rest } = p.buffer
    p.buffer = rest
    cursor += 1
  }
  p.delivered = delivered
  p.cursor = cursor
  p.gap = computeGap(p)
  return { ...store, partitions: { ...store.partitions, [key]: p } }
}

export function ingestAll(store, events) {
  return events.reduce(ingest, store)
}

/** Explicit, user-visible cursor reset: skip the unrecoverable gap and drain buffered events. */
export function resetCursor(store, key) {
  const p0 = store.partitions[key]
  if (!p0 || !p0.gap) return store
  const skipped = p0.gap
  const p = { ...p0, cursor: skipped.to, delivered: [...p0.delivered], buffer: { ...p0.buffer } }
  while (p.buffer[p.cursor + 1]) {
    p.delivered.push(p.buffer[p.cursor + 1])
    delete p.buffer[p.cursor + 1]
    p.cursor += 1
  }
  p.gap = computeGap(p)
  const notice = { key, text: `Cursor reset: sequences ${skipped.from}–${skipped.to} were skipped and are missing from this view.` }
  return { ...store, partitions: { ...store.partitions, [key]: p }, notices: [...store.notices, notice] }
}

/** Delivered events for one source, ordered by run then sequence. Never mixes sources. */
export function eventsForSource(store, source) {
  return Object.values(store.partitions)
    .filter((p) => p.source === source)
    .sort((a, b) => a.run_id.localeCompare(b.run_id))
    .flatMap((p) => p.delivered)
}

export function gapsForSource(store, source) {
  return Object.entries(store.partitions)
    .filter(([, p]) => p.source === source && p.gap)
    .map(([key, p]) => ({ key, run_id: p.run_id, ...p.gap }))
}

/**
 * Latest public activity per agent. For live data an expired or missing
 * expiry makes the activity Unknown. Recorded/demo activity is reported as
 * recorded (with its timestamp), never as current.
 */
export function activityByAgent(events, nowMs) {
  const out = {}
  for (const e of events) {
    if (e.kind !== 'activity') continue
    let label = e.activity_label
    let stale = false
    if (e.source === 'live') {
      const exp = e.expires_at ? Date.parse(e.expires_at) : NaN
      if (!Number.isFinite(exp) || exp <= nowMs) { label = 'unknown'; stale = true }
    }
    out[e.sender] = { label, stale, asRecorded: e.source !== 'live', at: e.occurred_at, summary: e.progress_summary ?? null, task_id: e.task_id }
  }
  return out
}
