/* ===== View: Round 2 / Day 2 bracket tab ===== */
function vDay2() {
  const tn = teamNameMap();
  const tokenSlot = (token, win) => {
    if (token == null) return `<span class="bk-tbd">TBD</span>`;
    if (token.bye)     return `<span class="bk-bye">BYE</span>`;
    return `<span class="bk-team ${win ? "win" : ""}"><span class="bk-seed num">${token.seed}</span><span class="bk-tname">${esc(tn[token.id] || "—")}</span>${win ? ic("crown", 13, "var(--teal)") : ""}</span>`;
  };

  if (S.teams.length < 2) {
    return `<div class="card">${empty("swords", "Day 2 needs teams", "Add teams and play Day 1 first — the bracket seeds from the Day 1 standings.")}</div>`;
  }

  if (!S.bracket) {
    const seeding = seedingOf();
    return `
      <div class="card mb18">
        <div class="card-h">${ic("swords", 16, "var(--orange)")}<h2>Day 2 — Double elimination</h2><span class="sub">Seeded from Day 1 standings</span></div>
        <div class="card-b">
          <p class="muted" style="font-size:13px;margin-top:0">All ${S.teams.length} teams enter a double-elimination bracket. Seeds come from the Day 1 league table — every team must lose twice to be knocked out, and matches alternate between the winners' and losers' brackets so no one plays back-to-back.</p>
          ${!day1Done() ? `<div class="banner banner-warn mb14">${ic("alert", 16)}<span>Day 1 still has unplayed matches, so seeds may change. You can generate now and regenerate later.</span></div>` : ""}
          <button class="btn btn-accent" data-act="genBracket">${ic("swords", 15)} Generate bracket</button>
        </div>
      </div>
      <div class="card">
        <div class="card-h">${ic("medal", 16, "var(--orange)")}<h2>Seeding preview</h2></div>
        <div class="card-b" style="padding:6px 8px">
          <table class="tbl">
            <thead><tr><th class="rankcell">Seed</th><th>Team</th><th>Group</th><th class="c">W</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
            <tbody>${seeding.map((t, i) =>
              `<tr>
                <td class="rankcell">${rankBadge(i)}</td>
                <td class="tname">${esc(t.name)}</td>
                <td><span class="pill pill-grey">${esc(t.group)}</span></td>
                <td class="c num">${t.W}</td><td class="c num">${pd(t.PD)}</td>
                <td class="c num" style="font-weight:700">${t.Pts}</td>
              </tr>`
            ).join("")}</tbody>
          </table>
        </div>
      </div>`;
  }

  const res = resolvedOf();
  const champ = res.champion;
  const stale = S.bracket.seedIds.length !== S.teams.length ||
    S.bracket.seedIds.some(id => !S.teams.find(t => t.id === id));
  const C = Math.max(1, Number(S.config.courts) || 1);

  const stages = {};
  S.bracket.matches.forEach(m => {
    const r = res.byId[m.id];
    if (m.bracket === "GF" && m.round === 2 && r && !r.active) return;
    (stages[m.stage] = stages[m.stage] || { label: m.stageLabel, items: [] }).items.push(m);
  });
  const stageKeys = Object.keys(stages).map(Number).sort((a, b) => a - b);

  const visible = S.bracket.matches.filter(m => {
    const r = res.byId[m.id];
    return !(m.bracket === "GF" && m.round === 2 && r && !r.active);
  });
  const total  = visible.length;
  const played = S.bracket.matches.filter(m => { const r = res.byId[m.id]; return r && r.done && !r.auto; }).length;

  const head = champ
    ? `<div class="champ-banner mb18">${ic("trophy", 24)}<div><div class="eyebrow" style="color:rgba(255,255,255,.7)">Tournament champion</div><div class="champ-name disp">${esc(tn[champ.id])}</div></div><span class="pill" style="background:rgba(255,255,255,.18);color:#fff;margin-left:auto">Seed ${champ.seed}</span></div>`
    : `<div class="flex ac jb wrap gap12 mb18"><div><h2 class="disp" style="margin:0;font-size:18px">Bracket — order of play</h2><span class="muted" style="font-size:12.5px">Winners &amp; losers brackets interleaved · play top to bottom</span></div><span class="pill pill-grey num">${played} / ${total} played</span></div>`;

  const stagesHtml = stageKeys.map(sk => {
    const st = stages[sk];
    const bk  = st.items[0].bracket;
    const dot = bk === "W" ? "stagedot-w" : bk === "L" ? "stagedot-l" : "stagedot-gf";

    const items = st.items.slice().sort((a, b) => a.pos - b.pos).map(m => {
      const r    = res.byId[m.id] || {};
      const d    = S.ui.d2drafts[m.id] || {};
      const aWin = r.done && r.winnerSide === "a";
      const bWin = r.done && r.winnerSide === "b";
      const court = (m.pos % C) + 1;

      // Side panel: scores/inputs stacked vertically + full-height button
      let rowBadgeB = "", sidePanel = "";
      if (r.auto) {
        rowBadgeB = `<span class="pill pill-grey" style="flex-shrink:0;font-size:11px">bye</span>`;
      } else if (!r.ready) {
        rowBadgeB = `<span class="bk-waiting">waiting</span>`;
      } else if (r.done) {
        sidePanel = `
          <div class="bk-side">
            <div class="bk-side-scores">
              <span class="bk-side-sc num ${aWin ? "win" : ""}">${r.sa}</span>
              <span class="bk-side-sc num ${bWin ? "win" : ""}">${r.sb}</span>
            </div>
            <button class="btn btn-sm bk-side-btn" data-act="editD2" data-id="${m.id}">${ic("pencil", 12)}</button>
          </div>`;
      } else {
        sidePanel = `
          <div class="bk-side">
            <div class="bk-side-inputs">
              <input class="score-in num" style="width:44px" inputmode="numeric" data-d2="a" data-id="${m.id}" placeholder="0" value="${esc(d.a == null ? "" : d.a)}">
              <input class="score-in num" style="width:44px" inputmode="numeric" data-d2="b" data-id="${m.id}" placeholder="0" value="${esc(d.b == null ? "" : d.b)}">
            </div>
            <button class="btn btn-accent bk-side-btn" data-act="saveD2" data-id="${m.id}">${ic("check", 15)}</button>
          </div>`;
      }

      // Referee row
      const tAId = r.teamA && !r.teamA.bye ? r.teamA.id : null;
      const tBId = r.teamB && !r.teamB.bye ? r.teamB.id : null;
      const assignedD2Ref  = S.d2Refs[m.id];
      const eligibleD2Refs = S.referees.filter(rf =>
        (!tAId || rf.teamId !== tAId) && (!tBId || rf.teamId !== tBId)
      );
      const refRow = S.referees.length ? `
        <div class="bk-ref">
          <span class="bk-ref-lbl">Ref</span>
          ${r.done
            ? `<span class="bk-ref-name">${assignedD2Ref ? esc((S.referees.find(rf => rf.id === assignedD2Ref) || {}).name || "—") : "—"}</span>`
            : `<select class="inp" style="padding:3px 7px;height:auto;font-size:12px;flex:1" data-ref="day2" data-id="${m.id}">
                 <option value="">— No referee —</option>
                 ${eligibleD2Refs.map(rf => `<option value="${rf.id}" ${assignedD2Ref === rf.id ? "selected" : ""}>${esc(rf.name)}</option>`).join("")}
               </select>`}
        </div>` : "";

      return `
        <div class="bk-match ${r.done ? "done" : ""} ${r.auto ? "auto" : ""}">
          <span class="bk-court pill pill-grey">Ct ${court}</span>
          <div class="bk-rows">
            <div class="bk-row">${tokenSlot(r.teamA, aWin)}</div>
            <div class="bk-row">${tokenSlot(r.teamB, bWin)}${rowBadgeB}</div>
            ${refRow}
          </div>
          ${sidePanel}
        </div>`;
    }).join("");

    return `
      <div class="bk-stage">
        <div class="bk-stage-h">
          <span class="stagedot ${dot}"></span>
          <span class="bk-stage-title disp">${esc(st.label)}</span>
          <span class="bk-stage-num eyebrow">Stage ${sk + 1}</span>
        </div>
        <div class="bk-stage-body">${items}</div>
      </div>`;
  }).join("");

  return `
    ${head}
    ${stale ? `<div class="banner banner-warn mb18">${ic("alert", 16)}<span>Teams changed since this bracket was built. <b style="cursor:pointer;text-decoration:underline" data-act="genBracket">Regenerate</b> to reseed.</span></div>` : ""}
    <div class="bk-stages">${stagesHtml}</div>
    <div class="flex gap12 wrap mt18" style="font-size:12px">
      <span class="flex ac gap8"><span class="stagedot stagedot-w"></span> Winners bracket</span>
      <span class="flex ac gap8"><span class="stagedot stagedot-l"></span> Losers bracket</span>
      <span class="flex ac gap8"><span class="stagedot stagedot-gf"></span> Grand final</span>
    </div>`;
}
