// Connections Builder - vanilla JS, no build step
// Repo for "submit to repo" flow:
const REPO_OWNER = "OhioMathTeacher";
const REPO_NAME = "clique";
const REPO_BRANCH = "main";
const GITHUB_API = "https://api.github.com";
const DIFFICULTIES = ["yellow", "green", "blue", "purple"];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
];
const SUBJECTS = ["Science", "Math", "Social Studies", "Language Arts", "Philosophy", "Mixed", "Just for Fun"];

const TOPICS = [
  { id: "algebra",       label: "Algebra" },
  { id: "arithmetic",    label: "Arithmetic" },
  { id: "calculus",      label: "Calculus" },
  { id: "geometry",      label: "Geometry" },
  { id: "biology",       label: "Biology" },
  { id: "chemistry",     label: "Chemistry" },
  { id: "physics",       label: "Physics" },
  { id: "earth-science", label: "Earth Science" },
  { id: "geography",     label: "Geography" },
  { id: "history",       label: "History" },
  { id: "literature",    label: "Literature" },
  { id: "philosophy",    label: "Philosophy" },
  { id: "drama",         label: "Drama" },
  { id: "vocabulary",    label: "Vocabulary" },
  { id: "spanish",       label: "Spanish" },
  { id: "chinese",       label: "Chinese" },
  { id: "animals",       label: "Animals" },
  { id: "food",          label: "Food" },
  { id: "movies",        label: "Movies & TV" },
  { id: "music",         label: "Music" },
  { id: "school",        label: "School Life" },
  { id: "pop-culture",   label: "Pop Culture" },
  { id: "humor",         label: "Humor" },
];
const GRADES = ["7-8", "9-10", "11-12"];

function languageLabel(code) {
  return (LANGUAGES.find(l => l.code === code) || {}).label || code || "—";
}

const I18N = {
  en: {
    by: "by",
    shuffle: "Shuffle",
    deselect: "Deselect",
    submit: "Submit",
    mistakes: "Mistakes:",
    showHints: "Show hints",
    relaxedMode: "Relaxed mode",
    nice: "Nice!",
    oneAway: "One away…",
    notQuite: "Not quite.",
    outOfGuesses: "Out of guesses. Better luck next time!",
    solved: (n) => `Solved with ${n} mistake${n === 1 ? "" : "s"}! 🎉`,
  },
  es: {
    by: "por",
    shuffle: "Mezclar",
    deselect: "Borrar",
    submit: "Enviar",
    mistakes: "Errores:",
    showHints: "Mostrar pistas",
    relaxedMode: "Modo relajado",
    nice: "¡Muy bien!",
    oneAway: "Falta uno…",
    notQuite: "Casi.",
    outOfGuesses: "Sin intentos. ¡Suerte la próxima!",
    solved: (n) => `¡Resuelto con ${n} error${n === 1 ? "" : "es"}! 🎉`,
  },
  zh: {
    by: "作者",
    shuffle: "打乱",
    deselect: "取消选择",
    submit: "提交",
    mistakes: "错误:",
    showHints: "显示提示",
    relaxedMode: "轻松模式",
    nice: "不错!",
    oneAway: "差一个…",
    notQuite: "不对。",
    outOfGuesses: "机会用完了。下次再试!",
    solved: (n) => `用了 ${n} 次错误解开了! 🎉`,
  },
};

function t(lang, key, ...args) {
  const dict = I18N[lang] || I18N.en;
  const v = dict[key] !== undefined ? dict[key] : I18N.en[key];
  return typeof v === "function" ? v(...args) : v;
}

const app = document.getElementById("app");

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function renderTemplate(id) {
  const tpl = document.getElementById(id);
  app.replaceChildren(tpl.content.cloneNode(true));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setMessage(text, cls = "") {
  const m = $("#message");
  if (!m) return;
  m.textContent = text;
  m.className = "message " + cls;
}

// ---------- Routing ----------

function route() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/play/inline/")) {
    const encoded = hash.slice("#/play/inline/".length);
    try {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      const puzzle = JSON.parse(json);
      renderPlay(puzzle);
    } catch (e) {
      app.innerHTML = "<p>Couldn't decode that puzzle link. It may be corrupted.</p>";
    }
    return;
  }
  if (hash.startsWith("#/play/")) {
    const slug = hash.slice("#/play/".length);
    loadAndPlay(slug);
    return;
  }
  if (hash.startsWith("#/create")) return renderCreate(hash);
  if (hash === "#/build") return renderBuild();
  if (hash === "#/about") return renderAbout();
  if (hash === "#/tips") return renderTips();
  return renderHome();
}

window.addEventListener("hashchange", route);

// ---------- Home ----------

async function renderHome() {
  renderTemplate("view-home");
  // Populate filter dropdowns
  fillSelect($("#filter-lang"), [{ value: "", label: "All languages" }, ...LANGUAGES.map(l => ({ value: l.code, label: l.label }))]);
  fillSelect($("#filter-subject"), [{ value: "", label: "All subjects" }, ...SUBJECTS.map(s => ({ value: s, label: s }))]);
  fillSelect($("#filter-grade"), [{ value: "", label: "All grades" }, ...GRADES.map(g => ({ value: g, label: `Grades ${g}` }))]);
  // Default to the Philosophy section on first load (the talk's focus).
  $("#filter-subject").value = "Philosophy";

  const list = $("#puzzle-list");
  list.innerHTML = `<li class="loading">Loading puzzles…</li>`;
  let items = [];
  try {
    items = await discoverPuzzles();
  } catch (e) {
    list.innerHTML = `<li class="loading">Couldn't load puzzles. <a href="#/build">Build one →</a></li>`;
    return;
  }

  const apply = () => {
    const lang = $("#filter-lang").value;
    const subj = $("#filter-subject").value;
    const grade = $("#filter-grade").value;
    const filtered = items.filter(it =>
      (!lang || (it.langs ? it.langs.includes(lang) : it.language === lang)) &&
      (!subj || it.subject === subj) &&
      (!grade || it.grade === grade)
    );
    if (!filtered.length) {
      list.innerHTML = `<li class="loading">No puzzles match those filters. Try widening the search, or <a href="#/build">build one</a>.</li>`;
      return;
    }
    list.innerHTML = "";
    for (const it of filtered) {
      const li = document.createElement("li");
      const langList = (it.langs && it.langs.length) ? it.langs : (it.language ? [it.language] : []);
      const badges = [
        ...langList.map(l => `<span class="badge">${escapeHtml(languageLabel(l))}</span>`),
        it.subject  ? `<span class="badge">${escapeHtml(it.subject)}</span>` : "",
        it.grade    ? `<span class="badge">Gr ${escapeHtml(it.grade)}</span>` : "",
      ].join("");
      const iconSrc = it.topic ? `assets/icons/topics/${encodeURIComponent(it.topic)}.svg` : "assets/icons/_default.svg";
      li.innerHTML = `<a href="#/play/${encodeURIComponent(it.slug)}">
        <img class="puzzle-icon" src="${iconSrc}" alt="" loading="lazy" onerror="this.src='assets/icons/_default.svg'">
        <div class="puzzle-info">
          <div class="row-title">${escapeHtml(it.title)}</div>
          <div class="meta">${it.author ? escapeHtml(it.author) + ' ' : ''}${badges}</div>
        </div>
      </a>`;
      list.appendChild(li);
    }
  };

  $("#filter-lang").addEventListener("change", apply);
  $("#filter-subject").addEventListener("change", apply);
  $("#filter-grade").addEventListener("change", apply);
  apply();
}

function fillSelect(sel, options) {
  sel.innerHTML = "";
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
}

// Read one puzzle file locally for its list metadata (no network).
async function puzzleMetaFromFile(name) {
  const slug = name.replace(/\.json$/, "");
  try {
    const r = await fetch(`puzzles/${name}`, { cache: "no-cache" });
    if (!r.ok) return null;
    const p = await r.json();
    const langs = p.languages ? Object.keys(p.languages) : (p.language ? [p.language] : []);
    return {
      slug,
      title: p.title || (langs[0] && p.languages && p.languages[langs[0]] && p.languages[langs[0]].title) || slug,
      author: p.author || "",
      language: langs[0] || "",   // representative (back-compat)
      langs,                      // every language this puzzle offers
      subject: p.subject || "",
      grade: p.grade || "",
      topic: p.topic || "",
    };
  } catch (e) { return null; }
}

