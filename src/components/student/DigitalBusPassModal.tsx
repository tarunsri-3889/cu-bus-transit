import React from 'react';
import { X, ShieldCheck, QrCode, Bus as BusIcon, Download, Check } from 'lucide-react';
import { Student, Route, Bus, RouteStop } from '../../types/transit';

interface DigitalBusPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  route: Route;
  bus: Bus;
  stop?: RouteStop;
}

export const DigitalBusPassModal: React.FC<DigitalBusPassModalProps> = ({
  isOpen,
  onClose,
  student,
  route,
  bus,
  stop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 transform transition-all max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Pass Top University Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-3 sm:px-6 sm:py-4 text-white relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900/60 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                <img
                  src="/cu-bus-logo.png"
                  alt="CU Transit Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">CHANDIGARH UNIVERSITY</h3>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-medium">
                  Official Transport Pass · Academic Session
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close bus pass modal"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pass Card Body */}
        <div className="p-3.5 sm:p-6 bg-slate-50 overflow-y-auto flex-1">
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Security Holographic Ribbon */}
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>Verified Transport</span>
            </div>

            {/* Student Profile Info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-20 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden flex flex-col items-center justify-center text-slate-400 shrink-0 relative shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mb-1">
                  {student.name.charAt(0)}
                </div>
                <span className="text-[9px] font-mono font-semibold text-slate-600 uppercase">
                  {student.uid.slice(-4)}
                </span>
                <div className="absolute bottom-0 inset-x-0 bg-blue-600 text-[8px] text-white text-center font-bold py-0.5">
                  CU 2026
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-8">
                <h4 className="text-base font-bold text-slate-900 truncate">{student.name}</h4>
                <p className="text-xs font-mono font-semibold text-blue-600 mt-0.5">{student.uid}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{student.department}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{student.semester} · Blood: {student.bloodGroup}</p>
              </div>
            </div>

            {/* Transit Route & Allocation Specs */}
            <div className="mt-5 grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Assigned Route</span>
                <span className="font-bold text-slate-800 font-mono text-sm">{route.code}</span>
                <span className="text-[11px] text-slate-500 block truncate">{route.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Designated Bus</span>
                <span className="font-bold text-blue-700 font-mono text-sm">{bus.busNumber}</span>
                <span className="text-[11px] text-slate-500 block font-mono">{bus.regNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Designated Stop</span>
                <span className="font-bold text-slate-800 text-xs truncate block">{stop?.name || 'Assigned Stop'}</span>
                <span className="text-[10px] text-slate-500 block font-mono">{stop?.scheduledMorningPickup || '07:15 AM'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Seat Reservation</span>
                <span className="font-bold text-slate-800 font-mono text-xs">{student.seatNumber} (Confirmed)</span>
                <span className="text-[10px] text-emerald-600 font-medium block">Validity: {student.passValidUntil}</span>
              </div>
            </div>

            {/* QR Code & Barcode Verification */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 p-1.5 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                  <QrCode className="w-full h-full" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">UID Barcode Token</span>
                  <div className="flex gap-0.5 mt-1 h-6 items-end">
                    {[12, 18, 14, 22, 10, 19, 16, 24, 11, 20, 15, 23, 13, 21].map((h, i) => (
                      <div key={i} className="w-1 bg-slate-800" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                    CU-PASS-{student.uid}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Valid Pass</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Show this pass to the bus conductor upon boarding.
          </p>
          <button
            onClick={() => {
              window.print();
            }}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save / Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
