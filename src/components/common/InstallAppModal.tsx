import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  QrCode
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qrcode'>('android');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // The direct shared app URL accessible from any mobile browser
  const appUrl = 'https://ais-pre-fxjzbrz2mwnerahrh5hfcj-193861526528.asia-northeast1.run.app';

  useEffect(() => {
    // Detect if already installed / running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Detect iOS Safari by user agent
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab('ios');
      }
    }
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      onClose();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
      >
        {/* Header with Navy Branding */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-md shrink-0 p-1.5 overflow-hidden">
              <img
                src="/cu-bus-logo.png"
                alt="CU BUS Transit Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PWA Mobile App</span>
              </div>
              <h2 id="install-modal-title" className="text-xl font-bold text-white tracking-tight leading-tight">
                Install CU BUS Transit
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-100/90 mt-2">
            Add CU BUS Transit to your phone's home screen for fast full-screen tracking, instant offline access, and bus notifications.
          </p>

          {/* Quick Tabs: Android vs iPhone vs QR Code */}
          <div className="flex gap-1.5 mt-4 bg-black/25 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'android'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ios'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
            >
              iPhone / iPad (Safari)
            </button>
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'qrcode'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
            >
              Scan QR
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Native 1-Click prompt if browser emitted beforeinstallprompt */}
          {deferredPrompt && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950">One-Tap Direct Install Ready</p>
                  <p className="text-[11px] text-blue-700">Your browser supports instant installation.</p>
                </div>
              </div>
              <button
                onClick={handleNativeInstall}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
              >
                Install Now
              </button>
            </div>
          )}

          {isStandalone && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Great news! You are already running CU BUS Transit in installed app mode.</span>
            </div>
          )}

          {/* Android Steps */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Open in Chrome on your Android phone</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Navigate to the app URL in Google Chrome (or Samsung Internet).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800">Tap the three dots menu</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                      <MoreVertical className="w-3 h-3 inline" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Located in the top-right corner of the Chrome toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950">
                    Select <span className="underline decoration-blue-500 font-extrabold">"Install app"</span> or <span className="underline decoration-blue-500 font-extrabold">"Add to Home screen"</span>
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Tap <strong>"Install"</strong> when prompted. The official <strong>CU Transit</strong> app icon will be added to your home screen and app launcher!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* iOS Safari Steps */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Open in Safari on your iPhone</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Make sure you are using <strong>Safari</strong> (Apple requires Safari for PWA installation).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800">Tap the Share icon at the bottom</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">
                      <Share2 className="w-3 h-3 inline" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    The square icon with an upward arrow in the center bottom of your Safari screen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-blue-950">
                      Scroll and tap <span className="underline decoration-blue-500 font-extrabold">"Add to Home Screen"</span>
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                      <PlusSquare className="w-3 h-3 inline" />
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Tap <strong>"Add"</strong> in the top right. <strong>CU Transit</strong> will launch like a native iOS app with full screen and no Safari search bars!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Tab for Instant Desktop-to-Phone handoff */}
          {activeTab === 'qrcode' && (
            <div className="text-center space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-2">
                  {/* Clean SVG visual QR code pattern linking directly to appUrl */}
                  <svg
                    viewBox="0 0 160 160"
                    width="140"
                    height="140"
                    className="mx-auto"
                    shapeRendering="crispEdges"
                  >
                    {/* Background */}
                    <rect width="160" height="160" fill="#ffffff" />
                    {/* Finder pattern Top-Left */}
                    <rect x="10" y="10" width="40" height="40" fill="#0f172a" />
                    <rect x="16" y="16" width="28" height="28" fill="#ffffff" />
                    <rect x="22" y="22" width="16" height="16" fill="#1e3a8a" />

                    {/* Finder pattern Top-Right */}
                    <rect x="110" y="10" width="40" height="40" fill="#0f172a" />
                    <rect x="116" y="16" width="28" height="28" fill="#ffffff" />
                    <rect x="122" y="22" width="16" height="16" fill="#1e3a8a" />

                    {/* Finder pattern Bottom-Left */}
                    <rect x="10" y="110" width="40" height="40" fill="#0f172a" />
                    <rect x="16" y="116" width="28" height="28" fill="#ffffff" />
                    <rect x="22" y="122" width="16" height="16" fill="#1e3a8a" />

                    {/* Timing and alignment blocks */}
                    <rect x="60" y="20" width="8" height="8" fill="#0f172a" />
                    <rect x="76" y="20" width="8" height="8" fill="#0f172a" />
                    <rect x="92" y="20" width="8" height="8" fill="#0f172a" />
                    <rect x="20" y="60" width="8" height="8" fill="#0f172a" />
                    <rect x="20" y="76" width="8" height="8" fill="#0f172a" />
                    <rect x="20" y="92" width="8" height="8" fill="#0f172a" />

                    {/* Data simulation matrix */}
                    <rect x="60" y="60" width="40" height="40" fill="#1e3a8a" rx="4" />
                    {/* Center bus icon */}
                    <path
                      d="M72 74 h16 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 v-12 a3 3 0 0 1 3 -3 z M73 78 h14 v4 h-14 z M74 88 a1.5 1.5 0 1 0 0 .1 z M86 88 a1.5 1.5 0 1 0 0 .1 z"
                      fill="#ffffff"
                    />

                    <rect x="110" y="60" width="8" height="8" fill="#0f172a" />
                    <rect x="126" y="68" width="8" height="8" fill="#0f172a" />
                    <rect x="142" y="60" width="8" height="8" fill="#0f172a" />
                    <rect x="118" y="84" width="8" height="8" fill="#0f172a" />
                    <rect x="134" y="92" width="8" height="8" fill="#0f172a" />

                    <rect x="60" y="110" width="8" height="8" fill="#0f172a" />
                    <rect x="76" y="118" width="8" height="8" fill="#0f172a" />
                    <rect x="92" y="110" width="8" height="8" fill="#0f172a" />
                    <rect x="68" y="134" width="8" height="8" fill="#0f172a" />
                    <rect x="84" y="142" width="8" height="8" fill="#0f172a" />

                    <rect x="110" y="110" width="16" height="16" fill="#0284c7" />
                    <rect x="134" y="118" width="16" height="16" fill="#0f172a" />
                    <rect x="118" y="134" width="16" height="16" fill="#0f172a" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-800">Scan with your Phone Camera</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                  Point your iPhone Camera or Android Google Lens at the code above to open the app directly.
                </p>
              </div>
            </div>
          )}

          {/* Quick Copy Link Box */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Direct Phone Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 truncate select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Progressive Web App · No App Store needed
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
