/* ===== View: Overview tab ===== */
function vOverview() {
  if (!S.teams.length) {
    return `<div class="card">${empty("trophy", "Let's set up your tournament", "Start by adding the teams and sorting them into groups for the Day 1 round robin.",
      `<button class="btn btn-accent" data-act="tab" data-tab="teams">${ic("plus", 15)} Add teams</button>`)}</div>`;
  }
  const groups = groupsOf(), tn = teamNameMap();
  const league = seedingOf();
  const total = S.matches.length, done = doneCount();
  const upcoming = [...S.matches].filter(m => !m.done).sort((a, b) => a.slot - b.slot || a.court - b.court).slice(0, 5);
  const statCard = (corner, cc, lab, big, foot) =>
    `<div class="stat"><div class="corner" style="background:${cc[0]};color:${cc[1]}">${ic(corner, 16)}</div><div class="lab">${lab}</div><div class="big disp num">${big}</div><div class="foot">${foot}</div></div>`;

  let leaders;
  if (done === 0) {
    leaders = `<p class="muted" style="font-size:13px;padding:14px 0;text-align:center">No results yet — standings appear as scores come in.</p>`;
  } else {
    leaders = `<table class="tbl"><thead><tr><th class="rankcell">#</th><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
      <tbody>${league.slice(0, 6).map((t, i) =>
        `<tr><td class="rankcell">${rankBadge(i)}</td><td class="tname">${esc(t.name)} <span class="pill pill-grey" style="margin-left:4px">${esc(t.group)}</span></td><td class="c num">${t.P}</td><td class="c num">${t.W}</td><td class="c num">${pd(t.PD)}</td><td class="c num" style="font-weight:700">${t.Pts}</td></tr>`
      ).join("")}</tbody></table>`;
  }

  let next;
  if (!total) {
    next = empty("calendar", "No schedule yet", "Generate the round-robin schedule to see upcoming matches here.",
      `<button class="btn btn-primary" data-act="tab" data-tab="matches">Go to schedule</button>`);
  } else if (!upcoming.length) {
    next = `<p class="muted" style="font-size:13px;text-align:center;padding:18px 0">All Day 1 matches are done. 🎉</p>`;
  } else {
    next = upcoming.map(m =>
      `<div class="flex ac gap12" style="padding:9px 11px;border:1px solid var(--line2);border-radius:10px">
        <div class="flex ac gap8" style="min-width:0;flex:1">
          <span class="pill pill-orange">Ct ${m.court}</span>
          <span style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tn[m.teamA])} <span class="faint">vs</span> ${esc(tn[m.teamB])}</span>
        </div>
        <span class="num faint" style="font-size:12px">${addMinutes(S.config.startTime, m.slot * S.config.matchMinutes)}</span>
      </div>`
    ).join("");
  }

  return `
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      ${statCard("users", ["#FDEADF", "var(--orange)"], "Teams",         S.teams.length,     groups.length + " group" + (groups.length !== 1 ? "s" : ""))}
      ${statCard("grid",  ["#EAF1FB", "#3B6FB5"],       "Courts",        S.config.courts,    S.config.matchMinutes + " min / match")}
      ${statCard("check", ["#E0F6F2", "var(--teal)"],   "Matches played", done + `<span style="font-size:18px;color:var(--faint)">/${total}</span>`, (total ? Math.round(done / total * 100) : 0) + "% complete")}
      ${statCard("zap",   ["#FBEAEA", "var(--red)"],    "Points cap",    S.config.maxPoints, S.config.winPoints + " pts per win")}
    </div>
    <div class="grid mt18" style="grid-template-columns:${IS_NARROW ? "1fr" : "1.1fr 1fr"}">
      <div class="card">
        <div class="card-h">${ic("crown", 16, "var(--orange)")}<h2>League leaders</h2><span class="sub">Day 2 seeding order</span></div>
        <div class="card-b" style="padding:6px 18px">${leaders}</div>
      </div>
      <div class="card">
        <div class="card-h">${ic("clock", 16, "var(--muted)")}<h2>Up next</h2></div>
        <div class="card-b" style="display:flex;flex-direction:column;gap:9px">${next}</div>
      </div>
    </div>`;
}
