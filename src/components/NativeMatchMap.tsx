import { PlacedMatch } from '../data/venues';

/**
 * Web-safe stub. `react-native-maps` is a native-only module, so this base file
 * (which web + TypeScript resolve to) renders nothing. The real implementation
 * lives in NativeMatchMap.native.tsx, which Metro picks on iOS/Android. On web
 * the map route is served by app/map.web.tsx (Leaflet), so this never renders.
 */
export function NativeMatchMap(_props: {
  markers: PlacedMatch[];
  onSelect: (matchId: string) => void;
}): null {
  return null;
}