// Discover playable puzzles. PURE LOCAL FIRST: if puzzles/index.json exists (a
// list of filenames), read those files locally with NO internet at all. Only
// when there's no local manifest do we reach out to the GitHub Contents API.
async function discoverPuzzles() {
  // 1) Local manifest — fully offline, full metadata from the files themselves.
  try {
    const r = await fetch("puzzles/index.json", { cache: "no-cache" });
    if (r.ok) {
      const list = await r.json();
      const names = list
        .map(x => typeof x === "string" ? x : (x.file || (x.slug ? x.slug + ".json" : "")))
        .filter(Boolean);
      const items = (await Promise.all(names.map(puzzleMetaFromFile))).filter(Boolean);
      if (items.length) return items.sort((a, b) => a.title.localeCompare(b.title));
    }
  } catch (e) { /* no local manifest — try GitHub next */ }

  // 2) Online fallback: auto-discover from the GitHub repo (only used when there
  //    is no local index.json).
  let files = [];
  try {
    const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/puzzles?ref=${REPO_BRANCH}`, {
      headers: { "Accept": "application/vnd.github+json" },
    });
    if (res.ok) {
      const entries = await res.json();
      files = entries
        .filter(e => e.type === "file" && e.name.endsWith(".json") && e.name !== "index.json")
        .map(e => e.name);
    }
  } catch (e) { /* offline and no manifest */ }
  const items = (await Promise.all(files.map(puzzleMetaFromFile))).filter(Boolean);
  return items.sort((a, b) => a.title.localeCompare(b.title));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// ---------- Play ----------

async function loadAndPlay(slug) {
  app.innerHTML = "<p>Loading…</p>";
  try {
    const res = await fetch(`puzzles/${encodeURIComponent(slug)}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error("not found");
    const raw = await res.json();
    startPlay(raw);
  } catch (e) {
    app.innerHTML = `<p>Puzzle not found. <a href="#/">Back to list</a></p>`;
  }
}

// A puzzle is multi-language if it carries a {languages} map (en/es/zh → {title,
// groups, hints}); otherwise it's a flat single-language puzzle (the legacy shape,
// and what the builder / share-links produce).
function puzzleLangs(p) { return p && p.languages ? Object.keys(p.languages) : null; }

// Collapse a (possibly multi-language) puzzle to the flat shape renderPlay/initPlay
// already understand, for the chosen language. Flat puzzles pass through unchanged.
function flattenPuzzle(raw, lang) {
  if (!raw || !raw.languages) return raw;
  const langs = Object.keys(raw.languages);
  const use = raw.languages[lang] ? lang : langs[0];
  const L = raw.languages[use];
  return {
    title: L.title || raw.title || "",
    author: raw.author || "",
    language: use,
    subject: raw.subject || "",
    grade: raw.grade || "",
    topic: raw.topic || "",
    groups: L.groups,
    hints: L.hints || {},
    socrates: L.socrates || null,   // per-puzzle cheat sheet that grounds Socrates
  };
}

// Play a puzzle, adding an in-play language toggle when it has more than one.
// Switching language re-renders from scratch (the board resets) — the word
// strings differ across languages, so a clean reset is the correct behavior.
function startPlay(raw, lang) {
  const langs = puzzleLangs(raw);
  const chosen = lang || (langs ? (langs.includes("en") ? "en" : langs[0]) : null);
  renderPlay(flattenPuzzle(raw, chosen));
  if (langs && langs.length > 1) renderLangToggle(raw, chosen);
}

function renderLangToggle(raw, currentLang) {
  const host = $("#play-langs");
  if (!host) return;
  host.hidden = false;
  host.innerHTML = puzzleLangs(raw).map(l =>
    `<button type="button" class="lang-btn${l === currentLang ? " active" : ""}" data-lang="${l}">${escapeHtml(languageLabel(l))}</button>`
  ).join("");
  host.querySelectorAll(".lang-btn").forEach(btn => {
    btn.onclick = () => { if (btn.dataset.lang !== currentLang) startPlay(raw, btn.dataset.lang); };
  });
}

function validatePuzzle(p) {
  if (!p || !Array.isArray(p.groups) || p.groups.length !== 4) return false;
  for (const g of p.groups) {
    if (!g.category || !Array.isArray(g.words) || g.words.length !== 4) return false;
  }
  return true;
}

function renderPlay(puzzle) {
  if (!validatePuzzle(puzzle)) {
    app.innerHTML = "<p>This puzzle is malformed.</p>";
    return;
  }
  renderTemplate("view-play");
  initPlay(puzzle);
}

function initPlay(puzzle) {
  if (!validatePuzzle(puzzle)) return;
  const lang = puzzle.language || "en";
  $("#play-title").textContent = puzzle.title || "Untitled";
  $("#play-author").textContent = puzzle.author ? `${t(lang, "by")} ${puzzle.author}` : "";

  // Localize static button labels and "Mistakes:" text
  $("#btn-shuffle").textContent = t(lang, "shuffle");
  $("#btn-deselect").textContent = t(lang, "deselect");
  $("#btn-submit").textContent = t(lang, "submit");
  const mistakesEl = $(".mistakes");
  if (mistakesEl) {
    mistakesEl.childNodes[0].textContent = t(lang, "mistakes") + " ";
  }

  // Hint toggle: only show if this puzzle has hints
  const hintLabel = $("#hint-toggle-label");
  const hintCheckbox = $("#toggle-hints");
  const hintText = $("#hint-toggle-text");
  const hasHints = puzzle.hints && Object.keys(puzzle.hints).length > 0;
  if (hasHints) {
    hintLabel.hidden = false;
    hintText.textContent = t(lang, "showHints");
    hintCheckbox.checked = false;   // default OFF every load — like the real game
  } else {
    hintLabel.hidden = true;
    hintCheckbox.checked = false;
  }

  // Relaxed mode toggle: always available, persisted across sessions
  $("#relax-toggle-text").textContent = t(lang, "relaxedMode");
  const relaxCheckbox = $("#toggle-relaxed");
  relaxCheckbox.checked = false;  // default OFF every load — like the real game

  const state = {
    puzzle,
    remaining: [],   // [{word, groupIndex}]
    selected: new Set(),
    solvedGroups: [], // group indices in order solved
    mistakes: 0,
    maxMistakes: 4,
    over: false,
  };

  for (let gi = 0; gi < puzzle.groups.length; gi++) {
    for (const w of puzzle.groups[gi].words) {
      state.remaining.push({ word: w.toUpperCase(), groupIndex: gi });
    }
  }
  state.remaining = shuffle(state.remaining);

  drawBoard(state);

  $("#btn-shuffle").onclick = () => {
    state.remaining = shuffle(state.remaining);
    drawBoard(state);
  };
  $("#btn-deselect").onclick = () => {
    state.selected.clear();
    drawBoard(state);
  };
  $("#btn-submit").onclick = () => submitGuess(state);

  if (hintCheckbox) {
    hintCheckbox.onchange = () => {
      localStorage.setItem("clique.hintsOn", hintCheckbox.checked ? "1" : "0");
      drawBoard(state);
    };
  }
  relaxCheckbox.onchange = () => {
    localStorage.setItem("clique.relaxedOn", relaxCheckbox.checked ? "1" : "0");
    drawBoard(state);
  };

  const askBtn = $("#btn-ask-athena");
  const athenaPanel = $("#athena-panel");
  const athenaClose = $("#btn-athena-close");
  const athenaForm = $("#athena-form");
  resetAthena(puzzle);   // fresh conversation per puzzle / language
  if (askBtn) askBtn.onclick = () => openAthena(athenaPanel);
  if (athenaClose) athenaClose.onclick = () => { athenaPanel.hidden = true; };
  if (athenaForm) athenaForm.onsubmit = (e) => { e.preventDefault(); sendAthena(state); };
}

// ---------- Socrates (gameplay chat) ----------

const ATHENA_CHAT_SYSTEM = `
You are Socrates, a warm thinking partner sitting beside a student playing a Connections-style word puzzle (16 words hide 4 groups of 4). The student ASKS you questions — answer their actual question, conversationally and kindly.
NEVER reveal the solution: never name a category, never say which words belong together, never confirm or deny a specific grouping. If they ask for the answer, gently turn it back into a question that helps them notice it themselves.
Keep replies short — 1 to 3 sentences. Curious and friendly, never preachy. Reply with just your message.
`.trim();

let athenaThread = [];          // [{ who: 'you' | 'socrates', text }]
let athenaPuzzleTitle = "";
let athenaLang = "en";

function resetAthena(puzzle) {
  athenaThread = [];
  athenaPuzzleTitle = puzzle.title || "this";
  athenaLang = puzzle.language || "en";
  const body = $("#athena-panel-body");
  if (body) body.innerHTML = "";
}

function renderAthenaThread() {
  const body = $("#athena-panel-body");
  if (!body) return;
  body.innerHTML = athenaThread
    .map(m => `<div class="athena-msg ${m.who}">${escapeHtml(m.text)}</div>`)
    .join("");
  body.scrollTop = body.scrollHeight;
}

function athenaGreeting() {
  if (athenaLang === "es") return `¡Hola! Veo que estás explorando «${athenaPuzzleTitle}». ¿Qué preguntas tienes?`;
  if (athenaLang === "zh") return `你好！我看到你在玩“${athenaPuzzleTitle}”。你有什么问题吗？`;
  return `Hello! I see you're exploring the ${athenaPuzzleTitle} puzzle. What questions do you have?`;
}

// Open the panel; greet on first open, then let the student type questions.
function openAthena(panel) {
  panel.hidden = false;
  if (athenaThread.length === 0) {
    athenaThread.push({ who: "socrates", text: athenaGreeting() });
    renderAthenaThread();
  }
  const input = $("#athena-input");
  if (input) input.focus();
}

