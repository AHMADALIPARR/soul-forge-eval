import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentConfig, validateTemperature, setDraft, requestApply, applyAck, changeModel, demoApply, temperatureEditable, temperatureState } from '../../src/lib/temperature.js'

const cap = { schema_version: '1', provider: 'p', model: 'm1', support: 'supported', min: 0, max: 1, step: 0.05, default: 'provider_default', revision: 1 }
const fresh = () => createAgentConfig({ agent_id: 'a1', model: 'm1', capability: cap, revision: 3 })
const ack = (o) => ({ schema_version: '1', request_id: 'r1', agent_id: 'a1', model: 'm1', result: 'accepted', expected_revision: 3, revision: 4, effective_temperature: 0.5, ...o })

test('AT-08 validation: boundaries, midpoint, out of range, NaN, Infinity, strings, step', () => {
  assert.equal(validateTemperature(0, cap).ok, true)
  assert.equal(validateTemperature(1, cap).ok, true)
  assert.equal(validateTemperature(0.5, cap).ok, true)
  assert.equal(validateTemperature('0.35', cap).ok, true)
  for (const bad of [-0.05, 1.05, NaN, Infinity, -Infinity, 'abc', '', '1e309', null, undefined, 0.33]) assert.equal(validateTemperature(bad, cap).ok, false, String(bad))
})

test('unsupported and unknown capabilities are not editable', () => {
  assert.equal(temperatureEditable(createAgentConfig({ agent_id: 'a', model: 'm', capability: { ...cap, model: 'm', support: 'unsupported' } })), false)
  assert.equal(temperatureEditable(createAgentConfig({ agent_id: 'a', model: 'm', capability: null })), false)
  assert.equal(validateTemperature(0.5, { ...cap, support: 'unknown' }).ok, false)
})

test('draft -> pending -> effective only via correlated ack', () => {
  let c = setDraft(fresh(), '0.5')
  assert.equal(temperatureState(c).effectiveLabel, 'not_applied')
  const r = requestApply(c, 'r1'); c = r.cfg
  assert.equal(r.request.expected_revision, 3)
  assert.equal(temperatureState(c).pending, 0.5)
  assert.equal(temperatureState(applyAck(c, ack({ request_id: 'other' }))).effectiveLabel, 'not_applied')
  c = applyAck(c, ack())
  assert.equal(temperatureState(c).effective, 0.5)
  assert.equal(c.revision, 4)
})

test('stale acks are ignored: wrong revision, wrong model, malformed', () => {
  const pending = requestApply(setDraft(fresh(), 0.5), 'r1').cfg
  for (const bad of [ack({ expected_revision: 2 }), ack({ revision: 3 }), ack({ model: 'm2' }), ack({ schema_version: '0' }), ack({ effective_temperature: NaN })]) {
    const c = applyAck(pending, bad)
    assert.equal(c.effective, null); assert.equal(c.last.kind, 'ignored')
  }
})

test('runtime clamp is shown honestly as adjusted', () => {
  const c = applyAck(requestApply(setDraft(fresh(), 0.9), 'r1').cfg, ack({ effective_temperature: 0.7 }))
  assert.equal(c.effective.adjusted, true); assert.match(c.last.reason, /0.7 instead of requested 0.9/)
})

test('rejection keeps the draft and shows the reason', () => {
  const c = applyAck(requestApply(setDraft(fresh(), 0.5), 'r1').cfg, ack({ result: 'rejected', reason: 'over quota', effective_temperature: undefined }))
  assert.equal(c.draft.raw, 0.5); assert.equal(c.effective, null); assert.equal(c.last.reason, 'over quota')
})

test('model change invalidates pending and effective; late ack for old model ignored', () => {
  let c = applyAck(requestApply(setDraft(fresh(), 0.5), 'r1').cfg, ack())
  c = requestApply(setDraft(c, 0.6), 'r2').cfg
  c = changeModel(c, 'm2', { ...cap, model: 'm2' })
  assert.equal(c.effective, null); assert.equal(c.pending, null)
  c = applyAck(c, ack({ request_id: 'r2', revision: 5, expected_revision: 4 }))
  assert.equal(c.effective, null)
})

test('demo apply is labelled not_applied, effective untouched', () => {
  const c = demoApply(setDraft(fresh(), 0.5))
  assert.equal(c.last.kind, 'not_applied'); assert.equal(c.effective, null)
})
