import React from 'react';
import { StudentPortal } from '../components/student/StudentPortal';

export const StudentPortalPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
          <span>Student Portal</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Campus Shuttle Tracker (Simulated GPS & Google Maps)</span>
        </div>
      </div>
      <StudentPortal />
    </div>
  );
};
