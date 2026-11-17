import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Route, Bus, RouteStop } from '../../types/transit';
import {
  getGoogleMapsJsApiKey,
  hasValidCoordinates,
  getValidRouteGeometry,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  buildGoogleMapsCoordinatesUrl,
  formatStopLabelForGoogleMaps,
  isFixStale,
  formatFixAge,
  fetchMapsGrounding,
  MapsGroundingResponse,
} from '../../utils/googleMaps';
import {
  MapPin,
  ExternalLink,
  Search,
  AlertCircle,
  Radio,
  Compass,
  Loader2,
  Info,
  Bus as BusIcon,
  Navigation,
  Maximize2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  Route as RouteIcon,
} from 'lucide-react';

export interface GoogleMapsTransitViewProps {
  mode: 'student' | 'fleet';
  routes: Route[];
  selectedRouteId?: string;
  buses: Bus[];
  highlightStopId?: string;
  selectedStopId?: string;
  onSelectStop?: (stop: RouteStop) => void;
  theme?: 'dark' | 'light';
}

interface ActiveMarkerSelection {
  kind: 'stop' | 'bus';
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  meta: string[];
  mapsUrl: string;
}

/**
 * Draws a polyline ONLY when a Route object already contains verified road-following
 * routeGeometry coordinates (>= 2 valid points). Never draws synthetic straight lines
 * between discrete stop coordinates.
 */
const VerifiedRoutePolylines: React.FC<{ routes: Route[] }> = ({ routes }) => {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLibrary) return;

    const polylines: Array<{ setMap: (target: null) => void }> = [];

    for (const route of routes) {
      const path = getValidRouteGeometry(route);
      if (path.length < 2) continue;

      const polyline = new mapsLibrary.Polyline({
        path,
        strokeColor: route.colorHex || '#2563EB',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        geodesic: true,
        map,
      });
      polylines.push(polyline);
    }

    return () => {
      for (const poly of polylines) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLibrary, routes]);

  return null;
};

/**
 * Fits the Google basemap viewport to the active route's stops (and verified geometry
 * or real device GPS fixes when present).
 */
const RouteBoundsFitter: React.FC<{
  points: Array<{ lat: number; lng: number }>;
  fitTrigger: number;
}> = ({ points, fitTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    for (const pt of points) {
      if (pt.lat > north) north = pt.lat;
      if (pt.lat < south) south = pt.lat;
      if (pt.lng > east) east = pt.lng;
      if (pt.lng < west) west = pt.lng;
    }

    map.fitBounds(
      { north, south, east, west },
      { top: 56, right: 48, bottom: 56, left: 48 }
    );
  }, [map, points, fitTrigger]);

  return null;
};

interface InnerInteractiveMapProps {
  activeRoutes: Route[];
  stops: Array<{ stop: RouteStop; route: Route }>;
  realDeviceBuses: Array<{ bus: Bus; route?: Route }>;
  highlightStopId?: string;
  activeStopId?: string;
  center: { lat: number; lng: number };
  fitPoints: Array<{ lat: number; lng: number }>;
  isSingleRouteEmphasized: boolean;
  onSelectStop?: (stop: RouteStop) => void;
  onApiFailed: () => void;
}

