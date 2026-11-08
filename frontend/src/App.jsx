import React, { useEffect, useMemo, useRef, useState } from 'react'
import panel from '../../templates/templates.json'
import demoText from './fixtures/demo-recording.json?raw'
import { AgentBlob } from './components/Blob.jsx'
import { createStore, ingestAll, eventsForSource, gapsForSource, resetCursor, activityByAgent } from './lib/eventStore.js'
import { parseRecording } from './lib/recording.js'
import { createAgentConfig, setDraft, resetDraft, demoApply, temperatureEditable, capabilityExplanation, temperatureState } from './lib/temperature.js'
import { ENGINE_KINDS, LEDGER_SCOPE, reliabilityConfigStatus, templateNote, thresholdNote } from './lib/evaluation.js'

// Connection state is owned by a runtime adapter. This static build ships
// with no runtime configured, so the only honest state is "disconnected".
// Recorded imports and the opt-in demo are separate, labelled views.
const RUNTIME = Object.freeze({ configured: false, status: 'disconnected' })

const ACTIVITY_TEXT = { idle: 'Idle', thinking: 'Thinking', working: 'Working', sending: 'Sending', waiting: 'Waiting', error: 'Error', unknown: 'Unknown' }
const STATUS_TEXT = { queued: 'Queued', sent: 'Sent', delivered: 'Delivered', failed: 'Failed', working: 'Working', waiting: 'Waiting', complete: 'Complete', unknown: 'Unknown' }

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown time'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d)
}

function recipientText(r, nameOf) {
  if (r === 'broadcast') return 'everyone'
  return (Array.isArray(r) ? r : [r]).map(nameOf).join(', ')
}

function buildView(text, as) {
  const parsed = parseRecording(text, as)
  if (!parsed.ok) return { error: parsed.error }
  const store = ingestAll(createStore(), parsed.events)
  const configs = {}
  for (const a of parsed.agents) configs[a.id] = createAgentConfig({ agent_id: a.id, model: a.model, capability: a.capability })
  return { as, agents: parsed.agents, store, configs, error: null }
}

function TemperatureControl({ agent, cfg, view, onChange }) {
  const editable = temperatureEditable(cfg)
  const st = temperatureState(cfg)
  const cap = cfg.capability
  const raw = cfg.draft ? cfg.draft.raw : ''
  const check = cfg.draft ? cfg.draft.check : null
  const id = `temp-${agent.id}`
  return (
    <div className="sf-temp" role="group" aria-labelledby={`${id}-label`}>
      <div className="sf-temp-head">
        <span id={`${id}-label`} className="sf-label">Temperature</span>
        <span className="sf-cap-pill" data-support={cap.support}>{cap.support === 'supported' ? 'Supported' : cap.support === 'unsupported' ? 'Not supported' : 'Unknown'}</span>
      </div>
      <p className="sf-help" id={`${id}-help`}>{capabilityExplanation(cfg)}</p>
      {editable && (
        <div className="sf-temp-inputs">
          <input type="range" aria-label={`${agent.name} temperature slider`} aria-describedby={`${id}-help`} min={cap.min} max={cap.max} step={cap.step}
            value={check && check.ok ? check.value : cap.default === 'provider_default' ? (cap.min + cap.max) / 2 : cap.default}
            onChange={(e) => onChange(setDraft(cfg, Number(e.target.value)))} />
          <input type="text" inputMode="decimal" className="sf-num" aria-label={`${agent.name} temperature value`} aria-invalid={check ? !check.ok : undefined}
            aria-describedby={`${id}-help ${id}-err`} value={raw} placeholder={cap.default === 'provider_default' ? 'default' : String(cap.default)}
            onChange={(e) => onChange(setDraft(cfg, e.target.value))} />
        </div>
      )}
      <p id={`${id}-err`} className="sf-error-text" role={check && !check.ok ? 'alert' : undefined}>{check && !check.ok ? check.reason : ''}</p>
      <dl className="sf-temp-state">
        <div><dt>Requested (draft)</dt><dd data-testid="temp-requested">{st.requested === null || st.requested === '' ? '—' : String(st.requested)}</dd></div>
        <div><dt>Pending</dt><dd data-testid="temp-pending">{st.pending === null ? '—' : String(st.pending)}</dd></div>
        <div><dt>Effective</dt><dd data-testid="temp-effective">{st.effectiveLabel}</dd></div>
      </dl>
      {cfg.last && <p className="sf-help" data-testid="temp-last" role="status">{cfg.last.reason}</p>}
      {editable && (
        <div className="sf-row">
          <button type="button" className="sf-btn sf-btn-primary" disabled={!check || !check.ok || view !== 'demo'}
            onClick={() => onChange(demoApply(cfg))}>{view === 'demo' ? 'Apply (demo simulation)' : 'Apply'}</button>
          <button type="button" className="sf-btn" disabled={!cfg.draft} onClick={() => onChange(resetDraft(cfg))}>Reset</button>
        </div>
      )}
      {editable && view !== 'demo' && <p className="sf-help">Apply needs a connected runtime to acknowledge the change. None is connected, so nothing can be applied.</p>}
    </div>
  )
}

