import React, { useEffect, useState } from 'react';
import { Shield, Radio, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 2100,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Detect user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Animate progress smoothly over durationMs
  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId: number;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;

    const finishSplash = () => {
      if (finished) return;
      finished = true;
      setProgress(100);
      setIsFadingOut(true);
      exitTimer = setTimeout(() => {
        onComplete();
      }, 400);
    };

    const updateProgress = (currentTime: number) => {
      const elapsed = Math.max(0, currentTime - startTime);
      const rawProgress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic for a polished feel
      const easedProgress = Math.round(
        (1 - Math.pow(1 - rawProgress, 2.5)) * 100
      );
      setProgress(easedProgress);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        finishSplash();
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    // Safety fallback in case requestAnimationFrame is throttled in background tabs/iframes
    const fallbackTimer = setTimeout(finishSplash, durationMs + 300);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(fallbackTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [durationMs, onComplete]);

  // Contextual loading status text based on progress
  const getStatusText = (pct: number) => {
    if (pct < 30) return 'Connecting Campus Fleet Telemetry...';
    if (pct < 65) return 'Syncing R-01 to R-05 Corridors & GPS...';
    if (pct < 92) return 'Verifying Schedule & Student Pass Services...';
    return 'Fleet Ready. Welcome to CU BUS Transit';
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading CU BUS Transit application"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-[#070d1e] text-white select-none transition-opacity duration-400 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambience & Professional Gradient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep radial sapphire glow */}
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] md:w-[720px] h-[340px] sm:h-[540px] md:h-[720px] bg-blue-600/20 rounded-full blur-[90px] sm:blur-[140px] pointer-events-none ${
            isReducedMotion ? '' : 'animate-pulse'
          }`}
          style={{ animationDuration: '4s' }}
        />
        {/* Subtle cyan secondary accent glow */}
        <div className="absolute bottom-10 right-1/4 w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Faint coordinate grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Diagonal lighting highlight */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Bar / University Affiliation Header */}
      <header className="relative z-10 w-full pt-6 sm:pt-8 px-6 flex items-center justify-between text-xs tracking-wider text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-[11px] uppercase text-emerald-400/90 font-medium">
            Live Dispatch Network
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Gharuan, Mohali · NH-05</span>
          <span className="sm:hidden">CU Transit</span>
        </div>
      </header>

      {/* Center Hero: Logo, Title, Subtitle, Tagline & Animated Bus Track */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-lg w-full text-center my-auto">
        {/* CU Transit Emblem with Glowing Ring */}
        <div className="relative mb-6 sm:mb-8 group">
          {/* Subtle spinning accent ring (disabled on reduced motion) */}
          <div
            className={`absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-60 blur-md ${
              isReducedMotion ? '' : 'animate-pulse'
            }`}
          />

          {/* Icon Container */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-2xl shadow-cyan-500/25 flex items-center justify-center border border-white/20">
            <div className="w-full h-full rounded-[22px] sm:rounded-[26px] bg-[#070e24] flex items-center justify-center relative overflow-hidden p-2 sm:p-2.5">
              {/* Gloss highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

              {/* Clean Bus Logo Image */}
              <img
                src="/cu-bus-logo.png"
                alt="CU BUS Transit Logo"
                className={`w-full h-full object-contain relative z-10 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)] ${
                  isReducedMotion ? '' : 'transition-transform duration-300'
                }`}
              />

              {/* University Monogram Pin in corner */}
              <span className="absolute top-1.5 right-2 text-[9px] font-black tracking-tighter text-cyan-300/80 font-mono z-10">
                CU
              </span>
            </div>
          </div>
        </div>

        {/* Text Section */}
        {/* Main Application Name */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-1.5">
          CU BUS TRANSIT
        </h1>

        {/* Subtitle: Chandigarh University with subtle badge accent */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Chandigarh University</span>
        </div>

        {/* Tagline */}
        <p className="text-sm sm:text-base text-slate-300 font-medium tracking-normal max-w-xs sm:max-w-sm mx-auto mb-8">
          Your Campus. Your Route. Your Journey.
        </p>

        {/* Subtle Bus Movement Animation on Stylized Transit Track */}
        <div className="w-full max-w-xs sm:max-w-sm px-2">
          <div className="relative h-14 w-full flex items-center justify-center">
            {/* Roadway / Track Line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 rounded-full overflow-hidden">
              {/* Dashed highway center lines animation */}
              <div
                className={`w-[200%] h-full flex ${
                  isReducedMotion ? '' : 'animate-road-move'
                }`}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 14px, transparent 14px, transparent 28px)',
                  opacity: 0.6,
                }}
              />
            </div>

            {/* Glowing route station nodes at left and right */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

            {/* Gliding Transit Bus */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-20 ${
                isReducedMotion ? 'left-1/2 -translate-x-1/2' : 'animate-bus-glide'
              }`}
            >
              <div className="relative flex items-center">
                {/* Headlight beam effect shining right */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-8 bg-gradient-to-r from-cyan-400/30 to-transparent clip-triangle pointer-events-none blur-xs" />

                {/* Bus vehicle mini-badge */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 text-white shadow-lg shadow-cyan-500/20 border border-cyan-500/40">
                  <img
                    src="/cu-bus-logo.png"
                    alt="CU Bus"
                    className="w-4 h-4 object-contain"
                  />
                  <span className="font-mono text-[10px] font-bold tracking-tight text-cyan-200">
                    PB-65
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transit Corridors micro-ticker */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 mt-1">
            <span>R-01 CHD</span>
            <span>·</span>
            <span>R-02 PKL</span>
            <span>·</span>
            <span>R-03 MOH</span>
            <span>·</span>
            <span>R-04 KRP</span>
            <span>·</span>
            <span>R-05 RPR</span>
          </div>
        </div>
      </div>

      {/* Bottom Loading Indicator & Status */}
      <footer className="relative z-10 w-full max-w-md px-6 pb-8 sm:pb-12 flex flex-col items-center">
        {/* Progress Bar Container */}
        <div className="w-full mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="truncate">{getStatusText(progress)}</span>
            </span>
            <span className="text-blue-400 font-bold ml-2 shrink-0">{progress}%</span>
          </div>

          {/* Modern Slim Glowing Progress Track */}
          <div className="relative h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
            {/* Animated Fill Bar */}
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 rounded-full transition-all duration-100 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer light sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Footer Meta: Campus Dispatch & Version */}
        <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] text-slate-400 font-mono">
          <span>CU Fleet Management v2.4</span>
          <span>Fast GPS Refresh: 8s</span>
        </div>
      </footer>
    </div>
  );
};