async function sendAthena(state) {
  const input = $("#athena-input");
  const q = (input && input.value || "").trim();
  if (!q) return;
  input.value = "";
  athenaThread.push({ who: "you", text: q });
  renderAthenaThread();

  const provider = resolveActiveProvider();
  if (!provider) {
    athenaThread.push({ who: "socrates", text: "Pick a model first — click 🤖 AI Setup in the top nav." });
    renderAthenaThread();
    return;
  }
  athenaThread.push({ who: "socrates", text: "…" });
  renderAthenaThread();

  const remaining = state.remaining.map(r => r.word);
  const selected = Array.from(state.selected);
  let ctx = `The 16 words on the board right now: ${remaining.join(", ")}.`;
  if (selected.length) ctx += `\nThe student has highlighted: ${selected.join(", ")}.`;
  const history = athenaThread
    .filter(m => m.text !== "…")
    .map(m => (m.who === "you" ? "Student" : "Socrates") + ": " + m.text)
    .join("\n");
  const prompt = `${ctx}\n\nConversation so far:\n${history}\n\nReply as Socrates to the student's latest message. Never reveal which words go together or name a category.`;

  // Ground Socrates with THIS puzzle's private cheat sheet (never revealed).
  const sheet = state.puzzle.socrates;
  let grounding = "";
  if (sheet) {
    grounding = "\n\nYOUR PRIVATE CHEAT SHEET for this puzzle — use it to ask good questions and talk about the words with real depth, but NEVER reveal it: never name a group, never say which words go together.";
    if (sheet.overview) grounding += "\nOverview: " + sheet.overview;
    if (sheet.words) grounding += "\nWord notes:\n" + Object.entries(sheet.words).map(([w, n]) => `• ${w}: ${n}`).join("\n");
  }

  try {
    const text = await provider.generate({ prompt, systemMessage: ATHENA_CHAT_SYSTEM + grounding, jsonMode: false });
    athenaThread.pop();
    athenaThread.push({ who: "socrates", text: text || "(no response)" });
  } catch (e) {
    athenaThread.pop();
    athenaThread.push({ who: "socrates", text: `Couldn't reach ${provider.label}. ${e.message || e}` });
  }
  renderAthenaThread();
}

function drawBoard(state) {
  const grid = $("#grid");
  const solved = $("#solved");
  grid.innerHTML = "";
  solved.innerHTML = "";

  for (const gi of state.solvedGroups) {
    const g = state.puzzle.groups[gi];
    const row = document.createElement("div");
    row.className = "solved-row " + DIFFICULTIES[gi] + (state.puzzle.pictograph ? " pictograph" : "");
    const wordsHTML = state.puzzle.pictograph
      ? g.words.map(w => escapeHtml(w)).join(" ")
      : g.words.map(w => escapeHtml(w.toUpperCase())).join(", ");
    row.innerHTML = `<div class="cat">${escapeHtml(g.category)}</div><div class="words">${wordsHTML}</div>`;
    solved.appendChild(row);
  }

  const hintsOn = $("#toggle-hints")?.checked && state.puzzle.hints;
  const isPictograph = !!state.puzzle.pictograph;
  for (const item of state.remaining) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile"
      + (state.selected.has(item.word) ? " selected" : "")
      + (isPictograph ? " pictograph" : "");
    btn.textContent = item.word;
    btn.disabled = state.over;
    if (hintsOn) {
      const hint = state.puzzle.hints[item.word];
      if (hint) {
        btn.classList.add("with-hint");
        btn.dataset.hint = hint;
      }
    }
    btn.onclick = () => {
      if (state.over) return;
      if (state.selected.has(item.word)) {
        state.selected.delete(item.word);
      } else {
        if (state.selected.size >= 4) return;
        state.selected.add(item.word);
      }
      drawBoard(state);
    };
    grid.appendChild(btn);
  }

  $("#btn-submit").disabled = state.selected.size !== 4 || state.over;
  // Hide the mistakes counter entirely in relaxed mode — no anxiety from a ticking dial.
  const relaxed = $("#toggle-relaxed")?.checked;
  const mistakesEl = $(".mistakes");
  if (mistakesEl) mistakesEl.style.visibility = relaxed ? "hidden" : "";
  drawMistakes(state);
}

// The challenge loop: every solved puzzle is an invitation to author one back.
// Carries the original author's name into the guided wizard.
function showMakeOneBack(state) {
  const msg = $("#message");
  if (!msg || $(".make-back")) return;
  const author = (state.puzzle.author || "").trim();
  const fromParam = author
    ? "/from/" + encodeURIComponent(btoa(unescape(encodeURIComponent(author))))
    : "";
  const cta = document.createElement("div");
  cta.className = "make-back";
  cta.innerHTML = `<a class="make-back-link" href="#/create${fromParam}">🎯 Now make one back →</a>`;
  msg.after(cta);
}

function drawMistakes(state) {
  const dots = $("#mistakes-dots");
  dots.innerHTML = "";
  for (let i = 0; i < state.maxMistakes; i++) {
    const d = document.createElement("span");
    d.className = "dot" + (i < state.mistakes ? " gone" : "");
    dots.appendChild(d);
  }
}

function submitGuess(state) {
  const lang = state.puzzle.language || "en";
  const picks = [...state.selected];
  const items = state.remaining.filter(r => picks.includes(r.word));
  const counts = {};
  for (const it of items) counts[it.groupIndex] = (counts[it.groupIndex] || 0) + 1;
  const groupIndex = items[0].groupIndex;
  const allSame = items.every(it => it.groupIndex === groupIndex);

  if (allSame) {
    // correct
    state.solvedGroups.push(groupIndex);
    state.remaining = state.remaining.filter(r => r.groupIndex !== groupIndex);
    state.selected.clear();
    drawBoard(state);
    if (state.solvedGroups.length === 4) {
      state.over = true;
      setMessage(t(lang, "solved", state.mistakes), "win");
      showMakeOneBack(state);
    } else {
      setMessage(t(lang, "nice"), "win");
    }
    return;
  }

  const relaxed = $("#toggle-relaxed")?.checked;
  if (!relaxed) state.mistakes++;
  const max = Math.max(...Object.values(counts));
  $$(".tile").forEach(t => {
    if (state.selected.has(t.textContent)) t.classList.add("shake");
  });
  setTimeout(() => $$(".tile.shake").forEach(t => t.classList.remove("shake")), 450);

  if (!relaxed && state.mistakes >= state.maxMistakes) {
    state.over = true;
    // reveal remaining
    const remainingGroups = [0,1,2,3].filter(gi => !state.solvedGroups.includes(gi));
    state.solvedGroups.push(...remainingGroups);
    state.remaining = [];
    drawBoard(state);
    setMessage(t(lang, "outOfGuesses"), "lose");
  } else if (max === 3) {
    setMessage(t(lang, "oneAway"), "hint");
    drawMistakes(state);
  } else {
    setMessage(t(lang, "notQuite"), "hint");
    drawMistakes(state);
  }
}

// ---------- Build ----------

function renderBuild() {
  renderTemplate("view-build");
  // Populate metadata selects
  fillSelect($("select[name=language]"), [{ value: "", label: "Choose…" }, ...LANGUAGES.map(l => ({ value: l.code, label: l.label }))]);
  fillSelect($("select[name=subject]"),  [{ value: "", label: "Choose…" }, ...SUBJECTS.map(s => ({ value: s, label: s }))]);
  fillSelect($("select[name=grade]"),    [{ value: "", label: "Choose…" }, ...GRADES.map(g => ({ value: g, label: `Grades ${g}` }))]);
  fillSelect($("select[name=topic]"),    [{ value: "", label: "Choose…" }, ...TOPICS.map(t => ({ value: t.id, label: t.label }))]);
  $("#btn-ai-generate").onclick = () => openGenerateDialog();
  $("#btn-preview").onclick = () => {
    const p = readForm();
    if (!p) return;
    renderPlay(p);
  };
  $("#btn-share").onclick = () => {
    const p = readForm();
    if (!p) return;
    const url = sharableLink(p);
    const out = $("#build-output");
    out.innerHTML = `
      <h3>🔗 Share this link</h3>
      <p>Copy the link below and send it to anyone you want to play your puzzle — over email, Classroom, text, whatever. The whole puzzle is encoded in the URL, so no account or upload is needed.</p>
      <div class="link-row">
        <input type="text" id="share-link-input" value="${escapeHtml(url)}" readonly>
        <button type="button" id="copy-link" class="primary">Copy</button>
      </div>
      <p class="muted">Heads up: the answer is encoded in the URL, so a curious player with developer tools could decode it.</p>
    `;
    const input = $("#share-link-input");
    input.focus();
    input.select();
    $("#copy-link").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        $("#copy-link").textContent = "Copied ✓";
        setTimeout(() => { $("#copy-link").textContent = "Copy"; }, 1500);
      } catch (e) {
        input.select();
        document.execCommand("copy");
      }
    };
  };
  $("#btn-download").onclick = () => {
    const p = readForm();
    if (!p) return;
    const slug = slugify(p.title);
    const content = JSON.stringify(p, null, 2) + "\n";
    const blob = new Blob([content], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    const out = $("#build-output");
    out.innerHTML = `
      <h3>💾 Saved!</h3>
      <p>Your puzzle was downloaded as <code>${escapeHtml(slug)}.json</code>. Keep it safe and bring it back another day, or share the file with friends.</p>
    `;
  };
}

