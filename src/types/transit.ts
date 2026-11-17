export interface RouteStop {
  id: string;
  name: string;
  stopOrder: number;
  landmark: string;
  etaFromStartMinutes: number; // Approximate minutes from first stop
  scheduledMorningPickup: string; // e.g. "07:15 AM"
  scheduledEveningDrop: string; // e.g. "05:15 PM"
  distanceFromStartKm: number;
  latitude: number;
  longitude: number;
}

export interface Route {
  id: string; // e.g., "R-01"
  code: string;
  name: string;
  corridor: string;
  colorHex: string;
  totalDistanceKm: number;
  morningDeparture: string;
  eveningReturn: string;
  description: string;
  stops: RouteStop[];
  /** Optional verified road-following route geometry if provided by app data */
  routeGeometry?: Array<{ lat: number; lng: number }>;
}

export interface DeviceLocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  heading: number | null;
  speedMps: number | null;
  timestamp: number; // Epoch ms from browser GeolocationPosition.timestamp
  source: 'device-gps';
  syncScope: 'local-browser-only';
}

export interface Bus {
  id: string; // "BUS-01"
  busNumber: string; // "Bus 12"
  regNumber: string; // "PB-65-AX-2401"
  model: string; // "Tata Starbus Ultra 52-Seater"
  capacity: number;
  occupiedSeats: number;
  routeId: string; // "R-01"
  driverId: string; // "DRV-101"
  status: 'idle' | 'in-transit' | 'delayed' | 'completed';
  currentStopIndex: number; // index into route.stops
  progressToNextStop: number; // 0 to 1 (fraction between currentStopIndex and next)
  speedKmH: number;
  isSimulating: boolean;
  delayMinutes: number;
  emergencyAlert: string | null;
  lastUpdated: string;
  deviceLocation?: DeviceLocationFix | null;
}

export interface Driver {
  id: string; // "DRV-101"
  name: string;
  phone: string;
  licenseNumber: string;
  busId: string;
  routeId: string;
  experienceYears: number;
  rating: number;
  status: 'on-duty' | 'driving' | 'off-duty';
  shift: 'morning' | 'evening' | 'idle';
}

export interface Student {
  id: string;
  uid: string; // e.g., "22BCS10101"
  name: string;
  email: string;
  phone: string;
  department: string;
  semester: string;
  routeId: string;
  stopId: string;
  busId: string;
  seatNumber: string;
  passValidUntil: string;
  bloodGroup: string;
  status: 'active' | 'suspended';
}

export type UserRole = 'student' | 'driver' | 'fleet_admin' | 'admin';

export interface TransitStats {
  totalBuses: number;
  activeInTransit: number;
  totalStudents: number;
  onTimePerformancePercent: number;
  averageOccupancyPercent: number;
  activeAlertsCount: number;
}
