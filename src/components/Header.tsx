import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Pulse, Clock, Stack, ShieldCheck } from '@phosphor-icons/react';

export default function Header() {
  const [time, setTime] = useState<string>('');
  const [fps, setFps] = useState<number>(60);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Digital clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(undefined, { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Frame rate performance meter
  useEffect(() => {
    let animationFrameId: number;
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) {
        setFps(Math.min(60, Math.round((frameCountRef.current * 1000) / elapsed)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Heading */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-md shadow-zinc-900/10">
            <Stack className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-900">
              Workspace Test Sandbox
            </h1>
            <p className="text-xs text-zinc-500 font-sans">
              Verify reactive performance, animation physics, and typography bindings.
            </p>
          </div>
        </div>

        {/* Diagnostic Metrics (Literal, objective and functional) */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Live FPS */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-600">
            <Pulse className={`w-3.5 h-3.5 ${fps >= 55 ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
            <span>FPS:</span>
            <span className="font-semibold text-zinc-900">{fps}</span>
          </div>

          {/* Local Session Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-600">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Clock:</span>
            <span className="font-semibold text-zinc-900">{time || '--:--:--'}</span>
          </div>

          {/* Setup Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tailwind v4:</span>
            <span className="font-semibold text-emerald-800">Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