function readForm() {
  const f = $("#build-form");
  if (!f.reportValidity()) return null;
  const fd = new FormData(f);
  const groups = [];
  for (let gi = 0; gi < 4; gi++) {
    groups.push({
      category: String(fd.get(`cat${gi}`)).trim(),
      difficulty: DIFFICULTIES[gi],
      words: [0,1,2,3].map(wi => String(fd.get(`w${gi}_${wi}`)).trim().toUpperCase()),
    });
  }
  // Check for duplicate or empty words across the whole puzzle
  const all = groups.flatMap(g => g.words);
  $$('#build-form input.dup-bad').forEach(el => el.classList.remove('dup-bad'));
  const dup = all.find((w, i) => w && all.indexOf(w) !== i);
  if (dup) {
    // Highlight every cell containing the dup word
    $$("#build-form input").forEach(el => {
      if (el.value.trim().toUpperCase() === dup) el.classList.add('dup-bad');
    });
    alert(`"${dup}" appears more than once. Each word in the puzzle must be unique — the duplicates are highlighted in red.`);
    return null;
  }
  if (all.some(w => !w)) {
    alert("Every word slot must be filled before submitting.");
    return null;
  }
  return {
    title: String(fd.get("title")).trim(),
    author: String(fd.get("author") || "").trim(),
    language: String(fd.get("language") || "").trim(),
    subject: String(fd.get("subject") || "").trim(),
    grade: String(fd.get("grade") || "").trim(),
    topic: String(fd.get("topic") || "").trim(),
    groups,
  };
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "puzzle";
}

function sharableLink(puzzle) {
  const json = JSON.stringify(puzzle);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `${location.origin}${location.pathname}#/play/inline/${encodeURIComponent(b64)}`;
}

// ---------- Guided Create (scaffolded authoring) ----------
// A staged wrapper over the same puzzle model the Build form uses, with coaching at
// each decision. The scaffold is meant to *fade*: "Switch to free build" jumps to
// #/build for students who've outgrown it. See docs/authoring-scaffold-design.md.

const CREATE_GROUPS = [
  { difficulty: "yellow", color: "Yellow", title: "the easy group",
    coach: "Start easy. Four things that <strong>obviously</strong> belong together — a solver should get this one in seconds.",
    example: "PLANETS → MERCURY, VENUS, EARTH, MARS" },
  { difficulty: "green", color: "Green", title: "a little harder",
    coach: "Still common knowledge, but it takes a beat to see the link.",
    example: "SHADES OF BLUE → NAVY, TEAL, COBALT, AZURE" },
  { difficulty: "blue", color: "Blue", title: "now it's tricky",
    coach: "A more nuanced connection — solvers should hesitate before they commit.",
    example: "___ BOARD → KEY, SURF, CARD, DASH" },
  { difficulty: "purple", color: "Purple", title: "the cleverest one",
    coach: "Wordplay, double meanings, or a hidden pattern. This is where the <em>“ohhh”</em> lives.",
    example: "Words that precede CELL → PRISON, BLOOD, SOLAR, FUEL" },
];
// Steps: 0 = setup, 1..4 = the four groups, 5 = distractors, 6 = playtest.
const CREATE_STEP = { SETUP: 0, DISTRACTORS: 5, PLAYTEST: 6 };
const CREATE_TOTAL = 7;
// Difficulty rises with the number of authored distractors (plausible wrong groupings).
const DIFFICULTY_LABELS = ["Gentle", "Easy", "Medium", "Hard", "Devious (two solutions!)"];

let createState = null;

function blankCreateState() {
  return {
    step: 0,
    title: "", author: "", theme: "",
    language: "en", subject: "", grade: "",
    challengeFrom: "",
    groups: CREATE_GROUPS.map(g => ({ category: "", difficulty: g.difficulty, words: ["", "", "", ""] })),
    numDistractors: 0,
    distractors: [],   // [{ label, words: [4 words drawn from the 16, pool-depleted] }]
  };
}

