export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type TeamRef = {
  /** Display name, e.g. "South Korea". */
  name: string;
  /** Short code for tight contexts, e.g. "KOR". */
  code: string;
  /** ISO-3166 alpha-2 (lowercase) for flag lookup, or null for placeholders. */
  iso: string | null;
  /** True for not-yet-decided knockout slots like "Winner R16" or "2A". */
  isPlaceholder: boolean;
};

export type GoalEvent = {
  name: string;
  minute: string;
  penalty?: boolean;
  ownGoal?: boolean;
  team: 'home' | 'away';
};

export type CardEvent = {
  name: string;
  minute: string;
  color: 'yellow' | 'red';
  team: 'home' | 'away';
};

export type MatchStats = {
  label: string;
  home: number;
  away: number;
  /** When true, values are rendered as percentages. */
  percent?: boolean;
};

/**
 * Three-way match odds as de-vigged implied probabilities (home + draw + away ≈ 1),
 * parsed from a bookmaker's moneyline. `live` is true when these are the in-play
 * (`current`) prices that move during the match, false for the pre-match line.
 */
export type MatchOdds = {
  home: number;
  draw: number;
  away: number;
  live: boolean;
};

export type Match = {
  id: string;
  round: string;
  group?: string;
  date: string;
  time: string;
  /** Absolute kickoff time, derived from date + time + UTC offset. */
  kickoff: string | null;
  ground?: string;
  home: TeamRef;
  away: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  htScore: [number, number] | null;
  goals: GoalEvent[];
  cards: CardEvent[];
  stats: MatchStats[];
  penalties: { home: number; away: number } | null;
  /** 3-way match odds (live when in play), when a bookmaker line is available. */
  odds?: MatchOdds | null;
  status: MatchStatus;
  /** Live minute / status label, e.g. "67'", "HT", "FT". */
  statusLabel: string;
  /** Where the data came from, surfaced subtly in the UI. */
  source: 'live' | 'static';
  /** Raw bracket slot codes for knockout fixtures, e.g. "1A", "2B", "3A/B/C/D/F",
   * "W73" — used to resolve the knockout bracket. Undefined for group games. */
  homeSlot?: string;
  awaySlot?: string;
};

export type Standing = {
  team: TeamRef;
  mp: number;
  w: number;
  d: number;
  l: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  /** Oldest → newest results, used for the "Last 5" form pills. */
  form: ('W' | 'D' | 'L')[];
};

export type GroupTable = {
  group: string;
  rows: Standing[];
};

export type WorldCupData = {
  matches: Match[];
  groups: GroupTable[];
  /** ISO timestamp of when this snapshot was produced. */
  updatedAt: string;
  source: 'live' | 'static' | 'bundled';
};
