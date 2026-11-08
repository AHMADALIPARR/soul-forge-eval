#!/usr/bin/env node
/**
 * build.mjs — the build entry point, in three steps:
 *   1. compile-mdx.mjs: pages/console.mdx -> .build/page.mjs
 *   2. esbuild bundles render-site.mjs (JSX components included)
 *      -> .build/render.mjs
 *   3. the bundle runs and writes the static site.
 * Everything here is build-time tooling. The shipped site is
 * static HTML + CSS with no script.
 */
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

execFileSync('node', ['compile-mdx.mjs'], { stdio: 'inherit' })
await build({
  entryPoints: ['render-site.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.build/render.mjs',
  logLevel: 'silent',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
})
await import('./.build/render.mjs')
