import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { PlacedMatch } from '../data/venues';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { matchScoreOrTime } from '../utils/matchLabel';
import { Flag } from './Flag';

const NORTH_AMERICA: Region = {
  latitude: 37.5,
  longitude: -96,
  latitudeDelta: 45,
  longitudeDelta: 55,
};

/**
 * Native (iOS/Android) match map. Mirrors the web Leaflet map: a flag-pair +
 * score/time card per fixture, re-fitting to the day's venues whenever they
 * change. iOS uses Apple Maps with no key; Android needs a Google Maps key
 * (see app.json → android.config.googleMaps.apiKey).
 */
export function NativeMatchMap({
  markers,
  onSelect,
}: {
  markers: PlacedMatch[];
  onSelect: (matchId: string) => void;
}) {
  const mapRef = useRef<MapView>(null);

  // Custom marker views need tracksViewChanges=true until their flag images
  // have loaded, then off for smooth panning.
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 1500);

    const coords = markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
    if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 6, longitudeDelta: 6 },
        300
      );
    } else if (coords.length > 1) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
    return () => clearTimeout(t);
  }, [markers]);

  return (
    <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={NORTH_AMERICA}>
      {markers.map((m) => (
        <Marker
          key={m.match.id}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={tracking}
          onPress={() => onSelect(m.match.id)}
        >
          <MarkerCard placed={m} />
        </Marker>
      ))}
    </MapView>
  );
}

function MarkerCard({ placed }: { placed: PlacedMatch }) {
  const theme = useTheme();
  const { match } = placed;
  const live = match.status === 'live';
  const finished = match.status === 'finished';

  const borderColor = live ? theme.colors.live : theme.colors.border;
  const labelColor = live ? theme.colors.live : theme.colors.text;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor }]}>
      <View style={styles.flags}>
        <Flag team={match.home} size={22} />
        <Flag team={match.away} size={22} />
      </View>
      <Text style={[styles.score, tabularNums, { color: labelColor }]}>{matchScoreOrTime(match)}</Text>
      {live ? (
        <Text style={[styles.tag, { color: theme.colors.live }]}>{match.statusLabel}</Text>
      ) : finished ? (
        <Text style={[styles.tag, { color: theme.colors.textMuted }]}>FT</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingTop: 5,
    paddingBottom: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 2,
  },
  flags: { flexDirection: 'row', gap: 2 },
  score: { fontSize: 13, fontWeight: '800', lineHeight: 14 },
  tag: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, lineHeight: 10 },
});
