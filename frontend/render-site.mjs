#!/usr/bin/env node
/**
 * render-site.mjs — step 2 of the build, bundled by build.mjs.
 * Renders the compiled MDX page to static HTML with the recording
 * in data/ (override with SF_RECORDING; output dir via SF_OUT).
 * The output is documents: HTML + CSS, no script.
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Page from './.build/page.mjs'
import { Console } from './components/Console.jsx'
import { EvalConsole } from './components/EvalConsole.jsx'

const recordingPath = process.env.SF_RECORDING || 'data/demo-recording.json'
const outDir = process.env.SF_OUT || 'dist'
const recording = JSON.parse(await readFile(recordingPath, 'utf8'))

const components = {
  Console: (props) => React.createElement(Console, { ...props, recording }),
  EvalConsole,
}
const body = renderToStaticMarkup(React.createElement(Page, { components }))
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Soul Forge — Eval Console</title>
<meta name="description" content="The Soul Forge evaluation console: a GDScript eval engine with an MDX front end. Agents do not grade their own work.">
<link rel="stylesheet" href="styles.css">
</head>
<body>
${body}
</body>
</html>
`
await mkdir(outDir, { recursive: true })
await writeFile(`${outDir}/index.html`, html)
await copyFile('site.css', `${outDir}/styles.css`)
console.log(`built ${outDir}/index.html (${html.length} bytes, recording: ${recordingPath})`)
