import React from 'react';
import { DriverPortal } from '../components/driver/DriverPortal';

export const DriverConsolePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
          <span>Driver Console</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Trip Dispatch & Route Management Cockpit</span>
        </div>
      </div>
      <DriverPortal />
    </div>
  );
};
