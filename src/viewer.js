/* ===== Viewer / display screen  (separate window: index.html#display) ===== */
var isDisplay = () => location.hash.replace("#", "") === "display";
function openDisplay() {
  window.open(location.href.split("#")[0] + "#display", "vbtviewer");
}
let DISPLAY = { tick: 0 };

function dvRowResult(x) {
  const aw = x.done && x.sa > x.sb, bw = x.done && x.sb > x.sa;
  return `<div class="dv-row"><span class="dv-court">Ct ${x.court}</span>
    <span class="dv-team ${aw ? "w" : ""}">${esc(x.aName)}</span>
    <span class="dv-score num">${x.sa}<span class="dv-sep">:</span>${x.sb}</span>
    <span class="dv-team r ${bw ? "w" : ""}">${esc(x.bName)}</span></div>`;
}
function dvRowUp(x) {
  return `<div class="dv-row"><span class="dv-court">Ct ${x.court}</span>
    <span class="dv-up-teams">${esc(x.aName)} <span class="dv-vs">vs</span> ${esc(x.bName)}</span>
    <span class="dv-when num">${esc(x.when || x.label || "")}</span></div>`;
}
const dvEmpty = (t) => `<div class="dv-empty">${esc(t)}</div>`;

function renderDisplay() {
  const tn = teamNameMap(), c = S.config;
  const clock = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const C = Math.max(1, Number(c.courts) || 1);
  const league = S.teams.length ? rankTeams(statsOf(), S.matches, c.winPoints, c.drawPoints) : [];
  let phase, results = [], upcoming = [], champ = null;

  if (S.bracket) {
    phase = "Day 2 · Knockout";
    const res = resolvedOf(); champ = res.champion;
    const nm = (tok) => tok == null ? "TBD" : tok.bye ? "BYE" : (tn[tok.id] || "—");
    const list = S.bracket.matches.filter(m => { const r = res.byId[m.id]; return r && !r.auto; }).map(m => {
      const r = res.byId[m.id] || {};
      return { court: (m.pos % C) + 1, label: m.stageLabel, stage: m.stage, aName: nm(r.teamA), bName: nm(r.teamB), sa: r.sa, sb: r.sb, done: r.done, ready: r.ready };
    });
    results = list.filter(x => x.done).sort((a, b) => b.stage - a.stage).slice(0, 7);
    upcoming = list.filter(x => x.ready && !x.done).sort((a, b) => a.stage - b.stage).slice(0, 7);
  } else {
    phase = "Day 1 · Round Robin";
    const list = S.matches.map(m => ({ court: m.court, when: addMinutes(c.startTime, m.slot * c.matchMinutes), label: m.group, slot: m.slot, aName: tn[m.teamA], bName: tn[m.teamB], sa: m.scoreA, sb: m.scoreB, done: m.done }));
    results = list.filter(x => x.done).sort((a, b) => b.slot - a.slot).slice(0, 7);
    upcoming = list.filter(x => !x.done).sort((a, b) => a.slot - b.slot).slice(0, 7);
  }

  const perPage = 10;
  const pages = Math.max(1, Math.ceil(league.length / perPage));
  const page = Math.floor(DISPLAY.tick / 8) % pages;
  const standRows = league.slice(page * perPage, page * perPage + perPage);

  const standTable = league.length ? `<table class="dv-table"><thead><tr><th>#</th><th>Team</th><th class="c">W</th><th class="c">D</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
    <tbody>${standRows.map((t) => {
      const i = league.indexOf(t);
      return `<tr><td><span class="dv-rk ${i < 3 ? "g" + (i + 1) : ""}">${i + 1}</span></td><td class="dv-tn">${esc(t.name)} <span class="pill pill-grey" style="font-size:11px;vertical-align:middle">${esc(t.group)}</span></td><td class="c num">${t.W}</td><td class="c num">${t.D}</td><td class="c num">${pd(t.PD)}</td><td class="c num dv-pts">${t.Pts}</td></tr>`;
    }).join("")}</tbody></table>` : dvEmpty("Standings will appear after the first results.");

  app.innerHTML = `
    <div class="dv-wrap">
      <div class="dv-top">
        <div class="dv-title disp">${esc(c.name || "Tournament")}</div>
        <div class="dv-phase">${phase}</div>
        <div class="dv-right">
          <span class="dv-live"><span class="dv-dot"></span>LIVE</span>
          <span class="dv-clock num">${clock}</span>
          <button class="dv-btn" data-dv="full">${ic("expand", 16)} Full screen</button>
          <button class="dv-btn" data-dv="exit">Exit</button>
        </div>
      </div>
      ${champ ? `<div class="dv-champ">${ic("trophy", 22, "#FFB38A")} Champion: <b>${esc(tn[champ.id])}</b></div>` : ""}
      <div class="dv-grid">
        <div class="dv-panel">
          <div class="dv-ph">${ic("check", 16)} Latest results</div>
          <div class="dv-list">${results.length ? results.map(dvRowResult).join("") : dvEmpty("No results yet")}</div>
        </div>
        <div class="dv-panel">
          <div class="dv-ph">${ic("clock", 16)} Coming up</div>
          <div class="dv-list">${upcoming.length ? upcoming.map(dvRowUp).join("") : dvEmpty("Nothing scheduled")}</div>
        </div>
        <div class="dv-panel dv-stand">
          <div class="dv-ph">${ic("trophy", 16)} Standings ${pages > 1 ? `<span class="dv-pageinfo">page ${page + 1}/${pages}</span>` : ""}</div>
          ${standTable}
        </div>
      </div>
    </div>`;
}
function dvClick(e) {
  const b = e.target.closest("[data-dv]");
  if (!b) return;
  const a = b.getAttribute("data-dv");
  if (a === "full") {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  } else if (a === "exit") { location.hash = ""; location.reload(); }
}
function initDisplay() {
  document.body.classList.add("display-mode");
  app.addEventListener("click", dvClick);
  window.addEventListener("storage", () => { loadState(); renderDisplay(); });
  renderDisplay();
  setInterval(() => { DISPLAY.tick++; loadState(); renderDisplay(); }, 1000);
}
