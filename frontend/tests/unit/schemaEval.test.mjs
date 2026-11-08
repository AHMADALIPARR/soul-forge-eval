import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA_VERSIONS, validateEvent, validateCapability, validateConfigAck } from '../../src/lib/schema.js'
import { reliabilityConfigStatus, describeReliabilityCase, LEDGER_SCOPE, templateNote } from '../../src/lib/evaluation.js'
import { parseRecording } from '../../src/lib/recording.js'

test('schemas are versioned', () => {
  assert.deepEqual(Object.keys(SCHEMA_VERSIONS).sort(), ['capability', 'config_ack', 'event', 'recording'])
  assert.equal(validateEvent({ schema_version: '2' }).ok, false)
  assert.equal(validateCapability({ schema_version: '1', provider: 'p', model: 'm', support: 'supported', revision: 0, min: 1, max: 0, step: 0.1, default: 1 }).ok, false)
  assert.equal(validateConfigAck({ schema_version: '1', request_id: 'r', agent_id: 'a', model: 'm', result: 'rejected', expected_revision: 1, revision: 1 }).ok, false)
})

test('status must be valid for kind; recipient forms', () => {
  const e = { schema_version: '1', event_id: 'e', run_id: 'r', sequence: 1, occurred_at: '2026-11-07T10:00:00Z', received_at: '2026-11-07T10:00:00Z', task_id: 't', sender: 's', recipient: 'broadcast', kind: 'message', message: 'x', status: 'delivered', source: 'live', correlation_id: 'c' }
  assert.equal(validateEvent(e).ok, true)
  assert.equal(validateEvent({ ...e, status: 'working' }).ok, false)
  assert.equal(validateEvent({ ...e, recipient: [] }).ok, false)
  assert.equal(validateEvent({ ...e, occurred_at: '2026-11-07 10:00' }).ok, false)
})

test('zero-trial reliability is INVALID, never a pass', () => {
  assert.equal(reliabilityConfigStatus({ kind: 'reliability', trials: 0 }).status, 'INVALID')
  assert.equal(describeReliabilityCase({ trials: 0, wins: 0, pass_at_k: false, pass_pow_k: true }).status, 'INVALID')
  assert.equal(describeReliabilityCase({ trials: 4, wins: 3, pass_at_k: true, pass_pow_k: false }).status, 'HELD')
})

test('no estimator or durability claims in evaluation copy', () => {
  const src = readFileSync(new URL('../../src/lib/evaluation.js', import.meta.url), 'utf8') + readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')
  const visible = LEDGER_SCOPE + templateNote({ kind: 'reliability' })
  assert.match(visible, /not durable/); assert.match(visible, /not probability estimates/)
  assert.equal(/probability of (passing|success)|is durable|tamper-proof|authenticated ledger/i.test(src), false)
})

test('templates.json reliability entry is currently valid', () => {
  const t = JSON.parse(readFileSync(new URL('../../../templates/templates.json', import.meta.url))).templates
  for (const r of t.filter((x) => x.kind === 'reliability')) assert.equal(reliabilityConfigStatus(r).status, 'OK')
})

test('recording import relabels as recorded and keeps original source', () => {
  const r = parseRecording(readFileSync(new URL('../fixtures/xss-recording.json', import.meta.url), 'utf8'), 'recorded')
  assert.equal(r.ok, true)
  assert.ok(r.events.every((e) => e.source === 'recorded'))
  assert.equal(r.events[0].original_source, 'live')
  assert.equal(parseRecording('{', 'recorded').ok, false)
  assert.equal(parseRecording('{"schema_version":"9","events":[]}', 'recorded').ok, false)
})
