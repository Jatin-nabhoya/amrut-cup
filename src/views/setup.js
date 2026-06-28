/* ===== View: Setup tab ===== */
function vSetup() {
  const c = S.config;
  const field = (label, key, type, extra = "", hint = "") =>
    `<div class="field"><label>${label}</label><input class="inp num" type="${type}" data-cfg="${key}" value="${esc(c[key])}" ${extra}>${hint ? `<span class="muted" style="font-size:11.5px">${hint}</span>` : ""}</div>`;
  const autoBlk = Math.max(1, Math.ceil((Number(c.courts) || 1) / 2));

  return `
    <div style="max-width:640px">
      <div class="card">
        <div class="card-h">${ic("settings", 16, "var(--orange)")}<h2>Tournament settings</h2></div>
        <div class="card-b grid" style="grid-template-columns:${IS_NARROW ? "1fr" : "1fr 1fr"};gap:16px">
          <div class="field" style="grid-column:1/-1"><label>Tournament name</label><input class="inp" data-cfg="name" value="${esc(c.name)}"></div>
          ${field("Number of courts",      "courts",       "number", 'min="1" max="12"')}
          ${field("Time per match (min)",  "matchMinutes", "number", 'min="5" max="120"')}
          ${field("Max points per game",   "maxPoints",    "number", 'min="5" max="99"')}
          <div class="field"><label>First match start</label><input class="inp num" type="time" data-cfg="startTime" value="${esc(c.startTime)}"></div>
          ${field("Courts per shared block", "blockSize",  "number", `min="0" max="${c.courts}" placeholder="Auto (${autoBlk})"`,
            "When groups outnumber courts, overflow groups rotate within a block of this many courts. Lower = less movement; higher = more parallel matches. 0 = auto.")}
          ${field("Points awarded per win",  "winPoints",  "number", 'min="1" max="5"')}
          ${field("Points awarded per draw", "drawPoints", "number", 'min="0" max="5"')}
        </div>
      </div>
      <div class="banner banner-info mt18">
        ${ic("flag", 16)}<span>Format: <b>Day 1</b> single round-robin within each group · one timed game per match to ${c.maxPoints} (${c.winPoints} pts win / ${c.drawPoints} pt draw if level on the clock) · standings seed the <b>Day 2 double-elimination</b> bracket.</span>
      </div>
      <div class="card mt18">
        <div class="card-h">${ic("download", 16, "var(--muted)")}<h2>Backup & data</h2><span class="sub">Saved on this device automatically</span></div>
        <div class="card-b flex wrap gap10">
          <button class="btn" data-act="export">${ic("download", 15)} Export to file</button>
          <button class="btn" data-act="import">${ic("upload",   15)} Import file</button>
          <button class="btn btn-danger" data-act="reset">${ic("refresh", 15)} Reset tournament</button>
        </div>
      </div>
    </div>`;
}
