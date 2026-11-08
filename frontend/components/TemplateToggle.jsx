import React from 'react'

/**
 * TemplateToggle — the template control, rendered statically.
 *
 * The switch state IS the template's `enabled` flag in
 * templates/templates.json: the GDScript engine runs the templates
 * whose toggle is on and skips the rest without sealing a verdict.
 * This page is a static render, so the switch is shown, not wired —
 * changing the state means editing the JSON, and the engine and
 * this panel both obey the file. Nothing here pretends a click
 * reached the engine.
 */
export function TemplateToggle({ template }) {
  const on = Boolean(template.enabled)
  return (
    <div className="sf-toggle-row" data-template-id={template.id}>
      <span
        role="switch"
        aria-checked={on}
        aria-label={`${template.title} (${template.kind})`}
        className={on ? 'sf-toggle sf-toggle-on' : 'sf-toggle sf-toggle-off'}
      >
        <span className="sf-toggle-knob" />
      </span>
      <div className="sf-toggle-text">
        <div className="sf-toggle-title">
          {template.title} <span className="sf-toggle-kind">{template.kind}</span>
        </div>
        <div className="sf-toggle-desc">{template.description}</div>
      </div>
      <div className="sf-toggle-state">{on ? 'RUNS' : 'HELD OUT'}</div>
    </div>
  )
}
