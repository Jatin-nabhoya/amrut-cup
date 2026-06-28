/* ===== Tournament logic (scheduler, standings, double-elim engine) ===== */
var DEFAULT_CONFIG = {
  name: "Spike City Open",
  courts: 2,
  matchMinutes: 20,
  maxPoints: 21,
  startTime: "09:00",
  winPoints: 2,
  drawPoints: 1,
  blockSize: 0, // courts per shared block (0 = auto: half the courts)
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
var uid = () => Math.random().toString(36).slice(2, 9);

function roundRobinRounds(ids) {
  const arr = [...ids];
  if (arr.length % 2) arr.push(null); // bye marker
  const n = arr.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a != null && b != null) pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()); // rotate, keep first fixed
  }
  return rounds;
}

// Assign each group a set of courts, minimising how much teams move between courts.
//  - Fewer/equal groups than courts (G <= C): every group gets its OWN private block of
//    courts (spare courts shared out evenly), so a group runs several matches in parallel
//    without ever sharing a court with another group.
//  - More groups than courts (G > C): the first C groups each keep a fixed home court; the
//    overflow groups rotate within a court "block" of size `blockSize` instead of every court.
function allocateCourts(groupNames, courts, blockSize) {
  const C = Math.max(1, courts);
  const G = groupNames.length;
  const alloc = {};
  if (G === 0) return alloc;

  if (G <= C) {
    // each group gets floor(C/G) or ceil(C/G) contiguous courts; no inter-group sharing
    const base = Math.floor(C / G);
    let extra = C % G;
    let next = 1;
    groupNames.forEach((g) => {
      const size = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      const blk = [];
      for (let k = 0; k < size; k++) blk.push(next++);
      alloc[g] = { home: blk[0], courts: blk, fixed: blk.length === 1 };
    });
    return alloc;
  }

  // G > C: contiguous blocks of `blockSize`; first C groups fixed, overflow rotates in a block
  const bs = Math.min(Math.max(1, blockSize || 1), C);
  const blocks = [];
  for (let c = 1; c <= C; c += bs) {
    const blk = [];
    for (let k = c; k <= Math.min(c + bs - 1, C); k++) blk.push(k);
    blocks.push(blk);
  }
  groupNames.forEach((g, i) => {
    if (i < C) alloc[g] = { home: i + 1, courts: [i + 1], fixed: true };
  });
  groupNames.slice(C).forEach((g, k) => {
    const blk = blocks[k % blocks.length];
    alloc[g] = { home: null, courts: [...blk], fixed: false };
  });
  return alloc;
}

function buildSchedule(teams, courts, blockSize) {
  const C = Math.max(1, courts);
  const byGroup = {};
  teams.forEach((t) => { (byGroup[t.group] = byGroup[t.group] || []).push(t.id); });
  const groupNames = Object.keys(byGroup).sort();
  const alloc = allocateCourts(groupNames, C, blockSize);

  // round-robin rounds per group
  const groupRounds = {};
  let maxR = 0;
  groupNames.forEach((g) => {
    groupRounds[g] = roundRobinRounds(byGroup[g]);
    maxR = Math.max(maxR, groupRounds[g].length);
  });

  // flatten round-major, then by group, so concurrent play spreads across groups
  const pending = [];
  for (let r = 0; r < maxR; r++) {
    groupNames.forEach((g) => {
      const round = groupRounds[g][r];
      if (round) round.forEach(([a, b]) =>
        pending.push({ id: uid(), phase: "rr", group: g, round: r + 1, teamA: a, teamB: b, scoreA: null, scoreB: null, done: false })
      );
    });
  }

  // greedy slot scheduler: a match may only use a court in its group's allowed set,
  // preferring the home court so fixed groups never move.
  const out = [];
  const remaining = [...pending];
  let slot = 0;
  const guard = pending.length * C + pending.length + 10;
  while (remaining.length && slot < guard) {
    const usedCourts = new Set();
    const busy = new Set();
    for (let idx = 0; idx < remaining.length; ) {
      const m = remaining[idx];
      const a = alloc[m.group];
      const candidates = a.home ? [a.home, ...a.courts.filter((c) => c !== a.home)] : a.courts;
      let placed = false;
      for (const c of candidates) {
        if (!usedCourts.has(c) && !busy.has(m.teamA) && !busy.has(m.teamB)) {
          usedCourts.add(c); busy.add(m.teamA); busy.add(m.teamB);
          m.slot = slot; m.court = c;
          out.push(m);
          remaining.splice(idx, 1);
          placed = true;
          break;
        }
      }
      if (!placed) idx++;
    }
    slot++;
  }
  remaining.forEach((m) => { m.slot = slot++; m.court = alloc[m.group].courts[0]; out.push(m); });
  return out;
}

