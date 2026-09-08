'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../context/OfflineContext';
import { 
  Leaf, 
  Wifi, 
  WifiOff, 
  Languages, 
  UserCheck, 
  TrendingUp, 
  CloudRain, 
  Sprout,
  MapPin, 
  BookOpen, 
  Layers,
  RefreshCw,
  Bug
  , Menu
  , X, Bell, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AppNotification, loadNotifications, markAllNotificationsRead, markNotificationRead, syncRiskNotifications } from '../utils/notifications';
import { loadIoTDevices } from '../utils/iotDevices';
import { dbService } from '../utils/supabase';

interface HeaderProps {
  role: 'farmer' | 'officer';
  setRole?: (role: 'farmer' | 'officer') => void;
}

export const Header: React.FC<HeaderProps> = ({ role }) => {
  const { language, setLanguage, t } = useLanguage();
  const { isOnline, syncQueueLength, triggerSync } = useOffline();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const audience = role === 'farmer' ? 'farmer' : 'officer';
    const refresh = async () => {
      if (audience === 'officer') syncRiskNotifications(loadIoTDevices(), await dbService.getValidationRequests());
      else syncRiskNotifications(loadIoTDevices());
      setNotifications(loadNotifications(audience));
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener('storage', refresh);
    window.addEventListener('krishirakshak-notifications-updated', refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('krishirakshak-notifications-updated', refresh); window.clearTimeout(timer); window.clearInterval(interval); };
  }, [role]);

  const unreadCount = notifications.filter(notification => !notification.read).length;
  const localizedNotificationTitle = (title: string) => {
    if (title === 'High pest activity detected') return t('highPestActivity');
    if (title === 'Environmental risk alert') return t('environmentalRiskAlert');
    if (title === 'High-risk outbreak signal') return t('highRiskOutbreak');
    if (title === 'Expert validation required') return t('expertValidationRequired');
    return title;
  };

  // Handler for manual sync click
  const handleSync = async () => {
    if (isOnline) {
      await triggerSync();
    }
  };

  // Farmer tabs: Dashboard, Detect, Surveillance, Forecasting, IPM
  // Officer tabs: Dashboard, Surveillance & Trends, Map, IPM
  const farmerTabs = [
    { name: t('navDashboard'), path: '/dashboard/farmer', icon: TrendingUp },
    { name: t('navDetect'), path: '/detect', icon: Leaf },
    { name: t('navSurveillance'), path: '/surveillance', icon: Bug },
    { name: t('navForecasting'), path: '/forecasting', icon: CloudRain },
    { name: t('navEnvironmentalRisk'), path: '/environmental-risk', icon: Sprout },
    { name: t('navIPM'), path: '/ipm', icon: BookOpen },
  ];

  const officerTabs = [
    { name: t('navDashboard'), path: '/dashboard/officer', icon: Layers },
    { name: t('navSurveillance'), path: '/surveillance?view=officer', icon: Bug },
    { name: t('navMap'), path: '/map', icon: MapPin },
    { name: t('navIPM'), path: '/ipm', icon: BookOpen },
  ];

  const activeTabs = role === 'farmer' ? farmerTabs : officerTabs;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center gap-3 py-2">
          
          {/* Logo */}
          <div className="flex min-w-[170px] shrink-0 cursor-pointer items-center gap-2" onClick={() => router.push('/')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/95 p-0.5 shadow-lg shadow-green-500/20 ring-1 ring-white/20">
              <img src="/logo-shield.png" alt="KrishiRakshak AI Logo" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 whitespace-nowrap text-[17px] font-bold leading-tight tracking-tight text-white">
                {t('title')}
              </h1>
              <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-green-400">
                {role === 'farmer' ? t('farmerPortal') : t('officerPortal')}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden min-w-0 items-center justify-around gap-2 overflow-x-auto min-[900px]:flex min-[900px]:basis-[60%] min-[900px]:grow-0 min-[1201px]:basis-auto min-[1201px]:grow min-[1201px]:justify-center min-[1201px]:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path || tab.path === '/dashboard/officer' && pathname.startsWith('/dashboard/officer');
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                    isActive 
                      ? 'bg-green-950/50 text-green-400 border border-green-800/30' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5 min-[1201px]:h-4 min-[1201px]:w-4" />
                  <span className="hidden min-[1201px]:inline">{tab.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Controls: Language, Role Switcher, Network Status */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button onClick={() => setNotificationsOpen(open => !open)} aria-label="Notifications" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notificationsOpen && <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2"><span className="text-xs font-bold text-white">{t('notifications')}</span>{unreadCount > 0 && <button onClick={() => { markAllNotificationsRead(role); setNotifications(loadNotifications(role)); }} className="text-[10px] font-bold text-sky-400">{t('markAllRead')}</button>}</div>
                {notifications.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">{t('noNotifications')}</p> : <div className="max-h-80 space-y-2 overflow-y-auto">{notifications.slice(0, 8).map(notification => <Link key={notification.id} href={notification.href} onClick={() => { markNotificationRead(notification.id); setNotificationsOpen(false); }} className={`block rounded-lg border p-3 ${notification.read ? 'border-slate-800 bg-slate-950/40' : 'border-amber-800/50 bg-amber-950/20'}`}><div className="flex gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${notification.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} /><div><p className="text-xs font-bold text-slate-100">{localizedNotificationTitle(notification.title)}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{notification.message}</p><p className="mt-1 text-[10px] text-slate-600">{new Date(notification.createdAt).toLocaleString()}</p></div></div></Link>)}</div>}
              </div>}
            </div>
            
            {/* Sync trigger if queue has items */}
            {syncQueueLength > 0 && (
              <button 
                onClick={handleSync}
                disabled={!isOnline}
                title={isOnline ? "Sync pending offline data" : "Offline - Sync queued"}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold animate-pulse transition-all ${
                  isOnline 
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${isOnline ? 'animate-spin' : ''}`} />
                <span className="hidden min-[1201px]:inline">{syncQueueLength} Queue</span>
              </button>
            )}

            {/* Network Status Badge */}
            <div 
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                isOnline 
                  ? 'bg-green-950/30 text-green-400 border-green-800/30' 
                  : 'bg-rose-950/30 text-rose-400 border-rose-800/30'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 animate-pulse" />
                  <span className="hidden min-[1201px]:inline">{t('online')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden min-[1201px]:inline">{t('offline')}</span>
                </>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative group">
              <button className="flex h-9 items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
                <Languages className="h-4 w-4" />
                <span className="hidden uppercase text-xs font-semibold min-[1201px]:inline">{language}</span>
              </button>
              <div className="absolute right-0 mt-1 w-36 max-h-64 overflow-y-auto origin-top-right rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full rounded-md px-2 py-1 text-left text-xs font-semibold hover:bg-slate-800 hover:text-white ${language === 'en' ? 'text-green-400' : 'text-slate-400'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('hi')}
                  className={`w-full rounded-md px-2 py-1 text-left text-xs font-semibold hover:bg-slate-800 hover:text-white ${language === 'hi' ? 'text-green-400' : 'text-slate-400'}`}
                >
                  हिन्दी (Hindi)
                </button>
                <button
                  onClick={() => setLanguage('bn')}
                  className={`w-full rounded-md px-2 py-1 text-left text-xs font-semibold hover:bg-slate-800 hover:text-white ${language === 'bn' ? 'text-green-400' : 'text-slate-400'}`}
                >
                  বাংলা (Bengali)
                </button>
              </div>
            </div>

            <button onClick={() => signOut().then(() => router.replace('/login'))} title={t('signOut')} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:border-rose-500/50 hover:text-rose-300">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden min-[1201px]:inline">{t('signOut')}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(open => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white min-[900px]:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Compact mobile navigation */}
      {mobileMenuOpen && <div className="hidden max-[899px]:block border-t border-slate-800/80 bg-slate-950/95 p-3 shadow-xl">
        <nav className="grid gap-1">
          {activeTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;
            return <Link key={tab.path} href={tab.path} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${isActive ? 'bg-green-950/50 text-green-400' : 'text-slate-300 hover:bg-slate-900'}`}><Icon className="h-4 w-4" />{tab.name}</Link>;
          })}
        </nav>
      </div>}

      <div className="hidden">
        {activeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 rounded-md py-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
