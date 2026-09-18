'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Languages, 
  LogOut,
  User,
  LayoutDashboard,
  ChevronDown,
  Sprout,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Bug,
  CloudRain,
  BookOpen,
  UserCheck,
  Layers,
  MapPin,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../utils/profileService';

interface HeaderProps {
  role?: 'farmer' | 'officer';
  setRole?: (role: 'farmer' | 'officer') => void;
}

export const Header: React.FC<HeaderProps> = ({ role }) => {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, role: authRole } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveRole = authRole || role || 'farmer';

  // Retrieve latest profile info (name, avatar)
  const profileData = effectiveRole === 'officer'
    ? profileService.getOfficerProfile(user?.email, user?.user_metadata?.full_name)
    : profileService.getFarmerProfile(user?.email, user?.user_metadata?.full_name);

  const displayName = profileData.fullName || user?.user_metadata?.full_name || (effectiveRole === 'officer' ? 'Agriculture Officer' : 'Kisan Member');
  const displayEmail = profileData.email || user?.email || (effectiveRole === 'officer' ? 'admin@krishirakshak.gov.in' : 'farmer@krishirakshak.in');
  const avatarUrl = profileData.avatarUrl;

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    router.replace('/login');
  };

  const handleLanguageChange = (lang: 'en' | 'hi' | 'bn') => {
    setLanguage(lang);
  };

  // Farmer tabs with multi-line formatted labels to prevent navbar overflow
  const farmerTabs = [
    {
      label: language === 'en' ? 'Farmer\nDashboard' : (language === 'hi' ? 'किसान\nडैशबोर्ड' : 'কৃষক\nড্যাশবোর্ড'),
      path: '/dashboard/farmer',
      icon: TrendingUp
    },
    {
      label: language === 'en' ? 'Scan\nDisease & Pest' : (language === 'hi' ? 'रोग व कीट\nस्कैन' : 'রোগ ও বালাই\nস্ক্যান'),
      path: '/detect',
      icon: Leaf
    },
    {
      label: language === 'en' ? 'Pest\nSurveillance' : (language === 'hi' ? 'कीट\nनिगरानी' : 'বালাই\nনজরদারি'),
      path: '/surveillance',
      icon: Bug
    },
    {
      label: language === 'en' ? 'Risk\nForecast' : (language === 'hi' ? 'जोखिम\nपूर्वानुमान' : 'ঝুঁকি\nপূর্বাভাস'),
      path: '/forecasting',
      icon: CloudRain
    },
    {
      label: language === 'en' ? 'Environmental\nRisk' : (language === 'hi' ? 'पर्यावरणीय\nजोखिम' : 'পরিবেশগত\nঝুঁকি'),
      path: '/environmental-risk',
      icon: Sprout
    },
    {
      label: language === 'en' ? 'IPM\nGuidelines' : (language === 'hi' ? 'IPM\nदिशानिर्देश' : 'IPM\nনির্দেশিকা'),
      path: '/ipm',
      icon: BookOpen
    },
    {
      label: language === 'en' ? 'My\nProfile' : (language === 'hi' ? 'मेरी\nप्रोफ़ाइल' : 'আমার\nপ্রোফাইল'),
      path: '/profile',
      icon: UserCheck
    }
  ];

  // Officer tabs with multi-line formatted labels
  const officerTabs = [
    {
      label: language === 'en' ? 'Officer\nDashboard' : (language === 'hi' ? 'अधिकारी\nडैशबोर्ड' : 'কর্মকর্তা\nড্যাশবোর্ড'),
      path: '/dashboard/officer',
      icon: Layers
    },
    {
      label: language === 'en' ? 'Pest\nSurveillance' : (language === 'hi' ? 'कीट\nनिगरानी' : 'বালাই\nনজরদারি'),
      path: '/surveillance?view=officer',
      icon: Bug
    },
    {
      label: language === 'en' ? 'Outbreak\nMap' : (language === 'hi' ? 'प्रकोप\nमानचित्र' : 'প্রকোপ\nমানচিত্র'),
      path: '/map',
      icon: MapPin
    },
    {
      label: language === 'en' ? 'IPM\nGuidelines' : (language === 'hi' ? 'IPM\nदिशानिर्देश' : 'IPM\nনির্দেশিকা'),
      path: '/ipm',
      icon: BookOpen
    },
    {
      label: language === 'en' ? 'Officer\nProfile' : (language === 'hi' ? 'अधिकारी\nप्रोफ़ाइल' : 'কর্মকর্তা\nপ্রোফাইল'),
      path: '/profile',
      icon: UserCheck
    }
  ];

  const activeTabs = effectiveRole === 'farmer' ? farmerTabs : officerTabs;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-16 items-center justify-between gap-2 py-1.5">
          
          {/* Brand Logo & Title (Navigates to Home / route) */}
          <Link 
            href="/"
            className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
            title="Go to Home"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 p-1 shadow-lg shadow-green-500/20 ring-1 ring-white/20">
              <img src="/logo-shield.png" alt="KrishiRakshak AI" className="h-7 w-7 object-contain drop-shadow" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1 text-[16px] font-black tracking-tight text-white leading-tight">
                {t('title')}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-400 leading-tight">
                {effectiveRole === 'farmer' ? t('farmerPortal') : t('officerPortal')}
              </p>
            </div>
          </Link>

          {/* Tablet & Desktop Top Navigation Links - Logo / Icon Only */}
          <nav className="hidden md:flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-0 max-w-[750px] mx-2">
            {activeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path || (tab.path.startsWith('/dashboard') && pathname.startsWith(tab.path));
              const cleanTitle = tab.label.replace('\n', ' ');
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  title={cleanTitle}
                  aria-label={cleanTitle}
                  className={`group relative flex items-center justify-center rounded-xl p-2 sm:p-2.5 transition-all ${
                    isActive 
                      ? 'bg-green-950/60 text-green-400 border border-green-800/50 shadow-sm shadow-green-500/10' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent hover:border-slate-800'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-green-400 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'}`} />
                  
                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md border border-slate-800">
                    {cleanTitle}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Controls: Profile Menu + Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Profile Dropdown Menu in Navbar */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-xs font-bold transition-all ${
                  profileMenuOpen
                    ? 'border-green-500/60 bg-green-950/40 text-green-300 ring-2 ring-green-500/20 shadow-lg shadow-green-500/10'
                    : 'border-slate-800 bg-slate-900/90 text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-7 w-7 rounded-xl object-cover ring-1 ring-green-500/40"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-green-600 to-emerald-500 text-[11px] font-black text-slate-950">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <div className="hidden text-left xl:block">
                  <p className="max-w-[100px] truncate text-xs font-bold text-white leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[9px] font-semibold text-green-400 capitalize">
                    {effectiveRole === 'officer' ? 'Officer' : 'Farmer'}
                  </p>
                </div>

                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180 text-green-400' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-3xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 animate-fadeIn z-50 space-y-4">
                  
                  {/* User Identity Info Header */}
                  <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3.5">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-green-500/30 shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-500 text-sm font-black text-slate-950 shadow-md">
                        {displayName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold text-white">{displayName}</h3>
                        {effectiveRole === 'officer' ? (
                          <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                        ) : (
                          <Sprout className="h-4 w-4 text-green-400 shrink-0" />
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-400 mt-0.5">{displayEmail}</p>
                      <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        effectiveRole === 'officer'
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                          : 'bg-green-950/60 text-green-300 border border-green-800/40'
                      }`}>
                        {effectiveRole === 'officer' ? 'Official Authority' : 'Registered Farmer'}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links inside Profile Menu */}
                  <div className="space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        pathname === '/profile'
                          ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <User className="h-4 w-4 shrink-0 text-green-400" />
                      <span>{t('navProfile')}</span>
                    </Link>

                    <Link
                      href={effectiveRole === 'officer' ? '/dashboard/officer' : '/dashboard/farmer'}
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        pathname.startsWith('/dashboard')
                          ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-green-400" />
                      <span>{effectiveRole === 'officer' ? t('officerPortal') : t('farmerPortal')}</span>
                    </Link>
                  </div>

                  {/* Language Selection Option */}
                  <div className="border-t border-slate-800/80 pt-3 space-y-2">
                    <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <Languages className="h-3.5 w-3.5 text-green-400" />
                      <span>{t('language')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
                      {[
                        { code: 'en' as const, label: 'English', native: 'EN' },
                        { code: 'hi' as const, label: 'हिन्दी', native: 'HI' },
                        { code: 'bn' as const, label: 'বাংলা', native: 'BN' }
                      ].map(lang => {
                        const isSelected = language === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                                : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                            }`}
                          >
                            <span className="text-xs">{lang.label}</span>
                            <span className="text-[9px] opacity-75 font-mono">{lang.native}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logout Option */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50 hover:text-white hover:border-rose-700 transition-all shadow-sm"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('signOut')}</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>

    {/* 📱 Mobile Fixed Bottom Navigation Bar (< md) - Logo/Icon Only like 2nd image */}
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-1.5 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {activeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path || (tab.path.startsWith('/dashboard') && pathname.startsWith(tab.path));
          const cleanTitle = tab.label.replace('\n', ' ');
          return (
            <Link
              key={tab.path}
              href={tab.path}
              title={cleanTitle}
              aria-label={cleanTitle}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-green-950/60 text-green-400 scale-105 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-green-400 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'}`} />
              {isActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-green-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  </>
  );
};
