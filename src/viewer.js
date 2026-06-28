/* ===== Viewer / display screen  (separate window: index.html#display) ===== */
var isDisplay = () => location.hash.replace("#", "") === "display";
function openDisplay() {
  window.open(location.href.split("#")[0] + "#display", "vbtviewer");
}
let DISPLAY = { tick: 0 };

/* ---------- Day 1 helpers (unchanged) ---------- */
function dvRowResult(x) {
  const aw = x.done && x.sa > x.sb, bw = x.done && x.sb > x.sa;
  return `<div class="dv-row"><span class="dv-court">Ct ${x.court}</span>
    <span class="dv-team ${aw ? "w" : ""}">${esc(x.aName)}</span>
    <span class="dv-score num">${x.sa}<span class="dv-sep">:</span>${x.sb}</span>
    <span class="dv-team r ${bw ? "w" : ""}">${esc(x.bName)}</span>
    ${x.ref ? `<span class="dv-ref">${esc(x.ref)}</span>` : ""}</div>`;
}
function dvRowUp(x) {
  return `<div class="dv-row"><span class="dv-court">Ct ${x.court}</span>
    <span class="dv-up-teams">${esc(x.aName)} <span class="dv-vs">vs</span> ${esc(x.bName)}</span>
    <span class="dv-when num">${esc(x.when || x.label || "")}</span>
    ${x.ref ? `<span class="dv-ref">${esc(x.ref)}</span>` : ""}</div>`;
}
const dvEmpty = (t) => `<div class="dv-empty">${esc(t)}</div>`;

