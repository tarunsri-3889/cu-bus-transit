import React from 'react';
import { Phone, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface EmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const helplines = [
    { title: 'CU Transport Central Control', number: '0160-3051000', subtitle: 'Main Dispatch & Bus Tracking Room' },
    { title: 'Campus Security & Emergency SOS', number: '+91 99159-99100', subtitle: 'Gate 2 Security Station, Gharuan' },
    { title: 'Student Transit Grievance Cell', number: '+91 98882-34900', subtitle: 'Bus Pass, Route & Lost Property' },
    { title: 'Highway Emergency / Medical Dispatch', number: '112 / 108', subtitle: 'National Emergency Service' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-200 transform transition-transform"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="emergency-title" className="text-base font-bold text-slate-900">
                CU Transit Support & Helplines
              </h3>
              <p className="text-xs text-slate-500">Chandigarh University Fleet Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close helplines modal"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {helplines.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                <p className="text-sm font-bold text-blue-600 font-mono mt-1">{item.number}</p>
              </div>
              <a
                href={`tel:${item.number.replace(/\s+/g, '')}`}
                className="px-3.5 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex items-center gap-1.5 shadow-2xs min-h-[44px]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All buses are monitored with live GPS & CCTV telemetry linked to Mohali Dispatch.</span>
        </div>

        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors min-h-[44px]"
          >
            Close Emergency Panel
          </button>
        </div>
      </div>
    </div>
  );
};
