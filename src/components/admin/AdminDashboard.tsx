import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTransit } from '../../context/TransitContext';
import { Student, Bus } from '../../types/transit';
import { GoogleMapsTransitView } from '../maps/GoogleMapsTransitView';
import { formatFixAge, isFixStale } from '../../utils/googleMaps';
import * as XLSX from 'xlsx';
import {
  Users,
  Bus as BusIcon,
  Navigation,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  X,
  Save,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    role,
    stats,
    students,
    buses,
    routes,
    drivers,
    addStudent,
    updateStudent,
    deleteStudent,
    addBus,
    updateBus,
    assignDriverToBus,
    importStudentsBatch,
    resetToDemoData,
  } = useTransit();

  const [activeTab, setActiveTab] = useState<'students' | 'buses' | 'import' | 'routes'>('students');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [busSearch, setBusSearch] = useState('');

  // Modals state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    uid: '',
    name: '',
    email: '',
    phone: '',
    department: 'Computer Science & Engineering',
    semester: '4th Semester',
    routeId: 'R-01',
    stopId: 'R-01-S1',
    busId: 'BUS-01',
    seatNumber: 'A-01',
    passValidUntil: '30 June 2027',
    bloodGroup: 'B+',
    status: 'active' as const,
  });

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedRows, setImportedRows] = useState<Array<Partial<Student>>>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.uid.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesRoute = selectedRouteFilter === 'all' || s.routeId === selectedRouteFilter;
    return matchesSearch && matchesRoute;
  });

  // Filtered buses
  const filteredBuses = buses.filter((b) => {
    return (
      b.busNumber.toLowerCase().includes(busSearch.toLowerCase()) ||
      b.regNumber.toLowerCase().includes(busSearch.toLowerCase()) ||
      b.routeId.toLowerCase().includes(busSearch.toLowerCase())
    );
  });

  // Handle Excel / CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        // Normalize headers
        const parsedRows: Array<Partial<Student>> = rawJson.map((row) => {
          return {
            uid: row.UID || row.uid || row['Student UID'] || row['Roll No'],
            name: row.Name || row.name || row['Student Name'],
            email: row.Email || row.email,
            phone: row.Phone || row.phone || row['Mobile'],
            department: row.Department || row.department || row['Branch'],
            semester: row.Semester || row.semester,
            routeId: (row.Route || row.routeId || row['Route Code'] || 'R-01').toString().toUpperCase(),
            stopId: row.Stop || row.stopId || row['Stop Name'],
            busId: row.Bus || row.busId || row['Bus ID'],
            seatNumber: row.Seat || row.seatNumber || row['Seat No'],
            passValidUntil: row.Validity || row.passValidUntil,
            bloodGroup: row.BloodGroup || row.bloodGroup || 'B+',
          };
        });

        setImportedRows(parsedRows);
      } catch (err) {
        console.error('File parsing error:', err);
        setImportResult({ success: 0, errors: ['Failed to read spreadsheet file. Please check format.'] });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = () => {
    if (importedRows.length === 0) return;
    const res = importStudentsBatch(importedRows);
    setImportResult({ success: res.successCount, errors: res.errors });
    setImportedRows([]);
    setImportFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        UID: '22BCS10999',
        Name: 'Vikram Malhotra',
        Email: 'vikram.22bcs10999@cuchd.in',
        Phone: '+91 98765-11223',
        Department: 'Computer Science & Engineering',
        Semester: '6th Semester',
        Route: 'R-01',
        Stop: 'Kharga Canteen',
        Seat: 'B-04',
        BloodGroup: 'O+',
        Validity: '30 June 2027',
      },
      {
        UID: '23BEE10450',
        Name: 'Gurleen Chahal',
        Email: 'gurleen.23bee10450@cuchd.in',
        Phone: '+91 98111-22334',
        Department: 'Electrical Engineering',
        Semester: '4th Semester',
        Route: 'R-02',
        Stop: 'DAV School',
        Seat: 'C-09',
        BloodGroup: 'B+',
        Validity: '30 June 2027',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'CU_Bus_Transit_Student_Import_Template.xlsx');
  };

  const exportCurrentStudents = () => {
    const exportData = students.map((s) => ({
      UID: s.uid,
      Name: s.name,
      Email: s.email,
      Phone: s.phone,
      Department: s.department,
      Semester: s.semester,
      RouteCode: s.routeId,
      StopId: s.stopId,
      BusId: s.busId,
      SeatNumber: s.seatNumber,
      Status: s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered_Students');
    XLSX.writeFile(workbook, `CU_Transit_Students_Export_${Date.now()}.xlsx`);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.uid || !newStudentForm.name) return;

    addStudent(newStudentForm);
    setIsAddStudentOpen(false);
    setNewStudentForm({
      uid: '',
      name: '',
      email: '',
      phone: '',
      department: 'Computer Science & Engineering',
      semester: '4th Semester',
      routeId: 'R-01',
      stopId: 'R-01-S1',
      busId: 'BUS-01',
      seatNumber: 'A-01',
      passValidUntil: '30 June 2027',
      bloodGroup: 'B+',
      status: 'active',
    });
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudent(editingStudent);
      setEditingStudent(null);
    }
  };

  // Defense-in-depth role guard: only fleet_admin and admin roles can view admin console
  if (role !== 'fleet_admin' && role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Restricted Section: Fleet Admin Required</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your current authenticated role is <span className="font-semibold capitalize text-slate-800 font-mono">[{role}]</span>. Administration of drivers, buses, student transport passes, and Excel dataset imports is strictly restricted to authorized Fleet Administrators.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={role === 'driver' ? '/driver' : '/student'}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl min-h-[44px]"
          >
            Return to {role === 'driver' ? 'Driver Console' : 'Student Portal'}
          </Link>
          <Link
            to="/routes"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl min-h-[44px]"
          >
            View All 5 Routes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">CU Fleet & Transport Administration</h1>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Official Control Room
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live fleet management, route assignment engine, student transport registration, and Excel bulk datasets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Reset all transit data back to original Chandigarh University demo dataset?')) {
                  resetToDemoData();
                }
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* Security & RBAC Status Banner */}
        <div className="mt-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              RBAC Status: <span className="font-mono text-blue-700">Fleet Administrator</span> (Full CRUD Permissions Granted)
            </span>
          </div>
          <p className="text-slate-500 text-[11px] leading-tight">
            <span className="font-medium text-slate-700">Security Architecture Notice:</span> Route guards, persona isolation, and mutation authorization enforced. Production deployments integrate server-side JWT verification & cloud security rules.
          </p>
        </div>

        {/* High-level KPI Metric Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Total Fleet</span>
              <BusIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.totalBuses} Buses</div>
            <span className="text-[11px] text-emerald-600 font-medium">{stats.activeInTransit} in transit right now</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Registered Students</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.totalStudents}</div>
            <span className="text-[11px] text-slate-500 font-medium">Across all 5 routes</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Designated Routes</span>
              <Navigation className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{routes.length} Corridors</div>
            <span className="text-[11px] text-slate-500 font-medium">R-01 through R-05</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>On-Time Rating</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.onTimePerformancePercent}%</div>
            <span className="text-[11px] text-emerald-600 font-medium">NH-5 corridor rating</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Average Occupancy</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.averageOccupancyPercent}%</div>
            <span className="text-[11px] text-slate-500 font-medium">Capacity utilized</span>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto scrollbar-none w-full max-w-xl">
        <button
          onClick={() => setActiveTab('students')}
          className={`shrink-0 sm:flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
            activeTab === 'students' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('buses')}
          className={`shrink-0 sm:flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
            activeTab === 'buses' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Fleet & Buses ({buses.length})
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`shrink-0 sm:flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
            activeTab === 'import' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Excel / CSV Import
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`shrink-0 sm:flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
            activeTab === 'routes' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Routes (5)
        </button>
      </div>

      {/* Tab 1: Searchable Students Directory */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search UID, Name, or Branch..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
              </div>

              {/* Route filter dropdown */}
              <select
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              >
                <option value="all">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} ({r.name.split(' - ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={exportCurrentStudents}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {/* Students Data Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department / Sem</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Assigned Stop</th>
                  <th className="py-3 px-4">Bus / Seat</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No matching student transport records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => {
                    const r = routes.find((x) => x.id === stu.routeId);
                    const stop = r?.stops.find((s) => s.id === stu.stopId);
                    const b = buses.find((x) => x.id === stu.busId);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{stu.uid}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{stu.name}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {stu.department} · {stu.semester}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800">{r?.code || stu.routeId}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{stop?.name || stu.stopId}</td>
                        <td className="py-3 px-4 font-mono">
                          {b?.busNumber || stu.busId} ({stu.seatNumber})
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => setEditingStudent(stu)}
                            aria-label={`Edit ${stu.name}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove transport pass for ${stu.name} (${stu.uid})?`)) {
                                deleteStudent(stu.id);
                              }
                            }}
                            aria-label={`Delete ${stu.name}`}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Fleet & Buses Management */}
      {activeTab === 'buses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={busSearch}
                onChange={(e) => setBusSearch(e.target.value)}
                placeholder="Search Bus Number, Reg, or Route..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
            </div>

            <span className="text-xs text-slate-500">
              Total Capacity: <strong className="font-mono text-slate-800">{buses.reduce((a, b) => a + b.capacity, 0)} Seats</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bus ID</th>
                  <th className="py-3 px-4">Vehicle Model</th>
                  <th className="py-3 px-4">Assigned Route</th>
                  <th className="py-3 px-4">Driver in Charge</th>
                  <th className="py-3 px-4">Live Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Speed / Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBuses.map((bus) => {
                  const driver = drivers.find((d) => d.id === bus.driverId);
                  const route = routes.find((r) => r.id === bus.routeId);

                  return (
                    <tr key={bus.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{bus.busNumber}</span>
                        <span className="text-[10px] font-mono text-slate-400">{bus.regNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{bus.model}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 block">{bus.routeId}</span>
                        <span className="text-[11px] text-slate-500 truncate block max-w-xs">{route?.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{driver?.name || 'Unassigned'}</span>
                        <span className="text-[11px] font-mono text-slate-500">{driver?.phone}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {bus.occupiedSeats} / {bus.capacity} seats ({Math.round((bus.occupiedSeats / bus.capacity) * 100)}%)
                      </td>
                      <td className="py-3 px-4">
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
                      </td>
                      <td className="py-3 px-4 text-slate-500 space-y-1">
                        <div>
                          <span className="font-mono font-semibold text-slate-800">{bus.speedKmH} km/h</span>
                          <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Simulated GPS
                          </span>
                        </div>
                        {bus.deviceLocation ? (
                          <div className="text-[11px] font-mono text-cyan-700">
                            Device GPS (Local): {bus.deviceLocation.latitude.toFixed(4)},{' '}
                            {bus.deviceLocation.longitude.toFixed(4)} ·{' '}
                            {formatFixAge(bus.deviceLocation.timestamp)}
                            {isFixStale(bus.deviceLocation.timestamp) ? ' (Stale)' : ''}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            No device GPS fix received · {bus.lastUpdated}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Location-Aware Fleet & Route Overview (Existing Route Data + Real Device GPS Fixes Only) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Fleet Location &amp; Route Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Displays existing route stops and only real browser Device GPS fixes received by this session. Simulated bus motion is never plotted as a live marker.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              <GoogleMapsTransitView
                mode="fleet"
                routes={routes}
                buses={buses}
                theme="light"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Excel & CSV Dataset Import */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Student Transit Records via Excel / CSV</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload student rosters (.xlsx, .xls, or .csv) to batch-assign routes, stops, and bus allocations.
              </p>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-900 block">Click to select an Excel (.xlsx) or CSV file</span>
              <span className="text-xs text-slate-500 block mt-1">
                Standard headers: UID, Name, Email, Phone, Department, Semester, Route, Stop, Seat
              </span>
            </label>
          </div>

          {importFileName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <span className="font-semibold">Selected file: {importFileName}</span>
              <span className="font-mono">{importedRows.length} rows parsed</span>
            </div>
          )}

          {importResult && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                importResult.errors.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <p className="font-bold">
                Import completed: {importResult.success} records successfully registered in LocalStorage.
              </p>
              {importResult.errors.length > 0 && (
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-rose-700">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Staged Data Preview Table */}
          {importedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Spreadsheet Preview Before Commit ({importedRows.length} rows)
                </h3>
                <button
                  onClick={handleCommitImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Commit to Transit Database</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">UID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-3">Stop</th>
                      <th className="py-2.5 px-3">Seat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {importedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">{row.uid || '-'}</td>
                        <td className="py-2 px-3 font-semibold">{row.name || '-'}</td>
                        <td className="py-2 px-3 font-mono">{row.routeId || 'R-01'}</td>
                        <td className="py-2 px-3">{row.stopId || 'Default Stop'}</td>
                        <td className="py-2 px-3 font-mono">{row.seatNumber || 'Auto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importedRows.length > 10 && (
                <p className="text-[11px] text-slate-400">
                  Showing first 10 of {importedRows.length} rows. Click "Commit to Transit Database" to apply all.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Routes Summary */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route) => {
            const countStudents = students.filter((s) => s.routeId === route.id).length;
            const countBuses = buses.filter((b) => b.routeId === route.id).length;

            return (
              <div key={route.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-blue-600 text-sm">{route.code}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{route.totalDistanceKm} km</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{route.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{route.corridor}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Stops: <strong className="text-slate-900">{route.stops.length}</strong></span>
                  <span>Buses: <strong className="text-slate-900">{countBuses}</strong></span>
                  <span>Enrolled: <strong className="text-slate-900">{countStudents}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register New Student Pass</h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Student UID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.uid}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, uid: e.target.value.toUpperCase() })}
                    placeholder="e.g. 23BCS10892"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    placeholder="e.g. Gurpreet Gill"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={newStudentForm.department}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Semester</label>
                  <input
                    type="text"
                    value={newStudentForm.semester}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, semester: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Route</label>
                  <select
                    value={newStudentForm.routeId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      const targetRoute = routes.find((r) => r.id === rId);
                      setNewStudentForm({
                        ...newStudentForm,
                        routeId: rId,
                        stopId: targetRoute?.stops[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Stop</label>
                  <select
                    value={newStudentForm.stopId}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, stopId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  >
                    {routes
                      .find((r) => r.id === newStudentForm.routeId)
                      ?.stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Seat No</label>
                  <input
                    type="text"
                    value={newStudentForm.seatNumber}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, seatNumber: e.target.value })}
                    placeholder="e.g. B-12"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 min-h-[44px] flex items-center justify-center shadow-xs"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Student Transit Assignment</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">UID</label>
                  <input
                    type="text"
                    disabled
                    value={editingStudent.uid}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono text-slate-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reassign Route</label>
                  <select
                    value={editingStudent.routeId}
                    onChange={(e) => {
                      const newRouteId = e.target.value;
                      const targetRoute = routes.find((r) => r.id === newRouteId);
                      setEditingStudent({
                        ...editingStudent,
                        routeId: newRouteId,
                        stopId: targetRoute?.stops[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} ({r.name.split(' - ')[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reassign Stop</label>
                  <select
                    value={editingStudent.stopId}
                    onChange={(e) => setEditingStudent({ ...editingStudent, stopId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  >
                    {routes
                      .find((r) => r.id === editingStudent.routeId)
                      ?.stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Seat Assignment</label>
                  <input
                    type="text"
                    value={editingStudent.seatNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, seatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pass Validity</label>
                  <input
                    type="text"
                    value={editingStudent.passValidUntil}
                    onChange={(e) => setEditingStudent({ ...editingStudent, passValidUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 min-h-[44px] flex items-center justify-center shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
