import React from 'react';
import { View } from 'react-native';
import { Match } from '../data/types';
import { VenueLocation } from '../data/venues';
import { NativeMatchMap } from './NativeMatchMap';

/** A compact, single-venue map for the match summary (native / react-native-maps). */
export function VenueMiniMap({ match, venue }: { match: Match; venue: VenueLocation }) {
  return (
    <View style={{ height: 190, borderRadius: 12, overflow: 'hidden' }}>
      <NativeMatchMap markers={[{ match, venue, lat: venue.lat, lng: venue.lng }]} onSelect={() => {}} />
    </View>
  );
}
