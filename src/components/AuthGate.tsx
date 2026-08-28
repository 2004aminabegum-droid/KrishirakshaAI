'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const publicRoute = pathname === '/' || pathname === '/login';
  const officerRoute = pathname === '/dashboard/officer' || pathname.startsWith('/map');
  const farmerRoute = pathname === '/dashboard/farmer' || pathname.startsWith('/detect') || pathname.startsWith('/environmental-risk') || pathname.startsWith('/forecasting');

  useEffect(() => {
    if (!loading && !user && !publicRoute) router.replace('/login');
    if (!loading && user && role === 'farmer' && officerRoute) router.replace('/dashboard/farmer');
    if (!loading && user && role === 'officer' && farmerRoute) router.replace('/dashboard/officer');
  }, [loading, user, role, publicRoute, officerRoute, farmerRoute, router]);

  if (!publicRoute && (loading || !user)) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Checking secure session...</div>;
  }

  return <>{children}</>;
}
