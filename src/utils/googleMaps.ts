import { Capacitor } from '@capacitor/core';
import { Route, RouteStop } from '../types/transit';

export interface GroundedMapPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
  rating?: number | null;
  distanceText?: string | null;
}

export interface MapsGroundingResponse {
  text: string;
  places: GroundedMapPlace[];
  model: string;
  source: string;
}

const PLACEHOLDER_KEYS = new Set([
  '',
  'MY_GOOGLE_MAPS_API_KEY',
  'YOUR_GOOGLE_MAPS_API_KEY',
  'YOUR_API_KEY',
  'YOUR_API_KEY_HERE',
]);

/**
 * Returns the client-side Google Maps JavaScript API key only when configured
 * via VITE_GOOGLE_MAPS_API_KEY. Never invents credentials or uses GEMINI_API_KEY.
 */
export function getGoogleMapsJsApiKey(): string | null {
  const raw = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (!raw || PLACEHOLDER_KEYS.has(raw)) {
    return null;
  }
  return raw;
}

export function hasValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Returns verified route geometry points ONLY when already present and valid on the Route object.
 * Returns an empty array if the route only has discrete stop coordinates.
 */
export function getValidRouteGeometry(route: Route): Array<{ lat: number; lng: number }> {
  if (!Array.isArray(route.routeGeometry) || route.routeGeometry.length < 2) {
    return [];
  }
  const valid = route.routeGeometry.filter((pt) => hasValidCoordinates(pt?.lat, pt?.lng));
  return valid.length >= 2 ? valid : [];
}

/**
 * Formats an existing RouteStop's name/landmark into a clear place label for Google Maps URLs
 * without fabricating coordinates or routing data.
 */
export function formatStopLabelForGoogleMaps(stop: RouteStop): string {
  if (stop.name.trim().toUpperCase() === 'CU') {
    return 'Chandigarh University, Gharuan, Mohali, Punjab';
  }
  return stop.landmark ? `${stop.name}, ${stop.landmark}` : stop.name;
}

/**
 * Builds an official Google Maps Directions link using ONLY the existing stop names
 * on a route (origin -> intermediate stop names -> destination).
 */
export function buildGoogleMapsDirectionsUrl(route: Route): string {
  const orderedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  if (orderedStops.length === 0) {
    return 'https://www.google.com/maps/search/?api=1&query=Chandigarh+University+Gharuan';
  }
  if (orderedStops.length === 1) {
    return buildGoogleMapsSearchUrl({ query: formatStopLabelForGoogleMaps(orderedStops[0]) });
  }

  const origin = formatStopLabelForGoogleMaps(orderedStops[0]);
  const destination = formatStopLabelForGoogleMaps(orderedStops[orderedStops.length - 1]);
  const waypoints = orderedStops
    .slice(1, -1)
    .map((s) => formatStopLabelForGoogleMaps(s));

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Builds a standard Google Maps search URL using existing app stop labels or coordinates.
 */
export function buildGoogleMapsSearchUrl(params: {
  query?: string;
  lat?: number | null;
  lng?: number | null;
}): string {
  const { query, lat, lng } = params;
  const searchParam =
    query && query.trim()
      ? query.trim()
      : hasValidCoordinates(lat, lng)
      ? `${lat},${lng}`
      : 'Chandigarh University Gharuan';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchParam)}`;
}

export function buildGoogleMapsCoordinatesUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export const DEVICE_FIX_STALE_MS = 30_000;

export function isFixStale(timestampMs: number, nowMs: number = Date.now()): boolean {
  return nowMs - timestampMs > DEVICE_FIX_STALE_MS;
}

export function formatFixAge(timestampMs: number, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ${diffMin % 60}m ago`;
}

/**
 * Returns the configured backend API origin (VITE_API_BASE_URL) with trailing slash removed.
 * Defaults to '' (same-origin) for standard Web/PWA deployments.
 * Never invents or hard-codes a backend URL.
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

export async function fetchMapsGrounding(params: {
  query: string;
  latitude?: number;
  longitude?: number;
  mode?: 'place' | 'nearby';
  scopeLabel?: string;
}): Promise<MapsGroundingResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (Capacitor.isNativePlatform() && !apiBaseUrl) {
    throw new Error(
      'Google Maps Grounding requires a running CU BUS Transit backend (server.ts). Rebuild the Android app with VITE_API_BASE_URL set to your backend origin (see ANDROID_SETUP.md). Direct Google Maps links above remain available.'
    );
  }

  const endpoint = `${apiBaseUrl}/api/maps-grounding`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 429 || payload?.error?.includes?.('RESOURCE_EXHAUSTED')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : `Google Maps data request failed (HTTP ${response.status}).`
    );
  }

  return payload as MapsGroundingResponse;
}
