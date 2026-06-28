/* ===== State & persistence  (localStorage, works from file://) ===== */
const LS_KEY = "vbt_html_v1";
var S = {
  tab: "overview",
  config: { ...DEFAULT_CONFIG },
  teams: [],
  matches: [],
  bracket: null,
  bracketResults: {},
  ui: { newName: "", newGroup: "Group A", bulk: "", autoN: 2, fGroup: "all", fStatus: "all", drafts: {}, d2drafts: {} }
};
function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      config: S.config, teams: S.teams, matches: S.matches, bracket: S.bracket, bracketResults: S.bracketResults
    }));
  } catch (e) { /* private mode / file restrictions: in-memory only */ }
}
function loadState() {
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) {
      const d = JSON.parse(r);
      if (d.config) S.config = { ...DEFAULT_CONFIG, ...d.config };
      if (d.teams) S.teams = d.teams;
      if (d.matches) S.matches = d.matches;
      if (d.bracket) S.bracket = d.bracket;
      if (d.bracketResults) S.bracketResults = d.bracketResults;
    }
  } catch (e) {}
}

/* ===== Derived helpers (read S + pure logic, used across views/actions/viewer) ===== */
var groupsOf   = () => [...new Set(S.teams.map(t => t.group))].sort();
var teamNameMap = () => { const m = {}; S.teams.forEach(t => (m[t.id] = t.name)); return m; };
var statsOf    = () => computeStats(S.teams, S.matches, S.config.winPoints, S.config.drawPoints);
var seedingOf  = () => rankTeams(statsOf(), S.matches, S.config.winPoints, S.config.drawPoints);
var resolvedOf = () => resolveBracket(S.bracket, S.bracketResults);
var day1Done   = () => S.matches.length > 0 && S.matches.every(m => m.done);
var doneCount  = () => S.matches.filter(m => m.done).length;
function courtPlanOf() {
  const m = {};
  S.matches.forEach(x => { (m[x.group] = m[x.group] || new Set()).add(x.court); });
  return Object.keys(m).sort().map(g => ({ group: g, courts: [...m[g]].sort((a, b) => a - b) }));
}
function scheduleStale() {
  if (!S.matches.length) return false;
  const ids = new Set(S.teams.map(t => t.id));
  const inM = new Set();
  S.matches.forEach(m => { inM.add(m.teamA); inM.add(m.teamB); });
  for (const id of inM) if (!ids.has(id)) return true;
  for (const t of S.teams) if (!inM.has(t.id)) return true;
  return false;
}
