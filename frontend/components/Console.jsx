import React from 'react'
import { AgentBlob } from './Blob.jsx'

/**
 * Console — the NOREPLY crew's messaging setup, rendered from data.
 *
 * This component is MDX-rendered to static HTML at build time. There
 * is no client script: the page shows the demo recording exactly as
 * recorded, the runtime state exactly as it is (Disconnected — no
 * runtime is connected to a static page), and controls that would
 * need a runtime are disabled rather than simulated. The evaluation
 * semantics live in the GDScript engine; this surface only displays.
 */

const STATUS_TEXT = { queued: 'Queued', sent: 'Sent', delivered: 'Delivered', failed: 'Failed', working: 'Working', waiting: 'Waiting', complete: 'Complete', unknown: 'Unknown' }

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown time'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(d)
}

function activityOf(agentId, events) {
  let label = null
  for (const e of events) {
    if (e.sender === agentId && e.kind === 'activity' && e.activity_label) label = e.activity_label
  }
  return label
}

export function Console({ recording }) {
  const agents = recording.agents || []
  const events = [...(recording.events || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const nameOf = (id) => (agents.find((a) => a.id === id) || { name: id }).name
  const recipientText = (r) => (r === 'broadcast' ? 'everyone' : [].concat(r).map(nameOf).join(', '))
  const panel = agents[0]

  return (
    <div className="sf-app">
      <div className="sf-demo-banner" role="note">DEMO: sample data only. Nothing here is a live or recorded exchange, and no model receives changes.</div>
      <header className="sf-header">
        <div className="sf-brand">
          <AgentBlob id="soul-forge" size={32} />
          <h1>Soul Forge</h1>
        </div>
        <div className="sf-status" role="status">
          <span className="sf-dot" data-state="disconnected" aria-hidden="true" />
          <span>Runtime: Disconnected</span>
          <span className="sf-chip">Showing: Demo sample</span>
        </div>
        <div className="sf-header-actions">
          <span className="sf-chip">Static MDX render — no scripts</span>
        </div>
      </header>

      <div className="sf-layout">
        <aside className="sf-roster" aria-label="Agents">
          <div className="sf-roster-head"><h2>Agents</h2></div>
          <ul>
            {agents.map((a) => {
              const act = activityOf(a.id, events)
              const label = act || 'unknown'
              return (
                <li key={a.id}>
                  <div className="sf-agent" aria-current={panel && a.id === panel.id ? 'true' : undefined}>
                    <AgentBlob id={a.id} activity={label} />
                    <span className="sf-agent-text">
                      <span className="sf-agent-name">{a.name}</span>
                      <span className="sf-agent-model">{a.model}</span>
                      <span className="sf-pill" data-activity={label}>{label[0].toUpperCase() + label.slice(1)}{act ? ' (recorded)' : ''}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </aside>

        <main className="sf-thread" aria-label="Conversation">
          <div className="sf-thread-tools">
            <button type="button" className="sf-btn" disabled title="A static page cannot import files">Import recording</button>
            <button type="button" className="sf-btn" disabled title="The demo is this page">Exit demo</button>
            <span className="sf-help">Static render: controls that need a runtime or a file are disabled. Nothing here is simulated.</span>
          </div>
          <div className="sf-filters" role="group" aria-label="Filters">
            <label>Agent <select disabled><option>All</option></select></label>
            <label>Task <select disabled><option>All</option></select></label>
            <label>Status <select disabled><option>All</option></select></label>
          </div>
          <ol className="sf-messages">
            {events.map((e) => {
              if (e.kind === 'activity') {
                return (
                  <li key={e.event_id} className="sf-activity-row">
                    <AgentBlob id={e.sender} activity={e.activity_label || 'unknown'} size={24} />
                    <span className="sf-pill" data-activity={e.activity_label || 'unknown'}>{(e.activity_label || 'unknown')[0].toUpperCase() + (e.activity_label || 'unknown').slice(1)}</span>
                    <span className="sf-help">{nameOf(e.sender)} · {e.task_id} · {formatTime(e.occurred_at)}</span>
                    {e.progress_summary && (
                      <details className="sf-progress">
                        <summary>Progress summary</summary>
                        <p>{e.progress_summary}</p>
                      </details>
                    )}
                  </li>
                )
              }
              const mine = panel && e.sender === panel.id
              return (
                <li key={e.event_id} className={mine ? 'sf-msg sf-msg-mine' : 'sf-msg'}>
                  <div className="sf-msg-body">
                    <div className="sf-msg-head">
                      <strong>{nameOf(e.sender)}</strong>
                      <span className="sf-help">→ {recipientText(e.recipient)}</span>
                      <AgentBlob id={e.sender} size={24} />
                    </div>
                    <div className="sf-bubble">{e.message}</div>
                    <div className="sf-meta">
                      <span className="sf-chip">{e.task_id}</span>
                      <span>{formatTime(e.occurred_at)}</span>
                      <span className="sf-delivery" data-status={e.status}>{e.status === 'failed' ? '⚠ ' : ''}{STATUS_TEXT[e.status] || e.status}</span>
                      <span className="sf-chip sf-chip-source">Demo sample</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </main>

        {panel && (
          <aside className="sf-inspector" aria-label="Agent detail">
            <div className="sf-tabs" role="tablist" aria-label="Inspector">
              <span className="sf-tab sf-tab-active" role="tab" aria-selected="true">Agent</span>
              <span className="sf-tab" role="tab" aria-selected="false">Evaluation</span>
              <span className="sf-tab" role="tab" aria-selected="false">Worker</span>
            </div>
            <div className="sf-agent-card">
              <AgentBlob id={panel.id} size={44} />
              <div>
                <div className="sf-agent-name">{panel.name}</div>
                <div className="sf-help">{panel.role} · {panel.provider} / {panel.model}</div>
              </div>
            </div>
            {panel.capability && (
              <div className="sf-temp" role="group" aria-label="Temperature">
                <div className="sf-temp-head">
                  <span className="sf-label">Temperature</span>
                  <span className="sf-cap-pill" data-support={panel.capability.support}>{panel.capability.support === 'supported' ? 'Supported' : 'Unknown'}</span>
                </div>
                <p className="sf-help">{panel.provider} / {panel.model} accepts {panel.capability.min}–{panel.capability.max} in steps of {panel.capability.step}; default: provider default.</p>
                <div className="sf-temp-inputs">
                  <input type="range" disabled min={panel.capability.min} max={panel.capability.max} step={panel.capability.step} value={(panel.capability.min + panel.capability.max) / 2} readOnly aria-label="Temperature slider (disabled on a static page)" />
                  <input type="text" className="sf-num" disabled placeholder="default" aria-label="Temperature value (disabled on a static page)" />
                </div>
                <dl className="sf-temp-state">
                  <div><dt>Requested (draft)</dt><dd>—</dd></div>
                  <div><dt>Pending</dt><dd>—</dd></div>
                  <div><dt>Effective</dt><dd>not_applied</dd></div>
                </dl>
                <div className="sf-row">
                  <button type="button" className="sf-btn sf-btn-primary" disabled>Apply (demo simulation)</button>
                  <button type="button" className="sf-btn" disabled>Reset</button>
                </div>
                <p className="sf-help">Apply needs a connected runtime to acknowledge the change. None is connected, so nothing can be applied.</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
