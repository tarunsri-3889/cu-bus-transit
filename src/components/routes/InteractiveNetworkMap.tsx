import React, { useState, useMemo } from 'react';
import { Route, RouteStop, Bus } from '../../types/transit';
import {
  Compass,
  MapPin,
  Bus as BusIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Info,
  Layers,
} from 'lucide-react';

interface InteractiveNetworkMapProps {
  routes: Route[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  buses: Bus[];
}

interface ProjectedPoint {
  x: number;
  y: number;
  stop: RouteStop;
}

export const InteractiveNetworkMap: React.FC<InteractiveNetworkMapProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  buses,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredStop, setHoveredStop] = useState<{ stop: RouteStop; routeCode: string; x: number; y: number } | null>(null);
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [mapMode, setMapMode] = useState<'network' | 'focus'>('network');

  // Geographic bounds across Ambala - Chandigarh - Mohali - Gharuan (CU)
  // Latitude ~ 30.30 (Ambala) to 30.78 (CU Gharuan)
  // Longitude ~ 76.55 (CU Gharuan) to 76.87 (Ambala Cantt)
  const bounds = useMemo(() => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    routes.forEach((r) => {
      r.stops.forEach((s) => {
        if (s.latitude < minLat) minLat = s.latitude;
        if (s.latitude > maxLat) maxLat = s.latitude;
        if (s.longitude < minLng) minLng = s.longitude;
        if (s.longitude > maxLng) maxLng = s.longitude;
      });
    });
    // Add margin
    return {
      minLat: minLat - 0.03,
      maxLat: maxLat + 0.03,
      minLng: minLng - 0.04,
      maxLng: maxLng + 0.04,
    };
  }, [routes]);

  // Project lat/lng to SVG viewBox (900 x 480)
  const project = (lat: number, lng: number): { x: number; y: number } => {
    const svgWidth = 900;
    const svgHeight = 480;

    // Invert lat for SVG Y (north is up)
    const normX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    const normY = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

    // Padding margins
    const padX = 70;
    const padY = 50;

    const x = padX + normX * (svgWidth - padX * 2);
    const y = padY + normY * (svgHeight - padY * 2);

    return { x, y };
  };

  // Pre-calculate paths for all routes
  const routePaths = useMemo(() => {
    return routes.map((route) => {
      const points: ProjectedPoint[] = route.stops.map((stop) => {
        const { x, y } = project(stop.latitude, stop.longitude);
        return { x, y, stop };
      });

      // Generate curved SVG path
      const pathD = points.reduce((acc, pt, idx) => {
        if (idx === 0) return `M ${pt.x} ${pt.y}`;
        const prev = points[idx - 1];
        const cx = (prev.x + pt.x) / 2;
        const cy = (prev.y + pt.y) / 2;
        return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${cy} T ${pt.x} ${pt.y}`;
      }, '');

      return {
        route,
        points,
        pathD,
      };
    });
  }, [routes, bounds]);

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const selectedRouteData = routePaths.find((rp) => rp.route.id === selectedRouteId) || routePaths[0];

  // Active buses on selected route
  const activeBuses = buses.filter((b) => b.routeId === selectedRouteId && b.status !== 'idle');

  // Terminal CU Hub coordinate
  const cuTerminalPt = project(30.768, 76.575);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Map Header & Controls */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Interactive Transit Network Visualization
            </h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono font-semibold text-blue-600">
              Highlighting {selectedRouteObj.code} Corridor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any route line or stop node to inspect its path, waypoints, and fleet allocations.
          </p>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs font-medium text-slate-700">
            <button
              onClick={() => setMapMode('network')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                mapMode === 'network' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              All Routes
            </button>
            <button
              onClick={() => setMapMode('focus')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                mapMode === 'focus' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Focus Selected
            </button>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
              title="Zoom In"
              aria-label="Zoom in"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
              title="Zoom Out"
              aria-label="Zoom out"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Reset View"
              aria-label="Reset zoom"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full h-[320px] sm:h-[420px] md:h-[460px] bg-slate-950 overflow-hidden select-none">
        {/* Subtle geometric cartography grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* Ambient Geographic Annotations */}
        <div className="absolute top-3 left-4 z-10 pointer-events-none flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400">
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">Greater Mohali · Kharar · Ambala Web</span>
          <span className="text-slate-600 hidden xs:inline">·</span>
          <span className="text-emerald-400 font-mono hidden xs:inline">5 Arteries</span>
        </div>

        {/* Scaled SVG */}
        <div
          className="w-full h-full transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 900 480"
            className="w-full h-full object-contain"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Highlight path glow filter */}
              <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Highway Infrastructure Grid lines */}
            <g stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3">
              <line x1="100" y1="240" x2="800" y2="240" />
              <line x1="450" y1="50" x2="450" y2="430" />
            </g>

            {/* Non-selected Routes (Muted background lines) */}
            {routePaths.map(({ route, pathD }) => {
              const isSelected = route.id === selectedRouteId;
              if (isSelected && mapMode === 'focus') return null;

              return (
                <g
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className="cursor-pointer group"
                >
                  {/* Invisible wide hit area for easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="24"
                    strokeLinecap="round"
                  />
                  {/* Visual Route Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? route.colorHex : '#475569'}
                    strokeWidth={isSelected ? '6' : '2.5'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isSelected ? '1' : mapMode === 'focus' ? '0.08' : '0.35'}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                </g>
              );
            })}

            {/* Selected Route Bright Highlight Overlay */}
            <g>
              {/* Soft colored neon halo */}
              <path
                d={selectedRouteData.pathD}
                fill="none"
                stroke={selectedRouteObj.colorHex}
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                filter="url(#routeGlow)"
              />
              {/* Solid High-Contrast Route Core */}
              <path
                d={selectedRouteData.pathD}
                fill="none"
                stroke={selectedRouteObj.colorHex}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-lg"
              />
              {/* Animated directional pulsing dash along the route */}
              <path
                d={selectedRouteData.pathD}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 14"
                className="animate-pulse"
                opacity="0.85"
              />
            </g>

            {/* Unselected Route Stops (small subtle dots) */}
            {mapMode === 'network' &&
              routePaths
                .filter((rp) => rp.route.id !== selectedRouteId)
                .map((rp) =>
                  rp.points.map((pt) => (
                    <circle
                      key={`${rp.route.id}-${pt.stop.id}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill="#64748B"
                      opacity="0.5"
                      className="cursor-pointer hover:scale-150 transition-transform"
                      onClick={() => onSelectRoute(rp.route.id)}
                    />
                  ))
                )}

            {/* Selected Route Stops (prominent clickable nodes with labels) */}
            {selectedRouteData.points.map((pt, idx) => {
              const isCampus = idx === selectedRouteData.points.length - 1;
              const isOrigin = idx === 0;
              const isHovered = hoveredStop?.stop.id === pt.stop.id;
              const isActive = activeStop?.id === pt.stop.id;

              return (
                <g
                  key={pt.stop.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => setActiveStop(pt.stop)}
                  onMouseEnter={() =>
                    setHoveredStop({
                      stop: pt.stop,
                      routeCode: selectedRouteObj.code,
                      x: pt.x,
                      y: pt.y,
                    })
                  }
                  onMouseLeave={() => setHoveredStop(null)}
                >
                  {/* Outer ring for active or hovered stop */}
                  {(isHovered || isActive) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      opacity="0.9"
                      className="animate-ping"
                      style={{ animationDuration: '3s' }}
                    />
                  )}

                  {/* Stop Node */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCampus ? '10' : isOrigin ? '8.5' : '7'}
                    fill={isCampus ? '#10B981' : isOrigin ? '#3B82F6' : '#FFFFFF'}
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />

                  {/* Stop order number inside non-terminal stops */}
                  {!isCampus && (
                    <text
                      x={pt.x}
                      y={pt.y + 3}
                      textAnchor="middle"
                      fill={isOrigin ? '#FFFFFF' : '#0F172A'}
                      fontSize="7.5"
                      fontWeight="bold"
                      className="select-none font-mono"
                    >
                      {idx + 1}
                    </text>
                  )}

                  {/* Stop label */}
                  <text
                    x={pt.x}
                    y={idx % 2 === 0 ? pt.y - 18 : pt.y + 24}
                    textAnchor="middle"
                    fill={isCampus ? '#34D399' : isOrigin ? '#60A5FA' : '#F8FAFC'}
                    fontSize={isCampus || isOrigin ? '11' : '10'}
                    fontWeight={isCampus || isOrigin || isHovered ? '700' : '500'}
                    className="select-none font-sans drop-shadow-md"
                  >
                    {pt.stop.name}
                  </text>
                </g>
              );
            })}

            {/* Central Terminal Campus Hub Marker (CU Gate 2) */}
            <g transform={`translate(${cuTerminalPt.x}, ${cuTerminalPt.y})`}>
              <circle cx="0" cy="0" r="22" fill="#10B981" opacity="0.15" className="animate-ping" />
              <circle cx="0" cy="0" r="14" fill="#047857" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
              <g transform="translate(0, -26)">
                <rect
                  x="-65"
                  y="-12"
                  width="130"
                  height="16"
                  rx="4"
                  fill="#064E3B"
                  stroke="#34D399"
                  strokeWidth="1"
                  opacity="0.95"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="700"
                  className="font-mono uppercase tracking-wider"
                >
                  CU Main Campus Terminal
                </text>
              </g>
            </g>

            {/* Animated Active Fleet Markers on Selected Route */}
            {activeBuses.map((bus) => {
              const currIdx = Math.min(bus.currentStopIndex, selectedRouteData.points.length - 1);
              const nextIdx = Math.min(bus.currentStopIndex + 1, selectedRouteData.points.length - 1);
              const p1 = selectedRouteData.points[currIdx];
              const p2 = selectedRouteData.points[nextIdx];

              const busX = p1.x + (p2.x - p1.x) * (currIdx === nextIdx ? 1 : bus.progressToNextStop);
              const busY = p1.y + (p2.y - p1.y) * (currIdx === nextIdx ? 1 : bus.progressToNextStop);

              return (
                <g
                  key={bus.id}
                  transform={`translate(${busX}, ${busY})`}
                  className="transition-all duration-700 ease-out cursor-pointer"
                >
                  <circle cx="0" cy="0" r="14" fill="#3B82F6" opacity="0.4" className="animate-ping" />
                  <circle cx="0" cy="0" r="10" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
                  <g transform="translate(0, -18)">
                    <rect
                      x="-36"
                      y="-11"
                      width="72"
                      height="14"
                      rx="3"
                      fill="#0F172A"
                      stroke="#60A5FA"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-1"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      {bus.busNumber} · {bus.speedKmH}km/h
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover / Active Stop Detail Floating Card */}
        {(hoveredStop || activeStop) && (
          <div className="absolute top-10 left-3 right-3 sm:left-auto sm:right-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-xl border border-slate-700 shadow-xl sm:max-w-xs animate-in fade-in">
            {(() => {
              const current = hoveredStop?.stop || activeStop!;
              return (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-400">
                      Stop #{current.stopOrder} of {selectedRouteObj.stops.length}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {current.distanceFromStartKm} km
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{current.name}</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5">{current.landmark}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400 block">Morning Pickup</span>
                      <span className="text-emerald-400 font-bold">{current.scheduledMorningPickup}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Evening Drop</span>
                      <span className="text-slate-200 font-bold">{current.scheduledEveningDrop}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Interactive Route Color Legend Bar */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-300 bg-slate-900/90 backdrop-blur-md p-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mr-1">Corridors:</span>
            {routes.map((r) => {
              const isSelected = r.id === selectedRouteId;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRoute(r.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md transition-colors ${
                    isSelected ? 'bg-white/20 font-bold text-white' : 'hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.colorHex }}
                  />
                  <span className="font-mono">{r.code}</span>
                  {isSelected && <span className="text-[10px] text-blue-400 hidden xs:inline">●</span>}
                </button>
              );
            })}
          </div>

          <div className="hidden xs:flex items-center gap-3 font-mono text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Campus Terminal</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Active Bus</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