function renderCreate(hash = "") {
  renderTemplate("view-create");
  // "Make one back" arrives as #/create/from/<b64 name> — carry the challenger through.
  let from = "";
  const m = hash.match(/^#\/create\/from\/(.+)$/);
  if (m) { try { from = decodeURIComponent(escape(atob(decodeURIComponent(m[1])))); } catch (e) { /* ignore */ } }
  createState = blankCreateState();
  if (from) createState.challengeFrom = from;
  renderCreateStep();
}

function renderCreateStep() {
  const s = createState;
  const stage = $("#create-stage");
  $("#create-step-label").textContent = `Step ${s.step + 1} of ${CREATE_TOTAL}`;
  if (s.step === CREATE_STEP.SETUP) stage.innerHTML = createSetupHTML(s);
  else if (s.step >= 1 && s.step <= CREATE_GROUPS.length) stage.innerHTML = createGroupHTML(s, s.step - 1);
  else if (s.step === CREATE_STEP.DISTRACTORS) stage.innerHTML = createDistractorsHTML(s);
  else stage.innerHTML = createPlaytestHTML(s);
  wireCreateStep();
}

function createFooterHTML({ back, nextLabel }) {
  return `<div class="create-footer">
    ${back ? '<button type="button" id="c-back">← Back</button>' : "<span></span>"}
    ${nextLabel ? `<button type="button" id="c-next" class="primary">${escapeHtml(nextLabel)}</button>` : "<span></span>"}
  </div>`;
}

function createSetupHTML(s) {
  const langOpts = LANGUAGES.map(l => `<option value="${l.code}" ${s.language === l.code ? "selected" : ""}>${l.label}</option>`).join("");
  const subjOpts = ['<option value="">Choose…</option>', ...SUBJECTS.map(x => `<option ${s.subject === x ? "selected" : ""}>${x}</option>`)].join("");
  const gradeOpts = ['<option value="">Choose…</option>', ...GRADES.map(g => `<option value="${g}" ${s.grade === g ? "selected" : ""}>Grades ${g}</option>`)].join("");
  const intro = s.challengeFrom
    ? `<p class="create-coach create-challenge">🎯 <strong>${escapeHtml(s.challengeFrom)}</strong> challenged you — now make one back!</p>`
    : "";
  return `
    ${intro}
    <p class="create-coach">A great puzzle is <strong>four neighborhoods in one city</strong> — one theme, four groups that almost overlap. Start by naming the world your puzzle lives in.</p>
    <label class="create-field">Theme / world
      <input id="c-theme" maxlength="60" placeholder="the ocean · fractions · verbs · the 1990s" value="${escapeHtml(s.theme)}">
    </label>
    <label class="create-field">Puzzle title
      <input id="c-title" maxlength="80" placeholder="My Awesome Puzzle" value="${escapeHtml(s.title)}">
    </label>
    <div class="meta-row">
      <label>Language <select id="c-language">${langOpts}</select></label>
      <label>Subject <select id="c-subject">${subjOpts}</select></label>
      <label>Grade <select id="c-grade">${gradeOpts}</select></label>
    </div>
    <label class="create-field">Your name (optional)
      <input id="c-author" maxlength="40" placeholder="Author" value="${escapeHtml(s.author)}">
    </label>
    <div id="c-error" class="create-error" aria-live="polite"></div>
    ${createFooterHTML({ back: false, nextLabel: "Start building →" })}
  `;
}

function createGroupHTML(s, gi) {
  const g = s.groups[gi];
  const meta = CREATE_GROUPS[gi];
  const wordInputs = g.words.map((w, i) =>
    `<input class="c-word" data-i="${i}" maxlength="20" placeholder="word ${i + 1}" value="${escapeHtml(w)}">`).join("");
  return `
    <div class="create-group-head g-${meta.difficulty}">
      <span class="create-chip c-${meta.difficulty}">${meta.color}</span>
      <span class="create-group-title">${escapeHtml(meta.title)}</span>
    </div>
    <p class="create-coach">${meta.coach}</p>
    <p class="create-example"><span>e.g.</span> ${escapeHtml(meta.example)}</p>
    <label class="create-field">Category — what connects these four?
      <input id="c-cat" maxlength="60" placeholder="The hidden link" value="${escapeHtml(g.category)}">
    </label>
    <div class="words c-words">${wordInputs}</div>
    <div id="c-error" class="create-error" aria-live="polite"></div>
    ${createFooterHTML({ back: true, nextLabel: gi === CREATE_GROUPS.length - 1 ? "Next: the trap →" : "Next group →" })}
  `;
}

// ---- Distractors: authored plausible-but-wrong groupings ----
// Difficulty = how many dead ends a solver might try first. Each distractor draws 4
// words from the puzzle's own 16, pool-depleted across all distractors — so 4 full
// distractors consume all 16 and the puzzle secretly carries a whole second partition.

function solutionPool(s) {
  return s.groups.flatMap(g => g.words.map(w => w.trim().toUpperCase()).filter(Boolean));
}

// Words already spoken-for by distractor cells, optionally ignoring one cell (so that
// cell's own current value still appears as a selectable option in its dropdown).
function distractorWordsUsed(s, exceptDi = -1, exceptWi = -1) {
  const used = new Set();
  s.distractors.forEach((d, di) => d.words.forEach((w, wi) => {
    if (di === exceptDi && wi === exceptWi) return;
    if (w) used.add(w.toUpperCase());
  }));
  return used;
}

function setNumDistractors(s, k) {
  s.numDistractors = k;
  const cur = s.distractors;
  s.distractors = Array.from({ length: k }, (_, i) => cur[i] || { label: "", words: ["", "", "", ""] });
}

function readDistractorsFromDom(s) {
  $$(".dx-label").forEach(inp => { const di = +inp.dataset.di; if (s.distractors[di]) s.distractors[di].label = inp.value; });
  $$(".dx-word").forEach(sel => { const di = +sel.dataset.di, wi = +sel.dataset.wi; if (s.distractors[di]) s.distractors[di].words[wi] = sel.value; });
}

function createDistractorsHTML(s) {
  const pool = solutionPool(s);
  const used = distractorWordsUsed(s);

  const left = s.groups.map((g, gi) => {
    const meta = CREATE_GROUPS[gi];
    return `<div class="dx-sol g-${meta.difficulty}">
      <div class="dx-sol-cat"><span class="create-chip c-${meta.difficulty}">${meta.color}</span> ${escapeHtml(g.category || "—")}</div>
      <div class="dx-sol-words">${g.words.map(w => escapeHtml(w.toUpperCase())).join(" · ")}</div>
    </div>`;
  }).join("");

  const kButtons = [0, 1, 2, 3, 4].map(k =>
    `<button type="button" class="dx-k ${s.numDistractors === k ? "is-on" : ""}" data-k="${k}">${k}</button>`).join("");

  const cells = s.distractors.map((d, di) => {
    const selects = d.words.map((w, wi) => {
      const avail = pool.filter(p => !distractorWordsUsed(s, di, wi).has(p));
      const opts = ['<option value="">—</option>',
        ...avail.map(p => `<option ${p === w.toUpperCase() ? "selected" : ""}>${escapeHtml(p)}</option>`)].join("");
      return `<select class="dx-word" data-di="${di}" data-wi="${wi}">${opts}</select>`;
    }).join("");
    return `<div class="dx-cell">
      <input class="dx-label" data-di="${di}" maxlength="40" placeholder="False theme (optional) — what makes it tempting?" value="${escapeHtml(d.label || "")}">
      <div class="dx-selects">${selects}</div>
    </div>`;
  }).join("");

  const poolLeft = pool.length - used.size;
  const rightInner = cells || '<p class="create-sub">Pick a number above to start adding traps — or leave it at 0 for a gentle puzzle.</p>';
  return `
    <p class="create-coach">Now the real craft: <strong>distractors</strong> — plausible <em>wrong</em> groupings hiding in your 16 words. Each one is a dead end a solver tries first. <strong>More distractors = harder puzzle.</strong></p>
    <p class="create-sub">Build each trap from your own words. A word can sit in at most one trap, so four full traps means your puzzle secretly has <em>two</em> solutions.</p>
    <div class="dx-kpick">How many distractors? <span class="dx-kbtns">${kButtons}</span>
      <span class="dx-diff">Difficulty: <strong>${DIFFICULTY_LABELS[s.numDistractors] || DIFFICULTY_LABELS[0]}</strong></span>
    </div>
    <div class="dx-cols">
      <div class="dx-left"><div class="dx-coltitle">Solution</div>${left}</div>
      <div class="dx-right">
        <div class="dx-coltitle">Distractors <span class="dx-pool">pool left: ${poolLeft}/16</span></div>
        ${rightInner}
      </div>
    </div>
    <div id="c-error" class="create-error" aria-live="polite"></div>
    ${createFooterHTML({ back: true, nextLabel: "Playtest it →" })}
  `;
}

function createPlaytestHTML(s) {
  return `
    <p class="create-coach">Time to test it. Play your puzzle the way a friend will — it opens in a new tab so you don't lose your work.</p>
    <ul class="create-checklist">
      <li>Flew through it? Too easy — add a trap or a trickier purple.</li>
      <li>Couldn't solve it? A category may be too obscure — loosen it.</li>
      <li>A couple of “one away” near-misses before you crack it = just right.</li>
    </ul>
    <div class="buttons">
      <button type="button" id="c-playtest" class="primary">▶ Playtest in new tab</button>
      <button type="button" id="c-getlink">🎯 Get challenge link</button>
    </div>
    <div id="c-out" class="build-output"></div>
    ${createFooterHTML({ back: true, nextLabel: "" })}
  `;
}

function wireCreateStep() {
  const s = createState;
  const back = $("#c-back");
  if (back) back.onclick = () => { readStepInto(s); s.step--; renderCreateStep(); };
  const next = $("#c-next");
  if (next) next.onclick = () => {
    const err = readStepInto(s);
    if (err) { const e = $("#c-error"); if (e) e.textContent = err; return; }
    s.step++; renderCreateStep();
  };
  $$(".dx-k").forEach(b => b.onclick = () => {
    readDistractorsFromDom(s);
    setNumDistractors(s, +b.dataset.k);
    renderCreateStep();
  });
  $$(".dx-word").forEach(sel => sel.onchange = () => {
    readDistractorsFromDom(s);
    renderCreateStep();   // re-render so the depleting pool updates every other dropdown
  });
  $$(".dx-label").forEach(inp => inp.oninput = () => {
    const di = +inp.dataset.di;
    if (s.distractors[di]) s.distractors[di].label = inp.value;
  });
  const pt = $("#c-playtest");
  if (pt) pt.onclick = () => {
    const err = validateFullPuzzle(createStateToPuzzle(s));
    const out = $("#c-out");
    if (err) { out.innerHTML = `<p class="create-error">${escapeHtml(err)}</p>`; return; }
    window.open(sharableLink(createStateToPuzzle(s)), "_blank");
  };
  const gl = $("#c-getlink");
  if (gl) gl.onclick = () => showCreateShare(s);
}

// Read the current step's inputs into state. Returns an error string for steps that
// gate forward navigation (setup, group steps); "" when the step is valid or has
// nothing to validate.
function readStepInto(s) {
  if (s.step === CREATE_STEP.SETUP) {
    s.theme = ($("#c-theme")?.value || "").trim();
    s.title = ($("#c-title")?.value || "").trim();
    s.author = ($("#c-author")?.value || "").trim();
    s.language = $("#c-language")?.value || s.language;
    s.subject = $("#c-subject")?.value || "";
    s.grade = $("#c-grade")?.value || "";
    if (!s.title && !s.theme) return "Give your puzzle a theme or a title to start.";
    return "";
  }
  if (s.step >= 1 && s.step <= CREATE_GROUPS.length) {
    const gi = s.step - 1;
    const g = s.groups[gi];
    g.category = ($("#c-cat")?.value || "").trim();
    $$(".c-word").forEach(inp => { g.words[+inp.dataset.i] = inp.value.trim(); });
    if (!g.category) return "Give this group a category name.";
    const upper = g.words.map(w => w.trim().toUpperCase());
    if (upper.some(w => !w)) return "Fill in all four words.";
    if (new Set(upper).size !== 4) return "Each word in this group must be different.";
    const others = s.groups.flatMap((gg, j) => j === gi ? [] : gg.words.map(w => w.trim().toUpperCase()).filter(Boolean));
    const clash = upper.find(w => others.includes(w));
    if (clash) return `“${clash}” is already in another group — every word must be unique across the puzzle.`;
    return "";
  }
  if (s.step === CREATE_STEP.DISTRACTORS) {
    readDistractorsFromDom(s);
    for (let di = 0; di < s.distractors.length; di++) {
      const words = s.distractors[di].words.map(w => w.trim().toUpperCase());
      if (words.some(w => !w)) return `Distractor ${di + 1} needs all four words — or lower the count.`;
      if (new Set(words).size !== 4) return `Distractor ${di + 1} repeats a word.`;
      const setW = new Set(words);
      if (s.groups.some(g => g.words.every(w => setW.has(w.trim().toUpperCase()))))
        return `Distractor ${di + 1} is just a real group — a trap has to be a *wrong* grouping.`;
    }
    return "";
  }
  return "";
}

function createStateToPuzzle(s) {
  const puzzle = {
    title: s.title.trim() || s.theme.trim() || "Untitled",
    author: s.author.trim(),
    language: s.language,
    subject: s.subject,
    grade: s.grade,
    topic: "",
    groups: s.groups.map(g => ({
      category: g.category.trim(),
      difficulty: g.difficulty,
      words: g.words.map(w => w.trim().toUpperCase()),
    })),
  };
  if (s.challengeFrom) puzzle.challengeFrom = s.challengeFrom;
  const ds = (s.distractors || [])
    .filter(d => d.words.every(w => w.trim()))
    .map(d => ({ label: (d.label || "").trim(), words: d.words.map(w => w.trim().toUpperCase()) }));
  if (ds.length) puzzle.distractors = ds;
  return puzzle;
}

function validateFullPuzzle(p) {
  if (!p.groups || p.groups.length !== 4) return "The puzzle needs all four groups.";
  const all = [];
  for (const g of p.groups) {
    if (!g.category) return "Every group needs a category name — go back and finish the empty one.";
    if (!g.words || g.words.length !== 4 || g.words.some(w => !w)) return "Every group needs four words.";
    all.push(...g.words.map(w => w.toUpperCase()));
  }
  if (new Set(all).size !== 16) return "All 16 words must be unique.";
  return "";
}

function showCreateShare(s) {
  const p = createStateToPuzzle(s);
  const out = $("#c-out");
  const err = validateFullPuzzle(p);
  if (err) { out.innerHTML = `<p class="create-error">${escapeHtml(err)}</p>`; return; }
  const url = sharableLink(p);
  out.innerHTML = `
    <h3>🎯 Your challenge link</h3>
    <p>Send it to a friend. The whole puzzle rides in the link — no account, no upload.</p>
    <div class="link-row">
      <input type="text" id="c-share-input" readonly value="${escapeHtml(url)}">
      <button type="button" id="c-copy" class="primary">Copy</button>
    </div>`;
  const input = $("#c-share-input");
  input.focus();
  input.select();
  $("#c-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      $("#c-copy").textContent = "Copied ✓";
      setTimeout(() => { $("#c-copy").textContent = "Copy"; }, 1500);
    } catch (e) {
      input.select();
      document.execCommand("copy");
    }
  };
}

