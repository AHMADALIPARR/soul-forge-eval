import React, { useState } from 'react'

/**
 * TemplateToggle — the template control. One switch per eval template.
 * The switch state IS the template's `enabled` flag in
 * templates/templates.json: the GDScript engine runs the templates
 * whose toggle is on, and skips the rest without sealing a verdict.
 * Flipping a toggle here and in the JSON are the same act.
 */
export function TemplateToggle({ template, onChange }) {
  const [on, setOn] = useState(template.enabled)
  const flip = () => {
    const next = !on
    setOn(next)
    if (onChange) onChange(template.id, next)
  }
  return (
    <div className="sf-toggle-row" data-template-id={template.id}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={on ? 'sf-toggle sf-toggle-on' : 'sf-toggle sf-toggle-off'}
        onClick={flip}
      >
        <span className="sf-toggle-knob" />
      </button>
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
