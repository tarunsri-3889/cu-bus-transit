import React, { useState } from 'react';
import { useTransit } from '../../context/TransitContext';
import { LiveBusTrackingMap } from './LiveBusTrackingMap';
import { DigitalBusPassModal } from './DigitalBusPassModal';
import {
  Bus as BusIcon,
  Clock,
  Navigation,
  MapPin,
  RefreshCw,
  Phone,
  QrCode,
  AlertCircle,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const {
    role,
    students,
    activeStudentUid,
    setActiveStudentUid,
    currentStudent,
    currentStudentBus,
    currentStudentRoute,
    currentStudentStop,
    calculateStopEta,
    drivers,
    buses,
    routes,
    toggleAutoSimulation,
    advanceToNextStop,
    lastRefreshedAt,
    refreshTelemetry,
  } = useTransit();

  const [searchUid, setSearchUid] = useState(activeStudentUid);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  if (!currentStudent || !currentStudentBus || !currentStudentRoute) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600">Student transit record not found.</p>
      </div>
    );
  }

  const assignedDriver = drivers.find((d) => d.id === currentStudentBus.driverId);
  const stops = currentStudentRoute.stops;
  const userStop = currentStudentStop || stops[0];
  const userStopIndex = stops.findIndex((s) => s.id === userStop.id);
  const currentBusStop = stops[currentStudentBus.currentStopIndex] || stops[0];

  // Calculate ETA to the student's assigned pickup stop
  const studentStopEta = calculateStopEta(currentStudentBus, userStop.id);

  // Next upcoming stop from bus perspective
  const nextStopObj =
    currentStudentBus.currentStopIndex < stops.length - 1
      ? stops[currentStudentBus.currentStopIndex + 1]
      : stops[stops.length - 1];

  const nextStopEta = calculateStopEta(currentStudentBus, nextStopObj.id);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const cleaned = searchUid.trim();
    const found = students.find((s) => s.uid.toLowerCase() === cleaned.toLowerCase());
    if (found) {
      setActiveStudentUid(found.uid);
    } else {
      setSearchError(`No transit record found for UID "${cleaned}". Try demo UID: 22BCS10101 or 21BEE10042`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Welcome & Quick Switcher Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shrink-0">
              {currentStudent.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {currentStudent.name}
                </h1>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentStudent.uid}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentStudent.department} · {currentStudent.semester}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span>Route: <strong className="text-slate-900">{currentStudentRoute.code}</strong></span>
                <span>·</span>
                <span>Assigned Stop: <strong className="text-slate-900">{userStop.name}</strong></span>
                <span>·</span>
                <span>Bus: <strong className="text-slate-900">{currentStudentBus.busNumber}</strong></span>
                <span>·</span>
                <span>Seat: <strong className="font-mono text-slate-900">{currentStudent.seatNumber}</strong></span>
              </div>
            </div>
          </div>

          {/* Role-based CTA: Students cannot switch UIDs; Admin can switch for testing */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto">
            {role === 'fleet_admin' || role === 'admin' ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="text"
                    value={searchUid}
                    onChange={(e) => setSearchUid(e.target.value)}
                    placeholder="Admin: Test Student UID"
                    aria-label="Student UID"
                    className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-full sm:w-48 font-mono min-h-[44px]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors min-h-[44px] shrink-0"
                >
                  Test UID
                </button>
              </form>
            ) : (
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Student: <strong className="font-mono">{currentStudent.uid}</strong></span>
              </div>
            )}

            <button
              onClick={() => setIsPassModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Bus Pass</span>
            </button>
          </div>
        </div>

        {searchError && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Demo UID Pills for Instant Testing */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="text-[11px] font-medium text-slate-400">Quick Test Demo Students:</span>
          {students.slice(0, 5).map((stu) => (
            <button
              key={stu.id}
              onClick={() => {
                setSearchUid(stu.uid);
                setActiveStudentUid(stu.uid);
                setSearchError(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors min-h-[32px] ${
                activeStudentUid === stu.uid
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {stu.uid} ({stu.name.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Hero Live Status & ETA Highlight Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 sm:p-7 shadow-md relative overflow-hidden">
        {/* Background ambient pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none">
          <BusIcon className="w-full h-full text-white" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Column 1: Live ETA Counter */}
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-2 text-blue-300 text-xs font-semibold tracking-wider uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Simulated Route Telemetry · {currentStudentBus.busNumber}</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-slate-400">{currentStudentBus.lastUpdated}</span>
              {currentStudentBus.deviceLocation && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] normal-case tracking-normal">
                  Device GPS Fix (Local Browser)
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-white">
                {studentStopEta.isPassed ? (
                  <span className="text-emerald-400">Departed Your Stop</span>
                ) : studentStopEta.isCurrent ? (
                  <span className="text-amber-400">Bus Arrived at Your Stop</span>
                ) : (
                  <>
                    <span className="tabular-nums font-mono text-emerald-400">
                      {studentStopEta.minutes} min{studentStopEta.minutes === 1 ? '' : 's'}
                    </span>{' '}
                    <span className="text-xl sm:text-2xl font-normal text-slate-300">to your stop</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-2 max-w-xl">
              Currently approaching <strong className="text-white">{nextStopObj.name}</strong> from{' '}
              <strong className="text-white">{currentBusStop.name}</strong> at{' '}
              <span className="font-mono font-bold text-white">{currentStudentBus.speedKmH} km/h</span>.
            </p>

            {/* Delay or Traffic Notice if present */}
            {currentStudentBus.delayMinutes > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-lg text-xs text-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {currentStudentBus.emergencyAlert || `Traffic delay: +${currentStudentBus.delayMinutes} mins`}
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Scheduled Transit Times & Driver details */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-slate-300">Driver</span>
              <span className="font-semibold text-white">{assignedDriver?.name || 'Duty Staff'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-slate-300">Transport Support</span>
              {role === 'fleet_admin' || role === 'admin' ? (
                <a
                  href={`tel:${assignedDriver?.phone || ''}`}
                  className="font-mono text-blue-300 hover:text-white flex items-center gap-1 font-semibold"
                >
                  <Phone className="w-3 h-3" />
                  <span>{assignedDriver?.phone || 'Direct Mobile'}</span>
                </a>
              ) : (
                <a
                  href="tel:01603051000"
                  className="font-mono text-blue-300 hover:text-white flex items-center gap-1 font-semibold"
                >
                  <Phone className="w-3 h-3" />
                  <span>0160-3051000 (Dispatch)</span>
                </a>
              )}
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-slate-300">Morning Pickup</span>
              <span className="font-mono font-bold text-white">{userStop.scheduledMorningPickup}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">CU Evening Return</span>
              <span className="font-mono font-bold text-white">{currentStudentRoute.eveningReturn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left) & Ordered Stops Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Visual Route Map (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <LiveBusTrackingMap
            route={currentStudentRoute}
            bus={currentStudentBus}
            userStopId={userStop.id}
            allBuses={buses}
            allRoutes={routes}
            onToggleSimulation={toggleAutoSimulation}
            onAdvanceStop={advanceToNextStop}
            onRefreshTelemetry={refreshTelemetry}
            calculateStopEta={calculateStopEta}
          />

          {/* Quick Bus Fleet Specs Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Assigned Vehicle Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Bus Number</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{currentStudentBus.busNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Registration</span>
                <span className="font-mono font-semibold text-slate-700">{currentStudentBus.regNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Vehicle Model</span>
                <span className="font-medium text-slate-700 truncate block">{currentStudentBus.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Live Occupancy</span>
                <span className="font-mono font-bold text-blue-600">
                  {currentStudentBus.occupiedSeats} / {currentStudentBus.capacity} seats
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ordered Bus Stops & Live Progress (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ordered Route Stops</h3>
              <p className="text-xs text-slate-500">
                {currentStudentRoute.name} · {stops.length} stops
              </p>
            </div>
            <button
              onClick={refreshTelemetry}
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 p-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Timeline of Ordered Stops */}
          <div className="mt-4 relative pl-4 space-y-4">
            {/* Vertical connector line */}
            <div className="absolute left-6 top-3 bottom-4 w-0.5 bg-slate-200" />

            {stops.map((stop, idx) => {
              const isBusHere = currentStudentBus.currentStopIndex === idx;
              const isBusPassed = currentStudentBus.currentStopIndex > idx;
              const isUserStop = stop.id === userStop.id;
              const isLast = idx === stops.length - 1;
              const stopEta = calculateStopEta(currentStudentBus, stop.id);

              return (
                <div key={stop.id} className="relative flex items-start gap-3.5 group">
                  {/* Stop Node Dot */}
                  <div
                    className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform ${
                      isBusHere
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                        : isUserStop
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                        : isBusPassed
                        ? 'bg-emerald-600 text-white'
                        : isLast
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isBusPassed ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <span className="text-[9px] font-mono font-bold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Stop Details */}
                  <div
                    className={`flex-1 min-w-0 p-3 rounded-xl border transition-colors ${
                      isUserStop
                        ? 'bg-amber-50/70 border-amber-200'
                        : isBusHere
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{stop.name}</h4>
                          {isUserStop && (
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                              (Your Stop)
                            </span>
                          )}
                          {isLast && (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              (Campus)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{stop.landmark}</p>
                      </div>

                      {/* Stop Status or ETA */}
                      <div className="text-right shrink-0">
                        {isBusPassed ? (
                          <span className="text-[11px] font-medium text-slate-400">Departed</span>
                        ) : isBusHere ? (
                          <span className="text-[11px] font-bold text-blue-600 animate-pulse">At Stop</span>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-emerald-600">
                            {stopEta.text}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 font-mono">
                      <span>Pickup: {stop.scheduledMorningPickup}</span>
                      <span>Drop: {stop.scheduledEveningDrop}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Digital Bus Pass Modal */}
      <DigitalBusPassModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        student={currentStudent}
        route={currentStudentRoute}
        bus={currentStudentBus}
        stop={userStop}
      />
    </div>
  );
};
