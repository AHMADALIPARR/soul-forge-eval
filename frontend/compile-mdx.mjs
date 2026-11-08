#!/usr/bin/env node
/**
 * compile-mdx.mjs — step 1 of the build. Compiles pages/console.mdx
 * to a plain JS module at .build/page.mjs using @mdx-js/mdx. Runs
 * unbundled under plain node; imports nothing but fs and the MDX
 * compiler.
 */
import { compile } from '@mdx-js/mdx'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const source = await readFile('pages/console.mdx', 'utf8')
const compiled = await compile(source, { outputFormat: 'program', jsxImportSource: 'react' })
await mkdir('.build', { recursive: true })
await writeFile('.build/page.mjs', String(compiled))
console.log('compiled pages/console.mdx -> .build/page.mjs')
