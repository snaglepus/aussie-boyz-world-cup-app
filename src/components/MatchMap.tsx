import L from 'leaflet';
import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { flagUrl } from '../data/countries';
import { Match } from '../data/types';
import { VenueLocation } from '../data/venues';
import { Theme } from '../theme/theme';
import { matchScoreOrTime } from '../utils/matchLabel';

export type MapMarker = { match: Match; venue: VenueLocation; lat: number; lng: number };

/**
 * Leaflet map of a single day's fixtures. Web-only — it touches the DOM via
 * Leaflet, so it is loaded lazily on the client (see app/map.web.tsx) and is
 * never reached by the native bundle.
 */
export function MatchMap({
  markers,
  theme,
  onSelect,
}: {
  markers: MapMarker[];
  theme: Theme;
  onSelect: (matchId: string) => void;
}) {
  // CARTO basemaps: free, keyless, and they ship a dark variant that matches
  // the app's dark theme.
  const tileUrl = theme.dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const icons = useMemo(
    () => markers.map((m) => ({ marker: m, icon: buildIcon(m.match, theme) })),
    [markers, theme]
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MARKER_CSS }} />
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', backgroundColor: theme.colors.bg }}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} subdomains="abcd" />
        <FitBounds markers={markers} />
        {icons.map(({ marker, icon }) => (
          <Marker
            key={marker.match.id}
            position={[marker.lat, marker.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(marker.match.id) }}
          />
        ))}
      </MapContainer>
    </>
  );
}

/** Re-centres the map on the current day's venues whenever they change. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 6, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 7, animate: false });
  }, [markers, map]);
  return null;
}

function buildIcon(match: Match, theme: Theme): L.DivIcon {
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const home = flagUrl(match.home, 40);
  const away = flagUrl(match.away, 40);

  const label = matchScoreOrTime(match);

  const accent = live ? theme.colors.live : theme.colors.border;
  const labelColor = live ? theme.colors.live : theme.colors.text;
  const statusTag = live
    ? `<span class="wc-tag" style="color:${theme.colors.live}">${escapeHtml(match.statusLabel)}</span>`
    : finished
      ? `<span class="wc-tag" style="color:${theme.colors.textMuted}">FT</span>`
      : '';

  const html = `
    <div class="wc-card" style="background:${theme.colors.surface};border-color:${accent};box-shadow:0 2px 8px rgba(0,0,0,${theme.dark ? 0.5 : 0.18})">
      <div class="wc-flags">
        ${flagImg(home, match.home.code)}
        ${flagImg(away, match.away.code)}
      </div>
      <div class="wc-score" style="color:${labelColor}">${escapeHtml(label)}</div>
      ${statusTag}
    </div>`;

  return L.divIcon({
    html,
    className: 'wc-divicon',
    iconSize: [64, 52],
    iconAnchor: [32, 52],
  });
}

function flagImg(url: string | null, code: string): string {
  if (!url) {
    return `<span class="wc-flag-fallback">${escapeHtml(code.slice(0, 3))}</span>`;
  }
  return `<img class="wc-flag" src="${url}" alt="${escapeHtml(code)}" />`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const MARKER_CSS = `
.wc-divicon { background: none; border: none; }
.wc-card {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 5px 7px 6px; border-radius: 10px; border-width: 1.5px; border-style: solid;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  cursor: pointer; transition: transform 0.08s ease; width: max-content;
}
.wc-card:hover { transform: translateY(-1px) scale(1.04); }
.wc-flags { display: flex; gap: 2px; }
.wc-flag { width: 24px; height: 17px; border-radius: 2px; display: block; object-fit: cover; box-shadow: 0 0 0 0.5px rgba(0,0,0,0.15); }
.wc-flag-fallback { font-size: 9px; font-weight: 700; padding: 0 3px; color: #888; }
.wc-score { font-size: 13px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.wc-tag { font-size: 9px; font-weight: 800; line-height: 1; letter-spacing: 0.3px; }
.leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
`;
