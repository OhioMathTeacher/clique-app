<img src="assets/favicon.svg" width="64" alt="Clique logo" align="left">

# Clique

A classroom-friendly Connections-style puzzle game maker — play a growing
library, build and share your own, or generate fresh ones with AI.

**Play it now → https://ohiomathteacher.github.io/clique/**

Hunt for four groups of four words that share a hidden theme — easiest
(yellow) to hardest (purple). Four mistakes and the game ends.

---

## What Clique does

### Play
- A **growing library** of puzzles in **English, Spanish, and Chinese**
- Filter by **subject** (Science, Math, Social Studies, Language Arts,
  Mixed, Just for Fun) and **grade band** (7–8, 9–10, 11–12)
- **Per-puzzle language toggle** when a puzzle has multiple translations
- **Localized play UI** — menus and prompts follow the puzzle's language
- **🪢 Ask Socrates** while you play — a built-in AI thinking partner
  that helps you reason through the puzzle without ever spoiling the
  answer (see [Ask Socrates](#ask-socrates) below)

### Build and share
- **Build** your own puzzle in the browser — no account, no login. Pick
  four categories, write four words for each, choose a topic icon, save
- **✨ Generate with AI** to seed a draft from a topic — refine, then save
  (see [Generate puzzles with AI](#generate-puzzles-with-ai) below)
- **Share** any puzzle as a self-contained URL — the entire puzzle is
  encoded in the link itself (base64 in the URL fragment), so anyone can
  play it instantly with no account, no server, no upload
- **Download** as `.json` for archiving or for adding to the curated library
- **Tips page** with concrete guidance for designing a good Connections puzzle

## Sharing with students

Send them the link: **https://ohiomathteacher.github.io/clique/**

That's it. They can play immediately, click **Build** to make their own,
click **Tips** for help on what makes a great puzzle, and click
**🪢 Ask Socrates** during play if they want a thinking partner that
won't spoil the answer.

## Ask Socrates

While playing any puzzle, click **🪢 Ask Socrates** to open a side panel
chat. Socrates is a warm thinking partner who helps students reason
through the puzzle — *without* revealing the solution.

- Never names a category
- Never confirms whether a specific group is correct
- Turns "what's the answer?" gently back into a question that helps the
  student notice it themselves
- Replies in 1–3 sentences, in the puzzle's language (English / Spanish /
  Chinese)

Each puzzle starts a fresh conversation. Socrates uses a per-puzzle
prompt that grounds him in that specific puzzle's structure, so his
Socratic questions are sharp without being spoilers.

You'll need an AI model wired up first via **AI Setup** — see below.

## Generate puzzles with AI

In the **Build** view, click **✨ Generate with AI** to draft a puzzle
from a topic. Refine the result, save, and share.

Both Ask Socrates and Generate use whichever AI model you configure in
**AI Setup**:

### Local model (recommended) — Ollama + qwen2.5:3b

[Ollama](https://ollama.com/) is a one-binary local LLM runner. Install
it, pull a small model, and Clique discovers it automatically at
`localhost:11434`.

On Linux:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:3b
```

On macOS: download [Ollama.app](https://ollama.com/download), drag to
Applications, then `ollama pull qwen2.5:3b` in Terminal.

On Windows: download the installer from [ollama.com/download](https://ollama.com/download),
then `ollama pull qwen2.5:3b` in PowerShell.

`qwen2.5:3b` is ~2 GB and runs comfortably on most laptops — including
older machines without a discrete GPU. Open **AI Setup** in Clique →
pick **Local (Ollama)** → select your model. No key needed.

> **Note for hosted-version users:** the hosted Clique at
> https://ohiomathteacher.github.io/clique/ runs over HTTPS, and most
> browsers block HTTPS pages from calling `http://localhost`. For local
> Ollama to work, run Clique locally (see "Running your own copy" below
> — it serves over HTTP, so the call to Ollama succeeds). Cloud
> providers work fine from the hosted version.

### Cloud model (alternative) — bring your own key

Open **AI Setup** and paste your API key for **Groq** (free tier,
fastest), **OpenAI**, **Gemini**, or **Claude**. Keys live only in your
browser's local storage and never leave it.

## Adding puzzles to the curated library

The curated library — what appears under **Pick a puzzle** — is sourced
from JSON files in `puzzles/`. To add one, drop a `<slug>.json` file
there and push to `main`. The Play list auto-discovers new puzzles via
the GitHub API — no index file to maintain.

> This is different from **share URLs**: share URLs are how users
> distribute puzzles peer-to-peer (the puzzle travels in the link
> itself, no upload needed). The curated library is the editorial
> selection shipped with the app.

Schema:

```json
{
  "title": "...",
  "author": "...",
  "language": "en",
  "subject": "Science",
  "grade": "9-10",
  "topic": "biology",
  "groups": [
    { "category": "...", "difficulty": "yellow", "words": ["A","B","C","D"] },
    { "category": "...", "difficulty": "green",  "words": ["A","B","C","D"] },
    { "category": "...", "difficulty": "blue",   "words": ["A","B","C","D"] },
    { "category": "...", "difficulty": "purple", "words": ["A","B","C","D"] }
  ]
}
```

The `topic` field picks the icon. See `assets/icons/topics/` for the
full list — algebra, biology, chemistry, drama, food, geography,
history, humor, etc.

## Tech notes

- Static site. No backend, no build step. Vanilla HTML, CSS, and JavaScript.
- Hosted on GitHub Pages from `main`. Pushing redeploys in about 30 seconds.
- AI requests go directly from the browser to your chosen provider
  (cloud over HTTPS, or local Ollama over HTTP at `localhost:11434`).
- Share URLs encode the entire puzzle as base64 in the URL fragment, so
  the link itself is the whole puzzle — no server lookup, works offline
  once loaded.

### Running your own copy (optional)

You don't need this for normal play — the [hosted version](https://ohiomathteacher.github.io/clique/)
works on any device with a browser. But if you want to develop, host on
your own server, play offline, or use a local Ollama model:

```bash
git clone https://github.com/OhioMathTeacher/clique-app.git
cd clique-app
python3 -m http.server 8000
```

Then open **http://localhost:8000** in any browser. Works the same on
macOS, Linux, and Windows (Windows uses `py -m http.server 8000`). No
Node, no build, no dependencies — Python 3 is the only thing you need,
and it ships with macOS and most Linux distros by default.

## Credits

Inspired by the New York Times Connections puzzle. Built by [@OhioMathTeacher](https://github.com/OhioMathTeacher).
