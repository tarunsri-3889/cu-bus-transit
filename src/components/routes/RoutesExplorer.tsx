import React, { useState } from 'react';
import { useTransit } from '../../context/TransitContext';
import { Route } from '../../types/transit';
import { MapPin, Bus as BusIcon, Clock, ArrowRight, CheckCircle2, ChevronRight, User } from 'lucide-react';

export const RoutesExplorer: React.FC = () => {
  const { routes, buses, drivers, calculateStopEta } = useTransit();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('R-01');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const routeBuses = buses.filter((b) => b.routeId === selectedRoute.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chandigarh University Transit Corridors</h1>
            <p className="text-xs text-slate-500 mt-1">
              Official university transport network covering Ambala, Panchkula, Mohali, and Gharuan campus terminals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              5 Active Designated Routes
            </span>
          </div>
        </div>

        {/* Route Selector Tabs */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <button
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all min-h-[44px] flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="font-mono">{route.code}</span>
                <span>·</span>
                <span className="font-medium text-[11px] truncate max-w-[140px] sm:max-w-none">
                  {route.name.split(' - ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Route Hero Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 mb-1">
              <span>{selectedRoute.code} OFFICIAL TRANSIT ROUTE</span>
              <span>·</span>
              <span className="text-slate-500">{selectedRoute.totalDistanceKm} KM TOTAL</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{selectedRoute.name}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{selectedRoute.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs shrink-0">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-mono">Morning Departure</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{selectedRoute.morningDeparture}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-mono">Evening Return from CU</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{selectedRoute.eveningReturn}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-mono">Total Stops</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{selectedRoute.stops.length} Stops</span>
            </div>
          </div>
        </div>

        {/* Assigned Fleet on this Route */}
        <div className="mt-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Buses Assigned to this Route ({routeBuses.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routeBuses.map((bus) => {
              const driver = drivers.find((d) => d.id === bus.driverId);
              return (
                <div
                  key={bus.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 font-mono">{bus.busNumber}</span>
                      <span className="text-[11px] font-mono text-slate-500">({bus.regNumber})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Driver: <strong className="text-slate-800">{driver?.name || 'Assigned Driver'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Seats: {bus.occupiedSeats} / {bus.capacity}
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
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      {bus.speedKmH} km/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ordered Stops Detailed Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Complete Ordered Stop Sequencing for {selectedRoute.code}
        </h3>

        <div className="divide-y divide-slate-100">
          {selectedRoute.stops.map((stop, idx) => {
            const isTerminal = idx === selectedRoute.stops.length - 1;
            const isFirst = idx === 0;

            return (
              <div
                key={stop.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5 ${
                      isTerminal
                        ? 'bg-emerald-600 text-white'
                        : isFirst
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{stop.name}</h4>
                      {isTerminal && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Destination Campus
                        </span>
                      )}
                      {isFirst && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Origin Stop
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{stop.landmark}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-600 sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Distance</span>
                    <span className="font-mono font-bold text-slate-800">{stop.distanceFromStartKm} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Morning Pickup</span>
                    <span className="font-mono font-bold text-blue-600">{stop.scheduledMorningPickup}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Evening Drop</span>
                    <span className="font-mono font-bold text-slate-800">{stop.scheduledEveningDrop}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
