/* ===== View: Round 1 (matches) tab ===== */
function vMatches() {
  const tn = teamNameMap(), groups = groupsOf();
  if (!S.matches.length) {
    return `<div class="card">${empty("calendar", "No schedule generated",
      S.teams.length < 2
        ? "Add at least two teams, then generate the round-robin schedule."
        : "Generate the Day 1 round-robin schedule to start recording results.",
      `<button class="btn btn-accent" data-act="generate" ${S.teams.length < 2 ? "disabled" : ""}>${ic("calendar", 15)} Generate schedule</button>`)
    }</div>`;
  }

  const plan = courtPlanOf();
  const stale = scheduleStale();
  const filtered = S.matches
    .filter(m => S.ui.fGroup  === "all" || m.group === S.ui.fGroup)
    .filter(m => S.ui.fStatus === "all" || (S.ui.fStatus === "done" ? m.done : !m.done))
    .sort((a, b) => a.slot - b.slot || a.court - b.court);

  const planCard = `
    <div class="card mb18">
      <div class="card-h">${ic("grid", 16, "var(--orange)")}<h2>Court plan</h2><span class="sub">Where each group plays</span></div>
      <div class="card-b grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:9px">
        ${plan.map(p =>
          `<div class="flex ac jb" style="padding:9px 12px;border:1px solid var(--line2);border-radius:10px">
            <span class="flex ac gap8">
              <span class="gtag disp">${esc(p.group)}</span>
              <span style="font-size:12.5px;font-weight:600">${p.courts.length === 1 ? "Court " + p.courts[0] : "Courts " + p.courts.join(", ")}</span>
            </span>
            <span class="pill ${p.courts.length === 1 ? "pill-teal" : "pill-orange"}">${p.courts.length === 1 ? "fixed" : "rotating"}</span>
          </div>`
        ).join("")}
      </div>
    </div>`;

  const rows = filtered.map(m => {
    const d = S.ui.drafts[m.id] || {};
    const aWin = m.done && m.scoreA > m.scoreB;
    const bWin = m.done && m.scoreB > m.scoreA;
    const draw = m.done && m.scoreA === m.scoreB;

    const score = m.done
      ? `<div class="m-score">
          <span class="score-final ${aWin ? "win" : ""}">${m.scoreA}</span>
          <span class="score-dash">–</span>
          <span class="score-final ${bWin ? "win" : ""}">${m.scoreB}</span>
         </div>`
      : `<div class="m-score">
          <input class="score-in num" inputmode="numeric" data-draft="a" data-id="${m.id}" value="${esc(d.a == null ? "" : d.a)}" placeholder="0">
          <span class="score-dash">–</span>
          <input class="score-in num" inputmode="numeric" data-draft="b" data-id="${m.id}" value="${esc(d.b == null ? "" : d.b)}" placeholder="0">
         </div>`;

    const action = m.done
      ? `<button class="btn btn-sm" data-act="editScore" data-id="${m.id}">${ic("pencil", 13)} Edit</button>`
      : `<button class="btn btn-accent btn-sm" data-act="saveScore" data-id="${m.id}">${ic("check", 14)} Save</button>`;

    const assignedRef  = S.matchRefs[m.id];
    const eligibleRefs = S.referees.filter(r => r.teamId !== m.teamA && r.teamId !== m.teamB);
    const refSection   = S.referees.length ? `
      <div class="m-ref">
        <span class="m-ref-lbl">Referee</span>
        ${m.done
          ? `<span class="m-ref-name">${assignedRef ? esc((S.referees.find(r => r.id === assignedRef) || {}).name || "—") : "—"}</span>`
          : `<select class="inp" style="padding:4px 8px;height:auto;font-size:12.5px;flex:1" data-ref="day1" data-id="${m.id}">
               <option value="">— No referee —</option>
               ${eligibleRefs.map(r => `<option value="${r.id}" ${assignedRef === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}
             </select>`}
      </div>` : "";

    return `
      <div class="match ${m.done ? "done" : ""}">
        <div class="m-slot">
          <span class="pill pill-orange" style="margin-bottom:2px">Court ${m.court}</span>
          <span class="m-time num">${addMinutes(S.config.startTime, m.slot * S.config.matchMinutes)}</span>
        </div>
        <span class="pill pill-grey">${esc(m.group)}</span>
        ${draw ? `<span class="pill" style="background:#EEF2F8;color:var(--muted)">Draw</span>` : ""}
        <div class="m-teams">
          <span class="m-team ${m.done ? (aWin || draw ? "win" : "lose") : ""}">${aWin ? ic("crown", 14, "var(--teal)") : ""}${esc(tn[m.teamA])}</span>
          ${score}
          <span class="m-team right ${m.done ? (bWin || draw ? "win" : "lose") : ""}">${esc(tn[m.teamB])}${bWin ? ic("crown", 14, "var(--teal)") : ""}</span>
        </div>
        ${action}
        ${refSection}
      </div>`;
  }).join("");

  return `
    ${stale ? `<div class="banner banner-warn mb18">${ic("alert", 16)}<span>Teams changed since this schedule was built. <b style="cursor:pointer;text-decoration:underline" data-act="generate">Regenerate</b> to include everyone.</span></div>` : ""}
    ${planCard}
    <div class="flex ac jb wrap gap12 mb18">
      <div class="flex gap8 wrap">
        <select class="inp" style="width:auto" data-filter="group">
          <option value="all" ${S.ui.fGroup === "all" ? "selected" : ""}>All groups</option>
          ${groups.map(g => `<option value="${esc(g)}" ${S.ui.fGroup === g ? "selected" : ""}>${esc(g)}</option>`).join("")}
        </select>
        <select class="inp" style="width:auto" data-filter="status">
          <option value="all"  ${S.ui.fStatus === "all"  ? "selected" : ""}>All matches</option>
          <option value="todo" ${S.ui.fStatus === "todo" ? "selected" : ""}>To play</option>
          <option value="done" ${S.ui.fStatus === "done" ? "selected" : ""}>Completed</option>
        </select>
      </div>
      <span class="pill pill-grey num">${doneCount()} / ${S.matches.length} played</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${rows || `<p class="muted" style="text-align:center;padding:24px">No matches match these filters.</p>`}
    </div>`;
}
