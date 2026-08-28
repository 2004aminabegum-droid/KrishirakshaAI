'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { 
  Leaf, 
  User, 
  ShieldAlert, 
  Languages, 
  ArrowRight, 
  Scan, 
  Bug, 
  CloudSun, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  BookOpen, 
  Database,
  Sparkles,
  Activity,
  Cpu,
  Globe,
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Zap,
  Info,
  Menu
} from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  category: 'AI Diagnostic' | 'IoT Surveillance' | 'Meteorology' | 'Geospatial' | 'Agri-Market' | 'Expert Panel' | 'Agronomy' | 'Architecture';
  icon: React.ElementType;
  color: string;
  bgGlow: string;
  borderColor: string;
  route: string;
  roleRequired?: 'farmer' | 'officer';
  shortDesc: string;
  fullDesc: string;
  keyCapabilities: string[];
  techStack: string[];
}

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const selectRoleAndNavigate = (role: 'farmer' | 'officer', targetRoute?: string) => {
    const destination = targetRoute || (role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer');
    router.push(`/login?role=${role}&next=${encodeURIComponent(destination)}`);
  };

  const features: FeatureItem[] = [
    {
      id: 'detect',
      title: 'AI Crop Health & Disease Scanner',
      category: 'AI Diagnostic',
      icon: Scan,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/20 to-green-900/10',
      borderColor: 'hover:border-emerald-500/40',
      route: '/detect',
      roleRequired: 'farmer',
      shortDesc: 'Instant machine learning leaf image analysis for 50+ crop diseases & pests with IoT camera integration.',
      fullDesc: 'The Crop Health Scanner utilizes high-resolution computer vision models to diagnose crop pathogens (blights, leaf rusts, mildews, and pest infestations) within seconds. Works both online and offline via local edge processing.',
      keyCapabilities: [
        'High-confidence disease & pathogen identification',
        'Direct IoT trap camera feed image pulling',
        'Automatic Integrated Pest Management (IPM) remedies',
        '1-Click validation request escalation to local Agriculture Officers'
      ],
      techStack: ['TensorFlow Edge ML', 'Canvas API', 'IndexedDB', 'Supabase Realtime']
    },
    {
      id: 'surveillance',
      title: 'Autonomous Smart Pest Surveillance',
      category: 'IoT Surveillance',
      icon: Bug,
      color: 'text-amber-400',
      bgGlow: 'from-amber-500/20 to-yellow-900/10',
      borderColor: 'hover:border-amber-500/40',
      route: '/surveillance',
      roleRequired: 'farmer',
      shortDesc: 'Real-time AI optical trap network with automated insect counters, IR night vision, and species detection.',
      fullDesc: 'Connected smart trap hardware provides automated pest monitoring around the clock. Optical sensors count insect catches, classify species (Bollworms, Aphids, Planthoppers), and issue Economic Threshold Level (ETL) warnings.',
      keyCapabilities: [
        'Automated insect optical counter & species classifier',
        'Economic Threshold Level (ETL) early warning alerts',
        '7-Day population curve & growth rate forecasting',
        'Remote pheromone lure refresh deployment trigger'
      ],
      techStack: ['IoT Sensor Telemetry', 'IR Night Vision Feed', 'Time-Series Forecast', 'Edge Trap Trigger']
    },
    {
      id: 'forecasting',
      title: 'Weather-Based Disease Risk Forecast',
      category: 'Meteorology',
      icon: CloudSun,
      color: 'text-sky-400',
      bgGlow: 'from-sky-500/20 to-blue-900/10',
      borderColor: 'hover:border-sky-500/40',
      route: '/forecasting',
      roleRequired: 'farmer',
      shortDesc: '5-Day predictive outbreak grid combining micro-climate field sensors with regional weather telemetry.',
      fullDesc: 'Combines canopy temperature, soil moisture, relative humidity, and regional weather forecasts to compute pathogen risk indices for Fungal Blight, Powdery Mildew, and Rust outbreaks before symptoms appear visually.',
      keyCapabilities: [
        '5-Day micro-climate outbreak probability matrix',
        'Specific fungal, bacterial, and humidity risk indices',
        'Micro-climate telemetry correlation (Temp, Moisture, Humidity)',
        'Proactive preventative agricultural treatment advisories'
      ],
      techStack: ['Open-Meteo API', 'Micro-climate Telemetry', 'Risk Index Calculator', 'Chart.js Visualizations']
    },
    {
      id: 'map',
      title: 'Geospatial Outbreak & Mesh Hotspot Map',
      category: 'Geospatial',
      icon: MapPin,
      color: 'text-red-400',
      bgGlow: 'from-red-500/20 to-rose-900/10',
      borderColor: 'hover:border-red-500/40',
      route: '/map',
      roleRequired: 'officer',
      shortDesc: 'Interactive spatial visualization of validated crop diseases, pest clusters, and officer inspection queues.',
      fullDesc: 'Provides agricultural officers and regional administrators with spatial intelligence on emerging crop threats. Combines anonymized farmer field scan nodes, optical trap spikes, and cluster corridor vector lines.',
      keyCapabilities: [
        'Interactive map filtering by crop type & severity levels',
        'Anonymized community farmer mesh stream',
        'Officer field dispatch & inspection queue tracking',
        'Spatiotemporal pest corridor vector rendering'
      ],
      techStack: ['Leaflet GIS', 'Spatial Clustering Engine', 'Live Coordinates Stream', 'Officer Queue Manager']
    },
    {
      id: 'mandi',
      title: 'Live Agmarknet Mandi Prices & Market Trends',
      category: 'Agri-Market',
      icon: TrendingUp,
      color: 'text-green-400',
      bgGlow: 'from-green-500/20 to-emerald-900/10',
      borderColor: 'hover:border-green-500/40',
      route: '/dashboard/farmer',
      roleRequired: 'farmer',
      shortDesc: 'Up-to-the-minute crop market prices across regional mandis with 30-day historical trend graphs.',
      fullDesc: 'Helps farmers make informed selling decisions by providing real-time commodity prices across local agricultural mandis (Wheat, Rice, Potato, Tomato, Cotton), along with min/max/average 30-day historical trends.',
      keyCapabilities: [
        'Real-time Agmarknet commodity price tracking (INR/Quintal)',
        '30-Day market price movement trends & analytics',
        'Multi-crop comparison (Wheat, Rice, Potato, Tomato, Cotton)',
        'Offline cached price data for remote mandi visits'
      ],
      techStack: ['Agmarknet API', 'Local Storage Cache', 'Historical Trend Charting', 'Multi-currency format']
    },
    {
      id: 'validation',
      title: 'Agriculture Officer Validation Portal',
      category: 'Expert Panel',
      icon: ShieldCheck,
      color: 'text-violet-400',
      bgGlow: 'from-violet-500/20 to-purple-900/10',
      borderColor: 'hover:border-violet-500/40',
      route: '/dashboard/officer',
      roleRequired: 'officer',
      shortDesc: 'Human-in-the-loop expert review workflow for low-confidence ML diagnoses and field escalations.',
      fullDesc: 'Bridges artificial intelligence with human agricultural expertise. Scans flagged with low confidence (<75%) are automatically routed to government/extension officers for official verification, custom guidance, and override.',
      keyCapabilities: [
        'Pending validation queue with farmer metadata & leaf images',
        'Official diagnostic verdict submission (Confirm, Override, Flag)',
        'Actionable treatment guidance & remedy publishing',
        'Real-time notification back to the farmer dashboard'
      ],
      techStack: ['Supabase DB Queue', 'Human-in-the-Loop Workflow', 'Expert Audit Log', 'Realtime Sync']
    },
    {
      id: 'ipm',
      title: 'Integrated Pest Management (IPM) Hub',
      category: 'Agronomy',
      icon: BookOpen,
      color: 'text-teal-400',
      bgGlow: 'from-teal-500/20 to-cyan-900/10',
      borderColor: 'hover:border-teal-500/40',
      route: '/ipm',
      roleRequired: 'farmer',
      shortDesc: 'Multi-tiered ecological crop protection guidelines balancing cultural, biological, and chemical methods.',
      fullDesc: 'Comprehensive agronomy database offering sustainable crop defense strategies. Minimizes unnecessary chemical usage by promoting eco-friendly biological controls and preventative cultural crop practices first.',
      keyCapabilities: [
        'Crop-specific IPM guides for major regional crops',
        '3-Tier intervention framework: Cultural, Biological, Chemical',
        'Eco-friendly biological predator & trap crop recommendations',
        'Multilingual agronomy advisory search & filter'
      ],
      techStack: ['Agronomy Knowledge Base', 'Multilingual Dictionary', 'Offline Static Pre-render']
    },
    {
      id: 'offline',
      title: 'Local-First Resilience & Supabase Sync',
      category: 'Architecture',
      icon: Database,
      color: 'text-blue-400',
      bgGlow: 'from-blue-500/20 to-indigo-900/10',
      borderColor: 'hover:border-blue-500/40',
      route: '/dashboard/farmer',
      roleRequired: 'farmer',
      shortDesc: 'Designed for remote agricultural zones with zero connectivity; stores data locally and syncs automatically when online.',
      fullDesc: 'Built local-first to ensure farmers in low-bandwidth or zero-internet rural regions never lose access to health checks, mandi prices, or scan records. Automatically queues offline scans in IndexedDB and syncs when reconnected.',
      keyCapabilities: [
        'IndexedDB local offline storage engine',
        'Background automatic synchronization with Supabase DB',
        'Zero data loss guarantee in connectivity dark spots',
        'Visual online/offline status bar & sync status feedback'
      ],
      techStack: ['IndexedDB (idb)', 'Service Worker PWA', 'Supabase Cloud Sync', 'Network Status Listener']
    }
  ];

  const categories = ['All', 'AI Diagnostic', 'IoT Surveillance', 'Meteorology', 'Geospatial', 'Agri-Market', 'Expert Panel', 'Agronomy', 'Architecture'];

  const localizedFeatureText: Record<string, { title: string; shortDesc: string }> = language === 'hi' ? {
    detect: { title: 'AI फसल स्वास्थ्य और रोग स्कैनर', shortDesc: '50 से अधिक फसल रोगों और कीटों के लिए तुरंत मशीन लर्निंग पत्ती विश्लेषण।' },
    surveillance: { title: 'स्वायत्त स्मार्ट कीट निगरानी', shortDesc: 'स्वचालित कीट गणना, IR नाइट विज़न और प्रजाति पहचान वाला रियल-टाइम AI ट्रैप नेटवर्क।' },
    forecasting: { title: 'मौसम आधारित रोग जोखिम पूर्वानुमान', shortDesc: 'माइक्रो-क्लाइमेट सेंसर और क्षेत्रीय मौसम डेटा से 5-दिवसीय प्रकोप पूर्वानुमान।' }
  } : language === 'bn' ? {
    detect: { title: 'AI ফসল স্বাস্থ্য ও রোগ স্ক্যানার', shortDesc: '৫০টিরও বেশি ফসলের রোগ ও কীটের জন্য তাৎক্ষণিক মেশিন লার্নিং পাতার বিশ্লেষণ।' },
    surveillance: { title: 'স্বয়ংক্রিয় স্মার্ট কীট পর্যবেক্ষণ', shortDesc: 'স্বয়ংক্রিয় কীট গণনা, IR নাইট ভিশন ও প্রজাতি শনাক্তকরণসহ রিয়েল-টাইম AI ট্র্যাপ নেটওয়ার্ক।' },
    forecasting: { title: 'আবহাওয়া-ভিত্তিক রোগ ঝুঁকি পূর্বাভাস', shortDesc: 'মাইক্রো-ক্লাইমেট সেন্সর ও আঞ্চলিক আবহাওয়া ডেটা দিয়ে ৫ দিনের প্রকোপ পূর্বাভাস।' }
  } : {};
  const filteredFeatures = activeCategory === 'All'
    ? features 
    : features.filter(f => f.category === activeCategory);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-green-500 selection:text-slate-950 font-sans overflow-x-hidden">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-green-900/15 blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-emerald-950/25 blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[45%] left-[55%] w-[35%] h-[35%] rounded-full bg-teal-800/10 blur-[120px] pointer-events-none z-0" />

      {/* Glassmorphic Sticky Header */}
      <header className={`sticky top-0 z-[60] w-full border-b transition-all duration-300 ${scrolled ? 'bg-slate-950/95 backdrop-blur-md border-slate-800/80 shadow-2xl py-3' : 'bg-slate-950/90 backdrop-blur-md border-slate-800/50 py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-lg shadow-green-500/25 ring-1 ring-white/20">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                {t('title')}
                <span className="text-[10px] font-extrabold bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">v2.0 AI</span>
              </h1>
              <p className="text-[11px] text-green-400 font-bold tracking-wider uppercase">Crop Health & Yield Sentinel</p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <nav className="hidden min-[601px]:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#portals" className="hover:text-green-400 transition-colors">Portals</a>
            <a href="#features" className="hover:text-green-400 transition-colors">All Features</a>
            <a href="#workflow" className="hover:text-green-400 transition-colors">How It Works</a>
            <a href="#stats" className="hover:text-green-400 transition-colors">Performance</a>
          </nav>

          {/* Language Switcher & CTA */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-slate-800 bg-slate-900/80 backdrop-blur-md rounded-xl p-1 shadow-inner">
              <Languages className="h-4 w-4 text-slate-400 ml-2 mr-1" />
              {(['en', 'hi', 'bn'] as const).map((langKey) => (
                <button
                  key={langKey}
                  onClick={() => setLanguage(langKey)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all duration-200 ${
                    language === langKey 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {langKey === 'en' ? 'EN' : langKey === 'hi' ? 'हिंदी' : 'বাংলা'}
                </button>
              ))}
            </div>

            <button 
              onClick={() => selectRoleAndNavigate('farmer')}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t('go')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(open => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="hidden max-[600px]:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
        {mobileMenuOpen && <nav className="hidden max-[600px]:grid gap-1 border-t border-slate-800/80 px-4 pb-3 pt-3 text-sm font-semibold text-slate-300">
          <a href="#portals" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-900 hover:text-green-400">Portals</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-900 hover:text-green-400">All Features</a>
          <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-900 hover:text-green-400">How It Works</a>
          <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-900 hover:text-green-400">Performance</a>
          <button onClick={() => { setMobileMenuOpen(false); selectRoleAndNavigate('farmer'); }} className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-3 text-white">{t('go')}<ArrowRight className="h-4 w-4" /></button>
        </nav>}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-8 pb-16 px-4 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-green-950/70 px-4 py-1.5 text-xs font-semibold text-green-400 border border-green-500/30 mb-8 shadow-inner backdrop-blur-md animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-green-400" />
          <span>{t('homeTagline')}</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-5xl leading-[1.1] mb-6">
          {t('homeHeroHeading')} <br />
          <span className="text-gradient-green">Anywhere, Offline or Online</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-slate-300 text-base sm:text-xl max-w-3xl leading-relaxed mb-10 font-normal">
          {t('homeHeroSubheading')}
        </p>

        {/* Live Telemetry Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 max-w-4xl">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            <span>IndexedDB Edge ML (Offline-First)</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>98.4% Classifier Accuracy</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>Real-time Agmarknet & IoT Mesh</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300">
            <Globe className="h-3.5 w-3.5 text-teal-400" />
            <span>Multilingual (EN, Hindi, Bengali)</span>
          </div>
        </div>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
          <a
            href="#portals"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-xl shadow-green-600/30 transition-all hover:scale-[1.02]"
          >
            <span>{t('selectRole')}</span>
            <ChevronRight className="h-4 w-4" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm px-7 py-3.5 rounded-2xl transition-all hover:border-slate-500"
          >
            <span>{t('exploreFeatures')}</span>
            <Info className="h-4 w-4 text-green-400" />
          </a>
        </div>

      </section>

      {/* Section 1: Choose Your Portal Cards */}
      <section id="portals" className="relative z-10 py-16 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            {t('selectPortalHeading')}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {t('selectPortalSubheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Farmer Portal Card */}
          <div 
            onClick={() => selectRoleAndNavigate('farmer')}
            className="group cursor-pointer glass-card p-8 flex flex-col justify-between border border-slate-800/80 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/30 border border-green-500/30 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                  <User className="h-8 w-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-green-400 bg-green-950/60 border border-green-800/50 px-3 py-1 rounded-full">
                  Field Operations Portal
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3 group-hover:text-green-400 transition-colors">
                {t('farmerPortal')}
              </h3>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {t('roleFarmerDesc')}
              </p>

              {/* Included Tools Checklist */}
              <div className="space-y-2 mb-8 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span>Agmarknet Live Mandi Commodity Prices & Trends</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span>Edge ML Leaf Disease & Pest Health Scanner</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span>IoT Smart Field Station & Telemetry Monitor</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span>Weather Outbreak Risk Forecasts & Offline Queue</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
              <span className="text-xs font-extrabold text-green-400 uppercase tracking-wider group-hover:underline">
                {t('go')}
              </span>
              <div className="h-9 w-9 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center text-green-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Agriculture Officer Portal Card */}
          <div 
            onClick={() => selectRoleAndNavigate('officer')}
            className="group cursor-pointer glass-card p-8 flex flex-col justify-between border border-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-900/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
                  Regional Command Center
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3 group-hover:text-emerald-400 transition-colors">
                {t('officerPortal')}
              </h3>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {t('roleOfficerDesc')}
              </p>

              {/* Included Tools Checklist */}
              <div className="space-y-2 mb-8 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Geospatial Regional Outbreak & Mesh Hotspot Map</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Low-Confidence Scan Human-in-the-Loop Queue</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Official Diagnosis Verdict & Guidance Publishing</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Regional IPM Protocol Management & Field Dispatch</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider group-hover:underline">
                {t('go')}
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section 2: Comprehensive Feature Matrix */}
      <section id="features" className="relative z-10 py-16 px-4 max-w-7xl mx-auto w-full border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-extrabold tracking-widest text-green-400 uppercase bg-green-950/60 border border-green-800/50 px-3.5 py-1 rounded-full mb-3 inline-block">
            Complete Ecosystem
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            {t('allFeaturesHeading')}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {t('allFeaturesSubheading')}
          </p>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feat) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={feat.id}
                className={`glass-card p-6 flex flex-col justify-between border border-slate-800/90 ${feat.borderColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden`}
              >
                {/* Subtle Glow Background */}
                <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${feat.bgGlow} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`} />

                <div>
                  {/* Category Badge & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${feat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                      {feat.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                    {localizedFeatureText[feat.id]?.title ?? feat.title}
                  </h3>

                  <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    {localizedFeatureText[feat.id]?.shortDesc ?? feat.shortDesc}
                  </p>

                  {/* Capabilities Bullet List */}
                  <ul className="space-y-1.5 mb-6">
                    {feat.keyCapabilities.slice(0, 3).map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-normal">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 gap-2">
                  <button
                    onClick={() => setSelectedFeature(feat)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center"
                  >
                    {t('learnMore')}
                  </button>

                  <button
                    onClick={() => selectRoleAndNavigate(feat.roleRequired || 'farmer', feat.route)}
                    className="py-2 px-3 rounded-xl bg-green-600/20 hover:bg-green-600 border border-green-500/30 hover:border-green-500 text-xs font-bold text-green-400 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>{t('launchFeature')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* Section 3: How It Works Workflow */}
      <section id="workflow" className="relative z-10 py-16 px-4 max-w-7xl mx-auto w-full border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/50 px-3.5 py-1 rounded-full mb-3 inline-block">
            4-Step Collaborative Workflow
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            {t('howItWorksHeading')}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {t('howItWorksSubheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {/* Step 1 */}
          <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-green-500/40 transition-all">
            <div className="absolute -top-4 left-6 h-8 w-8 rounded-full bg-green-600 text-white font-black text-xs flex items-center justify-center ring-4 ring-slate-950 shadow-lg">
              01
            </div>
            <div className="pt-2">
              <div className="h-10 w-10 rounded-xl bg-green-950/60 border border-green-800/40 flex items-center justify-center text-green-400 mb-4">
                <Scan className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">1. Image & Telemetry Capture</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Farmer uploads a leaf photo via mobile browser or IoT smart trap automatically captures insect images and field climate sensor data.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-emerald-500/40 transition-all">
            <div className="absolute -top-4 left-6 h-8 w-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center ring-4 ring-slate-950 shadow-lg">
              02
            </div>
            <div className="pt-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">2. Edge ML & Risk Modeling</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Local edge ML engine classifies plant pathogen with accuracy score while weather forecasting models assess 5-day outbreak probabilities.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-teal-500/40 transition-all">
            <div className="absolute -top-4 left-6 h-8 w-8 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center ring-4 ring-slate-950 shadow-lg">
              03
            </div>
            <div className="pt-2">
              <div className="h-10 w-10 rounded-xl bg-teal-950/60 border border-teal-800/40 flex items-center justify-center text-teal-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">3. Officer Validation & Map Sync</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Low-confidence scans (&lt;75%) trigger officer review. Validated outbreaks populate geospatial community mesh hotspot maps.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-sky-500/40 transition-all">
            <div className="absolute -top-4 left-6 h-8 w-8 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center ring-4 ring-slate-950 shadow-lg">
              04
            </div>
            <div className="pt-2">
              <div className="h-10 w-10 rounded-xl bg-sky-950/60 border border-sky-800/40 flex items-center justify-center text-sky-400 mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">4. IPM Action & Yield Defense</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Farmer receives custom biological, cultural, or chemical remedy instructions and live mandi pricing to protect crop yields profitably.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Section 4: Performance & Platform Stats */}
      <section id="stats" className="relative z-10 py-16 px-4 max-w-7xl mx-auto w-full border-t border-slate-900">
        <div className="glass-card p-8 sm:p-12 border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              {t('statsHeading')}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Engineered specifically for Indian agricultural realities: offline connectivity, multi-crop diseases, and fast extension response.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-3xl sm:text-5xl font-black text-gradient-green mb-1">98.4%</div>
              <div className="text-xs font-bold text-slate-300">Classifier Accuracy</div>
              <p className="text-[10px] text-slate-500 mt-1">Tested across 50+ crop diseases</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-3xl sm:text-5xl font-black text-gradient-gold mb-1">&lt; 2s</div>
              <div className="text-xs font-bold text-slate-300">Scan Execution Speed</div>
              <p className="text-[10px] text-slate-500 mt-1">Edge ML in-browser processing</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-3xl sm:text-5xl font-black text-gradient-sky mb-1">100%</div>
              <div className="text-xs font-bold text-slate-300">Offline Functionality</div>
              <p className="text-[10px] text-slate-500 mt-1">IndexedDB storage & auto-sync</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-3xl sm:text-5xl font-black text-emerald-400 mb-1">3 Languages</div>
              <div className="text-xs font-bold text-slate-300">English, Hindi & Bengali</div>
              <p className="text-[10px] text-slate-500 mt-1">Localized crop agronomy & alerts</p>
            </div>

          </div>

        </div>
      </section>

      {/* Feature Deep-Dive Interactive Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card max-w-2xl w-full p-6 sm:p-8 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-center gap-4 mb-4 pr-8">
              <div className={`h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center ${selectedFeature.color} shrink-0 shadow-inner`}>
                <selectedFeature.icon className="h-7 w-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md">
                  {selectedFeature.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {selectedFeature.title}
                </h3>
              </div>
            </div>

            {/* Full Description */}
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              {selectedFeature.fullDesc}
            </p>

            {/* Key Capabilities Section */}
            <div className="mb-6">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-green-400 mb-3">
                Key Platform Capabilities
              </h4>
              <div className="space-y-2">
                {selectedFeature.keyCapabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack Pills */}
            <div className="mb-8">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Technical Stack & Architecture
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedFeature.techStack.map((tech, i) => (
                  <span key={i} className="text-[11px] font-semibold text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300"
              >
                {t('closeModal')}
              </button>
              <button
                onClick={() => {
                  const targetRole = selectedFeature.roleRequired || 'farmer';
                  const targetRoute = selectedFeature.route;
                  setSelectedFeature(null);
                  selectRoleAndNavigate(targetRole, targetRoute);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-600/20"
              >
                <span>{t('launchFeature')}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-10 border-t border-slate-900 z-10 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Leaf className="h-5 w-5 text-green-500" />
            <span className="font-bold text-white text-sm">KrishiRakshak AI</span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            Built local-first for Indian Agriculture Mandis, Smart IoT Fields, and Regional Extension Officers.
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-400 pt-2">
            <a href="#portals" className="hover:text-green-400 transition-colors">Portals</a>
            <a href="#features" className="hover:text-green-400 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-green-400 transition-colors">Workflow</a>
            <a href="#stats" className="hover:text-green-400 transition-colors">Stats</a>
          </div>
          <p className="text-[11px] text-slate-600 pt-4">
            &copy; {new Date().getFullYear()} KrishiRakshak AI. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
