<img src="assets/favicon.svg" width="64" alt="Clique logo" align="left">

# Clique

A classroom-friendly Connections-style puzzle game maker.

**Play it now → https://ohiomathteacher.github.io/clique/**

Hunt for four groups of four words that share a hidden theme — easiest (yellow) to hardest (purple). Four mistakes and the game ends.

---

## What's inside

- **Play** a growing library of puzzles in English, Spanish, and Chinese
- Filter by **subject** (Science, Math, Social Studies, Language Arts, Mixed, Just for Fun) and **grade band** (7–8, 9–10, 11–12)
- **Build** your own puzzle in the browser — no account, no login
- **Generate** puzzles with AI. Bring your own key for Groq (free), OpenAI, Gemini, or Claude. Keys are stored only in the browser and never uploaded
- **Share** any puzzle as a self-contained URL, or **download** it as a `.json` file
- **Localized** play UI (English / Spanish / Chinese) based on each puzzle's language
- **Tips** page with concrete guidance for designing a good Connections puzzle

## Sharing with students

Send them the link: **https://ohiomathteacher.github.io/clique/**

That's it. They can play immediately, click **Build** to make their own, and click **Tips** for help on what makes a great puzzle.

## Adding puzzles to the library

Drop a `<slug>.json` file into `puzzles/` and push to `main`. The Play list auto-discovers new puzzles via the GitHub API — no index file to maintain. Schema:

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

The `topic` field picks the icon. See `assets/icons/topics/` for the full list — algebra, biology, chemistry, drama, food, geography, history, humor, etc.

## Tech notes

- Static site. No backend, no build step. Vanilla HTML, CSS, and JavaScript.
- Hosted on GitHub Pages from `main`. Pushing redeploys in about 30 seconds.
- AI requests go directly from the browser to your chosen provider over HTTPS.

### Running your own copy (optional)

You don't need this for normal play — the [hosted version](https://ohiomathteacher.github.io/clique/)
works on any device with a browser. But if you want to develop, host on your
own server, or play offline:

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
