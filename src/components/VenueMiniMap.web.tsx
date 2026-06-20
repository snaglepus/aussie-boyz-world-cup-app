import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Match } from '../data/types';
import { VenueLocation } from '../data/venues';
import { useTheme } from '../theme/ThemeProvider';

// Leaflet touches the DOM at import time, so load it lazily on the client only —
// never during static (server) rendering of the match route.
const MatchMapLazy = React.lazy(() =>
  import('./MatchMap').then((m) => ({ default: m.MatchMap }))
);

/** A compact, single-venue map for the match summary (web / Leaflet). */
export function VenueMiniMap({ match, venue }: { match: Match; venue: VenueLocation }) {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <View style={{ height: 190, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt }}>
      {mounted ? (
        <Suspense fallback={<Loading color={theme.colors.accent} />}>
          <MatchMapLazy
            markers={[{ match, venue, lat: venue.lat, lng: venue.lng }]}
            theme={theme}
            onSelect={() => {}}
          />
        </Suspense>
      ) : (
        <Loading color={theme.colors.accent} />
      )}
    </View>
  );
}

function Loading({ color }: { color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={color} />
    </View>
  );
}
