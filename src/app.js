/* ===== App shell — render, event wiring, init ===== */
var IS_NARROW = false;

const VIEWS = {
  overview:  vOverview,
  setup:     vSetup,
  teams:     vTeams,
  matches:   vMatches,
  standings: vStandings,
  day2:      vDay2
};

function navItems() {
  return [
    { id: "overview",  label: "Overview",      icon: "chart"    },
    { id: "setup",     label: "Setup",          icon: "settings" },
    { id: "teams",     label: "Teams & Groups", icon: "users",    count: S.teams.length },
    { id: "matches",   label: "Round 1",        icon: "calendar", count: S.matches.length },
    { id: "standings", label: "Standings",      icon: "trophy"   },
    { id: "day2",      label: "Round 2",        icon: "swords",   count: S.bracket ? S.bracket.matches.length : undefined }
  ];
}

function render() {
  IS_NARROW = window.innerWidth < 760;
  const NAV   = navItems();
  const c     = S.config;
  const total = S.matches.length;
  const done  = doneCount();

  const logo = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 4 7 3 12M12 21c-3-3-4-7-3-12M3.5 8c4 1 9 1 13-2M20.5 16c-4-1-9-1-13 2"/></svg>`;
  const nav   = NAV.map(n =>
    `<button class="nav-i ${S.tab === n.id ? "on" : ""}" data-act="tab" data-tab="${n.id}">
      <span class="nv-ic">${ic(n.icon, 17)}</span>${n.label}
      ${n.count != null ? `<span class="nav-count num">${n.count}</span>` : ""}
    </button>`
  ).join("");
  const mob = NAV.map(n =>
    `<button class="${S.tab === n.id ? "on" : ""}" data-act="tab" data-tab="${n.id}">${ic(n.icon, 15)}${n.label.split(" ")[0]}</button>`
  ).join("");

  const content = VIEWS[S.tab]();

  app.innerHTML = `
    <div class="shell">
      <aside class="rail"><div class="rail-inner">
        <div class="brand">
          <div class="brand-mark">${logo}</div>
          <div><div class="brand-name">Amrut Cup 2026</div><div class="brand-sub">Tournament Admin</div></div>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="rail-foot">
          <div class="rail-stat"><span>Progress</span><b class="num">${total ? Math.round(done / total * 100) : 0}%</b></div>
          <div class="rail-stat"><span>Courts</span><b class="num">${c.courts}</b></div>
          <div class="rail-stat"><span>Saved locally</span><b style="color:var(--teal)">● auto</b></div>
        </div>
      </div></aside>
      <div class="main">
        <header class="topbar">
          <h1 class="disp">${esc(c.name || "Tournament")}</h1>
          <div class="tb-meta">
            <span class="tb-chip">${ic("pin",   14)} ${c.courts} courts</span>
            <span class="tb-chip">${ic("clock", 14)} ${c.matchMinutes} min</span>
            <span class="tb-chip">${ic("zap",   14)} to ${c.maxPoints}</span>
            ${total ? `<div class="progress-wrap"><div class="pbar"><i style="width:${done / total * 100}%"></i></div><span class="num faint" style="font-size:12px">${done}/${total}</span></div>` : ""}
            <button class="btn btn-sm" data-act="openDisplay" style="margin-left:4px">${ic("monitor", 14)} Viewer</button>
          </div>
        </header>
        <div class="mobnav">${mob}</div>
        <main class="content">${content}</main>
      </div>
    </div>
    <input id="fileInput" type="file" accept=".xlsx,.xls,.csv,.txt,.json" style="display:none">`;
}

/* =========================================================
   Events (delegated, attached once in init)
   ========================================================= */
function onClick(e) {
  const el  = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.getAttribute("data-act");
  const id  = el.getAttribute("data-id");
  switch (act) {
    case "tab":         S.tab = el.getAttribute("data-tab"); render(); break;
    case "addTeam":     addTeam();              break;
    case "parseBulk":   parseBulk(S.ui.bulk);  break;
    case "autoAssign":  autoAssign();           break;
    case "removeTeam":  removeTeam(id);         break;
    case "generate":    generate();             break;
    case "saveScore":   saveResult(id);         break;
    case "editScore":   editResult(id);         break;
    case "genBracket":    generateBracket();      break;
    case "saveD2":        saveBracketResult(id);  break;
    case "editD2":        editBracketResult(id);  break;
    case "addReferee":    addReferee();           break;
    case "removeReferee": removeReferee(id);      break;
    case "template":      downloadTemplate();     break;
    case "export":      exportData();           break;
    case "import":      document.getElementById("fileInput").click(); break;
    case "reset":       resetAll();             break;
    case "openDisplay": openDisplay();          break;
  }
}
function onInput(e) {
  const t = e.target;
  if (t.hasAttribute("data-ui")) {
    S.ui[t.getAttribute("data-ui")] = t.value;
    return;
  }
  if (t.hasAttribute("data-cfg")) {
    const k = t.getAttribute("data-cfg");
    S.config[k] = (k === "name" || k === "startTime") ? t.value : Number(t.value);
    return;
  }
  if (t.hasAttribute("data-draft")) {
    const id = t.getAttribute("data-id"), side = t.getAttribute("data-draft");
    let v = t.value.replace(/[^0-9]/g, "");
    const cap = Number(S.config.maxPoints);
    if (v !== "" && Number(v) > cap) v = String(cap);
    if (v !== t.value) t.value = v;
    S.ui.drafts[id] = { ...(S.ui.drafts[id] || {}), [side]: v };
    return;
  }
  if (t.hasAttribute("data-d2")) {
    const id = t.getAttribute("data-id"), side = t.getAttribute("data-d2");
    let v = t.value.replace(/[^0-9]/g, "");
    const cap = Number(S.config.maxPoints);
    if (v !== "" && Number(v) > cap) v = String(cap);
    if (v !== t.value) t.value = v;
    S.ui.d2drafts[id] = { ...(S.ui.d2drafts[id] || {}), [side]: v };
    return;
  }
}
function onChange(e) {
  const t = e.target;
  if (t.id === "fileInput" && t.files && t.files[0]) { importFile(t.files[0]); t.value = ""; return; }
  if (t.hasAttribute("data-ui")) { S.ui[t.getAttribute("data-ui")] = t.value; return; }
  if (t.hasAttribute("data-ref")) {
    const mid = t.getAttribute("data-id");
    if (t.getAttribute("data-ref") === "day1") saveMatchRef(mid, t.value);
    else saveD2Ref(mid, t.value);
    return;
  }
  if (t.hasAttribute("data-filter")) {
    const k = t.getAttribute("data-filter");
    if (k === "group") S.ui.fGroup = t.value; else S.ui.fStatus = t.value;
    render();
    return;
  }
  if (t.hasAttribute("data-cfg")) { persist(); render(); return; }
}
function onKeydown(e) {
  if (e.key === "Enter" && e.target.id === "newName") { e.preventDefault(); addTeam(); }
}
let resizeRAF;
function onResize() { cancelAnimationFrame(resizeRAF); resizeRAF = requestAnimationFrame(render); }

/* =========================================================
   Init  (called by the inline <script> in volleyball-tournament.html
          after all src/ files have loaded)
   ========================================================= */
function init() {
  loadState();
  if (isDisplay()) { initDisplay(); return; }
  app.addEventListener("click",   onClick);
  app.addEventListener("input",   onInput);
  app.addEventListener("change",  onChange);
  app.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize);
  render();
}