function renderTips() {
  renderTemplate("view-tips");
}

// ---------- About ----------

function renderAbout() {
  renderTemplate("view-about");
  const link = $("#repo-link");
  if (link) link.href = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
}

// ---------- AI Setup (orbit-explorer-style modal, Clique palette) ----------
//
// Three cloud providers + dynamically-discovered local OpenAI-compatible
// endpoints (configured by the user via the modal — no URLs hardcoded).
// One globally-selected provider is used everywhere (Build/Generate, Ask Socrates).

const AI_STORAGE = {
  provider:   "clique.ai.provider",
  key:        (id) => `clique.ai.key.${id}`,
  endpoints:  "clique.ai.localEndpoints",
};

const AI_CLOUD_PROVIDERS = [
  {
    id: "anthropic", label: "Anthropic Claude",
    desc: "Your own key. Claude Sonnet — powerful and precise.",
    badge: "Own Key", badgeClass: "ai-badge-paid",
    placeholder: "sk-ant-…",
    keyHint: 'Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Stored only in your browser.',
  },
  {
    id: "gemini", label: "Gemini 2.0 Flash",
    desc: "Free tier via Google. Use a personal Gmail account.",
    badge: "Free", badgeClass: "ai-badge-free",
    placeholder: "AIza…",
    keyHint: 'Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a> for a free key — <strong>use a personal Gmail, not a school account</strong>. Stored in your browser only.',
  },
  {
    id: "groq", label: "Groq (Llama 3.3)",
    desc: "Free tier. Any email — no Google account needed.",
    badge: "Free", badgeClass: "ai-badge-free",
    placeholder: "gsk_…",
    keyHint: 'Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> for a free key — any email works. Stored in your browser only.',
  },
];

// _runtimeProviderOverride lets the boot-time health check disable a saved
// local provider for THIS SESSION without clearing the user's localStorage
// preference. If a local server isn't reachable at startup, present an
// honest "AI: Off" state. When the user reopens AI Setup later, the
// discovery probe finds the server (if it's now up) and they can re-select
// with one click. Cleared whenever setStoredProvider() is called (explicit
// user choice).
let _runtimeProviderOverride = null;
function getStoredProvider() {
  if (_runtimeProviderOverride !== null) return _runtimeProviderOverride;
  return localStorage.getItem(AI_STORAGE.provider) || "none";
}
function setStoredProvider(id) {
  _runtimeProviderOverride = null;
  localStorage.setItem(AI_STORAGE.provider, id);
  refreshHeaderIndicator();
}

