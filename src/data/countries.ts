import { TeamRef } from './types';

/**
 * Registry of every nation that can appear in the data, mapping the source
 * team-name strings (openfootball / BALLDONTLIE) to a display name, a 3-letter
 * code and an ISO alpha-2 code used for flag lookup.
 *
 * `iso` uses flagcdn-compatible subdivision codes for the home nations
 * (gb-eng, gb-sct) so their flags render correctly.
 */
type Entry = { name: string; code: string; iso: string; aliases?: string[] };

const REGISTRY: Entry[] = [
  { name: 'Algeria', code: 'ALG', iso: 'dz' },
  { name: 'Argentina', code: 'ARG', iso: 'ar' },
  { name: 'Australia', code: 'AUS', iso: 'au' },
  { name: 'Austria', code: 'AUT', iso: 'at' },
  { name: 'Belgium', code: 'BEL', iso: 'be' },
  { name: 'Bosnia & Herzegovina', code: 'BIH', iso: 'ba', aliases: ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'] },
  { name: 'Brazil', code: 'BRA', iso: 'br' },
  { name: 'Canada', code: 'CAN', iso: 'ca' },
  { name: 'Cape Verde', code: 'CPV', iso: 'cv', aliases: ['Cabo Verde'] },
  { name: 'Colombia', code: 'COL', iso: 'co' },
  { name: 'Croatia', code: 'CRO', iso: 'hr' },
  { name: 'Curaçao', code: 'CUW', iso: 'cw', aliases: ['Curacao'] },
  { name: 'Czech Republic', code: 'CZE', iso: 'cz', aliases: ['Czechia'] },
  { name: 'DR Congo', code: 'COD', iso: 'cd', aliases: ['Congo DR', 'Democratic Republic of the Congo'] },
  { name: 'Ecuador', code: 'ECU', iso: 'ec' },
  { name: 'Egypt', code: 'EGY', iso: 'eg' },
  { name: 'England', code: 'ENG', iso: 'gb-eng' },
  { name: 'France', code: 'FRA', iso: 'fr' },
  { name: 'Germany', code: 'GER', iso: 'de' },
  { name: 'Ghana', code: 'GHA', iso: 'gh' },
  { name: 'Haiti', code: 'HAI', iso: 'ht' },
  { name: 'Iran', code: 'IRN', iso: 'ir', aliases: ['IR Iran'] },
  { name: 'Iraq', code: 'IRQ', iso: 'iq' },
  { name: 'Ivory Coast', code: 'CIV', iso: 'ci', aliases: ["Côte d'Ivoire", "Cote d'Ivoire"] },
  { name: 'Japan', code: 'JPN', iso: 'jp' },
  { name: 'Jordan', code: 'JOR', iso: 'jo' },
  { name: 'Mexico', code: 'MEX', iso: 'mx' },
  { name: 'Morocco', code: 'MAR', iso: 'ma' },
  { name: 'Netherlands', code: 'NED', iso: 'nl' },
  { name: 'New Zealand', code: 'NZL', iso: 'nz' },
  { name: 'Norway', code: 'NOR', iso: 'no' },
  { name: 'Panama', code: 'PAN', iso: 'pa' },
  { name: 'Paraguay', code: 'PAR', iso: 'py' },
  { name: 'Portugal', code: 'POR', iso: 'pt' },
  { name: 'Qatar', code: 'QAT', iso: 'qa' },
  { name: 'Saudi Arabia', code: 'KSA', iso: 'sa' },
  { name: 'Scotland', code: 'SCO', iso: 'gb-sct' },
  { name: 'Senegal', code: 'SEN', iso: 'sn' },
  { name: 'South Africa', code: 'RSA', iso: 'za' },
  { name: 'South Korea', code: 'KOR', iso: 'kr', aliases: ['Korea Republic', 'Korea, South'] },
  { name: 'Spain', code: 'ESP', iso: 'es' },
  { name: 'Sweden', code: 'SWE', iso: 'se' },
  { name: 'Switzerland', code: 'SUI', iso: 'ch' },
  { name: 'Tunisia', code: 'TUN', iso: 'tn' },
  { name: 'Turkey', code: 'TUR', iso: 'tr', aliases: ['Türkiye', 'Turkiye'] },
  { name: 'USA', code: 'USA', iso: 'us', aliases: ['United States', 'United States of America'] },
  { name: 'Uruguay', code: 'URU', iso: 'uy' },
  { name: 'Uzbekistan', code: 'UZB', iso: 'uz' },
];

const lookup = new Map<string, Entry>();
for (const e of REGISTRY) {
  lookup.set(e.name.toLowerCase(), e);
  for (const a of e.aliases ?? []) lookup.set(a.toLowerCase(), e);
}

/** Turns a raw source name into a normalised TeamRef, handling placeholders. */
export function toTeamRef(raw: string): TeamRef {
  const trimmed = (raw ?? '').trim();
  const entry = lookup.get(trimmed.toLowerCase());
  if (entry) {
    return { name: entry.name, code: entry.code, iso: entry.iso, isPlaceholder: false };
  }
  // Placeholder slots: "1A", "2B", "W73" (winner of match 73), "L101", "3A/B/C/D/F".
  return {
    name: humanisePlaceholder(trimmed),
    code: trimmed.length <= 4 ? trimmed.toUpperCase() : 'TBD',
    iso: null,
    isPlaceholder: true,
  };
}

function humanisePlaceholder(slot: string): string {
  if (/^\d[A-L]$/.test(slot)) return `${ordinal(Number(slot[0]))} Group ${slot[1]}`;
  if (/^W\d+$/.test(slot)) return `Winner of match ${slot.slice(1)}`;
  if (/^L\d+$/.test(slot)) return `Loser of match ${slot.slice(1)}`;
  if (/^3[A-L/]+$/.test(slot)) return `3rd place (${slot.slice(1)})`;
  return slot || 'To be decided';
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

/** flagcdn PNG URL for a team, or null for placeholders. */
export function flagUrl(team: TeamRef, width = 80): string | null {
  if (!team.iso) return null;
  return `https://flagcdn.com/w${width}/${team.iso}.png`;
}