const InnerInteractiveMap: React.FC<InnerInteractiveMapProps> = ({
  activeRoutes,
  stops,
  realDeviceBuses,
  highlightStopId,
  activeStopId,
  center,
  fitPoints,
  isSingleRouteEmphasized,
  onSelectStop,
  onApiFailed,
}) => {
  const status = useApiLoadingStatus();
  const [selectedMarker, setSelectedMarker] = useState<ActiveMarkerSelection | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onApiFailed();
    }
  }, [status, onApiFailed]);

  return (
    <div className="relative w-full h-[360px] sm:h-[430px] rounded-xl overflow-hidden border border-slate-700/60 bg-slate-100">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        mapTypeId="roadmap"
        defaultCenter={center}
        defaultZoom={11}
        gestureHandling="greedy"
        zoomControl={true}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <RouteBoundsFitter points={fitPoints} fitTrigger={fitTrigger} />
        <VerifiedRoutePolylines routes={activeRoutes} />

        {/* Labeled Stop Markers from existing app stop coordinates */}
        {stops.map(({ stop, route }) => {
          const isUserStop = stop.id === highlightStopId;
          const isCampus = stop.name.trim().toUpperCase() === 'CU';
          const isSelected = stop.id === activeStopId;
          const routeColor = route.colorHex || '#2563EB';

          const badgeBg = isUserStop
            ? 'bg-amber-500 text-slate-950 border-amber-200'
            : isCampus
            ? 'bg-emerald-600 text-white border-emerald-200'
            : 'bg-slate-900/95 text-white border-white/80';

          const orderBg = isUserStop
            ? 'bg-amber-950 text-amber-200'
            : isCampus
            ? 'bg-emerald-950 text-emerald-200'
            : 'text-white';

          const zIndex = isSelected ? 40 : isUserStop ? 35 : isCampus ? 30 : 20;

          return (
            <AdvancedMarker
              key={`${route.id}-${stop.id}`}
              position={{ lat: stop.latitude, lng: stop.longitude }}
              zIndex={zIndex}
              title={`#${stop.stopOrder} ${stop.name} (${route.code})`}
              onClick={() => {
                if (onSelectStop) onSelectStop(stop);
                setSelectedMarker({
                  kind: 'stop',
                  id: stop.id,
                  title: `#${stop.stopOrder} ${stop.name} (${route.code})`,
                  subtitle: stop.landmark,
                  lat: stop.latitude,
                  lng: stop.longitude,
                  meta: [
                    isUserStop
                      ? 'Your Assigned Pickup Stop'
                      : isCampus
                      ? 'Chandigarh University Campus Terminal'
                      : `Route ${route.code} · Stop ${stop.stopOrder} of ${route.stops.length}`,
                    `Pickup: ${stop.scheduledMorningPickup} · Drop: ${stop.scheduledEveningDrop}`,
                    'Source: Existing app route stop coordinates',
                  ],
                  mapsUrl: buildGoogleMapsSearchUrl({
                    query: formatStopLabelForGoogleMaps(stop),
                    lat: stop.latitude,
                    lng: stop.longitude,
                  }),
                });
              }}
            >
              <div className="flex flex-col items-center group cursor-pointer select-none">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 shadow-md transition-transform ${badgeBg} ${
                    isSelected ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-mono font-extrabold flex items-center justify-center shrink-0 ${orderBg}`}
                    style={
                      !isUserStop && !isCampus ? { backgroundColor: routeColor } : undefined
                    }
                  >
                    {stop.stopOrder}
                  </span>
                  <div className="leading-tight">
                    <span className="text-[11px] font-bold whitespace-nowrap block">
                      {isCampus ? 'CU Campus' : stop.name}
                    </span>
                    {isUserStop && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider block text-amber-950">
                        Your Stop
                      </span>
                    )}
                    {isCampus && !isUserStop && (
                      <span className="text-[9px] font-bold uppercase tracking-wider block text-emerald-100">
                        Terminal
                      </span>
                    )}
                    {!isSingleRouteEmphasized && !isUserStop && !isCampus && (
                      <span className="text-[9px] font-mono text-slate-300 block">
                        {route.code}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-2.5 h-2.5 rotate-45 -mt-1.5 border-r-2 border-b-2 ${
                    isUserStop
                      ? 'bg-amber-500 border-amber-200'
                      : isCampus
                      ? 'bg-emerald-600 border-emerald-200'
                      : 'bg-slate-900 border-white/80'
                  }`}
                />
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Real Device GPS Bus Markers ONLY when an actual browser geolocation fix was received */}
        {realDeviceBuses.map(({ bus, route }) => {
          const fix = bus.deviceLocation!;
          const stale = isFixStale(fix.timestamp);
          return (
            <AdvancedMarker
              key={`device-bus-${bus.id}`}
              position={{ lat: fix.latitude, lng: fix.longitude }}
              zIndex={50}
              title={`${bus.busNumber} (Device GPS)`}
              onClick={() => {
                setSelectedMarker({
                  kind: 'bus',
                  id: bus.id,
                  title: `${bus.busNumber} · Device GPS`,
                  subtitle: `${route?.code || bus.routeId} · ${bus.regNumber}`,
                  lat: fix.latitude,
                  lng: fix.longitude,
                  meta: [
                    `Accuracy: ${
                      fix.accuracyMeters != null ? `±${Math.round(fix.accuracyMeters)}m` : 'Unknown'
                    } · Updated: ${formatFixAge(fix.timestamp)}${stale ? ' (Stale)' : ''}`,
                    'Source: Opt-in Driver Device GPS (local browser state only)',
                  ],
                  mapsUrl: buildGoogleMapsCoordinatesUrl(fix.latitude, fix.longitude),
                });
              }}
            >
              <div
                className={`px-2 py-1 rounded-lg border-2 text-[11px] font-mono font-bold shadow-lg flex items-center gap-1 ${
                  stale
                    ? 'bg-amber-900 border-amber-300 text-amber-100'
                    : 'bg-cyan-600 border-white text-white'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>{bus.busNumber}</span>
              </div>
            </AdvancedMarker>
          );
        })}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
            maxWidth={280}
          >
            <div className="text-slate-900 text-xs space-y-1 p-0.5">
              <p className="font-bold text-slate-900">{selectedMarker.title}</p>
              <p className="text-slate-600">{selectedMarker.subtitle}</p>
              {selectedMarker.meta.map((line, idx) => (
                <p key={idx} className="text-[11px] text-slate-500">
                  {line}
                </p>
              ))}
              <p className="font-mono text-[10px] text-slate-400">
                {selectedMarker.lat.toFixed(5)}, {selectedMarker.lng.toFixed(5)}
              </p>
              <a
                href={selectedMarker.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold pt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Fit Route Floating Control */}
      <button
        type="button"
        onClick={() => setFitTrigger((n) => n + 1)}
        title="Fit map viewport to selected route"
        className="absolute bottom-3 left-3 z-10 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-md text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
        <span>Fit Route</span>
      </button>
    </div>
  );
};

export const GoogleMapsTransitView: React.FC<GoogleMapsTransitViewProps> = ({
  mode,
  routes,
  selectedRouteId,
  buses,
  highlightStopId,
  selectedStopId,
  onSelectStop,
  theme = 'dark',
}) => {
  const apiKey = useMemo(() => getGoogleMapsJsApiKey(), []);
  const [mapsJsFailed, setMapsJsFailed] = useState(false);
  const [fleetRouteFilter, setFleetRouteFilter] = useState<string>(selectedRouteId || 'all');
  const [internalSelectedStopId, setInternalSelectedStopId] = useState<string | undefined>(
    selectedStopId || highlightStopId
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Optional user-triggered "Nearby places" panel state (NEVER requests device location)
  const [isNearbyOpen, setIsNearbyOpen] = useState<boolean>(false);
  const [nearbyScope, setNearbyScope] = useState<'stop' | 'route'>('stop');
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyResult, setNearbyResult] = useState<MapsGroundingResponse | null>(null);
  const [nearbyLastQueryLabel, setNearbyLastQueryLabel] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState<string>('');

  // Listen for runtime Google Maps quota/auth failures so we fall back gracefully
  useEffect(() => {
    const handleQuota = () => setMapsJsFailed(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Tick every 5s to keep real device GPS fix age/staleness accurate
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Sync external selectedRouteId in student mode
  useEffect(() => {
    if (mode === 'student' && selectedRouteId) {
      setFleetRouteFilter(selectedRouteId);
    }
  }, [mode, selectedRouteId]);

  // Sync external selectedStopId / highlightStopId
  useEffect(() => {
    if (selectedStopId) {
      setInternalSelectedStopId(selectedStopId);
    } else if (highlightStopId) {
      setInternalSelectedStopId(highlightStopId);
    }
  }, [selectedStopId, highlightStopId]);

  const activeRoutes = useMemo(() => {
    if (mode === 'student') {
      const target = routes.find((r) => r.id === selectedRouteId) || routes[0];
      return target ? [target] : [];
    }
    if (fleetRouteFilter === 'all') return routes;
    return routes.filter((r) => r.id === fleetRouteFilter);
  }, [mode, routes, selectedRouteId, fleetRouteFilter]);

  // Primary emphasized route (in student mode or when a specific route is filtered in fleet mode)
  const primaryRoute = useMemo<Route | null>(() => {
    if (activeRoutes.length === 1) return activeRoutes[0];
    return null;
  }, [activeRoutes]);

  const primaryRouteHasVerifiedGeometry = useMemo(() => {
    return primaryRoute ? getValidRouteGeometry(primaryRoute).length >= 2 : false;
  }, [primaryRoute]);

  const anyActiveRouteHasVerifiedGeometry = useMemo(() => {
    return activeRoutes.some((r) => getValidRouteGeometry(r).length >= 2);
  }, [activeRoutes]);

  const stopsWithCoords = useMemo(() => {
    const list: Array<{ stop: RouteStop; route: Route }> = [];
    for (const r of activeRoutes) {
      const ordered = [...r.stops].sort((a, b) => a.stopOrder - b.stopOrder);
      for (const s of ordered) {
        if (hasValidCoordinates(s.latitude, s.longitude)) {
          list.push({ stop: s, route: r });
        }
      }
    }
    return list;
  }, [activeRoutes]);

  const allActiveStops = useMemo(() => {
    const list: Array<{ stop: RouteStop; route: Route }> = [];
    for (const r of activeRoutes) {
      const ordered = [...r.stops].sort((a, b) => a.stopOrder - b.stopOrder);
      for (const s of ordered) {
        list.push({ stop: s, route: r });
      }
    }
    return list;
  }, [activeRoutes]);

  // Active selected stop for map focus and scoped Nearby Places lookup
  const activeStopEntry = useMemo(() => {
    if (internalSelectedStopId) {
      const match = allActiveStops.find((item) => item.stop.id === internalSelectedStopId);
      if (match) return match;
    }
    if (highlightStopId) {
      const match = allActiveStops.find((item) => item.stop.id === highlightStopId);
      if (match) return match;
    }
    return allActiveStops[0] || null;
  }, [allActiveStops, internalSelectedStopId, highlightStopId]);

  // ONLY include buses with an actual received browser geolocation fix (never invented/simulated coordinates!)
  const realDeviceBuses = useMemo(() => {
    const routeIds = new Set(activeRoutes.map((r) => r.id));
    return buses
      .filter(
        (b) =>
          (mode === 'student' || fleetRouteFilter === 'all' || routeIds.has(b.routeId)) &&
          b.deviceLocation &&
          hasValidCoordinates(b.deviceLocation.latitude, b.deviceLocation.longitude)
      )
      .map((bus) => ({
        bus,
        route: routes.find((r) => r.id === bus.routeId),
      }));
  }, [buses, activeRoutes, mode, fleetRouteFilter, routes]);

  // Points used to fit the interactive basemap to the selected route
  const fitPoints = useMemo(() => {
    const pts: Array<{ lat: number; lng: number }> = [];
    for (const r of activeRoutes) {
      for (const pt of getValidRouteGeometry(r)) {
        pts.push(pt);
      }
    }
    for (const { stop } of stopsWithCoords) {
      pts.push({ lat: stop.latitude, lng: stop.longitude });
    }
    for (const { bus } of realDeviceBuses) {
      if (bus.deviceLocation) {
        pts.push({ lat: bus.deviceLocation.latitude, lng: bus.deviceLocation.longitude });
      }
    }
    return pts;
  }, [activeRoutes, stopsWithCoords, realDeviceBuses]);

  // Compute initial center strictly from existing app stop coordinates or real device fix
  const mapCenter = useMemo(() => {
    if (activeStopEntry && hasValidCoordinates(activeStopEntry.stop.latitude, activeStopEntry.stop.longitude)) {
      return {
        lat: activeStopEntry.stop.latitude,
        lng: activeStopEntry.stop.longitude,
      };
    }
    if (fitPoints.length > 0) {
      return fitPoints[0];
    }
    return null;
  }, [activeStopEntry, fitPoints]);

  const canRenderInteractiveMap = Boolean(apiKey) && !mapsJsFailed && mapCenter !== null;

  const handleApiFailed = useCallback(() => {
    setMapsJsFailed(true);
  }, []);

  const handleStopSelection = useCallback(
    (stop: RouteStop) => {
      setInternalSelectedStopId(stop.id);
      if (onSelectStop) onSelectStop(stop);
    },
    [onSelectStop]
  );

  // Scoped Google Maps search fallback URL for the currently selected stop/route
  const nearbyFallbackSearchUrl = useMemo(() => {
    if (nearbyScope === 'stop' && activeStopEntry) {
      return buildGoogleMapsSearchUrl({
        query: `places near ${formatStopLabelForGoogleMaps(activeStopEntry.stop)}`,
      });
    }
    const targetRoute = primaryRoute || activeStopEntry?.route;
    if (targetRoute) {
      return buildGoogleMapsSearchUrl({
        query: `landmarks along ${targetRoute.corridor}`,
      });
    }
    return buildGoogleMapsSearchUrl({ query: 'Chandigarh University Gharuan' });
  }, [nearbyScope, activeStopEntry, primaryRoute]);

  // User-triggered Nearby Places lookup via existing server-side POST /api/maps-grounding
  const handleRunNearbyLookup = async (customOverride?: string) => {
    const targetRoute = primaryRoute || activeStopEntry?.route || routes[0];
    let queryText = '';
    let scopeLabel = '';
    let lat: number | undefined;
    let lng: number | undefined;

    if (customOverride && customOverride.trim()) {
      queryText = customOverride.trim();
      scopeLabel = targetRoute ? `${targetRoute.code} · ${targetRoute.name}` : 'CU BUS Transit';
      if (activeStopEntry && hasValidCoordinates(activeStopEntry.stop.latitude, activeStopEntry.stop.longitude)) {
        lat = activeStopEntry.stop.latitude;
        lng = activeStopEntry.stop.longitude;
      }
    } else if (nearbyScope === 'stop' && activeStopEntry) {
      const stopLabel = formatStopLabelForGoogleMaps(activeStopEntry.stop);
      queryText = `${stopLabel} (${activeStopEntry.route.code} bus stop)`;
      scopeLabel = `Stop #${activeStopEntry.stop.stopOrder} ${activeStopEntry.stop.name} on ${activeStopEntry.route.code}`;
      if (hasValidCoordinates(activeStopEntry.stop.latitude, activeStopEntry.stop.longitude)) {
        lat = activeStopEntry.stop.latitude;
        lng = activeStopEntry.stop.longitude;
      }
    } else if (targetRoute) {
      const stopNames = targetRoute.stops.map((s) => s.name).join(', ');
      queryText = `${targetRoute.name}, ${targetRoute.corridor} (stops: ${stopNames})`;
      scopeLabel = `Route ${targetRoute.code} (${targetRoute.corridor})`;
      const midStop = targetRoute.stops[Math.floor(targetRoute.stops.length / 2)];
      if (midStop && hasValidCoordinates(midStop.latitude, midStop.longitude)) {
        lat = midStop.latitude;
        lng = midStop.longitude;
      }
    } else {
      return;
    }

    setNearbyLoading(true);
    setNearbyError(null);
    setNearbyLastQueryLabel(customOverride?.trim() ? `Custom: ${customOverride.trim()}` : scopeLabel);

    try {
      const res = await fetchMapsGrounding({
        query: queryText,
        latitude: lat,
        longitude: lng,
        mode: customOverride?.trim() ? 'place' : 'nearby',
        scopeLabel,
      });
      setNearbyResult(res);
    } catch (err: unknown) {
      setNearbyError(
        err instanceof Error ? err.message : 'Unable to fetch Google Maps grounded places.'
      );
      setNearbyResult(null);
    } finally {
      setNearbyLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const cardCls = isDark
    ? 'bg-slate-950/90 border-slate-800 text-slate-200'
    : 'bg-white border-slate-200 text-slate-800';
  const subtleBoxCls = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
    : 'bg-slate-50 border-slate-200 text-slate-700';
  const mutedTextCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const headingCls = isDark ? 'text-white' : 'text-slate-900';

  const directionsRoute = primaryRoute || activeStopEntry?.route || null;
  const directionsUrl = directionsRoute ? buildGoogleMapsDirectionsUrl(directionsRoute) : null;
  const orderedDirectionsStops = directionsRoute
    ? [...directionsRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder)
    : [];

  return (
    <div className={`space-y-3.5 p-3.5 sm:p-4 ${isDark ? 'bg-[#070c18] text-slate-200' : ''}`}>
      {/* Top Action & Status Bar */}
      <div className={`rounded-xl border px-3 py-2.5 text-xs ${subtleBoxCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${
                canRenderInteractiveMap
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>
                {canRenderInteractiveMap
                  ? 'Google Maps Basemap'
                  : mapsJsFailed
                  ? 'Google Maps Link Fallback (SDK Error)'
                  : 'Google Maps Link Fallback (No Maps JS Key)'}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <MapPin className="w-3 h-3" />
              <span>
                {primaryRoute
                  ? `${primaryRoute.code} · ${stopsWithCoords.length} Stops`
                  : `${stopsWithCoords.length} App Route Stops`}
              </span>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] border ${
                realDeviceBuses.length > 0
                  ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>
                {realDeviceBuses.length} Device GPS {realDeviceBuses.length === 1 ? 'Fix' : 'Fixes'}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'fleet' && (
              <select
                value={fleetRouteFilter}
                onChange={(e) => setFleetRouteFilter(e.target.value)}
                aria-label="Filter fleet map by route"
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[34px] ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Routes ({routes.length})</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </option>
                ))}
              </select>
            )}

            {/* Optional User-Triggered Nearby Places Toggle */}
            <button
              type="button"
              onClick={() => setIsNearbyOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer min-h-[34px] ${
                isNearbyOpen
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nearby places</span>
              {isNearbyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Primary Interactive Google Basemap Preview OR Clearly Labeled Fallback */}
      {canRenderInteractiveMap && mapCenter ? (
        <div className="space-y-2.5">
          <APIProvider apiKey={apiKey!} libraries={['marker']} language="en" region="IN">
            <InnerInteractiveMap
              activeRoutes={activeRoutes}
              stops={stopsWithCoords}
              realDeviceBuses={realDeviceBuses}
              highlightStopId={highlightStopId}
              activeStopId={activeStopEntry?.stop.id}
              center={mapCenter}
              fitPoints={fitPoints}
              isSingleRouteEmphasized={Boolean(primaryRoute)}
              onSelectStop={handleStopSelection}
              onApiFailed={handleApiFailed}
            />
          </APIProvider>

          {/* Compact Map Legend */}
          <div className={`flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] ${mutedTextCls}`}>
            <div className="flex flex-wrap items-center gap-3">
              {highlightStopId && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Your Assigned Stop</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>CU Campus Terminal</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: primaryRoute?.colorHex || '#2563EB' }}
                />
                <span>Existing App Route Stops</span>
              </span>
              {realDeviceBuses.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>Device GPS Bus (Local)</span>
                </span>
              )}
            </div>
            <span className="font-mono text-[10px]">
              {anyActiveRouteHasVerifiedGeometry
                ? 'Verified app route geometry highlighted'
                : 'Stop markers only (no synthetic road line drawn)'}
            </span>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl border p-4 space-y-3 ${cardCls}`}>
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className={`font-bold ${headingCls}`}>
                Interactive Google Maps Basemap Unavailable — Using Google Maps Directions &amp; Search Fallback
              </p>
              <p className={`text-[11px] leading-relaxed ${mutedTextCls}`}>
                {mapsJsFailed
                  ? 'The Google Maps JavaScript SDK could not be loaded (API key restriction, billing, or quota error). Direct Google Maps directions and stop links below remain usable.'
                  : 'No usable client-side VITE_GOOGLE_MAPS_API_KEY was found in the environment. Direct Google Maps route directions and stop search links remain fully usable.'}
              </p>
            </div>
          </div>

          {/* Real Device GPS Fixes (if any) */}
          {realDeviceBuses.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-700/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-500 block">
                Received Device GPS Fixes (Local Browser Only)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {realDeviceBuses.map(({ bus, route }) => {
                  const fix = bus.deviceLocation!;
                  const stale = isFixStale(fix.timestamp, nowMs);
                  return (
                    <div
                      key={bus.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${subtleBoxCls}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <BusIcon className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          <span className={`font-bold truncate ${headingCls}`}>
                            {bus.busNumber} ({route?.code || bus.routeId})
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              stale
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-emerald-500/20 text-emerald-500'
                            }`}
                          >
                            {stale ? 'Stale' : 'Device GPS'}
                          </span>
                        </div>
                        <p className={`text-[11px] font-mono mt-0.5 ${mutedTextCls}`}>
                          {fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)}
                          {fix.accuracyMeters != null ? ` (±${Math.round(fix.accuracyMeters)}m)` : ''} ·{' '}
                          {formatFixAge(fix.timestamp, nowMs)}
                        </p>
                      </div>
                      <a
                        href={buildGoogleMapsCoordinatesUrl(fix.latitude, fix.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Google Maps Stop Links */}
          <div className="space-y-2 pt-2 border-t border-slate-700/30">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${mutedTextCls}`}>
              Existing Route Stops — Click to Select or Open in Google Maps
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {allActiveStops.map(({ stop, route }) => {
                const isUserStop = stop.id === highlightStopId;
                const isSelected = stop.id === activeStopEntry?.stop.id;
                const hasCoords = hasValidCoordinates(stop.latitude, stop.longitude);
                const labelUrl = buildGoogleMapsSearchUrl({
                  query: formatStopLabelForGoogleMaps(stop),
                  lat: hasCoords ? stop.latitude : undefined,
                  lng: hasCoords ? stop.longitude : undefined,
                });

                return (
                  <div
                    key={`${route.id}-${stop.id}`}
                    onClick={() => handleStopSelection(stop)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-500/15 border-blue-400/60'
                          : 'bg-blue-50 border-blue-300'
                        : isUserStop
                        ? isDark
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-amber-50 border-amber-300'
                        : subtleBoxCls
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-blue-500">
                          {route.code} #{stop.stopOrder}
                        </span>
                        <span className={`font-semibold truncate ${headingCls}`}>{stop.name}</span>
                        {isUserStop && (
                          <span className="text-[10px] font-bold text-amber-500 shrink-0">(Your Stop)</span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${mutedTextCls}`}>{stop.landmark}</p>
                    </div>
                    <a
                      href={labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Maps</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Route Directions Preview & Data-Source Clarity Bar (Built Strictly from Existing Stop Names) */}
      {directionsRoute && directionsUrl && (
        <div className={`rounded-xl border p-3 text-xs space-y-2 ${cardCls}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RouteIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className={`font-bold ${headingCls}`}>
                  {directionsRoute.code} Google Maps Directions Preview
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    primaryRouteHasVerifiedGeometry
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {primaryRouteHasVerifiedGeometry
                    ? 'Verified Road Geometry'
                    : 'Stop Coordinates Only'}
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${mutedTextCls}`}>
                {primaryRouteHasVerifiedGeometry
                  ? 'Route path drawn from verified geometry stored in app data.'
                  : 'App data includes stop coordinates but no verified road geometry, so no synthetic road line is drawn on the basemap. Open road directions in Google Maps built from the existing stop names:'}
              </p>
            </div>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open Route Directions</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Ordered Stop Sequence Preview Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {orderedDirectionsStops.map((stop, idx) => {
              const isUserStop = stop.id === highlightStopId;
              const isCampus = stop.name.trim().toUpperCase() === 'CU';
              const isSelected = stop.id === activeStopEntry?.stop.id;
              return (
                <React.Fragment key={stop.id}>
                  <button
                    type="button"
                    onClick={() => handleStopSelection(stop)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                        : isUserStop
                        ? isDark
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                        : isCampus
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : isDark
                        ? 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-mono text-[10px] mr-1 opacity-75">#{stop.stopOrder}</span>
                    <span>{isCampus ? 'CU Terminal' : stop.name}</span>
                  </button>
                  {idx < orderedDirectionsStops.length - 1 && (
                    <span className={`text-[10px] ${mutedTextCls}`}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Fleet Notice when 0 real device GPS fixes have been received */}
      {mode === 'fleet' && realDeviceBuses.length === 0 && (
        <div className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${subtleBoxCls}`}>
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className={`text-[11px] leading-relaxed ${mutedTextCls}`}>
            <strong>0 real device GPS fixes received.</strong> No live bus markers are plotted because simulated bus positions are never shown as real GPS. To test a local bus marker, start opt-in <strong>Device GPS</strong> inside the Driver Console in this browser.
          </p>
        </div>
      )}

      {/* 3. Optional User-Triggered "Nearby places" Panel (Google Maps Grounded, No Device Geolocation) */}
      {isNearbyOpen && (
        <div className={`rounded-xl border p-3.5 sm:p-4 space-y-3 ${cardCls}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={`text-xs font-bold flex items-center gap-1.5 ${headingCls}`}>
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Nearby Places</span>
                </h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30">
                  Google Maps Grounded
                </span>
              </div>
              <p className={`text-[11px] mt-1 leading-relaxed ${mutedTextCls}`}>
                Optional lookup using server-side Google Maps Grounding scoped to your selected stop or route. Does not request device location, and shows ratings or distances only when returned by Google Maps.
              </p>
            </div>
          </div>

          {/* Scope Selector + Stop Picker + User-Triggered Lookup Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div
              className={`inline-flex p-0.5 rounded-lg border text-xs shrink-0 ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setNearbyScope('stop')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  nearbyScope === 'stop'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selected Stop
              </button>
              <button
                type="button"
                onClick={() => setNearbyScope('route')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  nearbyScope === 'route'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selected Route
              </button>
            </div>

            {nearbyScope === 'stop' && allActiveStops.length > 0 && (
              <select
                value={activeStopEntry?.stop.id || ''}
                onChange={(e) => {
                  const found = allActiveStops.find((item) => item.stop.id === e.target.value);
                  if (found) handleStopSelection(found.stop);
                }}
                aria-label="Select stop for nearby places lookup"
                className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs min-h-[38px] ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {allActiveStops.map(({ stop, route }) => (
                  <option key={`${route.id}-${stop.id}`} value={stop.id}>
                    {route.code} · #{stop.stopOrder} {stop.name}
                    {stop.id === highlightStopId ? ' (Your Stop)' : ''}
                  </option>
                ))}
              </select>
            )}

            {nearbyScope === 'route' && (
              <div
                className={`flex-1 px-3 py-2 rounded-lg border text-xs truncate ${subtleBoxCls}`}
              >
                {directionsRoute
                  ? `${directionsRoute.code} · ${directionsRoute.name}`
                  : 'All active routes'}
              </div>
            )}

            <button
              type="button"
              disabled={nearbyLoading}
              onClick={() => handleRunNearbyLookup()}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[38px] cursor-pointer"
            >
              {nearbyLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Nearby Places</span>
                </>
              )}
            </button>
          </div>

          {/* Optional Custom Place / Landmark Search within the same panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customQuery.trim()) handleRunNearbyLookup(customQuery);
            }}
            className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700/20"
          >
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Or search a specific landmark near this route..."
              className={`flex-1 px-3 py-1.5 rounded-lg border text-xs min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={nearbyLoading || !customQuery.trim()}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 min-h-[36px] cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              Search Landmark
            </button>
          </form>

          {/* Loading State */}
          {nearbyLoading && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${subtleBoxCls}`}>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
              <span>
                Querying Google Maps Grounding for{' '}
                <strong>{nearbyLastQueryLabel || 'selected stop'}</strong>...
              </span>
            </div>
          )}

          {/* Error State with Google Maps Search Fallback Link */}
          {!nearbyLoading && nearbyError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{nearbyError}</span>
              </div>
              <a
                href={nearbyFallbackSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:underline font-semibold"
              >
                <span>Open nearby search directly in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Empty State */}
          {!nearbyLoading &&
            !nearbyError &&
            nearbyResult &&
            nearbyResult.places.length === 0 &&
            !nearbyResult.text.trim() && (
              <div className={`p-3 rounded-lg border text-xs space-y-2 ${subtleBoxCls}`}>
                <p className={mutedTextCls}>
                  No Google Maps grounded nearby places were returned for{' '}
                  <strong>{nearbyLastQueryLabel}</strong>.
                </p>
                <a
                  href={nearbyFallbackSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-500 hover:underline font-semibold"
                >
                  <span>Search Google Maps directly</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

          {/* Grounded Results State */}
          {!nearbyLoading &&
            !nearbyError &&
            nearbyResult &&
            (nearbyResult.places.length > 0 || nearbyResult.text.trim().length > 0) && (
              <div className={`p-3 rounded-lg border space-y-2.5 text-xs ${subtleBoxCls}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-500">
                  <span>Google Maps Grounded Results · {nearbyLastQueryLabel}</span>
                  <span>Google Maps Links: {nearbyResult.places.length}</span>
                </div>

                {nearbyResult.text.trim() && (
                  <p
                    className={`text-xs leading-relaxed whitespace-pre-line ${
                      isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}
                  >
                    {nearbyResult.text}
                  </p>
                )}

                {nearbyResult.places.length > 0 ? (
                  <div className="pt-2 border-t border-slate-700/20 space-y-2">
                    <span className={`text-[11px] font-semibold block ${mutedTextCls}`}>
                      Verified Google Maps Places:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nearbyResult.places.map((place, idx) => (
                        <div
                          key={`${place.uri}-${idx}`}
                          className={`p-2.5 rounded-lg border space-y-1.5 ${cardCls}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-500 hover:underline inline-flex items-center gap-1 leading-snug"
                            >
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span>{place.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>

                            {/* Render rating or distance ONLY when returned by the Google Maps source */}
                            {(place.rating != null || place.distanceText) && (
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                {place.rating != null && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    {place.rating}
                                  </span>
                                )}
                                {place.distanceText && (
                                  <span className={`px-1.5 py-0.5 rounded ${subtleBoxCls}`}>
                                    {place.distanceText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {place.reviewSnippets.length > 0 && (
                            <div className="space-y-1">
                              {place.reviewSnippets.map((snippet, sIdx) => (
                                <p key={sIdx} className={`text-[11px] italic ${mutedTextCls}`}>
                                  “{snippet}”
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-700/20 flex items-center justify-between gap-2">
                    <span className={`text-[11px] ${mutedTextCls}`}>
                      No individual Google Maps place links were attached to this response.
                    </span>
                    <a
                      href={nearbyFallbackSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-blue-500 hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Search on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