// Probe the saved local provider once at boot. If unreachable, override to
// 'none' for the session (without touching localStorage).
async function verifySavedLocalProvider() {
  const stored = localStorage.getItem(AI_STORAGE.provider) || "none";
  const parsed = parseLocalProvider(stored);
  if (!parsed) return;
  const url = parsed.endpoint.replace(/\/+$/, "") + "/v1/models";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error(`${res.status}`);
  } catch {
    _runtimeProviderOverride = "none";
    refreshHeaderIndicator();
  }
}
function getStoredKey(id)           { return localStorage.getItem(AI_STORAGE.key(id)) || ""; }
function setStoredKey(id, key) {
  if (key) localStorage.setItem(AI_STORAGE.key(id), key);
  else     localStorage.removeItem(AI_STORAGE.key(id));
}
function getStoredLocalEndpoints() {
  try {
    const arr = JSON.parse(localStorage.getItem(AI_STORAGE.endpoints) || "[]");
    // Filter out any garbage (e.g., someone pasted an API key here once)
    return arr.filter(u => /^https?:\/\//i.test(String(u)));
  } catch { return []; }
}
function setStoredLocalEndpoints(arr) {
  localStorage.setItem(AI_STORAGE.endpoints, JSON.stringify(arr));
}

// "local:<endpoint>:<modelId>" — endpoint is a URL (with optional :port), modelId may itself
// contain colons (e.g. Ollama's "gemma3:27b"). Split on the FIRST colon after the host[:port].
function parseLocalProvider(id) {
  if (!id || !id.startsWith("local:")) return null;
  const rest = id.slice("local:".length);
  const m = rest.match(/^(https?:\/\/[^:/]+(?::\d+)?)(?::(.+))?$/);
  if (!m || !m[2]) return null;
  return { endpoint: m[1], modelId: m[2] };
}

// Embedding models can't do chat completions; filter them out of selectable tiles.
function isEmbeddingModel(id) {
  return /(^|[\/:_-])embed(ding)?($|[\/:_-])|nomic-embed|mxbai-embed|bge-/i.test(String(id));
}

// "gemma3:27b" -> "Gemma 3 · 27B"; "qwen2.5-coder:7b" -> "Qwen 2.5 Coder · 7B"; otherwise original.
function prettyModelLabel(id) {
  const s = String(id);
  const m = s.match(/^([a-z][a-z0-9.\-]*?)[:\-]([0-9]+(?:\.[0-9]+)?[bm])$/i);
  if (!m) return s;
  const family = m[1]
    .replace(/(\d)/, " $1")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
  return `${family} · ${m[2].toUpperCase()}`;
}

function shortModelLabel(id) {
  return prettyModelLabel(id);
}

// In-memory cache of models discovered per endpoint: { [url]: [{id,label}, ...] }
const localModelsByEndpoint = {};

// Well-known ports for popular local LLM servers. Probed on modal open so users
// running these don't have to type a URL. The user still chooses — the result is
// surfaced as a one-click suggestion tile, not auto-saved.
const WELL_KNOWN_LOCAL_PORTS = [
  { url: "http://127.0.0.1:8765",  hint: "Athena / OpenAI-compatible shim" },
  { url: "http://127.0.0.1:11434", hint: "Ollama" },
  { url: "http://127.0.0.1:1234",  hint: "LM Studio" },
];

// Suggestions discovered this session: [{url, hint, models: [{id,label}]}]
let _suggestedLocalServers = [];

async function discoverModelsAt(url) {
  const trimmed = url.replace(/\/+$/, "");
  const probe = `${trimmed}/v1/models`;
  try {
    const res = await fetch(probe, { method: "GET" });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const models = (data.data || [])
      .filter(m => m?.id && !isEmbeddingModel(m.id))
      .map(m => ({
        id: String(m.id),
        label: prettyModelLabel(m.id),
      }));
    localModelsByEndpoint[url] = models;
    return models;
  } catch (e) {
    localModelsByEndpoint[url] = [];
    return [];
  }
}

async function refreshAllLocalModels() {
  const endpoints = getStoredLocalEndpoints();
  await Promise.all(endpoints.map(discoverModelsAt));
}

// Probe each well-known port (skipping those the user already saved) and
// populate _suggestedLocalServers with whatever responds. Re-renders on completion.
async function probeWellKnownLocalServers() {
  const saved = new Set(getStoredLocalEndpoints());
  const candidates = WELL_KNOWN_LOCAL_PORTS.filter(c => !saved.has(c.url));
  const settled = await Promise.all(candidates.map(async (c) => {
    try {
      const res = await fetch(`${c.url}/v1/models`, { method: "GET", signal: AbortSignal.timeout(1500) });
      if (!res.ok) return null;
      const data = await res.json();
      const models = (data.data || [])
        .filter(m => m?.id && !isEmbeddingModel(m.id))
        .map(m => ({ id: String(m.id), label: prettyModelLabel(m.id) }));
      if (!models.length) return null;
      return { url: c.url, hint: c.hint, models };
    } catch { return null; }
  }));
  _suggestedLocalServers = settled.filter(Boolean);
  renderProviderCards();
}

// Resolve the currently-selected provider to something with .generate({prompt,systemMessage,jsonMode}) and .label
function resolveActiveProvider() {
  const id = getStoredProvider();
  if (!id || id === "none") return null;
  const local = parseLocalProvider(id);
  if (local) {
    const trimmed = local.endpoint.replace(/\/+$/, "");
    return {
      label: prettyModelLabel(local.modelId),
      generate: ({ prompt, systemMessage, jsonMode }) => callOpenAICompatible({
        url: `${trimmed}/v1/chat/completions`,
        key: "local",
        model: local.modelId,
        prompt, systemMessage, jsonMode,
      }),
    };
  }
  const cloud = AI_CLOUD_PROVIDERS.find(p => p.id === id);
  if (!cloud) return null;
  const key = getStoredKey(cloud.id);
  if (!key) return null;
  return {
    label: cloud.label,
    generate: ({ prompt, systemMessage, jsonMode }) => {
      if (cloud.id === "anthropic") return callAnthropic({ key, model: "claude-sonnet-4-6", prompt, systemMessage });
      if (cloud.id === "gemini")    return callGemini({ key, model: "gemini-2.0-flash", prompt, systemMessage, jsonMode });
      if (cloud.id === "groq")      return callOpenAICompatible({
        url: "https://api.groq.com/openai/v1/chat/completions",
        key, model: "llama-3.3-70b-versatile", prompt, systemMessage, jsonMode,
      });
      throw new Error(`Unknown cloud provider: ${cloud.id}`);
    },
  };
}

function activeProviderLabel() {
  const p = resolveActiveProvider();
  return p ? p.label : null;
}

function refreshHeaderIndicator() {
  const btn = $("#open-keys");
  if (!btn) return;
  if (resolveActiveProvider()) btn.classList.add("ai-active");
  else                          btn.classList.remove("ai-active");
}

// ---- AI Setup modal ----

let _showAddEndpoint = false;

function openAiModal() {
  _showAddEndpoint = false;
  _suggestedLocalServers = [];
  $("#ai-key-section").hidden = true;
  $("#ai-add-endpoint").hidden = true;
  $("#ai-modal-overlay").classList.add("open");
  renderProviderCards();
  refreshAllLocalModels().then(renderProviderCards);
  probeWellKnownLocalServers();  // background — re-renders on its own
}

function closeAiModal() {
  $("#ai-modal-overlay").classList.remove("open");
  $("#ai-key-input").value = "";
  $("#ai-endpoint-input").value = "";
  refreshHeaderIndicator();
}

function renderProviderCards() {
  const wrap = $("#ai-provider-cards");
  if (!wrap) return;
  const current = getStoredProvider();
  wrap.innerHTML = "";

  const addCard = (opts) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `ai-provider-card${opts.selected ? " selected" : ""}${opts.extra || ""}`;
    b.innerHTML = `
      <div class="ai-card-title">${escapeHtml(opts.title)}</div>
      <div class="ai-card-desc">${escapeHtml(opts.desc)}</div>
      ${opts.badge ? `<div class="ai-card-badge ${opts.badgeClass}">${escapeHtml(opts.badge)}</div>` : ""}
    `;
    b.onclick = opts.onClick;
    wrap.appendChild(b);
  };

  // No AI
  addCard({
    title: "No AI",
    desc: "Play and build without an AI thinking partner.",
    badge: "Off", badgeClass: "ai-badge-none",
    selected: current === "none",
    onClick: () => { setStoredProvider("none"); _showAddEndpoint = false; $("#ai-key-section").hidden = true; $("#ai-add-endpoint").hidden = true; renderProviderCards(); },
  });

  // Cloud providers
  for (const p of AI_CLOUD_PROVIDERS) {
    addCard({
      title: p.label,
      desc: p.desc,
      badge: p.badge, badgeClass: p.badgeClass,
      selected: current === p.id,
      onClick: () => {
        setStoredProvider(p.id);
        _showAddEndpoint = false;
        $("#ai-add-endpoint").hidden = true;
        showKeyEntry(p);
        renderProviderCards();
      },
    });
  }

  // Local model tiles
  for (const url of getStoredLocalEndpoints()) {
    const models = localModelsByEndpoint[url] || [];
    if (models.length === 0) {
      addCard({
        title: pretty(url),
        desc: "No models found yet — is this server running?",
        badge: "Local", badgeClass: "ai-badge-local",
        selected: false,
        onClick: () => discoverModelsAt(url).then(renderProviderCards),
      });
    } else {
      for (const m of models) {
        const provId = `local:${url}:${m.id}`;
        addCard({
          title: m.label,
          desc: `Runs on ${pretty(url)}.`,
          badge: "Local", badgeClass: "ai-badge-local",
          selected: current === provId,
          onClick: () => {
            setStoredProvider(provId);
            _showAddEndpoint = false;
            $("#ai-key-section").hidden = true;
            $("#ai-add-endpoint").hidden = true;
            renderProviderCards();
          },
        });
      }
    }
  }

  // Detected local servers (well-known ports that responded to a probe).
  // One-click: saves the endpoint AND selects its first model.
  for (const sug of _suggestedLocalServers) {
    const firstModel = sug.models[0];
    const provId = `local:${sug.url}:${firstModel.id}`;
    addCard({
      title: `Detected: ${pretty(sug.url)}`,
      desc: `${sug.hint} · ${firstModel.label}${sug.models.length > 1 ? ` (+${sug.models.length - 1} more)` : ""} · click to add`,
      badge: "Local", badgeClass: "ai-badge-local",
      extra: " add-server",
      onClick: () => {
        const list = getStoredLocalEndpoints();
        if (!list.includes(sug.url)) {
          list.push(sug.url);
          setStoredLocalEndpoints(list);
        }
        localModelsByEndpoint[sug.url] = sug.models;
        setStoredProvider(provId);
        _suggestedLocalServers = _suggestedLocalServers.filter(s => s.url !== sug.url);
        $("#ai-key-section").hidden = true;
        $("#ai-add-endpoint").hidden = true;
        renderProviderCards();
      },
    });
  }

  // + Add local server
  addCard({
    title: "+ Add local server",
    desc: "Connect to an OpenAI-compatible LLM on your machine or network.",
    extra: " add-server",
    onClick: () => {
      _showAddEndpoint = true;
      $("#ai-key-section").hidden = true;
      $("#ai-add-endpoint").hidden = false;
      setTimeout(() => $("#ai-endpoint-input")?.focus(), 0);
    },
  });
}

function pretty(url) {
  return String(url).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function showKeyEntry(provider) {
  const hasStored = !!getStoredKey(provider.id);
  $("#ai-key-input").value = "";
  $("#ai-key-input").placeholder = hasStored
    ? `Key saved · type to replace · ${provider.placeholder}`
    : provider.placeholder;
  $("#ai-key-hint").innerHTML = provider.keyHint;
  $("#ai-key-section").hidden = false;
  $("#ai-add-endpoint").hidden = true;
  setTimeout(() => $("#ai-key-input")?.focus(), 0);
}

function commitKeyEntry() {
  const id = getStoredProvider();
  const cloud = AI_CLOUD_PROVIDERS.find(p => p.id === id);
  if (!cloud) return;
  const v = $("#ai-key-input").value.trim();
  if (v) setStoredKey(cloud.id, v);
  $("#ai-key-input").value = "";
}

function commitNewEndpoint() {
  const raw = $("#ai-endpoint-input").value.trim();
  if (!/^https?:\/\//i.test(raw)) return;
  const clean = raw.replace(/\/+$/, "");
  const list = getStoredLocalEndpoints();
  if (!list.includes(clean)) {
    list.push(clean);
    setStoredLocalEndpoints(list);
  }
  $("#ai-endpoint-input").value = "";
  _showAddEndpoint = false;
  $("#ai-add-endpoint").hidden = true;
  discoverModelsAt(clean).then(renderProviderCards);
}

function bindAiUI() {
  const openBtn = $("#open-keys");
  if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openAiModal(); });

  const overlay = $("#ai-modal-overlay");
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) { commitKeyEntry(); closeAiModal(); } });

  $("#ai-modal-done")?.addEventListener("click", () => { commitKeyEntry(); closeAiModal(); });

  $("#ai-key-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { commitKeyEntry(); closeAiModal(); }
    else if (e.key === "Escape") { $("#ai-key-input").value = ""; closeAiModal(); }
  });
  $("#ai-key-input")?.addEventListener("blur", commitKeyEntry);

  $("#ai-endpoint-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commitNewEndpoint();
    else if (e.key === "Escape") {
      $("#ai-endpoint-input").value = "";
      _showAddEndpoint = false;
      $("#ai-add-endpoint").hidden = true;
    }
  });

  // Generate modal
  const genOverlay = $("#gen-modal-overlay");
  if (genOverlay) genOverlay.addEventListener("click", (e) => { if (e.target === genOverlay) closeGenerateModal(); });
  $("#gen-cancel")?.addEventListener("click", closeGenerateModal);
  $("#gen-change")?.addEventListener("click", (e) => { e.preventDefault(); closeGenerateModal(); openAiModal(); });
  $("#gen-go")?.addEventListener("click", runGenerate);

  refreshHeaderIndicator();
}

// ---- Generate dialog ----

