'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('krishirakshak_role');
    if (role === 'farmer') {
      router.replace('/dashboard/farmer');
    } else if (role === 'officer') {
      router.replace('/dashboard/officer');
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">Loading Portal...</p>
      </div>
    </div>
  );
}
