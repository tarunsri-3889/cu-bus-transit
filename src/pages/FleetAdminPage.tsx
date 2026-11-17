import React from 'react';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export const FleetAdminPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
          <span>Fleet & Admin</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Transport Control Room & Registry Management</span>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
};
