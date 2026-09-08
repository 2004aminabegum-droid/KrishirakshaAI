'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const normalizePath = (p: string | null | undefined): string => {
  if (!p) return '/';
  const clean = p.split('?')[0].replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  const cleanPath = normalizePath(pathname);
  const isPublicRoute = cleanPath === '/' || cleanPath === '/login';
  const isOfficerRoute = cleanPath === '/dashboard/officer' || cleanPath.startsWith('/map');
  const isFarmerRoute = cleanPath === '/dashboard/farmer' || cleanPath.startsWith('/detect') || cleanPath.startsWith('/environmental-risk') || cleanPath.startsWith('/forecasting');

  // Liveness timeout to ensure user is never trapped forever
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace('/login');
    }
    if (!loading && user && role === 'farmer' && isOfficerRoute) {
      router.replace('/dashboard/farmer');
    }
    if (!loading && user && role === 'officer' && isFarmerRoute) {
      router.replace('/dashboard/officer');
    }
  }, [loading, user, role, isPublicRoute, isOfficerRoute, isFarmerRoute, router]);

  // Public routes (/ and /login) MUST NEVER be blocked by session check
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes while authenticating
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm font-semibold text-slate-300">Checking secure session...</p>
        {timedOut && !user && (
          <button
            onClick={() => router.replace('/login')}
            className="mt-2 rounded-xl bg-green-600 px-5 py-2 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
          >
            Go to Login
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
