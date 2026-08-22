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
  'README.md', 'LICENSE', 'measure.mjs', 'VERSION', 'package.json', '_preview.html',
  'package-lock.json', '.nojekyll', '.gitignore'
])

// Payload = what git actually ships. Asking git rather than walking the disk
// makes it structurally impossible to count scaffolding: a scratch file, a
// preview copy, an editor backup. If it is not committed, it does not ship, so
// it must not be measured. (A stray _preview.html once inflated this panel to
// 3.7 MB / 26 files -- in the very panel whose job is to be correct.)
function trackedFiles () {
  const out = execSync('git ls-files -z', { cwd: ROOT, maxBuffer: 1 << 24 })
    .toString()
    .split('\0')
    .filter(Boolean)
  return out.filter((f) => {
    const base = f.split('/').pop()
    if (SKIP_FILES.has(base) || base.endsWith('.md')) return false
    return !f.split('/').some((seg) => SKIP_DIRS.has(seg))
  })
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

const tracked = trackedFiles()
const sizes = tracked.map((f) => statSync(join(ROOT, f)).size)
const bytes = sizes.reduce((a, b) => a + b, 0)
const medium = capacity(bytes)
const floppies = Math.max(1, Math.ceil(bytes / FLOPPY))

// Deliberately NOT the commit SHA: this file becomes part of the very commit it
// would name, so a SHA here is always one behind. A tag is set on purpose.
let version = ''
try { version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim() } catch {}
if (!version) version = git('describe --tags --abbrev=0') || 'unreleased'

const now = new Date()
const iso = now.toISOString().slice(0, 10)
const built = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// Derived, not hardcoded — journaler-284 pins /blob/master/, which silently
// breaks the moment the pattern is copied into a repo that uses main.
const m = git('config --get remote.origin.url').match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/) || []
const owner = m[1] || 'OhioMathTeacher'
const repo = m[2] || basename(ROOT)
const branch = git('symbolic-ref --short HEAD') || 'main'
const gh = `https://github.com/${owner}/${repo}`

const block = `${START}
    <div class="about-links">
      <a href="${gh}#readme" target="_blank" rel="noopener" data-i18n="aboutSource">Source code &amp; README ↗</a>
      <a href="${gh}/blob/${branch}/LICENSE" target="_blank" rel="noopener" data-i18n="aboutLicense">License ↗</a>
      <a href="${gh}/issues" target="_blank" rel="noopener" data-i18n="aboutReport">Report a problem ↗</a>
    </div>
    <p class="about-build" data-build-v="${version.replace(/^v/, '')}" data-build-d="${iso}" data-build-s="${fmt(bytes)}" data-build-f="${sizes.length}" data-build-n="${floppies}" title="Everything the browser downloads to run this app: HTML, CSS, JavaScript, fonts, assets.">Version ${version.replace(/^v/, '')} · built ${built} · ${fmt(bytes)} across ${sizes.length} files</p>
    <p class="about-floppy">fits on ${floppies} × 1.44 MB floppy disks</p>
    ${END}`

// Find whichever HTML file carries the markers, so this script is portable.
const targets = tracked
  .filter((f) => f.endsWith('.html'))
  .filter((f) => readFileSync(join(ROOT, f), 'utf8').includes(START))
if (!targets.length) { console.error(`measure: no HTML file contains ${START}`); process.exit(1) }

// An unclosed <script> or <style> is not a parse error you will ever see: the
// parser consumes the rest of the file as text, the page loads, the title
// renders, and none of the code executes. That cost an afternoon once. Refuse
// to stamp a file that has one.
function checkTags (html, file) {
  for (const tag of ['script', 'style']) {
    const open = (html.match(new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')) || []).length
    const close = (html.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length
    if (open !== close) {
      console.error(`measure: ${file} has ${open} <${tag}> but ${close} </${tag}> -- unclosed tags are silently swallowed by the browser`)
      process.exit(1)
    }
  }
}

for (const t of targets) {
  const p = join(ROOT, t)
  const html = readFileSync(p, 'utf8')
  checkTags(html, t)
  writeFileSync(p, html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block))
  console.log(`measure: ${t} — ${fmt(bytes)}, ${sizes.length} files, ${version}, fits on ${medium}`)
}
