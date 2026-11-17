import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTransit } from '../context/TransitContext';
import {
  Bus as BusIcon,
  GraduationCap,
  QrCode,
  Gauge,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
  MapPin,
  Camera,
  Scan,
  Sparkles,
} from 'lucide-react';

type EntryMode = 'selection' | 'student-login' | 'scan-pass' | 'driver-login' | 'admin-login';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { students, drivers, loginStudent, loginDriver, loginAdmin } = useTransit();

  const [activeMode, setActiveMode] = useState<EntryMode>('selection');

  // Student Form State
  const [studentUid, setStudentUid] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);

  // QR Pass Scanner State
  const [scannedPassToken, setScannedPassToken] = useState('CU-PASS-22BCS10101');
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Driver Form State
  const [driverId, setDriverId] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [driverError, setDriverError] = useState<string | null>(null);

  // Admin Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // 1. Handle Student Form Submit
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    if (!studentUid.trim()) {
      setStudentError('Please enter your University Student UID.');
      return;
    }

    const result = loginStudent(studentUid);
    if (result.success) {
      navigate('/student');
    } else {
      setStudentError(result.message || 'Invalid Student UID.');
    }
  };

  // 2. Handle QR Scan Verify
  const handleVerifyScannedPass = (tokenToVerify?: string) => {
    setScanError(null);
    setScanSuccess(null);
    const token = tokenToVerify || scannedPassToken;

    if (!token.trim()) {
      setScanError('Please enter or select a valid digital bus pass token.');
      return;
    }

    // Extract UID from token format "CU-PASS-<UID>" or direct UID
    const extractedUid = token.replace('CU-PASS-', '').trim();
    const result = loginStudent(extractedUid);

    if (result.success) {
      setScanSuccess(`Valid Pass Verified for ${extractedUid}! Access granted.`);
      setTimeout(() => {
        navigate('/student');
      }, 700);
    } else {
      setScanError(`Digital pass verification failed for token "${token}". Try a demo pass below.`);
    }
  };

  // 3. Handle Driver Form Submit
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);

    if (!driverId.trim()) {
      setDriverError('Please select or enter your Driver ID.');
      return;
    }

    const result = loginDriver(driverId);
    if (result.success) {
      navigate('/driver');
    } else {
      setDriverError(result.message || 'Invalid Driver Credentials.');
    }
  };

  // 4. Handle Admin Form Submit
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    if (!adminKey.trim()) {
      setAdminError('Please enter the Administrator Security Key.');
      return;
    }

    const result = loginAdmin(adminKey);
    if (result.success) {
      navigate('/admin');
    } else {
      setAdminError(result.message || 'Invalid Master Security Key.');
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-5 sm:py-8 px-3 sm:px-6">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-md shadow-blue-900/20 mb-1 overflow-hidden">
            <img
              src="/cu-bus-logo.png"
              alt="CU BUS Transit Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
              CU BUS Transit
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Chandigarh University · Official Fleet & Student Transit Portal
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Real-time campus transit tracking, scheduled route corridors, and driver telemetry serving Ambala, Mohali, and Gharuan campus terminals.
          </p>
        </div>

        {/* View 1: 4 Distinct Entry Options (Role Selection) */}
        {activeMode === 'selection' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Select Your Portal Entry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Option 1: Student Login */}
              <button
                onClick={() => {
                  setActiveMode('student-login');
                  setStudentUid(students[0]?.uid || '22BCS10101');
                  setStudentError(null);
                }}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer min-h-[220px]"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Student Login
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Access your assigned bus, real-time ETA, and live tracking map using your Student UID.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Sign in with UID</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 2: Scan Digital Bus Pass */}
              <button
                onClick={() => {
                  setActiveMode('scan-pass');
                  setScanError(null);
                  setScanSuccess(null);
                }}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer min-h-[220px]"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Scan Bus Pass
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Instant contactless verification using your digital QR transit pass token.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                  <span>Scan QR Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 3: Driver Login */}
              <button
                onClick={() => {
                  setActiveMode('driver-login');
                  setDriverId(drivers[0]?.id || 'DRV-101');
                  setDriverError(null);
                }}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer min-h-[220px]"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Driver Console
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Driver shift portal to start trips, advance stop waypoints, and report traffic delays.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Driver Duty Check</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 4: Transport Admin Login */}
              <button
                onClick={() => {
                  setActiveMode('admin-login');
                  setAdminUsername('transport.admin@cuchd.in');
                  setAdminKey('admin2026');
                  setAdminError(null);
                }}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-800 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer min-h-[220px]"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                    Transport Admin
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Fleet overview, student route assignments, driver rosters, and Excel spreadsheet import.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Fleet Management</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Quick Public Route Timetable shortcut */}
            <div className="pt-4 text-center">
              <Link
                to="/routes"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-2 px-4 rounded-xl hover:bg-slate-100"
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Looking for public schedules? Browse All 5 Transit Corridors (R-01 to R-05)</span>
              </Link>
            </div>
          </div>
        )}

        {/* View 2: Flow 1 — Student Login Form */}
        {activeMode === 'student-login' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Student Portal Sign In</h2>
                  <p className="text-xs text-slate-500">Chandigarh University Transit</p>
                </div>
              </div>
              <button
                onClick={() => setActiveMode('selection')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {studentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{studentError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Student UID *</label>
                <input
                  type="text"
                  required
                  value={studentUid}
                  onChange={(e) => setStudentUid(e.target.value.toUpperCase())}
                  placeholder="e.g. 22BCS10101"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password / PIN (Demo)</label>
                <input
                  type="password"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="Demo: Any password or leave empty"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm min-h-[44px]"
                />
              </div>

              {/* Demo Quick-Fill Students */}
              <div className="pt-2">
                <label className="block text-slate-500 font-semibold mb-1.5 text-[11px]">
                  Or Select Demo Student Credential:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {students.slice(0, 4).map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        setStudentUid(stu.uid);
                        setStudentError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                        studentUid === stu.uid
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {stu.uid} ({stu.name.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Verify UID & Sign In</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View 3: Flow 2 — Scan Bus Pass (QR Demo Simulator) */}
        {activeMode === 'scan-pass' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Scan Digital Transit Pass</h2>
                  <p className="text-xs text-slate-500">Contactless QR Code Verification</p>
                </div>
              </div>
              <button
                onClick={() => setActiveMode('selection')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {scanError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {scanSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{scanSuccess}</span>
              </div>
            )}

            {/* Interactive Scanner Viewfinder Simulation */}
            <div className="relative w-full h-48 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

              {/* Animated laser line */}
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-pulse" />

              <div className="text-center z-10 px-4">
                <Camera className="w-7 h-7 text-emerald-400 mx-auto mb-2 opacity-80" />
                <span className="text-xs font-mono font-semibold text-emerald-300 block">
                  Simulated Optical QR Sensor Active
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Point camera at student bus pass or pick demo token below
                </span>
              </div>
            </div>

            {/* Token Selector & Trigger */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pass Token / UID Barcode</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={scannedPassToken}
                    onChange={(e) => setScannedPassToken(e.target.value)}
                    placeholder="CU-PASS-22BCS10101"
                    className="w-full flex-1 px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                  <button
                    onClick={() => handleVerifyScannedPass()}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 min-h-[44px] flex items-center justify-center"
                  >
                    Scan & Verify
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] font-semibold block mb-1.5">
                  Test Demo Student Digital Passes:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {students.slice(0, 4).map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        const token = `CU-PASS-${stu.uid}`;
                        setScannedPassToken(token);
                        handleVerifyScannedPass(token);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors min-h-[44px]"
                    >
                      <span className="font-bold text-slate-800 text-[11px] block">{stu.name}</span>
                      <span className="text-[10px] font-mono text-emerald-700">CU-PASS-{stu.uid}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 4: Flow 3 — Driver Login Form */}
        {activeMode === 'driver-login' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Driver Console Sign In</h2>
                  <p className="text-xs text-slate-500">Fleet Operations Shift Cockpit</p>
                </div>
              </div>
              <button
                onClick={() => setActiveMode('selection')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {driverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{driverError}</span>
              </div>
            )}

            <form onSubmit={handleDriverSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Driver ID *</label>
                <input
                  type="text"
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value.toUpperCase())}
                  placeholder="e.g. DRV-101"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Security PIN (Demo: 1234)</label>
                <input
                  type="password"
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  placeholder="Demo PIN: 1234"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm min-h-[44px]"
                />
              </div>

              {/* Demo Drivers */}
              <div className="pt-2">
                <label className="block text-slate-500 font-semibold mb-1.5 text-[11px]">
                  Pick Demo Assigned Driver:
                </label>
                <div className="space-y-1.5">
                  {drivers.slice(0, 3).map((drv) => (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => {
                        setDriverId(drv.id);
                        setDriverPin('1234');
                        setDriverError(null);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors border ${
                        driverId === drv.id
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="font-medium">
                        {drv.name} · <span className="font-mono text-slate-500">{drv.id}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">Bus {drv.busId}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                >
                  <Gauge className="w-4 h-4" />
                  <span>Authenticate & Launch Driver Console</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View 5: Flow 4 — Transport Admin Login Form */}
        {activeMode === 'admin-login' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Transport Admin Login</h2>
                  <p className="text-xs text-slate-500">Fleet Control & Registry Authority</p>
                </div>
              </div>
              <button
                onClick={() => setActiveMode('selection')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {adminError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Admin Email / Username *</label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="transport.admin@cuchd.in"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Master Security Key (Demo: <code className="font-mono text-blue-600">admin2026</code>)
                </label>
                <input
                  type="password"
                  required
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter security key"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm font-mono min-h-[44px]"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>Demo Admin Key: <strong className="font-mono text-slate-900">admin2026</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsername('transport.admin@cuchd.in');
                    setAdminKey('admin2026');
                    setAdminError(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  Autofill Demo
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate & Open Fleet Admin</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
