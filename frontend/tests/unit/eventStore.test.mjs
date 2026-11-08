import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createStore, ingestAll, ingest, eventsForSource, gapsForSource, resetCursor, activityByAgent, MAX_BUFFER } from '../../src/lib/eventStore.js'

const fx = JSON.parse(readFileSync(new URL('../fixtures/replay-reorder.json', import.meta.url)))
const base = (run, seq, id, extra = {}) => ({ schema_version: '1', event_id: id, run_id: run, sequence: seq, occurred_at: '2026-11-07T10:00:00Z', received_at: '2026-11-07T10:00:00Z', task_id: 'T', sender: 'a', recipient: 'b', kind: 'message', message: 'm', status: 'delivered', source: 'live', correlation_id: 'c', ...extra })

test('AT-10 fixture: exactly-once, sequence order, run partitioning, quarantine', () => {
  const s = ingestAll(createStore(), fx.events)
  const ids = (run) => s.partitions[`recorded:${run}`].delivered.map((e) => e.event_id)
  assert.deepEqual(ids('A'), fx.expected.A)
  assert.deepEqual(ids('B'), fx.expected.B)
  assert.equal(s.quarantine.length, fx.expected.quarantined)
  assert.ok(s.quarantine.some((q) => q.reason.startsWith('conflict: event_id')))
  assert.ok(s.quarantine.some((q) => q.reason.startsWith('stale')))
  assert.ok(s.quarantine.some((q) => q.reason.includes('size limit')))
})

test('gap is reported while missing, cleared on fill', () => {
  let s = ingestAll(createStore(), [base('R', 1, 'e1'), base('R', 3, 'e3')])
  assert.deepEqual(gapsForSource(s, 'live').map((g) => [g.from, g.to]), [[2, 2]])
  assert.deepEqual(eventsForSource(s, 'live').map((e) => e.event_id), ['e1'])
  s = ingest(s, base('R', 2, 'e2'))
  assert.equal(gapsForSource(s, 'live').length, 0)
  assert.deepEqual(eventsForSource(s, 'live').map((e) => e.event_id), ['e1', 'e2', 'e3'])
})

test('explicit cursor reset skips an unrecoverable gap and leaves a notice', () => {
  let s = ingestAll(createStore(), [base('R', 1, 'e1'), base('R', 5, 'e5')])
  s = resetCursor(s, 'live:R')
  assert.deepEqual(eventsForSource(s, 'live').map((e) => e.event_id), ['e1', 'e5'])
  assert.match(s.notices[0].text, /2–4 were skipped/)
})

test('same sequence with a different id is a conflict', () => {
  const s = ingestAll(createStore(), [base('R', 1, 'e1'), base('R', 3, 'e3'), base('R', 3, 'other')])
  assert.equal(s.quarantine.length, 1)
  assert.match(s.quarantine[0].reason, /already assigned/)
})

test('demo, recorded and live never mix', () => {
  const s = ingestAll(createStore(), [base('R', 1, 'l1'), base('R', 1, 'd1', { source: 'demo' }), base('R', 1, 'r1', { source: 'recorded' })])
  assert.deepEqual(eventsForSource(s, 'live').map((e) => e.event_id), ['l1'])
  assert.deepEqual(eventsForSource(s, 'demo').map((e) => e.event_id), ['d1'])
  assert.deepEqual(eventsForSource(s, 'recorded').map((e) => e.event_id), ['r1'])
})

test('bounded buffer: overflow is quarantined, not silently dropped', () => {
  const evs = [base('R', 1, 'e1')]
  for (let i = 0; i < MAX_BUFFER + 5; i++) evs.push(base('R', 3 + i, `f${i}`))
  const s = ingestAll(createStore(), evs)
  assert.equal(Object.keys(s.partitions['live:R'].buffer).length, MAX_BUFFER)
  assert.equal(s.quarantine.filter((q) => q.reason.startsWith('overflow')).length, 5)
})

test('private reasoning fields are dropped from stored events', () => {
  const s = ingest(createStore(), base('R', 1, 'e1', { private_reasoning: 'SENTINEL', chain_of_thought: 'SENTINEL' }))
  const e = eventsForSource(s, 'live')[0]
  assert.equal(JSON.stringify(e).includes('SENTINEL'), false)
  assert.deepEqual(e.redacted_fields, ['private_reasoning', 'chain_of_thought'])
})

test('live activity past expiry, or without expiry, is unknown; recorded stays recorded', () => {
  const now = Date.parse('2026-11-07T12:00:00Z')
  const act = (id, seq, extra) => base('R', seq, id, { kind: 'activity', status: 'working', message: null, activity_label: 'thinking', ...extra })
  const a = activityByAgent([act('1', 1, { sender: 'x', expires_at: '2026-11-07T11:00:00Z' }), act('2', 2, { sender: 'y' }), act('3', 3, { sender: 'z', expires_at: '2026-11-07T13:00:00Z' }), act('4', 4, { sender: 'w', source: 'recorded' })], now)
  assert.equal(a.x.label, 'unknown'); assert.equal(a.y.label, 'unknown'); assert.equal(a.z.label, 'thinking')
  assert.equal(a.w.label, 'thinking'); assert.equal(a.w.asRecorded, true)
})
