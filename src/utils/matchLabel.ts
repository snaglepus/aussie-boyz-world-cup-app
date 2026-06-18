import { Match } from '../data/types';
import { formatKickoffTime } from './time';

/**
 * The single value a match shows on the map marker: the score for live/finished
 * games, otherwise the kickoff time (or "TBD"). Shared by the web (Leaflet) and
 * native (react-native-maps) markers so both read identically.
 */
export function matchScoreOrTime(match: Match): string {
  if (match.status === 'live' || match.status === 'finished') {
    return `${match.homeScore ?? 0}–${match.awayScore ?? 0}`;
  }
  return formatKickoffTime(match.kickoff ? new Date(match.kickoff) : null) || 'TBD';
}
