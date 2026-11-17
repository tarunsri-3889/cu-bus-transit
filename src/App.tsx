/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { TransitProvider } from './context/TransitContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { EmergencyDrawer } from './components/common/EmergencyDrawer';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { DriverConsolePage } from './pages/DriverConsolePage';
import { FleetAdminPage } from './pages/FleetAdminPage';
import { RoutesDirectoryPage } from './pages/RoutesDirectoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SplashScreen } from './components/common/SplashScreen';
import { InstallAppModal } from './components/common/InstallAppModal';

interface AppLayoutProps {
  onReplaySplash?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ onReplaySplash }) => {
  const [isHelplineOpen, setIsHelplineOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header consistent across all pages */}
      <Header
        onOpenHelpline={() => setIsHelplineOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
      />

      {/* Main Responsive Viewport Canvas - renders only the active page */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 md:pb-12">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student', 'fleet_admin', 'admin']}>
                <StudentPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['driver', 'fleet_admin', 'admin']}>
                <DriverConsolePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['fleet_admin', 'admin']}>
                <FleetAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes"
            element={
              <ProtectedRoute allowedRoles={['student', 'driver', 'fleet_admin', 'admin']}>
                <RoutesDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile-first Bottom Navigation Bar (under 15% sticky cap) */}
      <BottomNav />

      {/* Emergency & Support Drawer */}
      <EmergencyDrawer isOpen={isHelplineOpen} onClose={() => setIsHelplineOpen(false)} />

      {/* Install App on Phone Modal */}
      <InstallAppModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />

      {/* Universal Footer */}
      <footer className="hidden md:block bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                CU
              </div>
              <span className="font-semibold text-slate-800">Chandigarh University Fleet Operations</span>
              <span>·</span>
              <span>NH-05 Ludhiana - Chandigarh State Highway, Gharuan, Mohali 140413</span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="hover:text-blue-600 transition-colors text-blue-600 font-bold cursor-pointer"
                title="Install CU BUS Transit on your phone"
              >
                📱 Install on Phone
              </button>
              <Link
                to="/routes"
                className="hover:text-slate-900 transition-colors"
              >
                Transit Corridors (R-01 – R-05)
              </Link>
              <button
                onClick={() => setIsHelplineOpen(true)}
                className="hover:text-slate-900 transition-colors text-rose-600 font-semibold cursor-pointer"
              >
                Dispatch Helpline: 0160-3051000
              </button>
              {onReplaySplash && (
                <button
                  onClick={onReplaySplash}
                  className="hover:text-blue-600 transition-colors text-slate-500 font-medium cursor-pointer"
                  title="Replay launch splash screen"
                >
                  Preview Splash
                </button>
              )}
              <span className="text-slate-400">Demo Dataset Mode</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const handleReplaySplash = useCallback(() => setShowSplash(true), []);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  return (
    <TransitProvider>
      <HashRouter>
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        {showSplash && (
          <SplashScreen
            onComplete={handleSplashComplete}
            durationMs={2000}
          />
        )}
        <AppLayout onReplaySplash={handleReplaySplash} />
      </HashRouter>
    </TransitProvider>
  );
}
