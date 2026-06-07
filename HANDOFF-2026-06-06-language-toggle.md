# Handoff — Clique: one puzzle, language togglable in-play (for next chat)

Goal: instead of shipping the same puzzle three times (e.g. `philosophy-101.json`,
`philosophy-101-es.json`, `philosophy-101-zh.json`), have **one puzzle** whose
language is **toggled inside the play view** (English / Español / 中文), the way
Marginalia toggles a reading's translation.

Status: the 3-file version already works for the talk, so this is an enhancement —
do it deliberately, not rushed.

## Current model (what exists)
- Each puzzle is its own JSON: `title, author, language, subject, grade, topic,
  groups[4]{category,difficulty,words[4]}, hints{WORD: text}`.
- `puzzles/index.json` lists every file. Filters in `app.js`:
  - `LANGUAGES`/`SUBJECTS` arrays (~lines 9–14); filter logic ~158–208
    (`it.language === lang`, `it.subject === subj`).
  - Catalog entries built ~234–248; puzzle loaded + rendered with
    `puzzle.groups`/`puzzle.hints`/`puzzle.language` (~316, ~530).
- We added es/zh Philosophy as separate files (see git log).

## Proposed model (recommended: mirror Marginalia)
A single multi-language puzzle file:
```json
{
  "title": "Philosophy 101",
  "subject": "Philosophy", "topic": "philosophy",
  "languages": {
    "en": { "title": "Philosophy 101", "groups": [...], "hints": {...} },
    "es": { "title": "Filosofía 101",  "groups": [...], "hints": {...} },
    "zh": { "title": "哲学入门",        "groups": [...], "hints": {...} }
  }
}
```
- **Loader:** accept BOTH shapes — if `languages` exists, it's multi-lang; else
  treat the flat file as `{languages:{[language]: <self>}}` (back-compat, so the
  other ~30 single-language puzzles keep working untouched).
- **Catalog/filter:** a multi-lang puzzle should match the language filter if it
  has that language (`Object.keys(p.languages).includes(lang)`), and appear once.
- **Play UI:** add language-toggle buttons in the play header (reuse a `.lang-btn`
  style like Marginalia). On switch, re-render the grid/hints/title from the
  chosen language and **reset the board** (selections, solved groups, mistakes) —
  the word strings differ across languages so state can't carry over cleanly;
  reset is the simplest correct behavior. (Stretch: preserve solved *groups* by
  index since group order is identical across languages.)
- **Migration:** fold `philosophy-101{,-es,-zh}.json` into one
  `philosophy-101.json` with a `languages` map; drop the two extra files from
  `index.json`. The translated content already exists in those files — just move
  it under `languages.es` / `languages.zh`.

## Touch list
`app.js` (loader/normalize ~234–248, filter ~158–208, play render ~316/530,
add toggle handler + `.lang-btn` markup), `index.html` (play header toggle
container if not reusing existing), `style.css` (`.lang-btn` if needed),
`puzzles/philosophy-101.json` (+ remove `-es`/`-zh` from index.json).

## Scope: ~1 focused session. Lower risk if done with full context.
To bring up Clique to test: run `start-demo.command`, then
`http://localhost:8000/clique/`.
