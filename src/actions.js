/* ===== Actions — all user-triggered state mutations ===== */

function addTeam() {
  const name = S.ui.newName.trim();
  if (!name) return;
  S.teams.push({ id: uid(), name, group: (S.ui.newGroup || "Group A").trim() });
  S.ui.newName = "";
  rerender();
}
function parseBulk(text) {
  const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const added = [];
  rows.forEach((line, i) => {
    const parts = line.split(",").map(s => s.trim());
    const name = parts[0];
    if (!name) return;
    if (i === 0 && /^(team\s*name|team|name|teams)$/i.test(name)) return;
    added.push({ id: uid(), name, group: parts[1] || (S.ui.newGroup || "Group A").trim() });
  });
  if (added.length) S.teams = S.teams.concat(added);
  S.ui.bulk = "";
  rerender();
}
function importRows(rows) {
  const added = [];
  rows.forEach((r, i) => {
    const name = String(r[0] == null ? "" : r[0]).trim();
    if (!name) return;
    if (i === 0 && /^(team\s*name|team|name|teams)$/i.test(name)) return;
    added.push({ id: uid(), name, group: String(r[1] == null ? "" : r[1]).trim() || (S.ui.newGroup || "Group A").trim() });
  });
  if (added.length) { S.teams = S.teams.concat(added); rerender(); }
}
function autoAssign() {
  if (!S.teams.length) return;
  const n = Math.max(1, Math.min(8, Number(S.ui.autoN) || 2));
  const labels = Array.from({ length: n }, (_, i) => "Group " + String.fromCharCode(65 + i));
  S.teams = S.teams.map((t, i) => ({ ...t, group: labels[i % n] }));
  rerender();
}
function removeTeam(id) { S.teams = S.teams.filter(t => t.id !== id); rerender(); }

function generate() {
  if (S.teams.length < 2) return;
  if (S.matches.length && !confirm("This rebuilds the schedule and clears all entered scores. Continue?")) return;
  const C = Math.max(1, Number(S.config.courts) || 1);
  const bs = S.config.blockSize > 0 ? Math.min(S.config.blockSize, C) : Math.max(1, Math.ceil(C / 2));
  S.matches = buildSchedule(S.teams, C, bs);
  S.ui.drafts = {};
  S.tab = "matches";
  rerender();
}
function saveResult(id) {
  const d = S.ui.drafts[id] || {};
  const a = parseInt(d.a, 10), b = parseInt(d.b, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return alert("Enter both scores.");
  const cap = Number(S.config.maxPoints);
  if (a > cap || b > cap) return alert("Scores can't exceed the " + cap + "-point cap.");
  const m = S.matches.find(x => x.id === id);
  if (m) { m.scoreA = a; m.scoreB = b; m.done = true; }
  rerender();
}
function editResult(id) {
  const m = S.matches.find(x => x.id === id);
  if (m) { S.ui.drafts[id] = { a: String(m.scoreA), b: String(m.scoreB) }; m.done = false; }
  rerender();
}
function generateBracket() {
  if (S.teams.length < 2) return;
  if (S.bracket && Object.keys(S.bracketResults).length &&
    !confirm("This rebuilds the Day 2 bracket and clears all Day 2 results. Continue?")) return;
  if (!day1Done() && !confirm("Day 1 isn't finished, so seeds may still change. Generate from current standings anyway?")) return;
  S.bracket = buildBracket(seedingOf().map(t => t.id));
  S.bracketResults = {};
  S.ui.d2drafts = {};
  rerender();
}
function saveBracketResult(id) {
  const d = S.ui.d2drafts[id] || {};
  const a = parseInt(d.a, 10), b = parseInt(d.b, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return alert("Enter both scores.");
  if (a === b) return alert("A knockout match needs a winner — scores can't be equal.");
  const cap = Number(S.config.maxPoints);
  if (a > cap || b > cap) return alert("Scores can't exceed the " + cap + "-point cap.");
  S.bracketResults[id] = { a, b };
  rerender();
}
function editBracketResult(id) {
  const m = S.bracket.matches.find(x => x.id === id);
  const stage = m ? m.stage : -1;
  const next = { ...S.bracketResults };
  delete next[id];
  S.bracket.matches.forEach(bm => { if (bm.stage > stage) delete next[bm.id]; });
  S.bracketResults = next;
  const r = resolvedOf().byId[id];
  S.ui.d2drafts[id] = { a: String(r && r.sa != null ? r.sa : ""), b: String(r && r.sb != null ? r.sb : "") };
  rerender();
}

function downloadTemplate() {
  const data = [
    ["Team Name", "Group"],
    ["Net Ninjas",  "Group A"], ["Spike Force",  "Group A"], ["Sand Sharks", "Group A"],
    ["Block Party", "Group B"], ["Dig Dynasty",  "Group B"], ["Set for Life", "Group B"]
  ];
  if (window.XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 22 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teams");
    XLSX.writeFile(wb, "teams_template.xlsx");
  } else {
    const csv = data.map(r => r.join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "teams_template.csv");
  }
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
function exportData() {
  downloadBlob(
    new Blob([JSON.stringify({ config: S.config, teams: S.teams, matches: S.matches, bracket: S.bracket, bracketResults: S.bracketResults }, null, 2)], { type: "application/json" }),
    (S.config.name || "tournament").replace(/\s+/g, "_") + "_tournament.json"
  );
}
function importFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const reader = new FileReader();
  if ((ext === "xlsx" || ext === "xls") && window.XLSX) {
    reader.onload = () => {
      try {
        const wb = XLSX.read(new Uint8Array(reader.result), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
        importRows(rows);
      } catch (e) { alert("Could not read that Excel file."); }
    };
    reader.readAsArrayBuffer(file);
  } else if (ext === "xlsx" || ext === "xls") {
    alert("Excel reading needs an internet connection here. Open the file and Save As CSV, then upload the CSV.");
  } else {
    reader.onload = () => {
      try {
        if (ext === "json") {
          const d = JSON.parse(reader.result);
          if (d.config) S.config = { ...DEFAULT_CONFIG, ...d.config };
          if (d.teams) S.teams = d.teams;
          if (d.matches) S.matches = d.matches;
          if (d.bracket !== undefined) S.bracket = d.bracket;
          if (d.bracketResults) S.bracketResults = d.bracketResults;
          rerender();
        } else {
          parseBulk(reader.result);
        }
      } catch (e) { alert("Could not read that file."); }
    };
    reader.readAsText(file);
  }
}
function resetAll() {
  if (!confirm("Clear everything and start a new tournament? This can't be undone.")) return;
  S.config = { ...DEFAULT_CONFIG }; S.teams = []; S.matches = []; S.bracket = null; S.bracketResults = {};
  S.ui.drafts = {}; S.ui.d2drafts = {};
  rerender();
}
