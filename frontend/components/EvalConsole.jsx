import React from 'react'
import panel from '../../templates/templates.json'
import { TemplateToggle } from './TemplateToggle.jsx'

/**
 * EvalConsole — the template-control panel. It renders one toggle per
 * entry in templates/templates.json, the same file the GDScript
 * engine reads. No template is hardcoded here: add an entry to the
 * JSON and it appears on the panel and in the engine's run list.
 */
export function EvalConsole() {
  return (
    <section className="sf-panel">
      <header className="sf-panel-head">
        <span className="sf-panel-title">EVAL PANEL — TEMPLATE CONTROL</span>
        <span className="sf-panel-meta">engine: GDScript · verdicts: hash-chained · judges: untrusted until proven</span>
      </header>
      <div className="sf-panel-body">
        {panel.templates.map((t) => (
          <TemplateToggle key={t.id} template={t} />
        ))}
      </div>
      <footer className="sf-panel-foot">
        A template whose toggle is off does not run and does not seal a verdict.
        The writer never grades its own work.
      </footer>
    </section>
  )
}
