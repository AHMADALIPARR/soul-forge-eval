#!/usr/bin/env node
/**
 * build-check.mjs — the front-end contract, checked against the
 * built static site (never against an app that is not shipped):
 *
 *  1. The MDX compiles and the site builds.
 *  2. The built page contains NO script — the front end is
 *     documents; any <script> in the output fails the build.
 *  3. Honest states render: the demo banner, Runtime: Disconnected,
 *     the not_applied effective temperature.
 *  4. The data renders: every agent and every recorded message from
 *     data/demo-recording.json appears on the page.
 *  5. The toggle contract: the panel renders exactly the templates
 *     in templates/templates.json, each with its file state.
 *  6. Hostile data stays inert: building against the XSS recording
 *     fixture yields escaped text, never live markup.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'

let failures = 0
const ok = (name, cond) => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}`)
  if (!cond) failures += 1
}
const build = (out, env = {}) =>
  execFileSync('node', ['build.mjs'], { env: { ...process.env, SF_OUT: out, ...env }, stdio: 'pipe' })

// 1–5: the real site
rmSync('dist-check', { recursive: true, force: true })
build('dist-check')
const html = readFileSync('dist-check/index.html', 'utf8')
const recording = JSON.parse(readFileSync('data/demo-recording.json', 'utf8'))
const panel = JSON.parse(readFileSync('../templates/templates.json', 'utf8'))

ok('the built page contains no script', !/<script/i.test(html))
ok('demo banner renders', html.includes('DEMO: sample data only'))
ok('runtime state is honestly Disconnected', html.includes('Runtime: Disconnected'))
ok('effective temperature reads not_applied', html.includes('not_applied'))
for (const a of recording.agents) ok(`agent renders: ${a.name}`, html.includes(a.name))
for (const e of recording.events) {
  if (e.kind === 'message' && e.message) ok(`message renders: ${e.event_id}`, html.includes(e.message))
}
for (const t of panel.templates) {
  ok(`template renders: ${t.id}`, html.includes(`data-template-id="${t.id}"`))
  ok(`template state matches the file: ${t.id}`, html.includes(t.enabled ? 'RUNS' : 'HELD OUT'))
}

// 6: hostile recording
rmSync('dist-xss', { recursive: true, force: true })
build('dist-xss', { SF_RECORDING: 'tests/fixtures/xss-recording.json' })
const xss = readFileSync('dist-xss/index.html', 'utf8')
ok('hostile build contains no script', !/<script/i.test(xss))
ok('svg payload renders as escaped text', xss.includes('&lt;svg') && !xss.includes('<svg onload'))
ok('img payload renders as escaped text', xss.includes('&lt;img') && !xss.includes('<img src=x onerror'))
rmSync('dist-check', { recursive: true, force: true })
rmSync('dist-xss', { recursive: true, force: true })

console.log(failures === 0 ? 'frontend check: all green' : `frontend check: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
