# Clique — Vision & Roadmap

*Last updated: 2026-05-29. Companion to [`docs/authoring-scaffold-design.md`](docs/authoring-scaffold-design.md)
(the implementation detail). This file is the **why** and the **what's next**.*

## The thesis

Move Clique from "AI makes the puzzle for you" toward **"students author puzzles and
challenge their friends,"** with the app scaffolding the craft and then *fading*.

Every feature gets one test (from the Cincy AI Week talk spine):
**does it make the kid *need* it (friendly guard) or *free* the kid from needing it
(emancipator)?**

- AI auto-generation = friendly guard. It does the thinking; the kid consumes.
- Scaffolded authoring + peer challenge = emancipator. The kid does the thinking; the
  scaffold teaches, then steps aside. Success = the student who no longer needs the wizard.

**Focus is the create side.** Play already works well and needs no distractor-specific
logic — the trap lives in the word choices, and difficulty emerges naturally when a
friend plays. Distractors are a *pure authoring scaffold*, not a play-time feature.

## Where we are (2026-05-29)

Committed in `cfaf922` — "Guided Create authoring wizard (WIP checkpoint)":

- **Guided Create wizard**: SETUP → four group steps → DISTRACTORS → PLAYTEST.
- **The distractor panel** (the heart of it): two columns.
  - Left = the **Solution**: a single column, 4 rows of 4 (the four real groups).
  - Right = **Distractors**: *k* rows, *k* ∈ 0–4. The author builds each cluster from
    dropdowns of the existing 16 words, **pool-depleted** so a word sits in at most one
    trap. Validation rejects incomplete/duplicate clusters and any cluster identical to
    a real group.
- **Challenge loop**: the win screen offers "Now make one back →", routing back into Create.
- **Share**: the whole puzzle (including distractors) base64-encodes into the link — no
  backend, no accounts.

## The "k notation" (shorthand for difficulty)

A game is described as **`solution:distractors`** = the number of clusters in each column.

- **4:0** — no distractors. A clean, gentle puzzle.
- **4:1 / 4:2** — a dead end or two. Rising challenge.
- **4:3** — *the hardest.* Three plausible wrong partitions to fall into.
- **4:4** — every word belongs to a second full cluster, so the puzzle has **two complete
  solutions**. Sneaky, but *arguably easier* than 4:3 because the solver has two ways to win.

**Difficulty is therefore NOT monotonic in k — it peaks at 4:3 and dips at 4:4.**

---

## Roadmap / to-do queue

Priority order. Check off as done; move detail into the design doc when a task starts.

### 1. Persistence — "save games as they're created"  🔴 not built
The create wizard's state is a single in-memory global; a refresh or crash wipes the whole
in-progress puzzle. (This session literally opened with a crash — a student mid-creation
would lose everything the same way.) No backend; use `localStorage` (already used for
settings/keys).
- [ ] **Autosave draft** — persist create-state on every step change; restore on load.
- [ ] **Saved library** — a "My puzzles" list of finished puzzles to reopen, re-share, or
      duplicate. Natural home for the challenge loop.

### 2. AI theme-checker for distractor clusters  🔴 not built
Today's validation only checks *mechanics* (complete, unique, not-a-real-group). It can't
tell whether a distractor is a *coherent* false theme or four random words. This is the
part that actually teaches the craft.
- [ ] **AI pass** (gated behind existing AI-key setup, graceful skip if no key):
      "Is this a plausible false theme? Name it, rate 1–5, suggest a swap." Reframes AI
      correctly — it *coaches the student's trap*, it doesn't make the puzzle.
- [ ] Heuristic-only fallback is weak (can't judge semantic coherence) — note its limits
      rather than pretend it validates themes.

### 3. Adopt the k-notation + fix the difficulty curve  🔴 not built
- [ ] Surface a **`4:3` badge** in the UI (cleaner than the current "Gentle/Easy/.../Devious").
- [ ] Fix `DIFFICULTY_LABELS` — it's currently monotonic and calls 4:4 the hardest
      ("Devious"). Relabel so **4:3 reads as the apex** and 4:4 as "two solutions —
      sneaky but forgiving."

### 4. Carried over from the design doc's "open decisions"
- [ ] **i18n**: wizard coaching copy is EN-only; ES/ZH parity later (play UI is already localized).
- [ ] **Reframe the AI "✨ Generate" button** in-product as a *starting draft to edit*, not
      a finished puzzle — consistent with the emancipator framing.

## Talk hook (Cincy AI Week, Demo 1 — June 9, 2026)

Live: author a tiny puzzle the guided way — build the easy group, ladder to a purple
wordplay group, plant a fair trap or two — then hit "make one back" to show the loop.
The demo *is* the thesis: the tool teaching a kid to do the thing, then stepping aside.