function addMinutes(hhmm, mins) {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function computeStats(teams, matches, winPoints, drawPoints) {
  const map = {};
  teams.forEach((t) => {
    map[t.id] = { id: t.id, name: t.name, group: t.group, P: 0, W: 0, D: 0, L: 0, PF: 0, PA: 0, Pts: 0 };
  });
  matches.forEach((m) => {
    if (!m.done) return;
    const a = map[m.teamA];
    const b = map[m.teamB];
    if (!a || !b) return;
    a.P++; b.P++;
    a.PF += m.scoreA; a.PA += m.scoreB;
    b.PF += m.scoreB; b.PA += m.scoreA;
    if (m.scoreA > m.scoreB) { a.W++; b.L++; a.Pts += winPoints; }
    else if (m.scoreB > m.scoreA) { b.W++; a.L++; b.Pts += winPoints; }
    else { a.D++; b.D++; a.Pts += drawPoints; b.Pts += drawPoints; }
  });
  return Object.values(map).map((t) => ({ ...t, PD: t.PF - t.PA }));
}

// Head-to-head record computed only among a set of tied teams.
function headToHead(ids, matches, winPoints, drawPoints) {
  const set = new Set(ids);
  const m = {};
  ids.forEach((id) => (m[id] = { pts: 0, pd: 0 }));
  matches.forEach((mt) => {
    if (!mt.done || !set.has(mt.teamA) || !set.has(mt.teamB)) return;
    const A = m[mt.teamA];
    const B = m[mt.teamB];
    A.pd += mt.scoreA - mt.scoreB;
    B.pd += mt.scoreB - mt.scoreA;
    if (mt.scoreA > mt.scoreB) A.pts += winPoints;
    else if (mt.scoreB > mt.scoreA) B.pts += winPoints;
    else { A.pts += drawPoints; B.pts += drawPoints; }
  });
  return m;
}

// Rank order: games won -> points -> point difference -> head-to-head.
// (final fallback: total points scored, then name, for full determinism)
function rankTeams(list, matches, winPoints, drawPoints) {
  const base = [...list].sort(
    (a, b) => b.W - a.W || b.Pts - a.Pts || b.PD - a.PD
  );
  const out = [];
  let i = 0;
  while (i < base.length) {
    let j = i + 1;
    while (
      j < base.length &&
      base[j].W === base[i].W &&
      base[j].Pts === base[i].Pts &&
      base[j].PD === base[i].PD
    ) j++;
    const cluster = base.slice(i, j);
    if (cluster.length > 1) {
      const h2h = headToHead(cluster.map((t) => t.id), matches, winPoints, drawPoints);
      cluster.sort(
        (a, b) =>
          h2h[b.id].pts - h2h[a.id].pts ||
          h2h[b.id].pd - h2h[a.id].pd ||
          b.PF - a.PF ||
          a.name.localeCompare(b.name)
      );
    }
    out.push(...cluster);
    i = j;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Day 2 — double elimination bracket engine                          */
/* ------------------------------------------------------------------ */
const nextPow2 = (n) => { let p = 1; while (p < n) p *= 2; return p; };

// seed positions for a single-elim bracket of size P (keeps top seeds apart)
function bracketSeedOrder(P) {
  let seeds = [1];
  for (let r = 1; (1 << r) <= P; r++) {
    const m = (1 << r) + 1;
    const next = [];
    for (const s of seeds) { next.push(s); next.push(m - s); }
    seeds = next;
  }
  return seeds;
}

// Build the static double-elimination structure (no results yet).
// seedIds: team ids in seed order (seed 1 first). Returns { matches, stages, P, N, d, lbRounds, seedIds }.
function buildBracket(seedIds) {
  const N = seedIds.length;
  const P = nextPow2(N);
  const d = Math.round(Math.log2(P));      // winners-bracket rounds
  const lbRounds = 2 * d - 2;              // losers-bracket rounds
  const order = bracketSeedOrder(P);
  const id = (b, r, p) => `${b}-${r}-${p}`;
  const matches = [];

  // ----- Winners bracket -----
  for (let p = 0; p < P / 2; p++) {
    matches.push({ id: id("W", 1, p), bracket: "W", round: 1, pos: p,
      a: { kind: "seed", seed: order[2 * p] }, b: { kind: "seed", seed: order[2 * p + 1] } });
  }
  for (let r = 2; r <= d; r++) {
    const cnt = P / 2 ** r;
    for (let p = 0; p < cnt; p++) {
      matches.push({ id: id("W", r, p), bracket: "W", round: r, pos: p,
        a: { kind: "win", of: id("W", r - 1, 2 * p) }, b: { kind: "win", of: id("W", r - 1, 2 * p + 1) } });
    }
  }

  // ----- Losers bracket -----
  for (let k = 1; k <= lbRounds; k++) {
    const pairIndex = Math.ceil(k / 2);
    const cnt = P / 2 ** (pairIndex + 1);
    for (let p = 0; p < cnt; p++) {
      let a, b;
      if (k === 1) {
        a = { kind: "lose", of: id("W", 1, 2 * p) };
        b = { kind: "lose", of: id("W", 1, 2 * p + 1) };
      } else if (k % 2 === 0) {
        // major round: LB winner vs a WB dropper (reversed to delay rematches)
        const wbRound = k / 2 + 1;
        const wbCnt = P / 2 ** wbRound;
        a = { kind: "win", of: id("L", k - 1, p) };
        b = { kind: "lose", of: id("W", wbRound, wbCnt - 1 - p) };
      } else {
        // minor round: pair up the previous major round's winners
        a = { kind: "win", of: id("L", k - 1, 2 * p) };
        b = { kind: "win", of: id("L", k - 1, 2 * p + 1) };
      }
      matches.push({ id: id("L", k, p), bracket: "L", round: k, pos: p, a, b });
    }
  }

  // ----- Grand final (+ bracket reset) -----
  const lbChampSrc = lbRounds > 0
    ? { kind: "win", of: id("L", lbRounds, 0) }   // winner of losers final
    : { kind: "lose", of: id("W", d, 0) };        // 2-team case: WB-final loser
  matches.push({ id: "GF-1-0", bracket: "GF", round: 1, pos: 0,
    a: { kind: "win", of: id("W", d, 0) }, b: lbChampSrc });
  matches.push({ id: "GF-2-0", bracket: "GF", round: 2, pos: 0,
    a: { kind: "win", of: "GF-1-0" }, b: { kind: "lose", of: "GF-1-0" } });

  // ----- Play order: interleave winners & losers so teams aren't back-to-back -----
  const stages = [{ b: "W", r: 1 }];
  if (lbRounds >= 1) stages.push({ b: "L", r: 1 });
  for (let r = 2; r <= d; r++) {
    stages.push({ b: "W", r });
    stages.push({ b: "L", r: 2 * (r - 1) });
    const minorNext = 2 * (r - 1) + 1;
    if (minorNext <= lbRounds && r < d) stages.push({ b: "L", r: minorNext });
  }
  stages.push({ b: "GF", r: 1 });
  stages.push({ b: "GF", r: 2 });

  const stageIndex = {};
  stages.forEach((s, i) => { stageIndex[`${s.b}-${s.r}`] = i; });
  const stageLabel = (b, r) =>
    b === "W" ? (r < d ? `Winners Round ${r}` : "Winners Final")
      : b === "L" ? (r < lbRounds ? `Losers Round ${r}` : "Losers Final")
        : r === 1 ? "Grand Final" : "Grand Final — Reset";
  matches.forEach((m) => {
    m.stage = stageIndex[`${m.bracket}-${m.round}`];
    m.stageLabel = stageLabel(m.bracket, m.round);
  });

  return { matches, P, N, d, lbRounds, seedIds };
}

const BYE = { bye: true };

// Resolve every slot from the entered results. Pure: recomputed from scratch each call.
// results: { matchId: { a, b } }. Returns { byId, champion } where byId[id] = resolved match.
function resolveBracket(struct, results) {
  const out = {};
  if (!struct) return { byId: out, champion: null };
  const { matches, N, seedIds } = struct;
  const ordered = [...matches].sort((x, y) =>
    x.stage - y.stage || x.bracket.localeCompare(y.bracket) || x.pos - y.pos);

  const tokenFrom = (src) => {
    if (src.kind === "seed") return src.seed > N ? BYE : { id: seedIds[src.seed - 1], seed: src.seed };
    const r = out[src.of];
    if (!r || !r.done) return null;               // upstream not settled yet
    return src.kind === "win" ? r.winner : r.loser;
  };
  const isReal = (t) => t && !t.bye;

  ordered.forEach((m) => {
    const teamA = tokenFrom(m.a);
    const teamB = tokenFrom(m.b);
    const node = { id: m.id, teamA, teamB, winner: null, loser: null, winnerSide: null,
      done: false, auto: false, ready: false, active: true };

    // grand-final reset only matters if the losers' champ won the first grand final
    if (m.id === "GF-2-0") {
      const gf = out["GF-1-0"];
      node.active = !!(gf && gf.done && gf.winnerSide === "b");
      if (!node.active) { out[m.id] = node; return; }
    }

    const aMissing = teamA === null, bMissing = teamB === null;
    if (aMissing || bMissing) {
      // a bye walks over a missing-but-irrelevant side only once both are known; keep TBD
      out[m.id] = node; return;
    }

    if (!isReal(teamA) || !isReal(teamB)) {
      // bye involved -> auto-resolve, no score needed
      node.auto = true; node.done = true; node.ready = true;
      if (isReal(teamA)) { node.winner = teamA; node.loser = teamB; node.winnerSide = "a"; }
      else if (isReal(teamB)) { node.winner = teamB; node.loser = teamA; node.winnerSide = "b"; }
      else { node.winner = BYE; node.loser = BYE; node.winnerSide = "a"; }
      out[m.id] = node; return;
    }

    // genuine contest
    node.ready = true;
    const res = results[m.id];
    if (res && Number.isFinite(res.a) && Number.isFinite(res.b) && res.a !== res.b) {
      node.done = true;
      if (res.a > res.b) { node.winner = teamA; node.loser = teamB; node.winnerSide = "a"; node.sa = res.a; node.sb = res.b; }
      else { node.winner = teamB; node.loser = teamA; node.winnerSide = "b"; node.sa = res.a; node.sb = res.b; }
    }
    out[m.id] = node;
  });

  // champion
  let champion = null;
  const gf1 = out["GF-1-0"], gf2 = out["GF-2-0"];
  if (gf2 && gf2.active && gf2.done) champion = gf2.winner;
  else if (gf1 && gf1.done && gf1.winnerSide === "a") champion = gf1.winner;
  return { byId: out, champion: champion && champion.id ? champion : null };
}
