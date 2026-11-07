// Build check for the template-control frontend.
//   1. The MDX page compiles (@mdx-js/mdx).
//   2. The toggle contract holds: templates.json is well-formed, ids
//      are unique, every template carries an enabled flag, and the
//      console component is data-driven over that file (no hardcoded
//      template ids in the components).
// Exits non-zero on any failure. Run: npm run check

import { readFileSync } from 'node:fs'
import { compile } from '@mdx-js/mdx'

let failed = 0
const ok = (name, cond) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

const mdxSource = readFileSync(new URL('./pages/eval-console.mdx', import.meta.url), 'utf8')
const panel = JSON.parse(readFileSync(new URL('../templates/templates.json', import.meta.url), 'utf8'))
const consoleSource = readFileSync(new URL('./components/EvalConsole.jsx', import.meta.url), 'utf8')
const toggleSource = readFileSync(new URL('./components/TemplateToggle.jsx', import.meta.url), 'utf8')

try {
  await compile(mdxSource, {})
  ok('eval-console.mdx compiles', true)
} catch (e) {
  ok(`eval-console.mdx compiles (${e.message})`, false)
}

const templates = panel.templates || []
ok('templates.json carries templates', templates.length > 0)
ok('template ids are unique', new Set(templates.map((t) => t.id)).size === templates.length)
ok('every template carries an enabled flag', templates.every((t) => typeof t.enabled === 'boolean'))
ok('every template carries a kind the engine speaks', templates.every((t) => ['assertions', 'reliability', 'metrology', 'judge'].includes(t.kind)))
ok('console renders from templates.json', consoleSource.includes("from '../../templates/templates.json'") && consoleSource.includes('.map('))
ok('no template id is hardcoded in the components', templates.every((t) => !consoleSource.includes(`'${t.id}'`) && !toggleSource.includes(`'${t.id}'`)))
ok('the page mounts the console', mdxSource.includes('<EvalConsole />'))

console.log(failed ? `\n${failed} failure(s)` : '\nfrontend check: all green')
process.exit(failed ? 1 : 0)
