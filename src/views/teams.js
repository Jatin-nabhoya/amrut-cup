/* ===== View: Teams & Groups tab ===== */
function vTeams() {
  const groups = groupsOf();
  const grouped = {};
  S.teams.forEach(t => (grouped[t.group] = grouped[t.group] || []).push(t));
  const datalist = `<datalist id="grouplist">${groups.map(g => `<option value="${esc(g)}">`).join("")}</datalist>`;

  const left = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-h">${ic("plus", 16, "var(--orange)")}<h2>Add a team</h2></div>
        <div class="card-b grid" style="gap:12px">
          <div class="field"><label>Team name</label><input class="inp" data-ui="newName" id="newName" value="${esc(S.ui.newName)}" placeholder="e.g. Net Ninjas"></div>
          <div class="field"><label>Group</label><input class="inp" data-ui="newGroup" list="grouplist" value="${esc(S.ui.newGroup)}" placeholder="Group A">${datalist}</div>
          <button class="btn btn-accent" data-act="addTeam">${ic("plus", 15)} Add team</button>
        </div>
      </div>
      <div class="card">
        <div class="card-h">${ic("upload", 16, "var(--muted)")}<h2>Bulk upload</h2></div>
        <div class="card-b grid" style="gap:12px">
          <div class="field">
            <label>One team per line · optional <code style="font-size:11px">Name, Group</code></label>
            <textarea class="inp" rows="5" data-ui="bulk" placeholder="Net Ninjas, Group A&#10;Spike Force, Group A&#10;Block Party, Group B">${esc(S.ui.bulk)}</textarea>
          </div>
          <div class="flex gap8 wrap">
            <button class="btn btn-primary btn-sm" data-act="parseBulk" ${S.ui.bulk.trim() ? "" : "disabled"}>Add from list</button>
            <button class="btn btn-sm" data-act="import">${ic("upload", 14)} Upload ${window.XLSX ? "Excel / " : ""}CSV</button>
          </div>
          <div class="banner banner-info" style="font-size:12.5px;padding:9px 12px">
            ${ic("download", 15)}<span>New here? <b style="cursor:pointer;text-decoration:underline" data-act="template">Download the ${window.XLSX ? "Excel" : "CSV"} template</b>, fill in teams and groups, then upload it back. The header row is ignored.</span>
          </div>
          <div class="flex ac gap8" style="border-top:1px solid var(--line2);padding-top:12px">
            <span class="muted" style="font-size:12px">Auto-split into</span>
            <input class="inp num" style="width:56px" type="number" min="1" max="8" data-ui="autoN" value="${esc(S.ui.autoN)}">
            <span class="muted" style="font-size:12px">groups</span>
            <button class="btn btn-sm right" data-act="autoAssign" ${S.teams.length ? "" : "disabled"}>Distribute</button>
          </div>
        </div>
      </div>
    </div>`;

  let listHtml;
  if (!S.teams.length) {
    listHtml = empty("users", "No teams yet", "Add teams one at a time or paste a whole list in the bulk uploader.");
  } else {
    listHtml = `<div style="display:flex;flex-direction:column;gap:18px">${
      Object.keys(grouped).sort().map(g => `
        <div>
          <div class="gtitle mb10">
            <span class="gtag disp">${esc(g)}</span>
            <span class="muted" style="font-size:12px">${grouped[g].length} team${grouped[g].length !== 1 ? "s" : ""}</span>
          </div>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
            ${grouped[g].map(t =>
              `<div class="flex ac jb" style="padding:8px 11px;border:1px solid var(--line2);border-radius:9px">
                <span style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</span>
                <button class="btn-ghost btn-sm" style="padding:4px;margin-left:6px" data-act="removeTeam" data-id="${t.id}">${ic("trash", 14)}</button>
              </div>`
            ).join("")}
          </div>
        </div>`
      ).join("")
    }</div>`;
  }

  const right = `
    <div class="card">
      <div class="card-h">
        ${ic("users", 16, "var(--orange)")}<h2>Teams</h2>
        <span class="sub">${S.teams.length} total · ${groups.length} groups</span>
        <button class="btn btn-accent btn-sm right" data-act="generate" ${S.teams.length < 2 ? "disabled" : ""}>
          ${ic("calendar", 14)} ${S.matches.length ? "Regenerate" : "Generate"} schedule
        </button>
      </div>
      <div class="card-b">${listHtml}</div>
    </div>`;

  return `<div class="grid" style="grid-template-columns:${IS_NARROW ? "1fr" : "340px 1fr"};align-items:start">${left}${right}</div>`;
}
