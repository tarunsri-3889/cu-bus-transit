import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTransit } from '../../context/TransitContext';
import {
  buildGoogleMapsCoordinatesUrl,
  buildGoogleMapsSearchUrl,
  formatFixAge,
  hasValidCoordinates,
  isFixStale,
} from '../../utils/googleMaps';
import {
  Play,
  Square,
  ChevronRight,
  Users,
  AlertTriangle,
  Radio,
  Clock,
  Compass,
  CheckCircle2,
  Phone,
  ShieldCheck,
  RotateCcw,
  MapPin,
  Crosshair,
  ExternalLink,
  AlertCircle,
  Trash2,
  Info,
} from 'lucide-react';

type GeolocationWatchState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'stale'
  | 'permission-denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export const DriverPortal: React.FC = () => {
  const {
    role,
    drivers,
    activeDriverId,
    setActiveDriverId,
    currentDriver,
    buses,
    routes,
    startTrip,
    endTrip,
    advanceToNextStop,
    updateBusOccupancy,
    reportDelay,
    toggleAutoSimulation,
    updateBusDeviceLocation,
  } = useTransit();

  const [customDelayNotice, setCustomDelayNotice] = useState('');
  const [showDelayModal, setShowDelayModal] = useState(false);

  // Opt-in Device GPS state (NEVER requested on page load)
  const [geoStatus, setGeoStatus] = useState<GeolocationWatchState>('idle');
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const watchIdRef = useRef<number | null>(null);
  const activeWatchBusIdRef = useRef<string | null>(null);

  const stopDeviceGpsWatch = useCallback((resetStatus = true) => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    activeWatchBusIdRef.current = null;
    if (resetStatus) {
      setGeoStatus('idle');
      setGeoErrorMessage(null);
    }
  }, []);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      stopDeviceGpsWatch(false);
    };
  }, [stopDeviceGpsWatch]);

  const assignedBus = currentDriver
    ? buses.find((b) => b.id === currentDriver.busId) || buses[0]
    : null;

  // Stop active watch if admin switches to a different driver/bus
  useEffect(() => {
    if (
      activeWatchBusIdRef.current &&
      assignedBus &&
      activeWatchBusIdRef.current !== assignedBus.id
    ) {
      stopDeviceGpsWatch(true);
    }
  }, [assignedBus?.id, stopDeviceGpsWatch]);

  // Periodically check staleness of saved device fix
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (
        watchIdRef.current !== null &&
        assignedBus?.deviceLocation &&
        isFixStale(assignedBus.deviceLocation.timestamp, now)
      ) {
        setGeoStatus((prev) => (prev === 'active' ? 'stale' : prev));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [assignedBus?.deviceLocation]);

  if (!currentDriver || !assignedBus) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600">Driver record not found.</p>
      </div>
    );
  }

  const assignedRoute = routes.find((r) => r.id === assignedBus.routeId) || routes[0];
  const stops = assignedRoute.stops;

  const currentStopObj = stops[assignedBus.currentStopIndex] || stops[0];
  const nextStopObj = stops[Math.min(assignedBus.currentStopIndex + 1, stops.length - 1)] || currentStopObj;
  const isTripActive = assignedBus.status === 'in-transit';
  const isTripCompleted = assignedBus.status === 'completed';
  const isLastStop = assignedBus.currentStopIndex >= stops.length - 1;
  const savedDeviceFix = assignedBus.deviceLocation || null;
  const isSavedFixStale = savedDeviceFix ? isFixStale(savedDeviceFix.timestamp, nowMs) : false;

  const handleStartDeviceGps = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      setGeoErrorMessage('Browser geolocation is not supported on this device or browser.');
      return;
    }

    stopDeviceGpsWatch(false);
    setGeoStatus('requesting');
    setGeoErrorMessage(null);
    activeWatchBusIdRef.current = assignedBus.id;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        updateBusDeviceLocation(assignedBus.id, {
          latitude,
          longitude,
          accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
          heading: heading !== null && Number.isFinite(heading) ? heading : null,
          speedMps: speed !== null && Number.isFinite(speed) ? speed : null,
          timestamp: position.timestamp || Date.now(),
          source: 'device-gps',
          syncScope: 'local-browser-only',
        });
        setNowMs(Date.now());
        setGeoStatus('active');
        setGeoErrorMessage(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('permission-denied');
          setGeoErrorMessage(
            'Location permission was denied. Allow location access in browser site settings to use Device GPS.'
          );
          stopDeviceGpsWatch(false);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoStatus('unavailable');
          setGeoErrorMessage(
            'Device GPS position is currently unavailable. Check device location services or GPS signal.'
          );
        } else if (err.code === err.TIMEOUT) {
          setGeoStatus('timeout');
          setGeoErrorMessage(
            'Timed out waiting for a Device GPS fix. Keeping watcher ready or retry in an open area.'
          );
        } else {
          setGeoStatus('unavailable');
          setGeoErrorMessage(err.message || 'Unable to acquire device location.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  };

  const handleClearSavedFix = () => {
    stopDeviceGpsWatch(true);
    updateBusDeviceLocation(assignedBus.id, null);
  };

  const handleDelaySubmit = (minutes: number, reason?: string) => {
    reportDelay(assignedBus.id, minutes, reason || null);
    setShowDelayModal(false);
    setCustomDelayNotice('');
  };

  return (
    <div className="space-y-6">
      {/* Driver Identity & Vehicle Duty Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {currentDriver.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{currentDriver.name}</h1>
                <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {currentDriver.id}
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                  License: {currentDriver.licenseNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Experience: {currentDriver.experienceYears} Years · Rating: {currentDriver.rating} ★ · Assigned Bus: {assignedBus.busNumber} ({assignedBus.regNumber})
              </p>
            </div>
          </div>

          {/* Role-Restricted Control: Drivers cannot switch drivers; Admin can test switcher */}
          {role === 'fleet_admin' || role === 'admin' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-medium text-slate-500 shrink-0">Admin: Test Driver:</label>
              <select
                value={activeDriverId}
                onChange={(e) => setActiveDriverId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              >
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.name} (Bus {drv.busId})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 min-h-[44px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Duty Cockpit · {currentDriver.id}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Trip Control Cockpit Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-7 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
              <Radio className={`w-3.5 h-3.5 ${isTripActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Trip Status: {assignedBus.status.toUpperCase()}</span>
              <span>·</span>
              <span className="text-slate-400 font-mono">{assignedRoute.code}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {assignedRoute.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Current Waypoint:{' '}
              <strong className="text-white font-semibold">
                {currentStopObj.name} (Stop {assignedBus.currentStopIndex + 1} of {stops.length})
              </strong>
            </p>
          </div>

          {/* Primary Start / Advance / End Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {!isTripActive && !isTripCompleted && (
              <button
                onClick={() => startTrip(assignedBus.id)}
                className="w-full sm:w-auto justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-transform active:scale-95 min-h-[48px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Shift Trip</span>
              </button>
            )}

            {isTripActive && (
              <>
                <button
                  onClick={() => advanceToNextStop(assignedBus.id)}
                  disabled={isLastStop}
                  className="w-full sm:w-auto justify-center px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-transform active:scale-95 min-h-[48px]"
                >
                  <ChevronRight className="w-5 h-5" />
                  <span>Advance to Next Stop</span>
                </button>

                <button
                  onClick={() => endTrip(assignedBus.id)}
                  className="w-full sm:w-auto justify-center px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors min-h-[48px]"
                >
                  <Square className="w-4 h-4" />
                  <span>End Trip</span>
                </button>
              </>
            )}

            {isTripCompleted && (
              <button
                onClick={() => startTrip(assignedBus.id)}
                className="w-full sm:w-auto justify-center px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-transform min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Return Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Control Bar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
          {/* Simulated GPS Progression toggle */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
            <span className="text-slate-400 block text-[11px]">Simulated GPS Progression</span>
            <div className="mt-2 flex items-center justify-between">
              <span className={`font-semibold ${assignedBus.isSimulating ? 'text-amber-300' : 'text-slate-400'}`}>
                {assignedBus.isSimulating ? 'Active (Sim)' : 'Manual'}
              </span>
              <button
                onClick={() => toggleAutoSimulation(assignedBus.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${
                  assignedBus.isSimulating
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {assignedBus.isSimulating ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>

          {/* Passenger Boarding Counter */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
            <span className="text-slate-400 block text-[11px]">Passenger Onboard</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono font-bold text-base text-white">
                {assignedBus.occupiedSeats} / {assignedBus.capacity}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateBusOccupancy(assignedBus.id, -1)}
                  disabled={assignedBus.occupiedSeats <= 0}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-600 disabled:opacity-40 text-base"
                  aria-label="Decrease passenger count"
                >
                  -
                </button>
                <button
                  onClick={() => updateBusOccupancy(assignedBus.id, 1)}
                  disabled={assignedBus.occupiedSeats >= assignedBus.capacity}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-500 disabled:opacity-40 text-base"
                  aria-label="Increase passenger count"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Speed Indicator */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
            <span className="text-slate-400 block text-[11px]">Simulated Speed</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-mono font-extrabold text-xl text-white">
                {assignedBus.status === 'in-transit' ? assignedBus.speedKmH : 0}
              </span>
              <span className="text-slate-400">km/h</span>
            </div>
          </div>

          {/* Report Traffic Delay trigger */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 flex flex-col justify-between">
            <span className="text-slate-400 block text-[11px]">Dispatch Alerts</span>
            <button
              onClick={() => setShowDelayModal(true)}
              className="mt-2 px-3 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Delay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Opt-In Device GPS Control Card (Browser Geolocation — Manual Start Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-600" />
                <span>Device GPS (Opt-In Browser Geolocation)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                Source: Device GPS
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  geoStatus === 'active' && !isSavedFixStale
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : geoStatus === 'stale' || (savedDeviceFix && isSavedFixStale)
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : geoStatus === 'requesting'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : geoStatus === 'permission-denied' ||
                      geoStatus === 'unavailable' ||
                      geoStatus === 'timeout' ||
                      geoStatus === 'unsupported'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {geoStatus === 'active' && !isSavedFixStale
                  ? 'TRACKING ACTIVE'
                  : geoStatus === 'stale' || (savedDeviceFix && isSavedFixStale)
                  ? 'FIX STALE (>30s)'
                  : geoStatus === 'requesting'
                  ? 'REQUESTING PERMISSION'
                  : geoStatus === 'permission-denied'
                  ? 'PERMISSION DENIED'
                  : geoStatus === 'unavailable'
                  ? 'SIGNAL UNAVAILABLE'
                  : geoStatus === 'timeout'
                  ? 'FIX TIMED OUT'
                  : geoStatus === 'unsupported'
                  ? 'UNSUPPORTED'
                  : 'OFF (NOT REQUESTED)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Location is only requested after you click <strong>Start Device GPS</strong>. Simulated route movement above remains separate and is never labeled as Device GPS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {watchIdRef.current === null ? (
              <button
                type="button"
                onClick={handleStartDeviceGps}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[42px] cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Start Device GPS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => stopDeviceGpsWatch(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[42px] cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Device GPS</span>
              </button>
            )}

            {savedDeviceFix && (
              <button
                type="button"
                onClick={handleClearSavedFix}
                className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[42px] cursor-pointer border border-slate-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Fix</span>
              </button>
            )}

            <a
              href={buildGoogleMapsSearchUrl({
                query: `${nextStopObj.name}, ${nextStopObj.landmark}`,
                lat: hasValidCoordinates(nextStopObj.latitude, nextStopObj.longitude)
                  ? nextStopObj.latitude
                  : undefined,
                lng: hasValidCoordinates(nextStopObj.latitude, nextStopObj.longitude)
                  ? nextStopObj.longitude
                  : undefined,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[42px]"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Next Stop in Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Local-Only Synchronization Limitation Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Local Browser State Only:</strong> This application does not currently run a live fleet telemetry backend. Device GPS fixes captured here are stored only in this browser session&apos;s local state and are <strong>not</strong> broadcast to other students, drivers, or remote admin devices.
          </p>
        </div>

        {/* Error / Permission State Notice */}
        {geoErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{geoErrorMessage}</span>
          </div>
        )}

        {/* Latest Captured Device Fix Details */}
        {savedDeviceFix ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Coordinates</span>
                <span className="font-mono font-bold text-slate-900">
                  {savedDeviceFix.latitude.toFixed(5)}, {savedDeviceFix.longitude.toFixed(5)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Accuracy</span>
                <span className="font-mono font-semibold text-slate-800">
                  {savedDeviceFix.accuracyMeters != null
                    ? `±${Math.round(savedDeviceFix.accuracyMeters)} m`
                    : 'Not reported'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Last Fix Age</span>
                <span className={`font-mono font-semibold ${isSavedFixStale ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatFixAge(savedDeviceFix.timestamp, nowMs)}
                  {isSavedFixStale ? ' (Stale)' : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Device Speed</span>
                <span className="font-mono font-semibold text-slate-800">
                  {savedDeviceFix.speedMps != null
                    ? `${Math.round(savedDeviceFix.speedMps * 3.6)} km/h`
                    : 'Not reported'}
                </span>
              </div>
            </div>

            <a
              href={buildGoogleMapsCoordinatesUrl(savedDeviceFix.latitude, savedDeviceFix.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Open Fix in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No Device GPS fix recorded yet for <strong className="text-slate-700">{assignedBus.busNumber}</strong>.
          </p>
        )}
      </div>

      {/* Route Stops Checklist with Boarding Tally */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Trip Stop Manifest & Waypoints</h3>
            <p className="text-xs text-slate-500">
              Corridor {assignedRoute.corridor} · Total Distance: {assignedRoute.totalDistanceKm} km
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            Morning Departure: {assignedRoute.morningDeparture}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {stops.map((stop, idx) => {
            const isCompleted = assignedBus.currentStopIndex > idx;
            const isCurrent = assignedBus.currentStopIndex === idx;
            const isCampus = idx === stops.length - 1;

            return (
              <div
                key={stop.id}
                className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isCurrent ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 sm:mt-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-slate-900">{stop.name}</span>
                      {isCampus && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Campus Terminal
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded animate-pulse">
                          Bus Here
                        </span>
                      )}
                      <span className="sm:hidden text-[11px] font-mono text-slate-500">
                        ({stop.scheduledMorningPickup})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{stop.landmark}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs shrink-0 w-full sm:w-auto">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 block font-mono">Pickup Schedule</span>
                    <span className="font-mono font-semibold text-slate-800">{stop.scheduledMorningPickup}</span>
                  </div>

                  {isTripActive && (
                    <button
                      onClick={() => advanceToNextStop(assignedBus.id)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center ${
                        isCurrent
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isCompleted ? 'Mark Re-visited' : isCurrent ? 'Check Out / Depart' : 'Jump Here'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traffic Delay Reporting Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Broadcast Traffic Delay</h3>
            <p className="text-xs text-slate-500 mb-4">
              Students subscribed to {assignedRoute.code} will see the updated delay alert in real time.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-700">Quick Delay Presets:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDelaySubmit(5, 'Minor traffic congestion at roundabout')}
                  className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 transition-colors min-h-[44px]"
                >
                  +5 Mins
                </button>
                <button
                  onClick={() => handleDelaySubmit(10, 'Heavy highway bottleneck on NH-5')}
                  className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 transition-colors min-h-[44px]"
                >
                  +10 Mins
                </button>
                <button
                  onClick={() => handleDelaySubmit(15, 'Toll Plaza traffic backup')}
                  className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 transition-colors min-h-[44px]"
                >
                  +15 Mins
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-5">
              <label className="text-xs font-semibold text-slate-700">Custom Incident Note (Optional):</label>
              <input
                type="text"
                value={customDelayNotice}
                onChange={(e) => setCustomDelayNotice(e.target.value)}
                placeholder="e.g. Tire pressure check / Diversion near Kharar"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDelayModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelaySubmit(8, customDelayNotice || 'Traffic delay reported by driver')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Broadcast Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
