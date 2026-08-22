#!/usr/bin/env node
// measure.mjs — stamps the About panel with facts that would otherwise go stale.
// Hand-typed sizes rot the moment you add an asset; these are measured.
//
// Runs from .githooks/pre-commit, so the stamped values always describe the
// commit they ship in. GitHub Pages serves main directly, so committed == live.
//
// Values are baked into the HTML rather than fetched as JSON at runtime, because
// these apps are meant to run from file:// too, where fetch() of a sibling file
// is blocked by CORS.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const TARGET = join(ROOT, 'index.html')
const START = '<!-- build-info:start -->'
const END = '<!-- build-info:end -->'

// "Payload" = what a browser downloads to run the app. Repo furniture — git
// metadata, the readme, the licence, this script — is not payload.
const SKIP_DIRS = new Set(['.git', '.githooks', '.github', 'node_modules', 'dist'])
const SKIP_FILES = new Set(['README.md', 'LICENSE', 'measure.mjs', 'VERSION', '.nojekyll', '.gitignore'])

function walk (dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, acc)
    } else if (!SKIP_FILES.has(name)) {
      acc.push({ path: p, size: st.size })
    }
  }
  return acc
}

// The whole point of measuring: this line stays true as the app grows.
const MEDIA = [
  [368640, 'a 360 KB 5¼-inch floppy disk'],
  [737280, 'a 720 KB 3½-inch floppy disk'],
  [1474560, 'a 1.44 MB 3½-inch floppy disk'],
  [2949120, 'a 2.88 MB floppy disk'],
  [100 * 1024 * 1024, 'a 100 MB Zip disk'],
  [681574400, 'a CD-ROM'],
  [4700000000, 'a DVD']
]

const fmt = b => b < 1024 ? `${b} bytes`
  : b < 1024 * 1024 ? `${(b / 1024).toFixed(b / 1024 < 10 ? 1 : 0)} KB`
  : `${(b / 1024 / 1024).toFixed(1)} MB`

const git = (cmd, fallback = '') => {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() }
  catch { return fallback }
}

const files = walk(ROOT)
const bytes = files.reduce((n, f) => n + f.size, 0)
const medium = (MEDIA.find(([lim]) => bytes <= lim) || [0, 'more than a DVD'])[1]

// Deliberately NOT the commit SHA: this file becomes part of the very commit it
// would name, so a SHA here is always one behind. A tag is set on purpose, so it
// doesn't lag. VERSION file wins if present.
let version = 'unreleased'
try { version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim() } catch {}
if (version === 'unreleased') version = git('describe --tags --abbrev=0') || 'unreleased'

// Stamped at commit time by the hook, so this is the real date of this build.
const built = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
const owner = (git('config --get remote.origin.url').match(/[:/]([^/]+)\/([^/.]+)(\.git)?$/) || [])[1] || ''
const repo = (git('config --get remote.origin.url').match(/[:/]([^/]+)\/([^/.]+)(\.git)?$/) || [])[2] || basename(ROOT)

const block = `${START}
  <dl class="buildinfo">
    <dt>Version</dt><dd>${version}</dd>
    <dt>Built</dt><dd>${built}</dd>
    <dt>Size</dt><dd title="Everything the browser downloads to run this app: HTML, CSS, JavaScript, fonts, assets.">${fmt(bytes)} across ${files.length} files — small enough to fit on ${medium}</dd>
    <dt>Source</dt><dd><a href="https://github.com/${owner}/${repo}">github.com/${owner}/${repo}</a></dd>
  </dl>
  <p class="buildinfo-note">Runs entirely in your browser. No server, no account, no tracking.</p>
  ${END}`

const html = readFileSync(TARGET, 'utf8')
if (!html.includes(START) || !html.includes(END)) {
  console.error(`measure: ${START} / ${END} markers not found in index.html`)
  process.exit(1)
}
const updated = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)

writeFileSync(TARGET, updated)
console.log(`measure: ${fmt(bytes)}, ${files.length} files, ${version} — fits on ${medium}`)