function EvaluationSection() {
  const [enabled, setEnabled] = useState(() => Object.fromEntries(panel.templates.map((t) => [t.id, t.enabled])))
  const changed = panel.templates.some((t) => enabled[t.id] !== t.enabled)
  const download = () => {
    const out = { ...panel, templates: panel.templates.map((t) => ({ ...t, enabled: enabled[t.id] })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'templates.draft.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="sf-eval">
      <p className="sf-help">Templates come from <code>templates/templates.json</code>, the file the engine reads. Switching here edits a browser draft only: it does not change the file or configure the engine.</p>
      <ul className="sf-template-list">
        {panel.templates.map((t) => {
          const rel = reliabilityConfigStatus(t)
          const known = ENGINE_KINDS.includes(t.kind)
          return (
            <li key={t.id} className="sf-template" data-template-id={t.id}>
              <div className="sf-template-text">
                <span className="sf-template-title">{t.title}</span>
                <span className="sf-chip">{t.kind}</span>
                <p className="sf-help">{templateNote(t)}{thresholdNote(t) ? ` ${thresholdNote(t)}.` : ''}</p>
                {rel && <p className={rel.status === 'OK' ? 'sf-help' : 'sf-error-text'} data-testid={`rel-${t.id}`}>{rel.status === 'OK' ? rel.reason : `${rel.status}: ${rel.reason}`}</p>}
                {!known && <p className="sf-error-text">Unknown kind: the engine does not speak it.</p>}
              </div>
              <button type="button" role="switch" aria-checked={enabled[t.id]} aria-label={`${t.title} (${t.kind}) template`}
                className="sf-switch" onClick={() => setEnabled((s) => ({ ...s, [t.id]: !s[t.id] }))}>
                <span className="sf-switch-knob" />
              </button>
            </li>
          )
        })}
      </ul>
      <dl className="sf-kv">
        <div><dt>Draft</dt><dd>{changed ? 'Changed from file' : 'Same as file'}</dd></div>
        <div><dt>Runtime acknowledged</dt><dd>None (no runtime connected)</dd></div>
      </dl>
      <button type="button" className="sf-btn" onClick={download}>Download draft as JSON</button>
      <p className="sf-help">A download is not a repository write. Judge templates are refused by the engine when enabled; a disabled template is skipped without a sealed verdict.</p>
      <h4 className="sf-subhead">Verdict ledger</h4>
      <p className="sf-help" data-testid="ledger-scope">{LEDGER_SCOPE}</p>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('none') // none | demo | recorded
  const [demo, setDemo] = useState(null)
  const [recorded, setRecorded] = useState(null)
  const [importError, setImportError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('agent')
  const [filters, setFilters] = useState({ agent: '', task: '', status: '' })
  const [paused, setPaused] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [announce, setAnnounce] = useState('')
  const fileRef = useRef(null)
  const rosterBtnRef = useRef(null)
  const rosterRef = useRef(null)

  const active = view === 'demo' ? demo : view === 'recorded' ? recorded : null
  const events = active ? eventsForSource(active.store, active.as) : []
  const gaps = active ? gapsForSource(active.store, active.as) : []
  const activity = useMemo(() => activityByAgent(events, Date.now()), [events])

  const agentList = useMemo(() => {
    if (!active) return []
    const list = [...active.agents]
    const known = new Set(list.map((a) => a.id))
    for (const e of events) for (const id of [e.sender, ...(e.recipient === 'broadcast' ? [] : [].concat(e.recipient))]) {
      if (!known.has(id)) { known.add(id); list.push({ id, name: `Unknown agent (${id})`, role: '', provider: 'unknown', model: 'unknown', capability: null, unknown: true }) }
    }
    return list
  }, [active, events])
  const nameOf = (id) => (agentList.find((a) => a.id === id) || { name: `Unknown agent (${id})` }).name
  const tasks = [...new Set(events.map((e) => e.task_id))]
  const shown = events.filter((e) => (!filters.agent || e.sender === filters.agent || [].concat(e.recipient).includes(filters.agent)) && (!filters.task || e.task_id === filters.task) && (!filters.status || e.status === filters.status))

  const openDemo = () => {
    const v = demo || buildView(demoText, 'demo')
    setDemo(v); setView('demo'); setSelected(v.agents[0]?.id ?? null); setAnnounce('Demo opened. All messages are sample data.')
  }
  const onImport = async (ev) => {
    const f = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!f) return
    const v = buildView(await f.text(), 'recorded')
    if (v.error) { setImportError(v.error); setAnnounce(`Import failed: ${v.error}`); return }
    setImportError(null); setRecorded(v); setView('recorded'); setSelected(v.agents[0]?.id ?? null)
    setAnnounce(`Recording imported: ${eventsForSource(v.store, 'recorded').length} events, ${v.store.quarantine.length} quarantined.`)
  }
  const updateCfg = (agentId, cfg) => {
    const upd = (v) => ({ ...v, configs: { ...v.configs, [agentId]: cfg } })
    if (view === 'demo') setDemo(upd); else if (view === 'recorded') setRecorded(upd)
  }
  const doReset = (key) => {
    const upd = (v) => ({ ...v, store: resetCursor(v.store, key) })
    if (view === 'demo') setDemo(upd); else setRecorded(upd)
  }

  useEffect(() => {
    if (!rosterOpen) return
    const el = rosterRef.current
    el && el.querySelector('button, select, input')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { setRosterOpen(false); rosterBtnRef.current?.focus() }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll('button:not([disabled]), select, input')]
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [rosterOpen])

  const selAgent = agentList.find((a) => a.id === selected)
  const selCfg = selAgent && active ? active.configs[selAgent.id] || createAgentConfig({ agent_id: selAgent.id, model: selAgent.model, capability: null }) : null
  const sourceLabel = view === 'demo' ? 'Demo sample' : 'Recorded'

  return (
    <div className={`sf-app${paused ? ' sf-paused' : ''}`}>
      {view === 'demo' && <div className="sf-demo-banner" role="note">DEMO: sample data only. Nothing here is a live or recorded exchange, and no model receives changes.</div>}
      <header className="sf-header">
        <div className="sf-brand">
          <AgentBlob id="soul-forge" size={32} />
          <h1>Soul Forge</h1>
        </div>
        <div className="sf-status" role="status" aria-live="polite">
          <span className="sf-dot" data-state={RUNTIME.status} aria-hidden="true" />
          <span data-testid="connection-status">Runtime: Disconnected</span>
          {view !== 'none' && <span className="sf-chip" data-testid="view-source">Showing: {sourceLabel}</span>}
        </div>
        <div className="sf-header-actions">
          <button type="button" className="sf-btn sf-only-narrow" ref={rosterBtnRef} aria-expanded={rosterOpen} aria-controls="sf-roster" onClick={() => setRosterOpen(true)}>Agents</button>
          <button type="button" className="sf-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume animation' : 'Pause animation'}</button>
        </div>
      </header>
      <p className="sf-visually-hidden" aria-live="polite">{announce}</p>

      <div className="sf-layout">
        <aside id="sf-roster" ref={rosterRef} className={`sf-roster${rosterOpen ? ' sf-open' : ''}`} aria-label="Agents" role={rosterOpen ? 'dialog' : undefined} aria-modal={rosterOpen ? 'true' : undefined}>
          <div className="sf-roster-head">
            <h2>Agents</h2>
            <button type="button" className="sf-btn sf-only-narrow" onClick={() => { setRosterOpen(false); rosterBtnRef.current?.focus() }}>Close</button>
          </div>
          {agentList.length === 0 && <p className="sf-help">No agents. Connect a runtime, import a recording, or open the demo.</p>}
          <ul>
            {agentList.map((a) => {
              const act = activity[a.id]
              const label = act ? act.label : 'unknown'
              return (
                <li key={a.id}>
                  <button type="button" className="sf-agent" aria-current={selected === a.id ? 'true' : undefined} onClick={() => { setSelected(a.id); setTab('agent'); setRosterOpen(false) }}>
                    <AgentBlob id={a.id} activity={label} />
                    <span className="sf-agent-text">
                      <span className="sf-agent-name">{a.name}</span>
                      <span className="sf-agent-model">{a.model}</span>
                      <span className="sf-pill" data-activity={label}>{ACTIVITY_TEXT[label]}{act && act.asRecorded ? ' (recorded)' : ''}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <main className="sf-thread" aria-label="Conversation">
          <div className="sf-thread-tools">
            <button type="button" className="sf-btn" onClick={() => fileRef.current?.click()}>Import recording</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sf-visually-hidden" aria-label="Recording file" data-testid="import-input" onChange={onImport} tabIndex={-1} />
            {view !== 'demo' && <button type="button" className="sf-btn" onClick={openDemo}>Explore demo</button>}
            {view === 'demo' && <button type="button" className="sf-btn" onClick={() => { setView(recorded ? 'recorded' : 'none'); setAnnounce('Demo closed.') }}>Exit demo</button>}
            {view === 'demo' && recorded && <span className="sf-help">Recorded data kept separately.</span>}
            {view === 'recorded' && demo && <button type="button" className="sf-btn" onClick={() => setView('demo')}>Back to demo</button>}
          </div>
          {importError && <p className="sf-error-text" role="alert">Import failed: {importError}</p>}

          {view === 'none' && (
            <div className="sf-empty">
              <AgentBlob id="empty-state" size={72} />
              <h2>No runtime connected</h2>
              <p>This page is a static site. It shows agent messages only when an external runtime streams them, or when you import a recording. Nothing here is generated or simulated.</p>
              <p>You can open a clearly labelled demo to see how the console works.</p>
            </div>
          )}

          {active && (
            <>
              <div className="sf-filters" role="group" aria-label="Filters">
                <label>Agent <select value={filters.agent} onChange={(e) => setFilters({ ...filters, agent: e.target.value })}><option value="">All</option>{agentList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                <label>Task <select value={filters.task} onChange={(e) => setFilters({ ...filters, task: e.target.value })}><option value="">All</option>{tasks.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
                <label>Status <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All</option>{Object.keys(STATUS_TEXT).map((s) => <option key={s} value={s}>{STATUS_TEXT[s]}</option>)}</select></label>
              </div>
              {gaps.map((g) => (
                <div key={g.key} className="sf-notice" role="note">Run {g.run_id}: sequences {g.from}–{g.to} are missing; {g.buffered} later event(s) are held back. <button type="button" className="sf-btn" onClick={() => doReset(g.key)}>Skip gap</button></div>
              ))}
              {active.store.notices.map((n, i) => <div key={i} className="sf-notice" role="note">{n.text}</div>)}
              {active.store.quarantine.length > 0 && (
                <details className="sf-notice">
                  <summary>{active.store.quarantine.length} event(s) quarantined and not shown</summary>
                  <ul>{active.store.quarantine.map((q, i) => <li key={i}><code>{q.event_id || '(no id)'}</code>: {q.reason}</li>)}</ul>
                </details>
              )}
              <ol className="sf-messages" data-testid="messages">
                {shown.length === 0 && <li className="sf-help">No events match.</li>}
                {shown.map((e) => {
                  const mine = e.sender === selected
                  if (e.kind === 'activity') {
                    return (
                      <li key={e.event_id} className="sf-activity-row" data-testid="activity-row">
                        <AgentBlob id={e.sender} activity={e.activity_label} size={24} />
                        <span className="sf-pill" data-activity={e.activity_label}>{ACTIVITY_TEXT[e.activity_label]}</span>
                        <span className="sf-meta">{nameOf(e.sender)} · {e.task_id} · {formatTime(e.occurred_at)}</span>
                        {e.progress_summary && <details className="sf-summary"><summary>Progress summary</summary><p>{e.progress_summary}</p></details>}
                      </li>
                    )
                  }
                  return (
                    <li key={e.event_id} className={`sf-msg${mine ? ' sf-msg-mine' : ''}`} data-testid="message" data-status={e.status}>
                      <AgentBlob id={e.sender} activity={(activity[e.sender] || {}).label || 'idle'} size={32} />
                      <div className="sf-msg-body">
                        <div className="sf-meta"><strong>{nameOf(e.sender)}</strong> → {recipientText(e.recipient, nameOf)}</div>
                        <div className="sf-bubble">{e.message ?? ''}</div>
                        <div className="sf-meta">
                          <span className="sf-chip">{e.task_id}</span>
                          <span>{formatTime(e.occurred_at)}</span>
                          <span className="sf-delivery" data-status={e.status}>{e.status === 'failed' ? '⚠ ' : ''}{STATUS_TEXT[e.status]}</span>
                          <span className="sf-chip sf-chip-source">{sourceLabel}{e.original_source && e.original_source !== e.source ? ` (originally ${e.original_source})` : ''}</span>
                        </div>
                        {e.evidence_refs && e.evidence_refs.length > 0 && <details className="sf-summary"><summary>Context</summary><ul>{e.evidence_refs.map((r, i) => <li key={i}>{r}</li>)}</ul></details>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </main>

        <section className="sf-inspector" aria-label="Inspector">
          <div className="sf-segmented" role="tablist" aria-label="Inspector sections">
            {['agent', 'evaluation', 'worker'].map((t) => (
              <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} onClick={() => setTab(t)}>{t === 'agent' ? 'Agent' : t === 'evaluation' ? 'Evaluation' : 'Worker'}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="sf-panel-body">
            {tab === 'agent' && (selAgent ? (
              <div>
                <div className="sf-agent-card">
                  <AgentBlob id={selAgent.id} activity={(activity[selAgent.id] || {}).label || 'unknown'} size={56} />
                  <div>
                    <h3>{selAgent.name}</h3>
                    <p className="sf-help">{selAgent.role || 'No role given'} · {selAgent.provider} / {selAgent.model}</p>
                  </div>
                </div>
                {activity[selAgent.id] && (
                  <p className="sf-help">Latest public activity: {ACTIVITY_TEXT[activity[selAgent.id].label]}{activity[selAgent.id].asRecorded ? `, as recorded at ${formatTime(activity[selAgent.id].at)}` : ''}. Activity labels are what the agent reported, not its private reasoning.</p>
                )}
                <TemperatureControl agent={selAgent} cfg={selCfg} view={view} onChange={(c) => updateCfg(selAgent.id, c)} />
              </div>
            ) : <p className="sf-help">Select an agent to see its model and temperature.</p>)}
            {tab === 'evaluation' && <EvaluationSection />}
            {tab === 'worker' && (
              <div>
                <p className="sf-help" data-testid="worker-status">No runtime connected, so there is no VM or container status to show. This site does not start, provision or pay for any worker.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      {rosterOpen && <div className="sf-scrim" onClick={() => setRosterOpen(false)} aria-hidden="true" />}
    </div>
  )
}
