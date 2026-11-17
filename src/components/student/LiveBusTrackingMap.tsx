import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Route, Bus, RouteStop } from '../../types/transit';
import {
  Bus as BusIcon,
  MapPin,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Layers,
  Play,
  Pause,
  FastForward,
  Radio,
  Clock,
  Gauge,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { GoogleMapsTransitView } from '../maps/GoogleMapsTransitView';
import { buildGoogleMapsSearchUrl, hasValidCoordinates } from '../../utils/googleMaps';

export interface LiveBusTrackingMapProps {
  route: Route;
  bus: Bus;
  userStopId?: string;
  allBuses?: Bus[];
  allRoutes?: Route[];
  onSelectStop?: (stop: RouteStop) => void;
  onToggleSimulation?: (busId: string) => void;
  onAdvanceStop?: (busId: string) => void;
  onRefreshTelemetry?: () => void;
  calculateStopEta?: (bus: Bus, stopId: string) => { minutes: number; text: string; isPassed: boolean; isCurrent: boolean };
}

interface ProjectedPoint {
  x: number;
  y: number;
  stop: RouteStop;
}

export const LiveBusTrackingMap: React.FC<LiveBusTrackingMapProps> = ({
  route,
  bus,
  userStopId,
  allBuses = [],
  allRoutes = [],
  onSelectStop,
  onToggleSimulation,
  onAdvanceStop,
  onRefreshTelemetry,
  calculateStopEta,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<string>(userStopId || route.stops[0]?.id);
  const [viewMode, setViewMode] = useState<'geographic' | 'schematic' | 'google-maps'>('geographic');
  const [showAllBuses, setShowAllBuses] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep selected stop synced if userStopId changes
  useEffect(() => {
    if (userStopId) {
      setSelectedStopId(userStopId);
    }
  }, [userStopId]);

  const stops = route.stops;
  const numStops = stops.length;

  // 1. Calculate Geographic Projection Bounds
  // Bounds cover Ambala, Chandigarh, Mohali, Kharar, and Gharuan (CU)
  const bounds = useMemo(() => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    const routesToScan = allRoutes.length > 0 ? allRoutes : [route];

    routesToScan.forEach((r) => {
      r.stops.forEach((s) => {
        if (s.latitude < minLat) minLat = s.latitude;
        if (s.latitude > maxLat) maxLat = s.latitude;
        if (s.longitude < minLng) minLng = s.longitude;
        if (s.longitude > maxLng) maxLng = s.longitude;
      });
    });

    // Add safe padding to ensure all stops fit comfortably
    return {
      minLat: minLat - 0.03,
      maxLat: maxLat + 0.03,
      minLng: minLng - 0.04,
      maxLng: maxLng + 0.04,
    };
  }, [allRoutes, route]);

  // Project geographic latitude/longitude to SVG viewport (860 x 440)
  const projectGeo = useCallback(
    (lat: number, lng: number): { x: number; y: number } => {
      const svgWidth = 860;
      const svgHeight = 440;
      const padX = 60;
      const padY = 50;

      const normX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
      // Invert Y because SVG coordinates increase downwards (north is up)
      const normY = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

      const x = padX + normX * (svgWidth - padX * 2);
      const y = padY + normY * (svgHeight - padY * 2);
      return { x, y };
    },
    [bounds]
  );

  // 2. Projected Points for the Active Route
  const routePoints: ProjectedPoint[] = useMemo(() => {
    if (viewMode === 'geographic') {
      return stops.map((stop) => {
        const { x, y } = projectGeo(stop.latitude, stop.longitude);
        return { x, y, stop };
      });
    } else {
      // Schematic Mode: Organic wave spline across width
      return stops.map((stop, index) => {
        const x = 70 + (index / (numStops - 1)) * 720;
        const curveOffset = Math.sin((index / (numStops - 1)) * Math.PI) * 70;
        const y = 230 - curveOffset;
        return { x, y, stop };
      });
    }
  }, [viewMode, stops, numStops, projectGeo]);

  // 3. Other Routes Paths (for rich multi-corridor transit context in geographic mode)
  const otherRoutePaths = useMemo(() => {
    if (viewMode !== 'geographic' || allRoutes.length === 0) return [];

    return allRoutes
      .filter((r) => r.id !== route.id)
      .map((r) => {
        const pts = r.stops.map((s) => {
          const { x, y } = projectGeo(s.latitude, s.longitude);
          return { x, y, stop: s };
        });

        const d = pts.reduce((acc, pt, idx) => {
          if (idx === 0) return `M ${pt.x} ${pt.y}`;
          const prev = pts[idx - 1];
          const cx = (prev.x + pt.x) / 2;
          const cy = (prev.y + pt.y) / 2;
          return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${cy} T ${pt.x} ${pt.y}`;
        }, '');

        return { route: r, points: pts, pathD: d };
      });
  }, [viewMode, allRoutes, route.id, projectGeo]);

  // 4. Generate SVG Route Spline Path
  const mainRoutePathD = useMemo(() => {
    return routePoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = routePoints[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      const cy = (prev.y + pt.y) / 2;
      return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${cy} T ${pt.x} ${pt.y}`;
    }, '');
  }, [routePoints]);

  // 5. Active Bus Real-Time Position & Tangent Heading Angle
  const currIdx = Math.min(bus.currentStopIndex, numStops - 1);
  const nextIdx = Math.min(bus.currentStopIndex + 1, numStops - 1);
  const p1 = routePoints[currIdx] || routePoints[0];
  const p2 = routePoints[nextIdx] || routePoints[routePoints.length - 1];

  const busX = p1.x + (p2.x - p1.x) * (currIdx === nextIdx ? 1 : bus.progressToNextStop);
  const busY = p1.y + (p2.y - p1.y) * (currIdx === nextIdx ? 1 : bus.progressToNextStop);

  // Compute forward heading angle in degrees
  const headingAngle = useMemo(() => {
    if (currIdx === nextIdx) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, [p1, p2, currIdx, nextIdx]);

  // 6. Completed Path Segment (traveled by the bus)
  const completedPathD = useMemo(() => {
    if (currIdx === 0 && bus.progressToNextStop === 0) return '';
    const pointsTraveled = routePoints.slice(0, currIdx + 1);
    let d = pointsTraveled.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = pointsTraveled[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      const cy = (prev.y + pt.y) / 2;
      return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${cy} T ${pt.x} ${pt.y}`;
    }, '');

    // Append line to current live bus position
    d += ` L ${busX} ${busY}`;
    return d;
  }, [currIdx, bus.progressToNextStop, routePoints, busX, busY]);

  // 7. Active Selected Stop Details
  const activeStopData = stops.find((s) => s.id === selectedStopId) || stops[currIdx];
  const isSelectedUserStop = activeStopData.id === userStopId;
  const userStopIndex = stops.findIndex((s) => s.id === userStopId);

  // Selected stop projected point
  const selectedStopPoint = routePoints.find((p) => p.stop.id === selectedStopId) || routePoints[0];
  const userStopPoint = routePoints.find((p) => p.stop.id === userStopId) || routePoints[0];

  // CU Campus Terminal Hub Point
  const cuTerminalPoint = routePoints[routePoints.length - 1];

  // 8. Pan & Zoom Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.8));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnBus = () => {
    setZoom(1.5);
    // Center viewBox on busX, busY (center of 860x440 is 430, 220)
    setPan({
      x: (430 - busX) * 0.7,
      y: (220 - busY) * 0.7,
    });
  };

  const handleCenterOnUserStop = () => {
    if (!userStopPoint) return;
    setZoom(1.5);
    setPan({
      x: (430 - userStopPoint.x) * 0.7,
      y: (220 - userStopPoint.y) * 0.7,
    });
  };

  // Mouse & Touch Dragging for Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Handlers for Mobile Panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Live ETA calculation for selected stop
  const activeStopEta = useMemo(() => {
    if (calculateStopEta) {
      return calculateStopEta(bus, activeStopData.id);
    }
    const idx = stops.findIndex((s) => s.id === activeStopData.id);
    const isPassed = currIdx > idx;
    const isCurrent = currIdx === idx;
    const remainingStops = Math.max(0, idx - currIdx);
    const estMinutes = remainingStops * 7;
    return {
      minutes: estMinutes,
      text: isPassed ? 'Departed' : isCurrent ? 'Arrived' : `~${estMinutes} mins`,
      isPassed,
      isCurrent,
    };
  }, [calculateStopEta, bus, activeStopData.id, currIdx, stops]);

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-2 sm:inset-4 z-50 bg-slate-950' : 'relative w-full'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="px-3 sm:px-5 py-3 border-b border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
        {/* Left Status & Route Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${bus.deviceLocation ? 'bg-cyan-400' : 'bg-amber-400'} relative`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-sans">
                Route Bus Tracker
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold">
                Simulated GPS
              </span>
              {bus.deviceLocation && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-semibold">
                  Device GPS (Local)
                </span>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono font-semibold text-blue-400 truncate">
                {route.code} Corridor
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {route.corridor}
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Fleet Toggle, Sim Controls, Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-800 rounded-lg text-xs font-medium text-slate-300">
            <button
              onClick={() => setViewMode('geographic')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'geographic'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Geographic
            </button>
            <button
              onClick={() => setViewMode('schematic')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'schematic'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Schematic
            </button>
            <button
              onClick={() => setViewMode('google-maps')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'google-maps'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              Google Maps
            </button>
          </div>

          {/* Multi-Bus Fleet Toggle (only available if allBuses provided) */}
          {allBuses.length > 0 && viewMode === 'geographic' && (
            <button
              onClick={() => setShowAllBuses(!showAllBuses)}
              title={showAllBuses ? 'Showing all simulated fleet buses' : 'Show all simulated fleet buses'}
              className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                showAllBuses
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fleet</span>
            </button>
          )}

          {/* Simulated GPS Controls */}
          {onToggleSimulation && (
            <button
              onClick={() => onToggleSimulation(bus.id)}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                bus.isSimulating
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={bus.isSimulating ? 'Pause simulated GPS movement' : 'Play simulated GPS movement'}
            >
              {bus.isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline text-[11px]">
                {bus.isSimulating ? 'Simulated GPS' : 'Sim Paused'}
              </span>
            </button>
          )}

          {/* Advance Stop Button for Quick Testing */}
          {onAdvanceStop && (
            <button
              onClick={() => onAdvanceStop(bus.id)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
              title="Advance simulated bus to next stop"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}

          {viewMode !== 'google-maps' && (
            <>
              {/* Quick Focus: My Bus */}
              <button
                onClick={handleCenterOnBus}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 border border-slate-700 text-blue-400 hover:text-blue-300 text-xs transition-colors cursor-pointer"
                title="Focus camera on simulated bus"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Zoom In / Out Buttons */}
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border-l border-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border-l border-slate-700"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Map Viewport Area (Google Maps View OR Existing SVG Map) */}
      {viewMode === 'google-maps' ? (
        <div className={isFullscreen ? 'flex-1 overflow-y-auto bg-[#070c18]' : ''}>
          <GoogleMapsTransitView
            mode="student"
            routes={[route]}
            selectedRouteId={route.id}
            buses={[bus]}
            highlightStopId={userStopId}
            selectedStopId={selectedStopId}
            onSelectStop={(stop) => {
              setSelectedStopId(stop.id);
              if (onSelectStop) onSelectStop(stop);
            }}
            theme="dark"
          />
        </div>
      ) : (
      <div
        className={`relative w-full ${
          isFullscreen ? 'flex-1' : 'h-[300px] sm:h-[380px] md:h-[420px]'
        } bg-[#070c18] overflow-hidden select-none cursor-grab active:cursor-grabbing`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ambient Map Grids & Background Highway Grid */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Ambient Radial Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(7,12,24,0.7)_100%)]" />

        {/* Floating Highway & Compass HUD Watermark */}
        <div className="absolute top-3 left-4 z-10 pointer-events-none flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>NH-05 Corridor · Gharuan, Mohali</span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-amber-400 font-semibold hidden sm:inline">Simulated Route Position</span>
        </div>

        {/* Telemetry Pill Overlay: Current Bus Speed & Status */}
        <div className="absolute top-3 right-4 z-10 pointer-events-none flex items-center gap-2 text-xs font-mono bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>Speed: <strong className="text-white font-bold">{bus.speedKmH} km/h</strong></span>
          <span className="text-slate-600">·</span>
          <span className={bus.status === 'in-transit' ? 'text-emerald-400' : 'text-amber-400'}>
            {bus.status === 'in-transit' ? 'In-Transit' : 'At Stop'}
          </span>
        </div>

        {/* SVG Canvas with Transform */}
        <svg
          viewBox="0 0 860 440"
          className="w-full h-full object-contain pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glowing neon filters for routes */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bus marker pulse filter */}
            <filter id="busGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Route gradient: Blue to Cyan to Emerald */}
            <linearGradient id="activeRouteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="55%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <linearGradient id="completedSegmentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>

          {/* Group with Pan & Zoom Transform */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: '430px 220px' }}>
            {/* 1. Regional Highway Context Grid (Geographic Mode) */}
            {viewMode === 'geographic' && (
              <g opacity="0.35" className="pointer-events-none">
                {/* Major NH-05 highway corridor spine */}
                <path
                  d="M 120 400 Q 380 320, 520 220 T 780 90"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <text x="320" y="325" fill="#64748B" fontSize="9" className="font-mono" transform="rotate(-18 320 325)">
                  NH-05 CHANDIGARH - LUDHIANA HIGHWAY
                </text>

                {/* PR-7 Mohali Airport Road arterial */}
                <path
                  d="M 500 420 Q 560 300, 680 240"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                />
              </g>
            )}

            {/* 2. Other Transit Corridors (if Geographic Mode) */}
            {otherRoutePaths.map(({ route: otherRoute, pathD }) => (
              <g key={otherRoute.id} opacity="0.25">
                <path
                  d={pathD}
                  fill="none"
                  stroke={otherRoute.colorHex || '#64748B'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                />
              </g>
            ))}

            {/* 3. Active Route Background Glow & Guide */}
            <path
              d={mainRoutePathD}
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.22"
              filter="url(#routeGlow)"
            />

            {/* 4. Active Route Base Highway Ribbon */}
            <path
              d={mainRoutePathD}
              fill="none"
              stroke="url(#activeRouteGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 5. Completed Traveled Segment */}
            {completedPathD && (
              <path
                d={completedPathD}
                fill="none"
                stroke="url(#completedSegmentGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="6 3"
                opacity="0.85"
              />
            )}

            {/* 6. Other Fleet Buses (if enabled) */}
            {showAllBuses &&
              viewMode === 'geographic' &&
              allBuses
                .filter((b) => b.id !== bus.id && b.status !== 'idle')
                .map((fleetBus) => {
                  const fRoute = allRoutes.find((r) => r.id === fleetBus.routeId);
                  if (!fRoute) return null;
                  const fStops = fRoute.stops;
                  const cIdx = Math.min(fleetBus.currentStopIndex, fStops.length - 1);
                  const nIdx = Math.min(cIdx + 1, fStops.length - 1);
                  const pt1 = projectGeo(fStops[cIdx].latitude, fStops[cIdx].longitude);
                  const pt2 = projectGeo(fStops[nIdx].latitude, fStops[nIdx].longitude);
                  const fx = pt1.x + (pt2.x - pt1.x) * fleetBus.progressToNextStop;
                  const fy = pt1.y + (pt2.y - pt1.y) * fleetBus.progressToNextStop;

                  return (
                    <g key={fleetBus.id} transform={`translate(${fx}, ${fy})`} className="cursor-pointer">
                      <circle cx="0" cy="0" r="12" fill="#4F46E5" opacity="0.4" />
                      <circle cx="0" cy="0" r="8" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text x="0" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="bold">
                        {fleetBus.busNumber.replace('Bus ', 'B')}
                      </text>
                    </g>
                  );
                })}

            {/* 7. Stop Stations (Interactive Pins) */}
            {routePoints.map((pt, idx) => {
              const isDestination = idx === numStops - 1;
              const isPassed = idx < currIdx;
              const isCurrentBusStop = idx === currIdx;
              const isUserStop = pt.stop.id === userStopId;
              const isSelected = pt.stop.id === selectedStopId;

              return (
                <g
                  key={pt.stop.id}
                  className="cursor-pointer transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStopId(pt.stop.id);
                    if (onSelectStop) onSelectStop(pt.stop);
                  }}
                >
                  {/* User Stop Highlight Halo Beacon */}
                  {isUserStop && (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="22"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        className="animate-spin"
                        style={{ transformOrigin: `${pt.x}px ${pt.y}px`, animationDuration: '8s' }}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="#F59E0B"
                        opacity="0.25"
                        className="animate-ping"
                      />
                    </g>
                  )}

                  {/* Selected Stop Outer Ring */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      opacity="0.9"
                    />
                  )}

                  {/* Destination CU Terminal Accent */}
                  {isDestination && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                      opacity="0.6"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Stop Marker Node */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isDestination ? 10 : isUserStop ? 9 : 7}
                    fill={
                      isDestination
                        ? '#10B981'
                        : isUserStop
                        ? '#F59E0B'
                        : isCurrentBusStop
                        ? '#3B82F6'
                        : isPassed
                        ? '#64748B'
                        : '#0F172A'
                    }
                    stroke={
                      isDestination
                        ? '#FFFFFF'
                        : isUserStop
                        ? '#FEF3C7'
                        : isCurrentBusStop
                        ? '#93C5FD'
                        : isPassed
                        ? '#94A3B8'
                        : '#38BDF8'
                    }
                    strokeWidth={isUserStop || isDestination ? '2.5' : '2'}
                  />

                  {/* Inner checkmark icon if stop has passed */}
                  {isPassed && (
                    <circle cx={pt.x} cy={pt.y} r="2.5" fill="#FFFFFF" />
                  )}

                  {/* Stop Order number for upcoming stops */}
                  {!isPassed && !isDestination && (
                    <text
                      x={pt.x}
                      y={pt.y + 3}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="7"
                      fontWeight="bold"
                      className="font-mono select-none pointer-events-none"
                    >
                      {idx + 1}
                    </text>
                  )}

                  {/* CU Terminal Star/Emblem for destination */}
                  {isDestination && (
                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8"
                      fontWeight="black"
                      className="select-none pointer-events-none"
                    >
                      CU
                    </text>
                  )}

                  {/* Stop Name Label */}
                  <g transform={`translate(${pt.x}, ${idx % 2 === 0 ? pt.y - 18 : pt.y + 24})`}>
                    <rect
                      x={-44}
                      y={-10}
                      width={88}
                      height={18}
                      rx={4}
                      fill={
                        isUserStop
                          ? '#78350F'
                          : isSelected
                          ? '#1E293B'
                          : isDestination
                          ? '#064E3B'
                          : '#0F172A'
                      }
                      stroke={
                        isUserStop
                          ? '#F59E0B'
                          : isSelected
                          ? '#FFFFFF'
                          : isDestination
                          ? '#34D399'
                          : '#334155'
                      }
                      strokeWidth={isSelected || isUserStop ? 1.5 : 0.8}
                      opacity={0.92}
                    />
                    <text
                      x={0}
                      y={2}
                      textAnchor="middle"
                      fill={isUserStop ? '#FEF3C7' : isDestination ? '#A7F3D0' : '#E2E8F0'}
                      fontSize={isUserStop || isDestination ? '8.5' : '8'}
                      fontWeight={isUserStop || isSelected ? '700' : '600'}
                      className="font-sans select-none pointer-events-none"
                    >
                      {pt.stop.name.length > 12 ? `${pt.stop.name.slice(0, 11)}…` : pt.stop.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 8. Real-Time Moving Bus Vehicle Marker */}
            {bus.status !== 'idle' && (
              <g
                transform={`translate(${busX}, ${busY})`}
                className="transition-transform duration-700 ease-out"
              >
                {/* Concentric radar beacon pulses */}
                <circle
                  cx="0"
                  cy="0"
                  r="26"
                  fill="#3B82F6"
                  opacity="0.2"
                  className="animate-ping"
                  style={{ animationDuration: '3s' }}
                />
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill="#1D4ED8"
                  opacity="0.35"
                />

                {/* Simulated Headlight Beam in the direction of heading */}
                <g transform={`rotate(${headingAngle})`}>
                  <polygon
                    points="8,-4 42,-14 42,14 8,4"
                    fill="url(#activeRouteGradient)"
                    opacity="0.22"
                    filter="url(#busGlow)"
                  />
                  <line
                    x1="8"
                    y1="0"
                    x2="38"
                    y2="0"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.6"
                  />
                </g>

                {/* Bus Pin Outer Badge */}
                <circle
                  cx="0"
                  cy="0"
                  r="13"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  filter="url(#busGlow)"
                />

                {/* Bus Icon Center */}
                <circle cx="0" cy="0" r="4" fill="#FFFFFF" />

                {/* Floating Bus Tag Badge (always upright) */}
                <g transform="translate(0, -26)">
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="18"
                    rx="4"
                    fill="#0A0F1D"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8.5"
                    fontWeight="700"
                    className="font-mono tracking-tight"
                  >
                    {bus.busNumber} · {bus.speedKmH}km/h
                  </text>
                </g>
              </g>
            )}
          </g>
        </svg>

        {/* Floating Quick Legend & Status Drawer Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6]" />
              <span className="text-[11px] font-medium">Simulated Bus ({bus.busNumber})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
              <span className="text-[11px] font-medium">Your Pickup</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span className="text-[11px] font-medium">CU Campus</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Next: <strong className="text-white">{stops[nextIdx]?.name || 'CU'}</strong></span>
            <span>·</span>
            <span className="text-emerald-400">
              {activeStopEta.isPassed
                ? 'Passed Your Stop'
                : activeStopEta.isCurrent
                ? 'At Your Stop'
                : `Sim ETA ~${activeStopEta.minutes}m`}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* 3. Selected Stop Interactive Inspection Tray */}
      <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isSelectedUserStop
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : activeStopData.name === 'CU'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {activeStopData.name === 'CU' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isSelectedUserStop ? (
              <MapPin className="w-4 h-4" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-sm tracking-tight truncate">
                {activeStopData.name}
              </h4>
              {isSelectedUserStop && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Your Assigned Stop
                </span>
              )}
              {activeStopData.name === 'CU' && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Campus Terminal
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{activeStopData.landmark}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-slate-300 text-[11px]">
              <span>Pickup: <strong className="font-mono text-white">{activeStopData.scheduledMorningPickup}</strong></span>
              <span>·</span>
              <span>Drop: <strong className="font-mono text-white">{activeStopData.scheduledEveningDrop}</strong></span>
              <span>·</span>
              <span>Dist: <strong className="font-mono text-white">{activeStopData.distanceFromStartKm} km</strong></span>
            </div>
          </div>
        </div>

        {/* Simulated Arrival Status & Google Maps Link for selected stop */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Simulated ETA
            </span>
            <span className="text-xs font-bold text-blue-400 font-mono">
              {activeStopEta.isPassed ? (
                <span className="text-slate-400">Bus has departed</span>
              ) : activeStopEta.isCurrent ? (
                <span className="text-emerald-400">Bus currently at stop</span>
              ) : (
                <span className="text-cyan-300">~{activeStopEta.minutes} mins away</span>
              )}
            </span>
          </div>

          <a
            href={buildGoogleMapsSearchUrl({
              query: `${activeStopData.name}, ${activeStopData.landmark}`,
              lat: hasValidCoordinates(activeStopData.latitude, activeStopData.longitude)
                ? activeStopData.latitude
                : undefined,
              lng: hasValidCoordinates(activeStopData.latitude, activeStopData.longitude)
                ? activeStopData.longitude
                : undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold transition-colors shrink-0 border border-blue-500/30 inline-flex items-center gap-1"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {userStopId !== activeStopData.id && (
            <button
              onClick={() => {
                setSelectedStopId(userStopId || stops[0].id);
                if (viewMode !== 'google-maps') {
                  handleCenterOnUserStop();
                }
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-slate-700"
            >
              Focus My Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
