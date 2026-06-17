/**
 * openfootball times look like "13:00 UTC-6". We turn date + that string into an
 * absolute instant, then derive a status (scheduled / live / finished) and a
 * human label. This is what powers the "near-real-time" fallback: when we have
 * no authoritative live feed, a match inside its play window is treated as live.
 */

const FULL_TIME_MINUTES = 115; // 90 + HT + generous stoppage/VAR buffer
const HALF_TIME_FROM = 45;
const HALF_TIME_TO = 60;

export function parseKickoff(date: string, time?: string): Date | null {
  if (!date) return null;
  const m = (time ?? '').match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})?/);
  if (!m) {
    const d = new Date(`${date}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, hh, mm, off] = m;
  const offset = off ? parseInt(off, 10) : 0;
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset).toString().padStart(2, '0');
  const iso = `${date}T${hh.padStart(2, '0')}:${mm}:00${sign}${abs}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export type LiveInfo = {
  status: 'scheduled' | 'live' | 'finished';
  label: string;
  /** Estimated elapsed minute while live (best-effort for the fallback feed). */
  minute: number | null;
};

export function deriveLiveInfo(
  kickoff: Date | null,
  hasFinalScore: boolean,
  now: Date = new Date()
): LiveInfo {
  if (!kickoff) {
    return { status: hasFinalScore ? 'finished' : 'scheduled', label: hasFinalScore ? 'FT' : 'TBD', minute: null };
  }
  const elapsedMin = Math.floor((now.getTime() - kickoff.getTime()) / 60000);

  if (elapsedMin < 0) {
    return { status: 'scheduled', label: formatKickoffLabel(kickoff, now), minute: null };
  }
  if (elapsedMin >= FULL_TIME_MINUTES || (hasFinalScore && elapsedMin >= 95)) {
    return { status: 'finished', label: 'FT', minute: null };
  }
  // Inside the play window → live.
  if (elapsedMin >= HALF_TIME_FROM && elapsedMin < HALF_TIME_TO) {
    return { status: 'live', label: 'HT', minute: 45 };
  }
  const minute = elapsedMin < HALF_TIME_FROM ? elapsedMin + 1 : Math.min(elapsedMin - 15 + 1, 90);
  const label = minute >= 90 ? "90'+" : `${minute}'`;
  return { status: 'live', label, minute };
}

function formatKickoffLabel(kickoff: Date, now: Date): string {
  const sameDay = kickoff.toDateString() === now.toDateString();
  const time = kickoff.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  const day = kickoff.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
}

export function formatMatchDay(kickoff: Date | null, fallbackDate: string): string {
  const d = kickoff ?? new Date(`${fallbackDate}T00:00:00`);
  if (isNaN(d.getTime())) return fallbackDate;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatKickoffTime(kickoff: Date | null): string {
  if (!kickoff) return '';
  return kickoff.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
