import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Route, Bus, Driver, Student, UserRole, TransitStats, RouteStop, DeviceLocationFix } from '../types/transit';
import { SEED_ROUTES, SEED_BUSES, SEED_DRIVERS, SEED_STUDENTS } from '../data/seedTransitData';

interface TransitContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeStudentUid: string;
  setActiveStudentUid: (uid: string) => void;
  activeDriverId: string;
  setActiveDriverId: (id: string) => void;

  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  students: Student[];
  stats: TransitStats;

  // Active records
  currentStudent: Student | undefined;
  currentDriver: Driver | undefined;
  currentStudentBus: Bus | undefined;
  currentStudentRoute: Route | undefined;
  currentStudentStop: RouteStop | undefined;

  // Driver operations
  startTrip: (busId: string) => void;
  endTrip: (busId: string) => void;
  advanceToNextStop: (busId: string) => void;
  updateBusOccupancy: (busId: string, delta: number) => void;
  reportDelay: (busId: string, delayMinutes: number, alertMessage: string | null) => void;
  toggleAutoSimulation: (busId: string) => void;
  updateBusDeviceLocation: (busId: string, fix: DeviceLocationFix | null) => void;

  // Admin operations
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  addBus: (bus: Omit<Bus, 'id'>) => void;
  updateBus: (bus: Bus) => void;
  assignDriverToBus: (busId: string, driverId: string) => void;
  importStudentsBatch: (imported: Array<Partial<Student>>) => { successCount: number; errors: string[] };
  resetToDemoData: () => void;

  // Real-time tracking & UI helpers
  lastRefreshedAt: Date;
  refreshTelemetry: () => void;
  calculateStopEta: (bus: Bus, stopId: string) => { minutes: number; text: string; isPassed: boolean; isCurrent: boolean };

  // Auth operations
  isAuthenticated: boolean;
  loginStudent: (uid: string) => { success: boolean; message?: string };
  loginDriver: (driverId: string) => { success: boolean; message?: string };
  loginAdmin: (accessKey: string) => { success: boolean; message?: string };
  logout: () => void;
}

const TransitContext = createContext<TransitContextType | null>(null);

