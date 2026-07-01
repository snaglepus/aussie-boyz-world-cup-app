// Builds the Golden Boot tie-breaker snapshot at build time and writes it to
// dist/players-stats.json, so the leaderboard can rank players by the official
// rule (goals → assists → fewest minutes) without every browser scraping ESPN.
//
// Goals stay sourced from openfootball on the client (complete + reliable); this
// only adds ASSISTS and MINUTES per player from ESPN's keyless summary feed:
//   - assists: each roster player carries a per-match `goalAssists` stat.
//   - minutes: derived from starter/subbed flags + the Substitution events' clock.
//
// Best-effort and keyless: any match we can't place on ESPN is simply skipped, so
// missing data only weakens tie-breaks, never the (openfootball) goal totals.
import fs from 'node:fs';
import path from 'node:path';

const OPENFOOTBALL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';
const OUT = path.resolve('dist', 'players-stats.json');
const OUT_SHOOTOUTS = path.resolve('dist', 'shootouts.json');

// "Kai Havertz" → "K. Havertz"; single names pass through unchanged.
function shortName(full) {
  const parts = String(full ?? '').trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

/** Shared with the client (src/data/playerStats.ts) — keep identical. */
function normName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// openfootball name → acceptable ESPN substrings, for the handful that differ.
const ALIASES = {
  usa: ['united states', 'usa'],
  'south korea': ['korea republic', 'korea'],
  'ivory coast': ['ivory coast', 'cote divoire'],
  turkey: ['turkey', 'turkiye'],
  'dr congo': ['congo dr', 'congo'],
  'cape verde': ['cape verde', 'cabo verde'],
  'czech republic': ['czech republic', 'czechia'],
  'bosnia & herzegovina': ['bosnia'],
};

function sameTeam(off, esp) {
  const a = normName(off);
  const b = normName(esp);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const al = ALIASES[a];
  return !!al && al.some((x) => b.includes(x) || x.includes(b));
}

function parseMin(disp) {
  const m = String(disp ?? '').match(/(\d+)(?:\+(\d+))?/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) : 0) : 0;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const nm = (x) => (typeof x === 'string' ? x : x?.name ?? '');
const ymd = (date) => String(date ?? '').replace(/-/g, '');

async function main() {
  let matches;
  try {
    const wc = await getJson(OPENFOOTBALL);
    matches = (wc.matches ?? []).filter((m) => m?.score?.ft);
  } catch (e) {
    console.log('[players] openfootball fetch failed:', e.message, '— skipping snapshot.');
    return;
  }

  // One scoreboard fetch per distinct date, reused across that day's fixtures.
  const sbCache = new Map();
  const getScoreboard = async (d) => {
    if (sbCache.has(d)) return sbCache.get(d);
    let events = [];
    try {
      const sb = await getJson(`${SCOREBOARD}?dates=${d}`);
      events = sb?.events ?? [];
    } catch {
      // leave empty
    }
    sbCache.set(d, events);
    return events;
  };

  const players = new Map(); // normName -> { name, assists, minutes }
  const shootouts = {}; // `of-${num}` -> { home: [{player, scored}], away: [...] }
  const bump = (displayName, inc) => {
    const key = normName(displayName);
    if (!key) return;
    const cur = players.get(key) ?? { name: displayName, assists: 0, minutes: 0, shots: 0, sot: 0, yellow: 0, red: 0, jersey: null };
    cur.assists += inc.assists;
    cur.minutes += inc.minutes;
    cur.shots += inc.shots;
    cur.sot += inc.sot;
    cur.yellow += inc.yellow;
    cur.red += inc.red;
    if (inc.jersey != null) cur.jersey = inc.jersey; // constant per player
    players.set(key, cur);
  };

  let placed = 0;
  for (const m of matches) {
    const t1 = nm(m.team1);
    const t2 = nm(m.team2);
    const d = ymd(m.date);
    try {
      const events = await getScoreboard(d);
      const ev = events.find((e) => {
        const comps = e?.competitions?.[0]?.competitors ?? [];
        const names = comps.map((c) => c?.team?.displayName ?? '');
        return names.length >= 2 && ((sameTeam(t1, names[0]) && sameTeam(t2, names[1])) || (sameTeam(t1, names[1]) && sameTeam(t2, names[0])));
      });
      if (!ev) continue;
      const sum = await getJson(`${SUMMARY}?event=${ev.id}`);

      // Penalty shootout takers, in order, mapped to this match's home/away side.
      if (Array.isArray(sum?.shootout) && sum.shootout.length && m.num != null) {
        const entry = {};
        for (const block of sum.shootout) {
          const side = sameTeam(t1, block?.team) ? 'home' : sameTeam(t2, block?.team) ? 'away' : null;
          if (!side) continue;
          entry[side] = (block.shots ?? [])
            .slice()
            .sort((a, b) => (a?.shotNumber ?? 0) - (b?.shotNumber ?? 0))
            .map((s) => ({ player: shortName(s?.player), scored: s?.didScore === true }));
        }
        if (entry.home || entry.away) shootouts[`of-${m.num}`] = entry;
      }

      // Substitution clocks: participants[0] comes on, participants[1] goes off.
      const onMin = new Map();
      const offMin = new Map();
      for (const k of sum?.keyEvents ?? []) {
        if (!/substitution/i.test(k?.type?.text ?? '')) continue;
        const min = parseMin(k?.clock?.displayValue);
        const on = k?.participants?.[0]?.athlete?.id;
        const off = k?.participants?.[1]?.athlete?.id;
        if (on != null) onMin.set(String(on), min);
        if (off != null) offMin.set(String(off), min);
      }

      const END = 90; // nominal full-time; minutes is only the 3rd tie-breaker
      for (const team of sum?.rosters ?? []) {
        for (const p of team?.roster ?? []) {
          const id = String(p?.athlete?.id ?? '');
          const name = p?.athlete?.displayName ?? '';
          const stat = (n) => Number((p?.stats ?? []).find((s) => s?.name === n)?.value) || 0;
          const assists = stat('goalAssists');
          const shots = stat('totalShots');
          const sot = stat('shotsOnTarget');
          const yellow = stat('yellowCards');
          const red = stat('redCards');
          const jersey = Number(p?.jersey) || null; // squad number, constant per player
          let minutes = 0;
          if (p?.starter) minutes = (offMin.has(id) ? offMin.get(id) : END);
          else if (p?.subbedIn || onMin.has(id)) minutes = (offMin.has(id) ? offMin.get(id) : END) - (onMin.get(id) ?? END);
          minutes = Math.max(0, Math.min(END, minutes));
          if (minutes > 0 || assists > 0 || shots > 0 || sot > 0 || yellow > 0 || red > 0)
            bump(name, { assists, minutes, shots, sot, yellow, red, jersey });
        }
      }
      placed += 1;
    } catch {
      // skip this match
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    matchesPlaced: placed,
    matchesTotal: matches.length,
    players: Object.fromEntries(
      [...players.entries()].map(([k, v]) => [
        k,
        { assists: v.assists, minutes: v.minutes, shots: v.shots, sot: v.sot, yellow: v.yellow, red: v.red, jersey: v.jersey },
      ])
    ),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`[players] Wrote ${OUT}: ${players.size} players from ${placed}/${matches.length} matches.`);

  fs.writeFileSync(OUT_SHOOTOUTS, JSON.stringify({ updatedAt: new Date().toISOString(), shootouts }));
  console.log(`[players] Wrote ${OUT_SHOOTOUTS}: ${Object.keys(shootouts).length} shootouts.`);
}

main()
  .catch((e) => console.log('[players] Failed:', e.message, '— skipping snapshot.'))
  .finally(() => process.exit(0));
