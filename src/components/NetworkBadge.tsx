'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cpu, Cloud, Layers } from 'lucide-react';

interface NetworkBadgeProps {
  executionMode?: 'OFFLINE_FAST' | 'OFFLINE_FALLBACK' | 'ONLINE_HYBRID' | 'UNSERTAIN_DISAGREEMENT' | null;
}

export function NetworkBadge({ executionMode }: NetworkBadgeProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs font-bold shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <WifiOff className="h-3.5 w-3.5" />
        <span>🔴 OFFLINE — Running Local Edge AI</span>
      </div>
    );
  }

  if (executionMode === 'OFFLINE_FAST') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-800/60 bg-amber-950/40 text-amber-300 text-xs font-bold shadow-sm">
        <Cpu className="h-3.5 w-3.5 text-amber-400" />
        <span>🟡 LIMITED CONNECTION — Local Edge AI (Conf ≥ 85%)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-bold shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Cloud className="h-3.5 w-3.5 text-emerald-400" />
      <span>🟢 ONLINE — Hybrid AI Available (Cloud + ONNX)</span>
    </div>
  );
}
