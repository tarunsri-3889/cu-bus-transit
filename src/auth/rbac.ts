/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Role-Based Access Control (RBAC) System
 * Defines access levels, permissions, and navigation for:
 * 1. student
 * 2. driver
 * 3. fleet_admin (and alias admin)
 * 
 * Production Security Notice:
 * In this client-side demonstration, permissions are enforced on client state
 * and local storage. In a production environment, authorization MUST always be
 * validated server-side (e.g., via cryptographically signed JWTs or session cookies)
 * to prevent client tampering.
 */

export type UserRole = 'student' | 'driver' | 'fleet_admin' | 'admin';

export type Permission =
  | 'view_student_portal'
  | 'view_all_routes'
  | 'view_assigned_route'
  | 'view_driver_console'
  | 'operate_assigned_trip'
  | 'view_fleet_admin'
  | 'manage_students'
  | 'manage_fleet'
  | 'manage_routes'
  | 'import_datasets'
  | 'switch_test_personas';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: [
    'view_student_portal',
    'view_all_routes',
  ],
  driver: [
    'view_driver_console',
    'view_assigned_route',
    'operate_assigned_trip',
  ],
  fleet_admin: [
    'view_student_portal',
    'view_all_routes',
    'view_assigned_route',
    'view_driver_console',
    'operate_assigned_trip',
    'view_fleet_admin',
    'manage_students',
    'manage_fleet',
    'manage_routes',
    'import_datasets',
    'switch_test_personas',
  ],
  admin: [
    'view_student_portal',
    'view_all_routes',
    'view_assigned_route',
    'view_driver_console',
    'operate_assigned_trip',
    'view_fleet_admin',
    'manage_students',
    'manage_fleet',
    'manage_routes',
    'import_datasets',
    'switch_test_personas',
  ],
};

/**
 * Check if a role possesses a specific permission.
 */
export const hasPermission = (role: UserRole | undefined, permission: Permission): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Returns the default home destination for a specific role upon login.
 */
export const getRoleHomePath = (role: UserRole | undefined): string => {
  switch (role) {
    case 'student':
      return '/student';
    case 'driver':
      return '/driver';
    case 'fleet_admin':
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
};

/**
 * Validates whether the given role is allowed to view the specified route path.
 */
export const isRouteAllowed = (role: UserRole | undefined, path: string): boolean => {
  if (!role) return false;
  const normalized = path.toLowerCase().split('?')[0].replace(/\/+$/, '');

  // Public/entry routes
  if (normalized === '' || normalized === '/login') {
    return true;
  }

  // Fleet Admin has access to all four application sections
  if (role === 'fleet_admin' || role === 'admin') {
    return true;
  }

  // Student is authorized ONLY for Student Portal and All 5 Routes
  if (role === 'student') {
    return normalized === '/student' || normalized === '/routes';
  }

  // Driver is authorized ONLY for Driver Console and Route Directory (assigned route view)
  if (role === 'driver') {
    return normalized === '/driver' || normalized === '/routes';
  }

  return false;
};

export interface RoleNavItem {
  id: string;
  label: string;
  path: string;
  iconName: 'Compass' | 'Gauge' | 'Shield' | 'MapPin';
  description?: string;
}

/**
 * Generates the role-restricted navigation links.
 * Hidden items are never rendered for unauthorized roles.
 */
export const getNavItemsForRole = (
  role: UserRole | undefined,
  assignedRouteCode?: string
): RoleNavItem[] => {
  switch (role) {
    case 'student':
      return [
        {
          id: 'student-portal',
          label: 'Student Portal',
          path: '/student',
          iconName: 'Compass',
          description: 'My assigned bus & live tracking',
        },
        {
          id: 'all-routes',
          label: 'All 5 Routes',
          path: '/routes',
          iconName: 'MapPin',
          description: 'Public corridor directory (Read-only)',
        },
      ];

    case 'driver':
      return [
        {
          id: 'driver-console',
          label: 'Driver Console',
          path: '/driver',
          iconName: 'Gauge',
          description: 'My shift telemetry & controls',
        },
        {
          id: 'assigned-route',
          label: assignedRouteCode ? `Assigned Route (${assignedRouteCode})` : 'Assigned Route',
          path: '/routes',
          iconName: 'MapPin',
          description: 'Waypoint manifests & timetable',
        },
      ];

    case 'fleet_admin':
    case 'admin':
      return [
        {
          id: 'student-portal',
          label: 'Student Portal',
          path: '/student',
          iconName: 'Compass',
          description: 'Student view testing',
        },
        {
          id: 'driver-console',
          label: 'Driver Console',
          path: '/driver',
          iconName: 'Gauge',
          description: 'Driver view testing',
        },
        {
          id: 'fleet-admin',
          label: 'Fleet & Admin',
          path: '/admin',
          iconName: 'Shield',
          description: 'Master transport administration',
        },
        {
          id: 'all-routes',
          label: 'All 5 Routes',
          path: '/routes',
          iconName: 'MapPin',
          description: 'Network directory & corridor maps',
        },
      ];

    default:
      return [];
  }
};
