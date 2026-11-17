import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Gauge, Shield, MapPin } from 'lucide-react';
import { useTransit } from '../../context/TransitContext';
import { getNavItemsForRole } from '../../auth/rbac';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { role, isAuthenticated, drivers, activeDriverId } = useTransit();
  const currentPath = location.pathname;

  // Do not show bottom nav on login page or when unauthenticated
  if (!isAuthenticated || currentPath === '/' || currentPath === '/login') {
    return null;
  }

  const currentDriver = drivers.find((d) => d.id === activeDriverId);
  const assignedRouteCode = currentDriver?.routeId || 'R-01';
  const navItems = getNavItemsForRole(role, assignedRouteCode);

  if (navItems.length === 0) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-5 h-5 mb-0.5" />;
      case 'Gauge':
        return <Gauge className="w-5 h-5 mb-0.5" />;
      case 'Shield':
        return <Shield className="w-5 h-5 mb-0.5" />;
      case 'MapPin':
      default:
        return <MapPin className="w-5 h-5 mb-0.5" />;
    }
  };

  const getGridColsClass = () => {
    switch (navItems.length) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
      default:
        return 'grid-cols-4';
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2"
    >
      <div className={`grid ${getGridColsClass()} items-center h-16 max-w-lg mx-auto`}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`min-h-[44px] flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {renderIcon(item.iconName)}
              <span className="text-[10px] tracking-tight whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

