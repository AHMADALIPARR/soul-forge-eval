import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const shotDir = process.env.SF_SCREENSHOT_DIR || 'test-results/screenshots'
const fixture = (n) => fileURLToPath(new URL(`../fixtures/${n}`, import.meta.url))
const shot = (page, info, name) => page.screenshot({ path: `${shotDir}/${info.project.name}-${name}.png`, fullPage: true, animations: 'disabled' })
const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

test('AT-03/AT-07: loads disconnected with no fabricated messages', async ({ page }, info) => {
  const requests = []
  page.on('request', (r) => requests.push(r.url()))
  await page.goto('./')
  await expect(page.getByTestId('connection-status')).toHaveText('Runtime: Disconnected')
  await expect(page.getByRole('heading', { name: 'No runtime connected' })).toBeVisible()
  await expect(page.getByTestId('message')).toHaveCount(0)
  await expect(page.locator('.sf-demo-banner')).toHaveCount(0)
  expect(requests.every((u) => u.startsWith('http://127.0.0.1:4173/soul-forge-eval/'))).toBe(true)
  await noOverflow(page)
  await shot(page, info, 'disconnected')
})

test('AT-07: demo is opt-in, persistently labelled, and separate', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore demo' }).click()
  await expect(page.locator('.sf-demo-banner')).toContainText('DEMO: sample data only')
  await expect(page.getByTestId('view-source')).toHaveText('Showing: Demo sample')
  await expect(page.getByTestId('connection-status')).toHaveText('Runtime: Disconnected')
  const msgs = page.getByTestId('message')
  await expect(msgs).toHaveCount(6)
  for (const m of await msgs.all()) await expect(m.locator('.sf-chip-source')).toHaveText('Demo sample')
  await expect(page.locator('[data-status="failed"] .sf-delivery')).toContainText('Failed')
  await expect(page.getByText('View reasoning')).toHaveCount(0)
  await noOverflow(page)
  await shot(page, info, 'demo-thread')
  await page.getByRole('button', { name: 'Exit demo' }).click()
  await expect(page.getByTestId('message')).toHaveCount(0)
  await expect(page.locator('.sf-demo-banner')).toHaveCount(0)
})

test('AT-08: temperature requested vs effective, unsupported disabled', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore demo' }).click()
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Agents' }).click()
  await page.getByRole('button', { name: /Architect/ }).click()
  const value = page.getByLabel('Architect temperature value')
  for (const bad of ['abc', '1.5', 'NaN', 'Infinity', '0.33']) {
    await value.fill(bad)
    await expect(value).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('button', { name: 'Apply (demo simulation)' })).toBeDisabled()
  }
  await value.fill('0.35')
  await expect(page.getByTestId('temp-requested')).toHaveText('0.35')
  await page.getByRole('button', { name: 'Apply (demo simulation)' }).click()
  await expect(page.getByTestId('temp-effective')).toHaveText('not_applied')
  await expect(page.getByTestId('temp-last')).toContainText('No model received it')
  await page.locator('.sf-inspector').scrollIntoViewIfNeeded()
  await shot(page, info, 'temperature')
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Agents' }).click()
  await page.getByRole('button', { name: /Mathematician/ }).click()
  await expect(page.getByText('does not accept a temperature setting')).toBeVisible()
  await expect(page.getByLabel('Mathematician temperature value')).toHaveCount(0)
})

test('AT-02: template switches have unique accessible names and state', async ({ page }, info) => {
  const tpl = JSON.parse(readFileSync(new URL('../../../templates/templates.json', import.meta.url))).templates
  await page.goto('./')
  await page.getByRole('tab', { name: 'Evaluation' }).click()
  for (const t of tpl) {
    const sw = page.getByRole('switch', { name: `${t.title} (${t.kind}) template` })
    await expect(sw).toHaveAttribute('aria-checked', String(t.enabled))
  }
  const first = page.getByRole('switch', { name: `${tpl[0].title} (${tpl[0].kind}) template` })
  await first.focus(); await page.keyboard.press('Space')
  await expect(first).toHaveAttribute('aria-checked', String(!tpl[0].enabled))
  await expect(page.getByText('Changed from file')).toBeVisible()
  await expect(page.getByTestId('ledger-scope')).toContainText('not durable, not replay-safe')
  await page.locator('.sf-inspector').scrollIntoViewIfNeeded()
  await shot(page, info, 'evaluation')
})

test('AT-09/AT-07: hostile recording renders inert text and drops private reasoning', async ({ page }, info) => {
  await page.goto('./')
  await page.getByTestId('import-input').setInputFiles(fixture('xss-recording.json'))
  await expect(page.getByTestId('view-source')).toHaveText('Showing: Recorded')
  await expect(page.getByTestId('message')).toHaveCount(2)
  await expect(page.getByTestId('message').first().locator('.sf-chip-source')).toHaveText('Recorded (originally live)')
  await expect(page.getByText('<img src=x onerror="window.__sf_xss=1">')).toBeVisible()
  expect(await page.evaluate(() => window.__sf_xss)).toBeUndefined()
  expect(await page.locator('.sf-messages img, .sf-messages a, .sf-messages script').count()).toBe(0)
  expect(await page.content()).not.toContain('SECRET-REASONING-SENTINEL')
  await shot(page, info, 'recorded-hostile')
})

test('AT-10: reordered/replayed fixture shows each event once, in order, with quarantine', async ({ page }) => {
  const fx = JSON.parse(readFileSync(fixture('replay-reorder.json'), 'utf8'))
  const rec = JSON.stringify({ schema_version: '1', agents: [], events: fx.events })
  await page.goto('./')
  await page.getByTestId('import-input').setInputFiles({ name: 'replay.json', mimeType: 'application/json', buffer: Buffer.from(rec) })
  await expect(page.getByTestId('message')).toHaveCount(5)
  await expect(page.getByText(`${fx.expected.quarantined} event(s) quarantined and not shown`)).toBeVisible()
  await expect(page.getByTestId('messages').getByText('Unknown agent (a1)').first()).toBeVisible()
})

test('AT-11: reduced motion disables blob animation; pause works; no overflow at 320px', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore demo' }).click()
  const anim = await page.locator('.sf-blob-shape').first().evaluate((el) => getComputedStyle(el).animationName)
  expect(anim).toBe('none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Pause animation' }).click()
  await expect(page.getByRole('button', { name: 'Resume animation' })).toHaveAttribute('aria-pressed', 'true')
  const state = await page.locator('.sf-blob-shape').first().evaluate((el) => getComputedStyle(el).animationPlayState)
  expect(state).toBe('paused')
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 700 })
    await noOverflow(page)
    await page.getByRole('button', { name: 'Agents' }).click()
    await expect(page.getByRole('dialog', { name: 'Agents' })).toBeVisible()
    await shot(page, info, 'roster-sheet-320')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Agents' })).toBeFocused()
  }
})
