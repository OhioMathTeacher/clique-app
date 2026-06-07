# Authoring Scaffold — design

*Goal: move Clique from "AI makes the puzzle for you" toward "students author puzzles
and challenge each other," with the app scaffolding the craft. Drives Demo 1 of the
Cincy AI Week talk (June 9, 2026).*

## The thesis (why this exists)

Every tool gets one test, from the talk's spine: **does it make the kid *need* it
(friendly guard) or free the kid from needing it (emancipator)?**

- **AI auto-generation = friendly guard.** It does the thinking. The kid consumes.
- **Scaffolded authoring + peer challenge = emancipator.** The kid does the thinking;
  the scaffold teaches the craft, then *fades*. Success = the student who no longer
  needs the wizard.

So the scaffold is **gradual-release by design** (I do → we do → you do). It must be
*removable*: the existing blank Build form stays as "free mode" for students who've
outgrown the coaching.

## What already exists (don't rebuild)

- **Build form** (`view-build`, `renderBuild`): title/author/meta + 4×4 grid, Preview,
  Share-as-URL, Download. `readForm` already rejects duplicate words and empty slots.
- **Tips page** (`view-tips`): already holds the *real* craft knowledge — distinct
  categories, difficulty ladder, accidental ambiguity, the one intentional trap,
  playtesting. **The scaffold relocates this knowledge inline, at the moment of each
  decision, instead of on a page students skip.**
- **Share**: `sharableLink` base64-encodes the whole puzzle into `#/play/inline/<b64>`.
  No backend. The challenge loop extends this, not replaces it.
- **Routing**: hash-based (`route()`), `<template>` views via `renderTemplate`.

## The build — four parts

### Part 1 — Guided Create wizard  (`#/create`, `view-create`)
A staged flow over the same puzzle data the Build form uses. One decision per screen,
each with a short coaching line and a live check. Steps:

1. **Theme world** — one umbrella ("the ocean", "fractions", "verbs"). Keeps the 16
   words coherent. Coaching: a puzzle is four *neighborhoods* in one city.
2. **Easy group first (yellow)** — "Four things that obviously belong together. Your
   friend should get this one fast." Live check: warn if a word looks obscure/long.
3. **Ladder up (green → blue → purple)** — one screen each, each naming what makes it
   harder. Purple screen teaches wordplay / double meaning, with an example.
4. **The fair trap** — the craft move. "Pick one word that *looks* like it could be in
   another group but belongs in exactly one." Teaches intentional-ambiguity-without-
   literal-duplication (the key distinction the current validator can't express). A
   gentle checker highlights candidate trap words; never forces one.
5. **Playtest** — "Send it to a friend. Solved instantly? Add a trap. Couldn't solve?
   Loosen a category." Launches Preview, then routes to Share.

Wizard writes into the same fields `readForm` reads, so Preview/Share/Download all work
unchanged. "Switch to free mode" link jumps to `#/build` carrying current progress.

### Part 2 — The challenge loop
Closes author → player → author. No backend.

- **Win screen** (`submitGuess`, solved branch) gains **"Now make one back →"**, routing
  to `#/create` with the challenger's name carried through (so the new puzzle's "author
  challenges…" framing is pre-filled).
- The loop is the point: every solved puzzle is an invitation to author one.

### Part 3 — Challenge cards
The share link becomes a challenge, not just a puzzle.

- Optional **challenge message** + author name encoded alongside the puzzle.
- Play header shows "**Maya challenges you** — can you beat 0 mistakes?" instead of a
  bare title.
- Backward compatible: puzzles without challenge metadata render exactly as today.

### Part 4 — Result sharing (Wordle-style)
On solve, offer a copyable result (emoji grid of guess order + mistake count) to send
*back* to the challenger. Pure text/clipboard — no backend, no accounts.

## Decisions still open

- **Trap checker depth**: heuristic word-overlap hints (cheap, offline, deterministic)
  vs. optional AI "is this a fair trap?" pass (richer, needs a key). Lean heuristic for
  the stage demo; AI as a later enhancement.
- **i18n**: wizard coaching copy in EN first; ES/ZH parity later (play UI is already
  localized; authoring coaching is not yet).
- **Where AI lives now**: keep "✨ Generate" available, but reframe it in-product as a
  *starting draft to edit*, not a finished puzzle — consistent with the emancipator
  framing (and the existing Tip #5 already says this).

## Talk hook (Demo 1)

Live: author a tiny puzzle the guided way — build the easy group, ladder to a purple
wordplay group, plant one fair trap — then hit **"make one back"** to show the loop.
The demo *is* the thesis: the tool teaching a kid to do the thing, then stepping aside.
