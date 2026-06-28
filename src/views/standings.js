/* ===== View: Standings tab ===== */
function vStandings() {
  if (!S.teams.length) {
    return `<div class="card">${empty("trophy", "Nothing to rank yet", "Add teams and record some results to build the standings.")}</div>`;
  }
  const stats = statsOf(), groups = groupsOf();
  const league = rankTeams(stats, S.matches, S.config.winPoints, S.config.drawPoints);
  const groupTables = groups.map(g => ({
    g,
    rows: rankTeams(stats.filter(t => t.group === g), S.matches, S.config.winPoints, S.config.drawPoints)
  }));

  const gtable = groupTables.map(({ g, rows }) => `
    <div class="card">
      <div class="card-h"><span class="gtag disp">${esc(g)}</span><h2 style="font-size:13px">Round robin</h2></div>
      <div class="card-b" style="padding:6px">
        <table class="tbl">
          <thead><tr><th class="rankcell">#</th><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
          <tbody>${rows.map((t, i) =>
            `<tr class="${i < 2 ? "qual" : ""}">
              <td class="rankcell">${rankBadge(i)}</td>
              <td class="tname">${esc(t.name)}</td>
              <td class="c num">${t.P}</td><td class="c num">${t.W}</td><td class="c num">${t.D}</td>
              <td class="c num">${t.L}</td><td class="c num">${pd(t.PD)}</td>
              <td class="c num" style="font-weight:700">${t.Pts}</td>
            </tr>`
          ).join("")}</tbody>
        </table>
      </div>
    </div>`
  ).join("");

  const ltable = `
    <div class="card">
      <div class="card-h">${ic("medal", 16, "var(--orange)")}<h2>Overall standings</h2><span class="sub">Seeds the double-elimination bracket</span></div>
      <div class="card-b" style="padding:6px 8px">
        <table class="tbl">
          <thead><tr><th class="rankcell">Seed</th><th>Team</th><th>Group</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">PF</th><th class="c">PA</th><th class="c">PD</th><th class="c">Pts</th></tr></thead>
          <tbody>${league.map((t, i) =>
            `<tr>
              <td class="rankcell">${rankBadge(i)}</td>
              <td class="tname">${esc(t.name)}</td>
              <td><span class="pill pill-grey">${esc(t.group)}</span></td>
              <td class="c num">${t.P}</td><td class="c num">${t.W}</td><td class="c num">${t.D}</td>
              <td class="c num">${t.L}</td><td class="c num">${t.PF}</td><td class="c num">${t.PA}</td>
              <td class="c num">${pd(t.PD)}</td><td class="c num" style="font-weight:700">${t.Pts}</td>
            </tr>`
          ).join("")}</tbody>
        </table>
      </div>
    </div>`;

  return `
    <h3 class="sec-title">Group standings</h3>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">${gtable}</div>
    <h3 class="sec-title mt24">League table — Day 2 seeding</h3>
    ${ltable}
    <div class="banner banner-info mt18">
      ${ic("trophy", 16)}<span>Tiebreakers, in order: games won → points → point difference → head-to-head record (then points scored). These seeds feed the Day 2 bracket.</span>
    </div>`;
}
