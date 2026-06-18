import { Match } from './types';

/**
 * Matches carry only a venue *name* (`ground`) — a city like "Guadalajara" from
 * the bundled schedule, or a stadium like "MetLife Stadium" from the live feed.
 * The map needs coordinates, so we resolve those names against the fixed set of
 * 2026 World Cup host venues here.
 *
 * Matching is keyword-based and case-insensitive: we test the venue string for
 * any of an entry's aliases (city names, regions and the official stadium name),
 * which covers both data sources without needing exact strings.
 */
export type VenueLocation = {
  /** Canonical city label shown on the map marker. */
  city: string;
  /** Official stadium at this host city. */
  stadium: string;
  lat: number;
  lng: number;
  /** Lower-cased substrings that identify this venue in source data. */
  aliases: string[];
};

const VENUES: VenueLocation[] = [
  { city: 'Atlanta', stadium: 'Mercedes-Benz Stadium', lat: 33.7553, lng: -84.4006, aliases: ['atlanta', 'mercedes-benz'] },
  { city: 'Boston', stadium: 'Gillette Stadium', lat: 42.0909, lng: -71.2643, aliases: ['boston', 'foxborough', 'gillette'] },
  { city: 'Dallas', stadium: 'AT&T Stadium', lat: 32.7473, lng: -97.0945, aliases: ['dallas', 'arlington', 'at&t', 'at and t'] },
  { city: 'Houston', stadium: 'NRG Stadium', lat: 29.6847, lng: -95.4107, aliases: ['houston', 'nrg'] },
  { city: 'Kansas City', stadium: 'Arrowhead Stadium', lat: 39.0489, lng: -94.4839, aliases: ['kansas city', 'arrowhead'] },
  { city: 'Los Angeles', stadium: 'SoFi Stadium', lat: 33.9535, lng: -118.3392, aliases: ['los angeles', 'inglewood', 'sofi'] },
  { city: 'Miami', stadium: 'Hard Rock Stadium', lat: 25.958, lng: -80.2389, aliases: ['miami', 'hard rock'] },
  { city: 'New York / New Jersey', stadium: 'MetLife Stadium', lat: 40.8135, lng: -74.0745, aliases: ['new york', 'new jersey', 'east rutherford', 'metlife'] },
  { city: 'Philadelphia', stadium: 'Lincoln Financial Field', lat: 39.9008, lng: -75.1675, aliases: ['philadelphia', 'lincoln financial'] },
  { city: 'San Francisco Bay Area', stadium: "Levi's Stadium", lat: 37.403, lng: -121.97, aliases: ['san francisco', 'bay area', 'santa clara', 'levi'] },
  { city: 'Seattle', stadium: 'Lumen Field', lat: 47.5952, lng: -122.3316, aliases: ['seattle', 'lumen'] },
  { city: 'Toronto', stadium: 'BMO Field', lat: 43.6332, lng: -79.4185, aliases: ['toronto', 'bmo'] },
  { city: 'Vancouver', stadium: 'BC Place', lat: 49.2768, lng: -123.1119, aliases: ['vancouver', 'bc place'] },
  { city: 'Mexico City', stadium: 'Estadio Azteca', lat: 19.3029, lng: -99.1505, aliases: ['mexico city', 'azteca'] },
  { city: 'Guadalajara', stadium: 'Estadio Akron', lat: 20.6819, lng: -103.4625, aliases: ['guadalajara', 'akron'] },
  { city: 'Monterrey', stadium: 'Estadio BBVA', lat: 25.6692, lng: -100.2444, aliases: ['monterrey', 'bbva'] },
];

/** Resolve a match's venue name to coordinates, or null if unrecognised. */
export function resolveVenue(ground?: string): VenueLocation | null {
  if (!ground) return null;
  const needle = ground.toLowerCase();
  for (const v of VENUES) {
    if (v.aliases.some((a) => needle.includes(a))) return v;
  }
  return null;
}

/** A match paired with its resolved coordinates (only those we could place). */
export type LocatedMatch = { match: Match; venue: VenueLocation };

export function locateMatches(matches: Match[]): LocatedMatch[] {
  const out: LocatedMatch[] = [];
  for (const match of matches) {
    const venue = resolveVenue(match.ground);
    if (venue) out.push({ match, venue });
  }
  return out;
}

export type PlacedMatch = { match: Match; venue: VenueLocation; lat: number; lng: number };

// Tuning for the continental zoom the map opens at. Markers within ~CLUSTER_DEG
// of each other would visually overlap, so we fan every such cluster out around
// its centre on a circle sized to keep a clear gap (~SEPARATION_DEG) between
// neighbours. Same-venue matches are just a cluster of distance 0.
const CLUSTER_DEG = 3.8;
const SEPARATION_DEG = 4.6;
const MIN_RADIUS_DEG = 2.2;

/**
 * Spread out any markers close enough to collide so none overlap on the opening
 * map view. Isolated venues keep their true position; clustered ones (same city,
 * or just nearby) are pushed evenly around the cluster centre.
 */
export function declutterMarkers(located: LocatedMatch[]): PlacedMatch[] {
  const clusters = clusterByProximity(located, CLUSTER_DEG);

  const result: PlacedMatch[] = [];
  for (const group of clusters) {
    if (group.length === 1) {
      const { match, venue } = group[0];
      result.push({ match, venue, lat: venue.lat, lng: venue.lng });
      continue;
    }
    const cLat = avg(group.map((g) => g.venue.lat));
    const cLng = avg(group.map((g) => g.venue.lng));
    const radius = Math.max(MIN_RADIUS_DEG, SEPARATION_DEG / 2 / Math.sin(Math.PI / group.length));
    const latAdj = Math.max(Math.cos((cLat * Math.PI) / 180), 0.3);
    group.forEach(({ match, venue }, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      result.push({
        match,
        venue,
        lat: cLat + radius * Math.sin(angle),
        lng: cLng + (radius / latAdj) * Math.cos(angle),
      });
    });
  }
  return result;
}

/** Greedily group venues whose centres fall within `threshold` degrees. */
function clusterByProximity(located: LocatedMatch[], threshold: number): LocatedMatch[][] {
  const clusters: LocatedMatch[][] = [];
  for (const lm of located) {
    const hit = clusters.find((c) => c.some((o) => venueDistanceDeg(o.venue, lm.venue) < threshold));
    if (hit) hit.push(lm);
    else clusters.push([lm]);
  }
  return clusters;
}

/** Rough degree distance with longitude compressed by latitude. */
function venueDistanceDeg(a: VenueLocation, b: VenueLocation): number {
  const latAdj = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * latAdj;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function avg(ns: number[]): number {
  return ns.reduce((s, n) => s + n, 0) / ns.length;
}