function openGenerateDialog() {
  const provider = resolveActiveProvider();
  const usingEl = $("#gen-using");
  if (provider) {
    usingEl.innerHTML = `Using: <strong>${escapeHtml(provider.label)}</strong> · <a href="#" id="gen-change">change in AI Setup</a>`;
  } else {
    usingEl.innerHTML = `No model selected — <a href="#" id="gen-change">choose one in AI Setup</a>.`;
  }
  // Re-bind the (possibly recreated) "change" link
  $("#gen-change")?.addEventListener("click", (e) => { e.preventDefault(); closeGenerateModal(); openAiModal(); });

  $("#gen-topic").value = "";
  $("#gen-status").textContent = "";
  $("#gen-modal-overlay").classList.add("open");
  setTimeout(() => $("#gen-topic")?.focus(), 0);
}

function closeGenerateModal() {
  $("#gen-modal-overlay").classList.remove("open");
}

async function runGenerate() {
  const provider = resolveActiveProvider();
  if (!provider) {
    $("#gen-status").textContent = "Pick a model first via 🤖 AI Setup.";
    return;
  }
  const fd = new FormData($("#build-form"));
  const language = String(fd.get("language") || "");
  const subject = String(fd.get("subject") || "");
  const grade = String(fd.get("grade") || "");
  const formTopic = String(fd.get("topic") || "");
  if (!language || !subject || !grade) {
    $("#gen-status").textContent = "Choose language, subject, and grade level on the form first.";
    return;
  }
  const topicHint = $("#gen-topic").value.trim();
  const prompt = buildPrompt({ language, subject, grade, topicHint, formTopic });

  $("#gen-go").disabled = true;
  // Models occasionally return malformed JSON or a puzzle with a duplicate word.
  // Re-roll a couple of times before surfacing an error, so a live demo recovers
  // on its own instead of dying on the first bad draw.
  const MAX_ATTEMPTS = 3;
  let lastErr;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      $("#gen-status").textContent = attempt === 1
        ? `Generating with ${provider.label}… this can take 5–20 seconds.`
        : `Re-rolling (attempt ${attempt} of ${MAX_ATTEMPTS})…`;
      try {
        const text = await provider.generate({ prompt, jsonMode: true });
        const puzzle = parsePuzzleJSON(text);
        const topic = formTopic || (TOPICS.find(t => t.id === puzzle.topic) ? puzzle.topic : "");
        fillBuildFormFromPuzzle({ ...puzzle, language, subject, grade, topic });
        $("#gen-status").textContent = "✓ Generated — review and edit before submitting.";
        setTimeout(closeGenerateModal, 600);
        return;
      } catch (e) {
        lastErr = e;
        console.warn(`Generate attempt ${attempt} failed:`, e);
      }
    }
    $("#gen-status").textContent = "Error: " + (lastErr?.message || lastErr || "generation failed");
  } finally {
    $("#gen-go").disabled = false;
  }
}

function buildPrompt({ language, subject, grade, topicHint, formTopic }) {
  const langName = languageLabel(language);
  const topicList = TOPICS.map(t => t.id).join(", ");
  const topicLine = formTopic
    ? `- Topic: "${formTopic}" (use this exact id)`
    : `- Topic: pick the single best matching id from this list and put it in the JSON: ${topicList}`;
  return `You are generating a Connections-style word puzzle for students.

Output ONLY a single JSON object — no markdown fences, no commentary. Schema:
{
  "title": "short title in ${langName}",
  "topic": "one id from the topic list below",
  "groups": [
    {"category": "label", "difficulty": "yellow", "words": ["A","B","C","D"]},
    {"category": "label", "difficulty": "green",  "words": ["A","B","C","D"]},
    {"category": "label", "difficulty": "blue",   "words": ["A","B","C","D"]},
    {"category": "label", "difficulty": "purple", "words": ["A","B","C","D"]}
  ],
  "hints": {
    "WORD": "a short question that nudges a stuck student toward the word — never states or defines it"
  }
}

Constraints:
- All puzzle text (title, category labels, words) must be in ${langName}.
- Subject area: ${subject}
- Grade level: ${grade}
${topicLine}
- Topic hint from user (may be empty): ${topicHint || "(none — pick something fitting)"}
- Yellow = easiest category, Green = moderate, Blue = challenging, Purple = hardest (often wordplay or trickier links).
- Exactly 4 groups, each with exactly 4 words.
- CRITICAL: All 16 words must be unique. No word may appear in two categories. Double-check before returning.
- Each "word" is a single word or short phrase (max 3 words).
- Words should be UPPERCASE.
- Keep content school-appropriate.
- Make the categories specific enough to be solvable by students at the stated grade level.
- Include a "hints" object that maps every uppercase word to a short Socratic QUESTION (8–18 words) in ${langName}. The hint must NOT define, state, or describe the word — it asks a question that gets a stuck student thinking their own way toward it, without revealing the category. Make them think, don't tell them. (e.g. for DIVIDE: "If you share 12 cookies equally among 4 friends, what are you doing?")

Return only the JSON object.`;
}

function parsePuzzleJSON(text) {
  if (!text) throw new Error("Empty response");
  // Strip code fences if present
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Find first { and last } as a fallback
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first > 0 || last < s.length - 1) {
    if (first !== -1 && last !== -1) s = s.slice(first, last + 1);
  }
  let parsed;
  try { parsed = JSON.parse(s); }
  catch (e) { throw new Error("Couldn't parse JSON from model: " + e.message); }
  if (!parsed.groups || parsed.groups.length !== 4) {
    throw new Error("Model didn't return 4 groups.");
  }
  const order = ["yellow", "green", "blue", "purple"];
  parsed.groups.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
  for (const g of parsed.groups) {
    if (!g.words || g.words.length !== 4) throw new Error("A group is missing 4 words.");
    g.words = g.words.map(w => String(w).toUpperCase());
  }
  // A word must live in exactly one group. Duplicates render fine but make the
  // game unsolvable (submitGuess matches the same word in two groups), so reject
  // here — runGenerate retries on this, turning a broken puzzle into a re-roll.
  const seen = new Map();
  for (const g of parsed.groups) {
    for (const w of g.words) {
      if (seen.has(w)) {
        throw new Error(`Duplicate word "${w}" in two categories ("${seen.get(w)}" and "${g.category}").`);
      }
      seen.set(w, g.category);
    }
  }
  return parsed;
}

function fillBuildFormFromPuzzle(p) {
  const f = $("#build-form");
  if (p.title) f.elements["title"].value = p.title;
  if (p.language) f.elements["language"].value = p.language;
  if (p.subject) f.elements["subject"].value = p.subject;
  if (p.grade) f.elements["grade"].value = p.grade;
  if (p.topic) f.elements["topic"].value = p.topic;
  for (let gi = 0; gi < 4; gi++) {
    const g = p.groups[gi];
    f.elements[`cat${gi}`].value = g.category || "";
    for (let wi = 0; wi < 4; wi++) {
      f.elements[`w${gi}_${wi}`].value = (g.words[wi] || "").toUpperCase();
    }
  }
}

// ---- Provider API callers ----

// Why a local-model call may have failed, phrased for the situation. Browsers
// (Safari most strictly) block an HTTPS page from calling http://localhost
// (mixed content); a remote origin needs the server to allow that exact
// origin, never "*". Cloud (https) endpoints never reach this.
function localFailureHint(endpoint) {
  const onHttps = location.protocol === "https:";
  const epIsHttp = /^http:\/\//i.test(endpoint || "");
  const h = location.hostname;
  const remoteOrigin = h && !["localhost", "127.0.0.1", "tauri.localhost", ""].includes(h);
  if (onHttps && epIsHttp) {
    return `Safari (and some browsers) block an HTTPS page from calling ${endpoint}. Use a Chromium-based browser like Chrome, which allows http://localhost, or pick a cloud model.`;
  }
  if (remoteOrigin) {
    return `The page is loaded from ${location.origin}, so the local server must allow that origin: set OLLAMA_ORIGINS to include ${location.origin} (a specific origin, never "*") and restart it, then confirm it's running at ${endpoint}.`;
  }
  return `Is the local model server running at ${endpoint}? Start Ollama with "ollama serve". On localhost you don't need OLLAMA_ORIGINS — that origin is allowed by default.`;
}

async function callOpenAICompatible({ url, key, model, prompt, systemMessage, jsonMode = true }) {
  const sys = systemMessage || "You are a careful, school-appropriate puzzle author. Return only JSON when asked.";
  const body = {
    model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const isLocal = /^http:\/\//i.test(url);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Connection-level failure. For a local (http) endpoint this is usually the
    // HTTPS→http-localhost block or the server being down — explain it.
    if (isLocal) throw new Error(localFailureHint(url));
    throw e;
  }
  if (!res.ok) {
    const detail = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    throw new Error(isLocal ? `${localFailureHint(url)} (${detail})` : detail);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini({ key, model, prompt, systemMessage, jsonMode = true }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8 },
  };
  if (jsonMode) body.generationConfig.responseMimeType = "application/json";
  if (systemMessage) body.systemInstruction = { parts: [{ text: systemMessage }] };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAnthropic({ key, model, prompt, systemMessage }) {
  const sys = systemMessage || "You are a careful, school-appropriate puzzle author. Return only JSON when asked.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.8,
      system: sys,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// boot
bindAiUI();
route();
verifySavedLocalProvider();  // probe saved local server; falls back to 'none' if unreachable
