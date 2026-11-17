import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bus as BusIcon,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Check,
  LogOut,
  Menu,
  X,
  Compass,
  Gauge,
  Shield,
  MapPin,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useTransit } from '../../context/TransitContext';
import { UserRole } from '../../types/transit';
import { getNavItemsForRole } from '../../auth/rbac';

interface HeaderProps {
  onOpenHelpline: () => void;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelpline, onOpenInstall }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    role,
    setRole,
    students,
    activeStudentUid,
    drivers,
    activeDriverId,
    lastRefreshedAt,
    refreshTelemetry,
    isAuthenticated,
    logout,
  } = useTransit();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    refreshTelemetry();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const currentPath = location.pathname;
  const isLoginPage = currentPath === '/' || currentPath === '/login';

  const currentStudent = students.find((s) => s.uid.toLowerCase() === activeStudentUid.toLowerCase());
  const currentStudentName = currentStudent?.name || 'Student';
  const currentDriver = drivers.find((d) => d.id === activeDriverId);
  const currentDriverName = currentDriver?.name || 'Driver';

  // Get strictly authorized navigation links for the active user role
  const assignedRouteCode = currentDriver?.routeId || 'R-01';
  const navItems = getNavItemsForRole(isAuthenticated ? role : undefined, assignedRouteCode);

  const getRoleDisplayName = (): string => {
    if (!isAuthenticated || isLoginPage) return 'Sign In / Select Role';
    if (role === 'student') return `Student: ${currentStudentName.split(' ')[0]}`;
    if (role === 'driver') return `Driver: ${currentDriverName.split(' ')[0]}`;
    return 'Admin Console';
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
    setIsRoleDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const renderNavIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-4 h-4" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4" />;
      case 'Shield':
        return <Shield className="w-4 h-4" />;
      case 'MapPin':
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 h-14 sm:h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link
              to={isAuthenticated ? (role === 'student' ? '/student' : role === 'driver' ? '/driver' : '/admin') : '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none min-h-[44px] shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800/80 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                <img
                  src="/cu-bus-logo.png"
                  alt="CU BUS Transit Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
                  CU BUS Transit
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 whitespace-nowrap hidden min-[360px]:block">
                  Chandigarh University
                </span>
              </div>
            </Link>
          </div>

          {/* Zone 2: Role-Restricted Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-slate-600">
            {isAuthenticated ? (
              navItems.map((item) => {
                const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                      isActive ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })
            ) : (
              <Link
                to="/routes"
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                  currentPath.startsWith('/routes') ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''
                }`}
              >
                All 5 Routes
              </Link>
            )}
          </nav>

          {/* Zone 3: Actions & Role / Persona Control */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Quick Refresh Telemetry button */}
            <button
              onClick={handleRefreshClick}
              title={`Updated at ${lastRefreshedAt.toLocaleTimeString()}`}
              aria-label="Refresh transit telemetry"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center min-w-[40px] min-h-[40px] touch-manipulation"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Helpline quick trigger */}
            <button
              onClick={onOpenHelpline}
              title="Transport Control Room & Helplines"
              aria-label="Transport Helplines"
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center min-w-[40px] min-h-[40px] touch-manipulation"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Install on Phone quick trigger */}
            {onOpenInstall && (
              <button
                onClick={onOpenInstall}
                title="Install App on Phone / Setup Instructions"
                aria-label="Install App on Phone"
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center min-w-[40px] min-h-[40px] touch-manipulation"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            )}

            {/* Desktop Role & Persona Menu */}
            <div className="relative hidden md:block">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200/80 min-h-[40px]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="max-w-[130px] lg:max-w-[170px] truncate">{getRoleDisplayName()}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isRoleDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95 text-xs">
                        {/* Student Persona Details */}
                        {role === 'student' && (
                          <div className="px-3.5 py-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                              Student Access Level
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{currentStudentName}</p>
                            <p className="font-mono text-[11px] text-slate-500">{currentStudent?.uid}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{currentStudent?.department}</p>
                          </div>
                        )}

                        {/* Driver Persona Details */}
                        {role === 'driver' && (
                          <div className="px-3.5 py-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                              Driver Duty Access Level
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{currentDriverName}</p>
                            <p className="font-mono text-[11px] text-slate-500">ID: {currentDriver?.id}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Assigned Bus: {currentDriver?.busId}</p>
                          </div>
                        )}

                        {/* Fleet Admin Master Controls */}
                        {(role === 'fleet_admin' || role === 'admin') && (
                          <>
                            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/60">
                              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                                Fleet Administrator
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">Master Dispatch & Registry Authority</p>
                            </div>

                            <div className="px-3 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Admin Testing Portal Switcher
                            </div>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  navigate('/student');
                                  setIsRoleDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>Student Portal View</span>
                                {currentPath === '/student' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigate('/driver');
                                  setIsRoleDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>Driver Console View</span>
                                {currentPath === '/driver' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigate('/admin');
                                  setIsRoleDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between font-semibold"
                              >
                                <span>Fleet & Admin Control</span>
                                {currentPath === '/admin' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigate('/routes');
                                  setIsRoleDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>All 5 Routes</span>
                                {currentPath === '/routes' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            </div>
                          </>
                        )}

                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-between transition-colors"
                          >
                            <span>Sign Out ({getRoleDisplayName()})</span>
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Portal Login</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Hamburger Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors touch-manipulation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Sheet - strictly role-filtered */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 shadow-lg space-y-3 animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Authorized Pages ({role.replace('_', ' ').toUpperCase()})
              </div>

              <div className={`grid gap-2 text-xs ${navItems.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {navItems.map((item) => {
                  const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 min-h-[48px] ${
                        isActive
                          ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      {renderNavIcon(item.iconName)}
                      <div>
                        <span className="block font-semibold">{item.label}</span>
                        {item.description && (
                          <span className="text-[10px] text-slate-500 block leading-tight">{item.description}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Active Identity Strip & Logout */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium truncate max-w-[200px]">{getRoleDisplayName()}</span>
                <button
                  onClick={handleSignOut}
                  className="text-rose-600 font-semibold flex items-center gap-1.5 py-1 px-2.5 hover:bg-rose-50 rounded-lg min-h-[40px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {onOpenInstall && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenInstall();
                  }}
                  className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors border border-blue-200"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App on Phone</span>
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In to CU BUS Portal</span>
              </Link>
              <Link
                to="/routes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-slate-100 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px]"
              >
                <MapPin className="w-4 h-4" />
                <span>Browse All 5 Route Timetables</span>
              </Link>
              {onOpenInstall && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenInstall();
                  }}
                  className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors border border-blue-200"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App on Phone</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
