import React, { useState } from 'react';
import { useTransit } from '../context/TransitContext';
import { Route } from '../types/transit';
import { InteractiveNetworkMap } from '../components/routes/InteractiveNetworkMap';
import {
  MapPin,
  Bus as BusIcon,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Navigation,
  ShieldCheck,
} from 'lucide-react';

export const RoutesDirectoryPage: React.FC = () => {
  const { routes, buses, drivers } = useTransit();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('R-01');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const assignedBuses = buses.filter((b) => b.routeId === selectedRoute.id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
          <span>All 5 Routes</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Official Campus Transit Directory</span>
        </div>
      </div>

      {/* Directory Intro Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Chandigarh University Transit Corridors
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Select any of the five official transit lines below to view its route path visualization, complete stop sequence, scheduled pickup & drop times, assigned fleet vehicles, and total corridor distance.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              5 Designated Corridors
            </span>
          </div>
        </div>

        {/* 5 Selectable Route Cards Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const routeBusCount = buses.filter((b) => b.routeId === route.id).length;

            return (
              <button
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer min-h-[44px] flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {route.code}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{route.totalDistanceKm} km</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {route.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{route.stops.length} Stops</span>
                  <span>{routeBusCount} Buses</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Route Network Map Visualization */}
      <InteractiveNetworkMap
        routes={routes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        buses={buses}
      />

      {/* Dedicated Route In-Depth Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
        {/* Route Details Hero */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 mb-1">
              <span>DESIGNATED ROUTE {selectedRoute.code}</span>
              <span>·</span>
              <span className="text-slate-400 font-sans">{selectedRoute.corridor}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedRoute.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {selectedRoute.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs w-full lg:w-auto shrink-0">
            <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Distance</span>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                {selectedRoute.totalDistanceKm} km
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Morning</span>
              <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm mt-0.5 block">
                {selectedRoute.morningDeparture}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Return</span>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                {selectedRoute.eveningReturn}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Fleet Vehicles */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Assigned Fleet Vehicles ({assignedBuses.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedBuses.map((bus) => {
              const driver = drivers.find((d) => d.id === bus.driverId);
              return (
                <div
                  key={bus.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">{bus.busNumber}</span>
                      <span className="text-xs font-mono text-slate-500">({bus.regNumber})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{bus.model}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Driver: <strong className="text-slate-800">{driver?.name || 'Assigned Driver'}</strong>
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Capacity: {bus.occupiedSeats} / {bus.capacity} seats ({Math.round((bus.occupiedSeats / bus.capacity) * 100)}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        bus.status === 'in-transit'
                          ? 'bg-emerald-100 text-emerald-800'
                          : bus.status === 'delayed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {bus.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 block mt-1.5">
                      {bus.speedKmH} km/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ordered Stops Manifest */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ordered Bus Stops for {selectedRoute.code} ({selectedRoute.stops.length} Total Stops)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Stops are ordered sequentially from first origin point to Chandigarh University Gate 2 campus terminal.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {selectedRoute.stops.map((stop, idx) => {
              const isCampus = idx === selectedRoute.stops.length - 1;
              const isOrigin = idx === 0;

              return (
                <div
                  key={stop.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCampus ? 'bg-emerald-50/40' : isOrigin ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5 ${
                        isCampus
                          ? 'bg-emerald-600 text-white'
                          : isOrigin
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{stop.name}</h4>
                        {isCampus && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Campus Destination
                          </span>
                        )}
                        {isOrigin && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Origin Terminal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{stop.landmark}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs text-slate-600 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono uppercase">Cumulative</span>
                      <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{stop.distanceFromStartKm} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono uppercase">Morning Pickup</span>
                      <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">{stop.scheduledMorningPickup}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono uppercase">Evening Drop</span>
                      <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{stop.scheduledEveningDrop}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
