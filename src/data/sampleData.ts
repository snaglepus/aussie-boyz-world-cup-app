import { RawMatch } from './openfootball';

/**
 * A small bundled snapshot (openfootball shape) so the app always renders
 * something — on first launch, offline, or if both feeds are unreachable.
 * Groups A and B are complete enough to populate a real standings table.
 */
export const SAMPLE_RAW_MATCHES: RawMatch[] = [
  // ---- Group A ----
  { num: 1, round: 'Matchday 1', group: 'Group A', date: '2026-06-11', time: '13:00 UTC-6', team1: 'Mexico', team2: 'South Africa', ground: 'Mexico City', score: { ft: [2, 0], ht: [1, 0] }, goals1: [{ name: 'Julián Quiñones', minute: '9' }, { name: 'Raúl Jiménez', minute: '67' }], goals2: [] },
  { num: 2, round: 'Matchday 1', group: 'Group A', date: '2026-06-11', time: '20:00 UTC-6', team1: 'South Korea', team2: 'Czech Republic', ground: 'Guadalajara', score: { ft: [2, 1], ht: [0, 0] }, goals1: [{ name: 'Hwang In-Beom', minute: '67' }, { name: 'Oh Hyeon-Gyu', minute: '80' }], goals2: [{ name: 'Ladislav Krejčí', minute: '59' }] },
  { num: 18, round: 'Matchday 8', group: 'Group A', date: '2026-06-18', time: '12:00 UTC-4', team1: 'Czech Republic', team2: 'South Africa', ground: 'Atlanta' },
  { num: 19, round: 'Matchday 8', group: 'Group A', date: '2026-06-18', time: '19:00 UTC-6', team1: 'Mexico', team2: 'South Korea', ground: 'Guadalajara' },
  { num: 35, round: 'Matchday 14', group: 'Group A', date: '2026-06-24', time: '19:00 UTC-6', team1: 'Czech Republic', team2: 'Mexico', ground: 'Mexico City' },
  { num: 36, round: 'Matchday 14', group: 'Group A', date: '2026-06-24', time: '19:00 UTC-6', team1: 'South Africa', team2: 'South Korea', ground: 'Monterrey' },
  // ---- Group B ----
  { num: 3, round: 'Matchday 2', group: 'Group B', date: '2026-06-12', time: '15:00 UTC-4', team1: 'Canada', team2: 'Bosnia & Herzegovina', ground: 'Toronto', score: { ft: [1, 1], ht: [0, 1] }, goals1: [{ name: 'Cyle Larin', minute: '78' }], goals2: [{ name: 'Jovo Lukić', minute: '21' }] },
  { num: 4, round: 'Matchday 3', group: 'Group B', date: '2026-06-13', time: '12:00 UTC-7', team1: 'Qatar', team2: 'Switzerland', ground: 'San Francisco Bay Area', score: { ft: [1, 1], ht: [0, 1] }, goals1: [{ name: 'Boualem Khoukhi', minute: '90+4' }], goals2: [{ name: 'Breel Embolo', minute: '17', penalty: true }] },
  { num: 20, round: 'Matchday 8', group: 'Group B', date: '2026-06-18', time: '12:00 UTC-7', team1: 'Switzerland', team2: 'Bosnia & Herzegovina', ground: 'San Francisco Bay Area' },
  { num: 21, round: 'Matchday 9', group: 'Group B', date: '2026-06-18', time: '18:00 UTC-4', team1: 'Canada', team2: 'Qatar', ground: 'Toronto' },
  { num: 37, round: 'Matchday 15', group: 'Group B', date: '2026-06-24', time: '15:00 UTC-4', team1: 'Bosnia & Herzegovina', team2: 'Qatar', ground: 'Vancouver' },
  { num: 38, round: 'Matchday 15', group: 'Group B', date: '2026-06-24', time: '15:00 UTC-4', team1: 'Switzerland', team2: 'Canada', ground: 'Vancouver' },
];