const STORAGE_KEYS = {
  ROUTES: 'cu_transit_routes_v1',
  BUSES: 'cu_transit_buses_v1',
  DRIVERS: 'cu_transit_drivers_v1',
  STUDENTS: 'cu_transit_students_v1',
  ROLE: 'cu_transit_role_v1',
  ACTIVE_UID: 'cu_transit_active_uid_v1',
  ACTIVE_DRIVER_ID: 'cu_transit_active_drv_v1',
  IS_AUTH: 'cu_transit_is_auth_v1',
};

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export const TransitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from LocalStorage or seed fallback
  const [routes] = useState<Route[]>(() => readStorageJson(STORAGE_KEYS.ROUTES, SEED_ROUTES));

  const [buses, setBuses] = useState<Bus[]>(() => readStorageJson(STORAGE_KEYS.BUSES, SEED_BUSES));

  const [drivers, setDrivers] = useState<Driver[]>(() => readStorageJson(STORAGE_KEYS.DRIVERS, SEED_DRIVERS));

  const [students, setStudents] = useState<Student[]>(() => readStorageJson(STORAGE_KEYS.STUDENTS, SEED_STUDENTS));

  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return (saved as UserRole) || 'student';
  });

  const [activeStudentUid, setActiveStudentUidState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_UID);
    return saved || '22BCS10101';
  });

  const [activeDriverId, setActiveDriverIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRIVER_ID);
    return saved || 'DRV-101';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTH);
    return saved === 'true';
  });

  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUSES, JSON.stringify(buses));
  }, [buses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  const setRole = (newRole: UserRole) => {
    // Only Fleet Admin can manually switch roles during test sessions
    if (isAuthenticated && role !== 'fleet_admin' && role !== 'admin' && newRole !== role) {
      console.warn(`RBAC Denial: Role ${role} cannot self-escalate or change permissions to ${newRole}`);
      return;
    }
    setRoleState(newRole);
    localStorage.setItem(STORAGE_KEYS.ROLE, newRole);
  };

  const setActiveStudentUid = (uid: string) => {
    // RBAC Security Check: Students can only read and view their own private student record
    if (role === 'student' && uid.toLowerCase() !== activeStudentUid.toLowerCase()) {
      console.warn('RBAC Denial: Students can only view their own student records.');
      return;
    }
    setActiveStudentUidState(uid);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_UID, uid);
  };

  const setActiveDriverId = (drvId: string) => {
    // RBAC Security Check: Drivers can only view their own assigned vehicle cockpit
    if (role === 'driver' && drvId !== activeDriverId) {
      console.warn('RBAC Denial: Drivers can only view their own assigned vehicle cockpit.');
      return;
    }
    setActiveDriverIdState(drvId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DRIVER_ID, drvId);
  };

  const loginStudent = useCallback(
    (uid: string) => {
      const cleaned = uid.trim().toLowerCase();
      const found = students.find((s) => s.uid.toLowerCase() === cleaned);
      if (found) {
        // Clear any previous driver credentials
        setActiveDriverIdState('');
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRIVER_ID);

        setActiveStudentUidState(found.uid);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_UID, found.uid);
        setRoleState('student');
        localStorage.setItem(STORAGE_KEYS.ROLE, 'student');
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
        return { success: true };
      }
      return {
        success: false,
        message: `No student record found for UID "${uid}". You can use demo UID: 22BCS10101, 21BEE10042, or 23MCA10089.`,
      };
    },
    [students]
  );

  const loginDriver = useCallback(
    (driverId: string) => {
      const cleaned = driverId.trim().toLowerCase();
      const found = drivers.find((d) => d.id.toLowerCase() === cleaned);
      if (found) {
        // Clear any previous student credentials
        setActiveStudentUidState('');
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_UID);

        setActiveDriverIdState(found.id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_DRIVER_ID, found.id);
        setRoleState('driver');
        localStorage.setItem(STORAGE_KEYS.ROLE, 'driver');
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
        return { success: true };
      }
      return {
        success: false,
        message: `No driver credentials found for ID "${driverId}". You can use demo ID: DRV-101 or DRV-102.`,
      };
    },
    [drivers]
  );

  const loginAdmin = useCallback((accessKey: string) => {
    const validKeys = ['admin', 'admin123', 'admin2026', 'cuadmin', '1234'];
    if (validKeys.includes(accessKey.trim().toLowerCase())) {
      setRoleState('fleet_admin');
      localStorage.setItem(STORAGE_KEYS.ROLE, 'fleet_admin');
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
      return { success: true };
    }
    return {
      success: false,
      message: 'Invalid administrator access key. Demo key: admin2026',
    };
  }, []);

  const logout = useCallback(() => {
    // Complete session isolation wipe: clear authentication, active records, and permissions
    setIsAuthenticated(false);
    localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'false');
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_UID);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRIVER_ID);
    setRoleState('student');
  }, []);

  // Automated GPS Simulation ticker: advances buses that have isSimulating === true
  useEffect(() => {
    const interval = setInterval(() => {
      setBuses((prevBuses) => {
        let changed = false;
        const updated = prevBuses.map((bus) => {
          if (!bus.isSimulating || bus.status !== 'in-transit') return bus;

          const route = routes.find((r) => r.id === bus.routeId);
          if (!route) return bus;

          changed = true;
          const currentStop = bus.currentStopIndex;
          const isLastStop = currentStop >= route.stops.length - 1;

          if (isLastStop) {
            // Bus has reached CU campus!
            return {
              ...bus,
              progressToNextStop: 1,
              status: 'completed' as const,
              speedKmH: 0,
              isSimulating: false,
              lastUpdated: 'Arrived at CU Campus',
            };
          }

          // Advance progress smoothly (increment by 0.08 per 3 seconds ~ realistic transit pace)
          const newProgress = bus.progressToNextStop + 0.08;
          if (newProgress >= 1) {
            // Reached next stop!
            const nextIdx = currentStop + 1;
            const reachedStopName = route.stops[nextIdx]?.name || 'Next stop';
            return {
              ...bus,
              currentStopIndex: nextIdx,
              progressToNextStop: 0,
              speedKmH: Math.floor(35 + Math.random() * 15),
              lastUpdated: `At ${reachedStopName}`,
            };
          }

          return {
            ...bus,
            progressToNextStop: Math.min(newProgress, 0.98),
            speedKmH: Math.floor(38 + Math.random() * 12),
            lastUpdated: 'Simulated GPS updating',
          };
        });

        return changed ? updated : prevBuses;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [routes]);

  // Telemetry refresh
  const refreshTelemetry = useCallback(() => {
    setLastRefreshedAt(new Date());
    setBuses((prev) =>
      prev.map((b) => ({
        ...b,
        lastUpdated: 'Just now',
      }))
    );
  }, []);

  // Current entity lookups
  const currentStudent = useMemo(
    () => students.find((s) => s.uid.toLowerCase() === activeStudentUid.toLowerCase()) || students[0],
    [students, activeStudentUid]
  );

  const currentStudentBus = useMemo(
    () => buses.find((b) => b.id === currentStudent?.busId) || buses[0],
    [buses, currentStudent]
  );

  const currentStudentRoute = useMemo(
    () => routes.find((r) => r.id === currentStudent?.routeId) || routes[0],
    [routes, currentStudent]
  );

  const currentStudentStop = useMemo(
    () => currentStudentRoute?.stops.find((s) => s.id === currentStudent?.stopId),
    [currentStudentRoute, currentStudent]
  );

  const currentDriver = useMemo(
    () => drivers.find((d) => d.id === activeDriverId) || drivers[0],
    [drivers, activeDriverId]
  );

  // Driver operations - enforced with RBAC checks
  const startTrip = useCallback(
    (busId: string) => {
      // RBAC check: Students cannot control trips; Drivers can only control their assigned bus
      if (role === 'student') {
        console.warn('RBAC Denial: Students are not permitted to start trips.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot operate unassigned bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            return {
              ...bus,
              status: 'in-transit',
              currentStopIndex: 0,
              progressToNextStop: 0.1,
              speedKmH: 40,
              isSimulating: true,
              delayMinutes: 0,
              emergencyAlert: null,
              lastUpdated: 'Trip started',
            };
          }
          return bus;
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  const endTrip = useCallback(
    (busId: string) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students are not permitted to end trips.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot operate unassigned bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            return {
              ...bus,
              status: 'completed',
              speedKmH: 0,
              isSimulating: false,
              lastUpdated: 'Trip completed at CU Terminal',
            };
          }
          return bus;
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  const advanceToNextStop = useCallback(
    (busId: string) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students are not permitted to advance stops.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot operate unassigned bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            const route = routes.find((r) => r.id === bus.routeId);
            if (!route) return bus;

            const nextIndex = bus.currentStopIndex + 1;
            if (nextIndex >= route.stops.length) {
              return {
                ...bus,
                currentStopIndex: route.stops.length - 1,
                progressToNextStop: 1,
                status: 'completed',
                speedKmH: 0,
                isSimulating: false,
                lastUpdated: 'Arrived at CU Campus',
              };
            }

            const stopName = route.stops[nextIndex]?.name || 'Next stop';
            return {
              ...bus,
              currentStopIndex: nextIndex,
              progressToNextStop: 0,
              speedKmH: 42,
              status: 'in-transit',
              lastUpdated: `Arrived at ${stopName}`,
            };
          }
          return bus;
        })
      );
    },
    [routes, role, activeDriverId, drivers]
  );

  const updateBusOccupancy = useCallback(
    (busId: string, delta: number) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students cannot modify vehicle occupancy.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot modify occupancy for bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            const newOccupancy = Math.max(0, Math.min(bus.capacity, bus.occupiedSeats + delta));
            return { ...bus, occupiedSeats: newOccupancy };
          }
          return bus;
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  const reportDelay = useCallback(
    (busId: string, delayMinutes: number, alertMessage: string | null) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students cannot report dispatch delays.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot broadcast alert for bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            return {
              ...bus,
              delayMinutes,
              emergencyAlert: alertMessage,
              status: delayMinutes > 5 ? 'delayed' : bus.status,
              lastUpdated: alertMessage ? `Alert: ${alertMessage}` : 'Delay updated',
            };
          }
          return bus;
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  const toggleAutoSimulation = useCallback(
    (busId: string) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students cannot toggle simulation telemetry.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot toggle simulation for bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id === busId) {
            const nextSim = !bus.isSimulating;
            return {
              ...bus,
              isSimulating: nextSim,
              status: nextSim && bus.status === 'idle' ? 'in-transit' : bus.status,
            };
          }
          return bus;
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  const updateBusDeviceLocation = useCallback(
    (busId: string, fix: DeviceLocationFix | null) => {
      if (role === 'student') {
        console.warn('RBAC Denial: Students cannot update vehicle device GPS location.');
        return;
      }
      if (role === 'driver') {
        const driver = drivers.find((d) => d.id === activeDriverId);
        if (driver && driver.busId !== busId) {
          console.warn(`RBAC Denial: Driver ${driver.id} cannot update location for unassigned bus ${busId}`);
          return;
        }
      }

      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id !== busId) return bus;
          return {
            ...bus,
            deviceLocation: fix,
            lastUpdated: fix ? 'Device GPS fix (local browser)' : bus.lastUpdated,
          };
        })
      );
    },
    [role, activeDriverId, drivers]
  );

  // Admin operations - strictly restricted to fleet_admin
  const addStudent = useCallback(
    (newStudentData: Omit<Student, 'id'>) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can add student transport passes.');
        return;
      }
      const id = `STU-${Date.now().toString().slice(-4)}`;
      const student: Student = { ...newStudentData, id };
      setStudents((prev) => [student, ...prev]);
    },
    [role]
  );

  const updateStudent = useCallback(
    (updated: Student) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can update student records.');
        return;
      }
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    },
    [role]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can delete student records.');
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
    },
    [role]
  );

  const addBus = useCallback(
    (busData: Omit<Bus, 'id'>) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can add fleet vehicles.');
        return;
      }
      const id = `BUS-${Date.now().toString().slice(-4)}`;
      const bus: Bus = { ...busData, id };
      setBuses((prev) => [...prev, bus]);
    },
    [role]
  );

  const updateBus = useCallback(
    (updated: Bus) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can update fleet vehicles.');
        return;
      }
      setBuses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    },
    [role]
  );

  const assignDriverToBus = useCallback(
    (busId: string, driverId: string) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can change driver assignments.');
        return;
      }
      setBuses((prev) => prev.map((b) => (b.id === busId ? { ...b, driverId } : b)));
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, busId } : d)));
    },
    [role]
  );

  // Batch import parser from CSV / Excel rows
  const importStudentsBatch = useCallback(
    (importedRows: Array<Partial<Student>>) => {
      if (role !== 'fleet_admin' && role !== 'admin') {
        console.warn('RBAC Denial: Only Fleet Admin can import datasets.');
        return { successCount: 0, errors: ['Unauthorized: Administrator privileges required for batch imports.'] };
      }

      let count = 0;
      const errors: string[] = [];
      const newStudents: Student[] = [];

      importedRows.forEach((row, index) => {
        const uid = row.uid?.toString().trim();
        const name = row.name?.toString().trim();
        if (!uid || !name) {
          errors.push(`Row ${index + 1}: Missing mandatory UID or Name`);
          return;
        }

        // Validate or assign default route
        const routeId = row.routeId?.toString().trim().toUpperCase() || 'R-01';
        const targetRoute = routes.find((r) => r.id === routeId) || routes[0];
        const stopId = row.stopId?.toString().trim() || targetRoute.stops[0]?.id;
        const busId = row.busId?.toString().trim() || buses.find((b) => b.routeId === routeId)?.id || buses[0].id;

        const newStudent: Student = {
          id: `STU-${Date.now()}-${index}`,
          uid,
          name,
          email: row.email || `${uid.toLowerCase()}@cuchd.in`,
          phone: row.phone || '+91 98000-00000',
          department: row.department || 'Computer Science & Engineering',
          semester: row.semester || '4th Semester',
          routeId: targetRoute.id,
          stopId,
          busId,
          seatNumber: row.seatNumber || `S-${Math.floor(10 + Math.random() * 40)}`,
          passValidUntil: row.passValidUntil || '30 June 2027',
          bloodGroup: row.bloodGroup || 'B+',
          status: 'active',
        };

        newStudents.push(newStudent);
        count++;
      });

      if (newStudents.length > 0) {
        setStudents((prev) => {
          // Merge avoiding UID duplicates
          const existingUids = new Set(newStudents.map((s) => s.uid.toLowerCase()));
          const filteredOld = prev.filter((s) => !existingUids.has(s.uid.toLowerCase()));
          return [...newStudents, ...filteredOld];
        });
      }

      return { successCount: count, errors };
    },
    [routes, buses, role]
  );

  const resetToDemoData = useCallback(() => {
    if (role !== 'fleet_admin' && role !== 'admin') {
      console.warn('RBAC Denial: Only Fleet Admin can reset transit demo data.');
      return;
    }
    localStorage.removeItem(STORAGE_KEYS.ROUTES);
    localStorage.removeItem(STORAGE_KEYS.BUSES);
    localStorage.removeItem(STORAGE_KEYS.DRIVERS);
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    setBuses(SEED_BUSES);
    setDrivers(SEED_DRIVERS);
    setStudents(SEED_STUDENTS);
    setActiveStudentUidState('22BCS10101');
    setActiveDriverIdState('DRV-101');
    setLastRefreshedAt(new Date());
  }, [role]);

  // Real-time stop ETA calculation
  const calculateStopEta = useCallback(
    (bus: Bus, stopId: string) => {
      const route = routes.find((r) => r.id === bus.routeId);
      if (!route) return { minutes: 0, text: 'No route', isPassed: false, isCurrent: false };

      const stopIndex = route.stops.findIndex((s) => s.id === stopId);
      if (stopIndex === -1) return { minutes: 0, text: 'Unknown stop', isPassed: false, isCurrent: false };

      const isCurrent = bus.currentStopIndex === stopIndex && bus.progressToNextStop < 0.2;
      const isPassed = bus.currentStopIndex > stopIndex;

      if (isPassed) {
        return { minutes: 0, text: 'Departed', isPassed: true, isCurrent: false };
      }

      if (isCurrent) {
        return { minutes: 0, text: 'Boarding now', isPassed: false, isCurrent: true };
      }

      // Calculate time gap between bus location and target stop
      const targetStop = route.stops[stopIndex];
      const busCurrentStop = route.stops[bus.currentStopIndex];

      if (!busCurrentStop || !targetStop) {
        return { minutes: 10, text: '~10 mins', isPassed: false, isCurrent: false };
      }

      const rawMinutesDiff = Math.max(
        1,
        targetStop.etaFromStartMinutes - (busCurrentStop.etaFromStartMinutes + bus.progressToNextStop * 8)
      );

      const totalEta = Math.round(rawMinutesDiff + bus.delayMinutes);

      return {
        minutes: totalEta,
        text: `${totalEta} min${totalEta === 1 ? '' : 's'}`,
        isPassed: false,
        isCurrent: false,
      };
    },
    [routes]
  );

  // Overall Transit stats
  const stats: TransitStats = useMemo(() => {
    const totalBuses = buses.length;
    const activeInTransit = buses.filter((b) => b.status === 'in-transit').length;
    const totalStudents = students.length;
    const onTimeBuses = buses.filter((b) => b.delayMinutes <= 2).length;
    const onTimePerformancePercent = totalBuses ? Math.round((onTimeBuses / totalBuses) * 100) : 95;

    const totalCapacity = buses.reduce((acc, b) => acc + b.capacity, 0);
    const totalOccupied = buses.reduce((acc, b) => acc + b.occupiedSeats, 0);
    const averageOccupancyPercent = totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 78;

    const activeAlertsCount = buses.filter((b) => b.emergencyAlert !== null || b.delayMinutes > 5).length;

    return {
      totalBuses,
      activeInTransit,
      totalStudents,
      onTimePerformancePercent,
      averageOccupancyPercent,
      activeAlertsCount,
    };
  }, [buses, students]);

  const value = {
    role,
    setRole,
    activeStudentUid,
    setActiveStudentUid,
    activeDriverId,
    setActiveDriverId,

    routes,
    buses,
    drivers,
    students,
    stats,

    currentStudent,
    currentDriver,
    currentStudentBus,
    currentStudentRoute,
    currentStudentStop,

    startTrip,
    endTrip,
    advanceToNextStop,
    updateBusOccupancy,
    reportDelay,
    toggleAutoSimulation,
    updateBusDeviceLocation,

    addStudent,
    updateStudent,
    deleteStudent,
    addBus,
    updateBus,
    assignDriverToBus,
    importStudentsBatch,
    resetToDemoData,

    lastRefreshedAt,
    refreshTelemetry,
    calculateStopEta,

    isAuthenticated,
    loginStudent,
    loginDriver,
    loginAdmin,
    logout,
  };

  return <TransitContext.Provider value={value}>{children}</TransitContext.Provider>;
};

export const useTransit = () => {
  const context = useContext(TransitContext);
  if (!context) {
    throw new Error('useTransit must be used within a TransitProvider');
  }
  return context;
};