/* ---------- Day 2 — bracket viewer ---------- */
function renderBracketDisplay() {
  const res = resolvedOf();
  const tn  = teamNameMap();
  const C   = Math.max(1, Number(S.config.courts) || 1);
  const c   = S.config;
  const clock = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const champ = res.champion;

  // Visible matches (GF bracket-reset hidden until active)
  const allMatches = S.bracket.matches.filter(m => {
    const r = res.byId[m.id];
    return !(m.bracket === "GF" && m.round === 2 && r && !r.active);
  });

  // Sequential match numbering ordered by stage then pos
  const mnMap = {};
  allMatches.slice().sort((a, b) => a.stage - b.stage || a.pos - b.pos)
    .forEach((m, i) => (mnMap[m.id] = i + 1));

  // Group an array of matches into stage buckets [{label, items}]
  const byStage = (arr) => {
    const map = {};
    arr.forEach(m => {
      if (!map[m.stage]) map[m.stage] = { label: m.stageLabel, items: [] };
      map[m.stage].items.push(m);
    });
    return Object.keys(map).map(Number).sort((a, b) => a - b).map(k => map[k]);
  };

  const wStages  = byStage(allMatches.filter(m => m.bracket === "W"));
  const lStages  = byStage(allMatches.filter(m => m.bracket === "L"));
  const gfAll    = allMatches.filter(m => m.bracket === "GF");

  /* ---- match card ---- */
  const card = (m) => {
    const r     = res.byId[m.id] || {};
    const court = (m.pos % C) + 1;
    const isLive = r.ready && !r.done && !r.auto;
    const isDone = r.done;
    const isAuto = r.auto;
    const aWin   = isDone && r.winnerSide === "a";
    const bWin   = isDone && r.winnerSide === "b";

    const teamRow = (tok, win, sc) => {
      if (!tok)      return `<div class="dvb-row dvb-tbd"><span class="dvb-seed">?</span><span class="dvb-tname">TBD</span></div>`;
      if (tok.bye)   return `<div class="dvb-row dvb-bye"><span class="dvb-seed">—</span><span class="dvb-tname">BYE</span></div>`;
      return `<div class="dvb-row ${win ? "dvb-win" : isDone ? "dvb-lose" : ""}">
        <span class="dvb-seed">${tok.seed}</span>
        <span class="dvb-tname">${esc(tn[tok.id] || "—")}</span>
        ${isDone && !isAuto ? `<span class="dvb-sc num">${sc}</span>` : ""}
      </div>`;
    };

    let badge;
    if (isAuto)      badge = `<span class="dvb-badge dvb-b-auto">BYE</span>`;
    else if (isDone) badge = `<span class="dvb-badge dvb-b-done">✓ Done</span>`;
    else if (isLive) badge = `<span class="dvb-badge dvb-b-live"><i class="dvb-dot"></i>LIVE</span>`;
    else             badge = `<span class="dvb-badge dvb-b-wait">Upcoming</span>`;

    const refId   = S.d2Refs[m.id];
    const refName = refId ? (S.referees.find(r => r.id === refId) || {}).name : null;

    const cls = [
      "dvb-card",
      m.bracket === "GF" ? "dvb-gf-card" : "",
      isLive ? "dvb-live" : "",
      isDone ? "dvb-done" : "",
      isAuto ? "dvb-auto" : ""
    ].filter(Boolean).join(" ");

    return `<div class="${cls}">
      <div class="dvb-hd">
        <span class="dvb-mnum">M${mnMap[m.id]}</span>
        <span class="dvb-ct">Ct ${court}</span>
        ${badge}
      </div>
      <div class="dvb-rows">
        ${teamRow(r.teamA, aWin, r.sa)}
        ${teamRow(r.teamB, bWin, r.sb)}
      </div>
      ${refName ? `<div class="dvb-ref"><span class="dvb-ref-lbl">Ref</span><span class="dvb-ref-nm">${esc(refName)}</span></div>` : ""}
    </div>`;
  };

  /* ---- bracket section (Winners / Losers) ---- */
  const section = (stages, title, cls) => !stages.length ? "" : `
    <div class="dvb-sec ${cls}">
      <div class="dvb-sec-lbl">${title}</div>
      <div class="dvb-cols">
        ${stages.map(st => `
          <div class="dvb-col">
            <div class="dvb-col-hd">${esc(st.label)}</div>
            <div class="dvb-col-body">
              ${st.items.slice().sort((a, b) => a.pos - b.pos).map(card).join("")}
            </div>
          </div>`).join("")}
      </div>
    </div>`;

  const wHtml = section(wStages, "Winners Bracket", "dvb-w");
  const lHtml = section(lStages, "Losers Bracket",  "dvb-l");

  /* ---- grand final ---- */
  let gfHtml = "";
  if (gfAll.length) {
    const champCard = champ ? `
      <div class="dvb-champ-card">
        <span class="dvb-champ-icon">🏆</span>
        <div>
          <div class="dvb-champ-ey">Tournament Champion</div>
          <div class="dvb-champ-nm">${esc(tn[champ.id])}</div>
        </div>
      </div>` : "";
    gfHtml = `
      <div class="dvb-sec dvb-gf">
        <div class="dvb-sec-lbl">Grand Final</div>
        <div class="dvb-gf-body">
          <div class="dvb-col">
            ${gfAll.slice().sort((a, b) => a.round - b.round).map(card).join("")}
          </div>
          ${champCard}
        </div>
      </div>`;
  }

  /* ---- aside panel data ---- */
  const totalDone = allMatches.filter(m => (res.byId[m.id] || {}).done).length;
  const total     = allMatches.length;
  const liveList  = allMatches.filter(m => { const r = res.byId[m.id] || {}; return r.ready && !r.done && !r.auto; });
  const upList    = allMatches.filter(m => { const r = res.byId[m.id] || {}; return !r.ready && !r.done && !r.auto; }).slice(0, 5);

  const pmRow = (m, showCt) => {
    const r  = res.byId[m.id] || {};
    const ct = (m.pos % C) + 1;
    const ta = r.teamA ? (tn[r.teamA.id] || "TBD") : "TBD";
    const tb = r.teamB ? (tn[r.teamB.id] || "TBD") : "TBD";
    return `<div class="dvb-pm">
      ${showCt ? `<span class="dvb-pm-ct">Ct ${ct}</span>` : ""}
      <span class="dvb-pm-t">${esc(ta)} <span class="dvb-pm-vs">vs</span> ${esc(tb)}</span>
    </div>`;
  };

  const livePanel = liveList.length
    ? liveList.map(m => pmRow(m, true)).join("")
    : `<div class="dvb-pm-empty">No live matches right now</div>`;
  const upPanel = upList.length
    ? upList.map(m => pmRow(m, false)).join("")
    : `<div class="dvb-pm-empty">Waiting on earlier results</div>`;

  return `
    <div class="dvb-shell">
      <div class="dvb-topbar">
        <div class="dv-title disp">${esc(c.name || "Tournament")}</div>
        <span class="dv-phase">Double Elimination</span>
        <div class="dv-right">
          ${liveList.length ? `<span class="dv-live"><span class="dv-dot"></span>LIVE</span>` : ""}
          <span class="dv-clock num">${clock}</span>
          <button class="dv-btn" data-dv="full">${ic("expand", 16)} Full screen</button>
          <button class="dv-btn" data-dv="exit">Exit</button>
        </div>
      </div>
      <div class="dvb-main">
        <div class="dvb-bracket">
          ${wHtml}
          ${lHtml}
          ${gfHtml}
        </div>
        <div class="dvb-aside">
          <div class="dvb-aside-tour">
            <div class="dvb-at-name">${esc(c.name || "Tournament")}</div>
            <div class="dvb-at-stage">Double Elimination</div>
            <div class="dvb-at-prog">
              <div class="dvb-prog-bar">
                <div class="dvb-prog-fill" style="width:${total ? Math.round(totalDone / total * 100) : 0}%"></div>
              </div>
              <span class="dvb-prog-txt">${totalDone} / ${total} played</span>
            </div>
          </div>
          <div class="dvb-aside-blk">
            <div class="dvb-blk-hd"><i class="dvb-live-dot"></i>Live now</div>
            ${livePanel}
          </div>
          <div class="dvb-aside-blk">
            <div class="dvb-blk-hd">Up next</div>
            ${upPanel}
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------- renderDisplay: auto-routes to bracket or Day 1 ---------- */
function renderDisplay() {
  if (S.bracket && S.bracket.matches && S.bracket.matches.length) {
    app.innerHTML = renderBracketDisplay();
    return;
  }

  /* ---- Day 1 viewer (unchanged) ---- */
  const tn = teamNameMap(), c = S.config;
  const clock = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const league = S.teams.length ? rankTeams(statsOf(), S.matches, c.winPoints, c.drawPoints) : [];
  let results = [], upcoming = [];

  const list = S.matches.map(m => ({
    court: m.court,
    when: addMinutes(c.startTime, m.slot * c.matchMinutes),
    label: m.group,
    slot: m.slot,
    aName: tn[m.teamA],
    bName: tn[m.teamB],
    sa: m.scoreA,
    sb: m.scoreB,
    done: m.done,
    ref: S.matchRefs[m.id] ? (S.referees.find(r => r.id === S.matchRefs[m.id]) || {}).name || null : null
  }));
  results  = list.filter(x => x.done).sort((a, b) => b.slot - a.slot).slice(0, 7);
  upcoming = list.filter(x => !x.done).sort((a, b) => a.slot - b.slot).slice(0, 7);

  const perPage = 10;
  const pages   = Math.max(1, Math.ceil(league.length / perPage));
  const page    = Math.floor(DISPLAY.tick / 8) % pages;
  const standRows = league.slice(page * perPage, page * perPage + perPage);

  const standTable = league.length
    ? `<table class="dv-table"><thead><tr><th>#</th><th>Team</th><th class="c">W</th><th class="c">D</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
       <tbody>${standRows.map(t => {
         const i = league.indexOf(t);
         return `<tr><td><span class="dv-rk ${i < 3 ? "g" + (i + 1) : ""}">${i + 1}</span></td>
           <td class="dv-tn">${esc(t.name)} <span class="pill pill-grey" style="font-size:11px;vertical-align:middle">${esc(t.group)}</span></td>
           <td class="c num">${t.W}</td><td class="c num">${t.D}</td>
           <td class="c num">${pd(t.PD)}</td><td class="c num dv-pts">${t.Pts}</td></tr>`;
       }).join("")}</tbody></table>`
    : dvEmpty("Standings will appear after the first results.");

  app.innerHTML = `
    <div class="dv-wrap">
      <div class="dv-top">
        <div class="dv-title disp">${esc(c.name || "Tournament")}</div>
        <div class="dv-phase">Day 1 · Round Robin</div>
        <div class="dv-right">
          <span class="dv-live"><span class="dv-dot"></span>LIVE</span>
          <span class="dv-clock num">${clock}</span>
          <button class="dv-btn" data-dv="full">${ic("expand", 16)} Full screen</button>
          <button class="dv-btn" data-dv="exit">Exit</button>
        </div>
      </div>
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
