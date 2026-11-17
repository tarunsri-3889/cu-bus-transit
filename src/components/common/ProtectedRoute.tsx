import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTransit } from '../../context/TransitContext';
import { isRouteAllowed, getRoleHomePath, UserRole } from '../../auth/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Route guard component enforcing strict Role-Based Access Control (RBAC).
 * 1. Checks if the user is authenticated; if not, redirects to /login.
 * 2. Checks if the user's role has permission for the target route path.
 * 3. Redirects unauthorized attempts to the user's permitted home dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useTransit();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Validate path permission according to RBAC matrix
  if (!isRouteAllowed(role, location.pathname)) {
    const fallbackPath = getRoleHomePath(role);
    return <Navigate to={fallbackPath} replace />;
  }

  // Validate specific allowedRoles constraint if provided
  if (allowedRoles && !allowedRoles.includes(role)) {
    const fallbackPath = getRoleHomePath(role);
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
