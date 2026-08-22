#!/usr/bin/env node
// measure.mjs — writes the About panel's build line and source links.
//
// Runs from .githooks/pre-commit, so the stamped values always describe the
// commit they ship in. GitHub Pages serves the default branch directly, so
// committed == live.
//
// Values are baked into the HTML rather than fetched at runtime, because these
// apps must also run from file://, where fetch() of a sibling file is blocked.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const START = '<!-- build-info:start -->'
const END = '<!-- build-info:end -->'

// "Payload" = what a browser downloads to run the app. Repo furniture — git
// metadata, readme, licence, this script — is not payload.
const SKIP_DIRS = new Set(['.git', '.githooks', '.github', 'node_modules', 'dist', 'press'])
const SKIP_FILES = new Set([
  'README.md', 'LICENSE', 'measure.mjs', 'VERSION', 'package.json',
  'package-lock.json', '.nojekyll', '.gitignore'
])

function walk (dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, acc) }
    else if (!SKIP_FILES.has(name) && !name.endsWith('.md')) acc.push(st.size)
  }
  return acc
}

// Naming an ever-bigger medium is a bad flex: "3.3 MB fits on a 100 MB Zip disk"
// says nothing, because the disk is 30x the payload. Past one floppy, count them.
const FLOPPY = 1474560
const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
function capacity (b) {
  if (b <= 368640) return 'a 360 KB 5¼-inch floppy disk'
  if (b <= 737280) return 'a 720 KB 3½-inch floppy disk'
  if (b <= FLOPPY) return 'a 1.44 MB 3½-inch floppy disk'
  const n = Math.ceil(b / FLOPPY)
  return `${WORDS[n] || n} 1.44 MB floppy disks`
}

const fmt = b => b < 1024 ? `${b} bytes`
  : b < 1024 * 1024 ? `${(b / 1024).toFixed(b / 1024 < 10 ? 1 : 0)} KB`
  : `${(b / 1024 / 1024).toFixed(1)} MB`

const git = (cmd, fb = '') => {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() }
  catch { return fb }
}

const sizes = walk(ROOT)
const bytes = sizes.reduce((a, b) => a + b, 0)
const medium = capacity(bytes)

// Deliberately NOT the commit SHA: this file becomes part of the very commit it
// would name, so a SHA here is always one behind. A tag is set on purpose.
let version = ''
try { version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim() } catch {}
if (!version) version = git('describe --tags --abbrev=0') || 'unreleased'

const built = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// Derived, not hardcoded — journaler-284 pins /blob/master/, which silently
// breaks the moment the pattern is copied into a repo that uses main.
const m = git('config --get remote.origin.url').match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/) || []
const owner = m[1] || 'OhioMathTeacher'
const repo = m[2] || basename(ROOT)
const branch = git('symbolic-ref --short HEAD') || 'main'
const gh = `https://github.com/${owner}/${repo}`

const block = `${START}
    <div class="about-links">
      <a href="${gh}#readme" target="_blank" rel="noopener">Source code &amp; README ↗</a>
      <a href="${gh}/blob/${branch}/LICENSE" target="_blank" rel="noopener">License ↗</a>
      <a href="${gh}/issues" target="_blank" rel="noopener">Report a problem ↗</a>
    </div>
    <p class="about-build" title="Everything the browser downloads to run this app: HTML, CSS, JavaScript, fonts, assets.">Version ${version.replace(/^v/, "")} · built ${built} · ${fmt(bytes)} across ${sizes.length} files — fits on ${medium}</p>
    ${END}`

// Find whichever HTML file carries the markers, so this script is portable.
const targets = readdirSync(ROOT).filter(f => f.endsWith('.html'))
  .filter(f => readFileSync(join(ROOT, f), 'utf8').includes(START))
if (!targets.length) { console.error(`measure: no HTML file contains ${START}`); process.exit(1) }

for (const t of targets) {
  const p = join(ROOT, t)
  const html = readFileSync(p, 'utf8')
  writeFileSync(p, html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block))
  console.log(`measure: ${t} — ${fmt(bytes)}, ${sizes.length} files, ${version}, fits on ${medium}`)
}
