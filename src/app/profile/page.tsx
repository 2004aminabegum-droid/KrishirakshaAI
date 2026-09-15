'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Header } from '../../components/Header';
import {
  profileService,
  FarmerProfileData,
  OfficerProfileData,
  FarmPlot
} from '../../utils/profileService';
import { localDB, ScanRecord } from '../../utils/db';
import { dbService, ValidationRequest, HotspotRecord } from '../../utils/supabase';
import { loadIoTDevices, IoTDevice } from '../../utils/iotDevices';
import { addNotification } from '../../utils/notifications';
import {
  User,
  ShieldCheck,
  Award,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Wifi,
  Sparkles,
  Download,
  Share2,
  Bell,
  Cpu,
  RefreshCw,
  Send,
  Building2,
  Layers,
  Leaf,
  Sprout,
  Activity,
  FileText,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  Database,
  Sliders,
  Check,
  X,
  Clock
} from 'lucide-react';

export default function ProfilePage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, role: authRole, signOut } = useAuth();
  const { isOnline } = useOffline();

  // Active viewing role (defaults to logged-in user role, but allows switching for demonstration/testing)
  const [activeRoleView, setActiveRoleView] = useState<'farmer' | 'officer'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const qRole = urlParams.get('role');
      if (qRole === 'officer' || qRole === 'farmer') return qRole;
    }
    return authRole === 'officer' ? 'officer' : 'farmer';
  });

  // Active Tab within Profile
  const [farmerActiveTab, setFarmerActiveTab] = useState<'info' | 'farms' | 'scans' | 'help' | 'storage'>('info');
  const [officerActiveTab, setOfficerActiveTab] = useState<'credentials' | 'advisory' | 'fleet' | 'diagnostics' | 'reports'>('credentials');

  // Profiles State
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfileData>(() =>
    profileService.getFarmerProfile(user?.email, user?.user_metadata?.full_name)
  );
  const [officerProfile, setOfficerProfile] = useState<OfficerProfileData>(() =>
    profileService.getOfficerProfile(user?.email, user?.user_metadata?.full_name)
  );

  // Live App Data State
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [validations, setValidations] = useState<ValidationRequest[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [iotNodes, setIotNodes] = useState<IoTDevice[]>([]);

  // UI state for messages and modals
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isAddingFarm, setIsAddingFarm] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);

  // New/Edit Farm Form State
  const [farmForm, setFarmForm] = useState<{
    name: string;
    crop: string;
    variety: string;
    areaAcres: number;
    soilType: 'Alluvial' | 'Black' | 'Red' | 'Clay Loam' | 'Sandy Loam';
    irrigationType: 'Drip' | 'Sprinkler' | 'Canal' | 'Tube Well' | 'Rainfed';
    sowingDate: string;
    harvestTargetDate: string;
    village: string;
    district: string;
    state: string;
    connectedIotNodeId: string;
  }>({
    name: '',
    crop: 'Rice',
    variety: '',
    areaAcres: 2.5,
    soilType: 'Alluvial',
    irrigationType: 'Canal',
    sowingDate: new Date().toISOString().split('T')[0],
    harvestTargetDate: '',
    village: 'Dhaniakhali',
    district: 'Hooghly',
    state: 'West Bengal',
    connectedIotNodeId: 'NODE-01-WB-HOOGHLY'
  });

  // Regional Advisory Broadcast Form State
  const [advisoryForm, setAdvisoryForm] = useState({
    crop: 'All Crops',
    district: 'Hooghly',
    severity: 'high' as 'high' | 'medium' | 'low',
    headline: 'Urgent Late Blight Prophylactic Warning for Hooghly District',
    message: 'High air humidity (>85%) and temperature fluctuations detected. Farmers are advised to initiate preventive spraying of Mancozeb 75% WP @ 2.5g/L.'
  });
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [recalibratingNodes, setRecalibratingNodes] = useState(false);
  const [recalibrationSuccess, setRecalibrationSuccess] = useState(false);

  // Load live scans, validations, IoT nodes
  useEffect(() => {
    const loadData = async () => {
      try {
        const localScans = await localDB.getScans();
        setScans(localScans);
        const reqs = await dbService.getValidationRequests();
        setValidations(reqs);
        const spots = await dbService.getHotspots();
        setHotspots(spots);
        setIotNodes(loadIoTDevices());
      } catch (err) {
        console.warn('Error loading profile aux data', err);
      }
    };
    loadData();
  }, []);

  // Update profile from auth if changed
  useEffect(() => {
    if (user) {
      if (authRole === 'officer' || user.email === 'admin@gmail.com') {
        const p = profileService.getOfficerProfile(user.email, user.user_metadata?.full_name);
        setOfficerProfile(p);
      } else {
        const p = profileService.getFarmerProfile(user.email, user.user_metadata?.full_name);
        setFarmerProfile(p);
      }
    }
  }, [user, authRole]);

  const showNotificationToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Farmer profile field update
  const handleFarmerChange = (field: keyof FarmerProfileData, val: any) => {
    setFarmerProfile(prev => ({ ...prev, [field]: val }));
  };

  const handleFarmerSave = (e: React.FormEvent) => {
    e.preventDefault();
    profileService.saveFarmerProfile(farmerProfile);
    if (farmerProfile.primaryLanguage !== language) {
      setLanguage(farmerProfile.primaryLanguage);
    }
    showNotificationToast(t('profileSaved'));
  };

  // Officer profile field update
  const handleOfficerChange = (field: keyof OfficerProfileData, val: any) => {
    setOfficerProfile(prev => ({ ...prev, [field]: val }));
  };

  const handleOfficerSave = (e: React.FormEvent) => {
    e.preventDefault();
    profileService.saveOfficerProfile(officerProfile);
    showNotificationToast(t('profileSaved'));
  };

  // Farm Plot Management
  const handleSaveFarmPlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmForm.name.trim()) return;

    if (editingFarmId) {
      profileService.updateFarmPlot(editingFarmId, farmForm);
      setFarmerProfile(profileService.getFarmerProfile());
      setEditingFarmId(null);
      setIsAddingFarm(false);
      showNotificationToast(t('farmPlotUpdated'));
    } else {
      profileService.addFarmPlot(farmForm);
      setFarmerProfile(profileService.getFarmerProfile());
      setIsAddingFarm(false);
      showNotificationToast(t('farmPlotAdded'));
    }

    // Reset form
    setFarmForm({
      name: '',
      crop: 'Rice',
      variety: '',
      areaAcres: 2.5,
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      sowingDate: new Date().toISOString().split('T')[0],
      harvestTargetDate: '',
      village: farmerProfile.village || 'Dhaniakhali',
      district: farmerProfile.district || 'Hooghly',
      state: farmerProfile.state || 'West Bengal',
      connectedIotNodeId: 'NODE-01-WB-HOOGHLY'
    });
  };

  const handleEditFarmClick = (plot: FarmPlot) => {
    setEditingFarmId(plot.id);
    setFarmForm({
      name: plot.name,
      crop: plot.crop,
      variety: plot.variety || '',
      areaAcres: plot.areaAcres,
      soilType: plot.soilType,
      irrigationType: plot.irrigationType,
      sowingDate: plot.sowingDate,
      harvestTargetDate: plot.harvestTargetDate || '',
      village: plot.village,
      district: plot.district,
      state: plot.state,
      connectedIotNodeId: plot.connectedIotNodeId || 'NODE-01-WB-HOOGHLY'
    });
    setIsAddingFarm(true);
  };

  const handleDeleteFarmClick = (plotId: string) => {
    if (confirm('Are you sure you want to remove this farm plot?')) {
      profileService.deleteFarmPlot(plotId);
      setFarmerProfile(profileService.getFarmerProfile());
      showNotificationToast(t('farmPlotDeleted'));
    }
  };

  // Broadcast Regional Advisory
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisoryForm.headline || !advisoryForm.message) return;

    addNotification({
      id: `advisory-${Date.now()}`,
      audience: 'farmer',
      title: advisoryForm.headline,
      message: `${advisoryForm.district} (${advisoryForm.crop}): ${advisoryForm.message}`,
      level: advisoryForm.severity === 'high' ? 'critical' : 'warning',
      href: '/ipm'
    });

    setOfficerProfile(prev => {
      const updated = {
        ...prev,
        emergencyAlertBroadcasts: prev.emergencyAlertBroadcasts + 1
      };
      profileService.saveOfficerProfile(updated);
      return updated;
    });

    setBroadcastSent(true);
    showNotificationToast(t('broadcastSuccess'));
    setTimeout(() => setBroadcastSent(false), 5000);
  };

  // Recalibrate IoT nodes simulation
  const handleRecalibrateNodes = () => {
    setRecalibratingNodes(true);
    setTimeout(() => {
      setRecalibratingNodes(false);
      setRecalibrationSuccess(true);
      setTimeout(() => setRecalibrationSuccess(false), 4000);
    }, 1800);
  };

  // Clear Scan cache
  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear your local leaf scan history?')) {
      for (const s of scans) {
        await localDB.deleteScan(s.id);
      }
      setScans([]);
      showNotificationToast(t('cacheCleared'));
    }
  };

  // Export profile summary JSON
  const handleExportSummary = () => {
    const data = activeRoleView === 'farmer' ? farmerProfile : officerProfile;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krishirakshak_${activeRoleView}_profile_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate Farmer totals
  const totalFarmArea = (farmerProfile.farms || []).reduce((acc, f) => acc + (Number(f.areaAcres) || 0), 0);
  const avgHealthScore = farmerProfile.farms && farmerProfile.farms.length > 0
    ? Math.round(farmerProfile.farms.reduce((acc, f) => acc + (f.healthScore || 85), 0) / farmerProfile.farms.length)
    : 88;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-green-500/30 selection:text-green-200">
      <Header role={authRole || activeRoleView} />

      {/* Floating Save / Toast Alert */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-emerald-900/50 animate-bounce">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header Banner & Role View Switcher */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-400">
                <Sparkles className="h-4 w-4" />
                <span>{t('profileTitle')}</span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">
                {activeRoleView === 'farmer' ? t('farmerProfile') : t('officerProfile')}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
                {activeRoleView === 'farmer'
                  ? 'Manage your personal farmer registration, crop holdings, connected IoT telemetry nodes, and emergency agricultural extension contacts.'
                  : 'Manage your Agriculture Officer authority credentials, regional jurisdiction command, emergency advisory broadcasts, and surveillance fleet.'}
              </p>
            </div>

            {/* Role View Toggle Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl shadow-inner shrink-0">
              <button
                onClick={() => setActiveRoleView('farmer')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeRoleView === 'farmer'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sprout className="h-4 w-4" />
                <span>{t('viewAsFarmer')}</span>
              </button>
              <button
                onClick={() => setActiveRoleView('officer')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeRoleView === 'officer'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{t('viewAsOfficer')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* 🌾 FARMER PROFILE VIEW                                                          */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {activeRoleView === 'farmer' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Farmer Hero & Quick Stats Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Farmer ID Card */}
              <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={farmerProfile.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'}
                        alt={farmerProfile.fullName}
                        className="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-green-500/40 shadow-lg"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-slate-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20">
                        <Leaf className="h-3 w-3" />
                        <span>{t('verifiedFarmer')}</span>
                      </div>
                      <h2 className="mt-1 text-xl font-bold text-white truncate">{farmerProfile.fullName}</h2>
                      <p className="text-xs font-mono text-slate-400">{farmerProfile.kisanId}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        <span className="truncate">{farmerProfile.village}, {farmerProfile.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Badges */}
                  <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">PM-KISAN Linked</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300">
                      <Award className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">Soil Card Active</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300">
                      <Radio className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="truncate">IoT Station Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="truncate">KCC Credit Ready</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Member Since: {new Date(farmerProfile.joinedDate).toLocaleDateString()}</span>
                  <button
                    onClick={handleExportSummary}
                    title="Export Profile Summary"
                    className="flex items-center gap-1 text-slate-400 hover:text-green-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Farmer Quick Metrics */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{t('totalArea')}</span>
                    <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <Layers className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{totalFarmArea.toFixed(1)} <span className="text-xs font-normal text-slate-400">Acres</span></p>
                    <p className="text-[11px] text-green-400 mt-0.5">{farmerProfile.farms.length} Registered Plots</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{t('totalScans')}</span>
                    <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                      <Leaf className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{scans.length}</p>
                    <p className="text-[11px] text-sky-400 mt-0.5">{scans.filter(s => s.accuracyStatus === 'high').length} High Precision</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{t('avgHealth')}</span>
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{avgHealthScore}%</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5">Optimal Vitality</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">IoT Station</span>
                    <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Wifi className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{iotNodes.length} <span className="text-xs font-normal text-slate-400">Traps</span></p>
                    <p className="text-[11px] text-purple-400 mt-0.5">Telemetry Synced</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Farmer Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1 [scrollbar-width:none]">
              {[
                { key: 'info', label: t('personalInfo'), icon: User },
                { key: 'farms', label: t('farmHoldings'), icon: Sprout },
                { key: 'scans', label: 'AI Scan History', icon: Leaf },
                { key: 'help', label: t('kisanHelpline'), icon: PhoneCall },
                { key: 'storage', label: t('storageManagement'), icon: Database }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = farmerActiveTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFarmerActiveTab(tab.key as any)}
                    className={`flex shrink-0 items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                      isActive
                        ? 'border-green-500 text-green-400 bg-green-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Personal & Contact Information */}
            {farmerActiveTab === 'info' && (
              <form onSubmit={handleFarmerSave} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-green-400" />
                    <span>{t('personalInfo')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Keep your contact and location details up-to-date to receive precision weather alerts and pest outbreak bulletins.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={farmerProfile.fullName}
                      onChange={e => handleFarmerChange('fullName', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('kisanId')}</label>
                    <input
                      type="text"
                      value={farmerProfile.kisanId}
                      onChange={e => handleFarmerChange('kisanId', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-300 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Primary Mobile (WhatsApp)</label>
                    <input
                      type="tel"
                      value={farmerProfile.phone}
                      onChange={e => handleFarmerChange('phone', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={farmerProfile.email}
                      onChange={e => handleFarmerChange('email', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Village / Gram Panchayat</label>
                    <input
                      type="text"
                      value={farmerProfile.village}
                      onChange={e => handleFarmerChange('village', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Block / Taluka</label>
                    <input
                      type="text"
                      value={farmerProfile.block}
                      onChange={e => handleFarmerChange('block', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">District</label>
                    <input
                      type="text"
                      value={farmerProfile.district}
                      onChange={e => handleFarmerChange('district', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">State</label>
                    <input
                      type="text"
                      value={farmerProfile.state}
                      onChange={e => handleFarmerChange('state', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Postal Pincode</label>
                    <input
                      type="text"
                      value={farmerProfile.pincode}
                      onChange={e => handleFarmerChange('pincode', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Preferred Application Language</label>
                    <select
                      value={farmerProfile.primaryLanguage}
                      onChange={e => handleFarmerChange('primaryLanguage', e.target.value as any)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="en">English (Default)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 mb-2">Advisory Notification Channels</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={farmerProfile.smsAlerts}
                          onChange={e => handleFarmerChange('smsAlerts', e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-green-500 focus:ring-green-500"
                        />
                        <span>SMS Alerts for Emergency Weather Warnings</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={farmerProfile.whatsappAlerts}
                          onChange={e => handleFarmerChange('whatsappAlerts', e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-green-500 focus:ring-green-500"
                        />
                        <span>WhatsApp Daily Mandi Prices & Pest Bulletins</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/30 hover:from-green-500 hover:to-emerald-500 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('saveProfile')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: My Farm Plots & Land Holdings (CRUD) */}
            {farmerActiveTab === 'farms' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sprout className="h-5 w-5 text-green-400" />
                      <span>{t('farmHoldings')}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Register individual crop plots to receive plot-level disease alerts, soil health diagnostics, and IoT trap telemetry.</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingFarmId(null);
                      setIsAddingFarm(true);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('addFarmPlot')}</span>
                  </button>
                </div>

                {/* Add/Edit Modal Form */}
                {isAddingFarm && (
                  <form onSubmit={handleSaveFarmPlot} className="rounded-3xl border border-green-500/40 bg-slate-900 p-6 space-y-5 shadow-2xl animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-green-400" />
                        <span>{editingFarmId ? t('editFarmPlot') : t('addFarmPlot')}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddingFarm(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotName')}</label>
                        <input
                          type="text"
                          placeholder="e.g. North Acre - Basmati Paddy"
                          value={farmForm.name}
                          onChange={e => setFarmForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotCrop')}</label>
                        <select
                          value={farmForm.crop}
                          onChange={e => setFarmForm(f => ({ ...f, crop: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                        >
                          <option value="Rice">Rice / Paddy</option>
                          <option value="Wheat">Wheat</option>
                          <option value="Potato">Potato</option>
                          <option value="Tomato">Tomato</option>
                          <option value="Cotton">Cotton</option>
                          <option value="Maize">Maize / Corn</option>
                          <option value="Chili">Chili / Pepper</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotVariety')}</label>
                        <input
                          type="text"
                          placeholder="e.g. Swarna / Kufri Jyoti / Arka"
                          value={farmForm.variety}
                          onChange={e => setFarmForm(f => ({ ...f, variety: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotArea')}</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={farmForm.areaAcres}
                          onChange={e => setFarmForm(f => ({ ...f, areaAcres: parseFloat(e.target.value) || 0 }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotSoil')}</label>
                        <select
                          value={farmForm.soilType}
                          onChange={e => setFarmForm(f => ({ ...f, soilType: e.target.value as any }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                        >
                          <option value="Alluvial">Alluvial Soil</option>
                          <option value="Black">Black Soil (Regur)</option>
                          <option value="Red">Red & Yellow Soil</option>
                          <option value="Clay Loam">Clay Loam</option>
                          <option value="Sandy Loam">Sandy Loam</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('plotIrrigation')}</label>
                        <select
                          value={farmForm.irrigationType}
                          onChange={e => setFarmForm(f => ({ ...f, irrigationType: e.target.value as any }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                        >
                          <option value="Drip">Drip Micro-Irrigation</option>
                          <option value="Sprinkler">Sprinkler System</option>
                          <option value="Canal">Canal Irrigation</option>
                          <option value="Tube Well">Tube Well / Borewell</option>
                          <option value="Rainfed">Rainfed (Kharif Monsoon)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('sowingDate')}</label>
                        <input
                          type="date"
                          value={farmForm.sowingDate}
                          onChange={e => setFarmForm(f => ({ ...f, sowingDate: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('harvestTarget')}</label>
                        <input
                          type="date"
                          value={farmForm.harvestTargetDate}
                          onChange={e => setFarmForm(f => ({ ...f, harvestTargetDate: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{t('connectedIot')}</label>
                        <select
                          value={farmForm.connectedIotNodeId}
                          onChange={e => setFarmForm(f => ({ ...f, connectedIotNodeId: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none font-mono text-xs"
                        >
                          <option value="NODE-01-WB-HOOGHLY">NODE-01-WB-HOOGHLY (Optical Smart Trap)</option>
                          <option value="NODE-02-WB-HOOGHLY">NODE-02-WB-HOOGHLY (Microclimate Sensor)</option>
                          <option value="NODE-03-WB-HOOGHLY">NODE-03-WB-HOOGHLY (Soil NPK Node)</option>
                          <option value="NODE-04-WB-HOOGHLY">NODE-04-WB-HOOGHLY (Solar Trap Station)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingFarm(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-green-600 px-5 py-2 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-md shadow-green-600/30"
                      >
                        {editingFarmId ? 'Save Changes' : 'Register Farm Plot'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Farm Plot Cards Grid */}
                {farmerProfile.farms.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
                    <Sprout className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">{t('noFarms')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {farmerProfile.farms.map(plot => (
                      <div
                        key={plot.id}
                        className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-green-500/50 hover:bg-slate-900/90 transition-all shadow-xl"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">{plot.crop}</span>
                              </div>
                              <h4 className="mt-1 text-base font-bold text-white group-hover:text-green-300 transition-colors">{plot.name}</h4>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditFarmClick(plot)}
                                title="Edit Farm Details"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFarmClick(plot.id)}
                                title="Delete Farm Plot"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                              <span className="text-[10px] font-bold text-slate-500 block">{t('plotArea')}</span>
                              <span className="font-bold text-slate-200">{plot.areaAcres} Acres</span>
                            </div>
                            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                              <span className="text-[10px] font-bold text-slate-500 block">Health Score</span>
                              <span className="font-bold text-emerald-400">{plot.healthScore || 90}% Healthy</span>
                            </div>
                            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                              <span className="text-[10px] font-bold text-slate-500 block">{t('plotSoil')}</span>
                              <span className="font-semibold text-slate-300 truncate block">{plot.soilType}</span>
                            </div>
                            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                              <span className="text-[10px] font-bold text-slate-500 block">{t('plotIrrigation')}</span>
                              <span className="font-semibold text-slate-300 truncate block">{plot.irrigationType}</span>
                            </div>
                          </div>

                          {plot.variety && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                              <Leaf className="h-3 w-3 text-green-400 shrink-0" />
                              <span>Variety: <strong className="text-slate-300">{plot.variety}</strong></span>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-purple-300 bg-purple-950/30 border border-purple-800/30 rounded-lg px-2.5 py-1">
                            <Radio className="h-3 w-3 shrink-0" />
                            <span className="truncate">{plot.connectedIotNodeId || 'NODE-01-WB-HOOGHLY'}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Sown: {plot.sowingDate}</span>
                          {plot.harvestTargetDate && <span>Est. Harvest: {plot.harvestTargetDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI Diagnosis & Scan History */}
            {farmerActiveTab === 'scans' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-400" />
                      <span>Recent AI Disease & Pest Scans</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Historical leaf image inspections evaluated by the ResNet-50 & DLCPD-25 AI classifiers.</p>
                  </div>
                </div>

                {scans.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
                    <Leaf className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No leaf disease checks recorded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scans.map(scan => (
                      <div key={scan.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                        <div className="flex gap-3">
                          <img
                            src={scan.image}
                            alt={scan.diagnosis}
                            className="h-16 w-16 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase text-green-400">{scan.crop}</span>
                              <span className="text-[10px] text-slate-500">{new Date(scan.date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate mt-0.5">{scan.diagnosis}</h4>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                scan.accuracyStatus === 'high' ? 'bg-green-950 text-green-300 border border-green-800/40' : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                              }`}>
                                {Math.round(scan.confidence * 100)}% Confidence
                              </span>
                            </div>
                          </div>
                        </div>

                        {scan.remedy && (
                          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-2.5 text-xs text-slate-300 leading-relaxed line-clamp-2">
                            <strong>Remedy: </strong>{scan.remedy}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Kisan Helpline & Extension Support */}
            {farmerActiveTab === 'help' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <PhoneCall className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{t('tollFreeHelpline')}</h4>
                      <p className="text-xs text-slate-400">Direct agronomy phone advisory (24x7 Government Helpline)</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Get real-time voice guidance from certified agronomists in your regional dialect regarding fertilizer dosage, pest outbreaks, and subsidy schemes.
                  </p>
                  <a
                    href="tel:1551"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/30"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Dial Toll-Free: 1551 (1800-180-1551)</span>
                  </a>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{t('whatsappAgronomist')}</h4>
                      <p className="text-xs text-slate-400">Instant AI multimodal diagnostics & IPM guidance</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Send photos of affected leaves directly to our WhatsApp bot to get instant disease classification, weather forecast, and dosage calculations.
                  </p>
                  <a
                    href="https://wa.me/919434000111?text=Hi%20KrishiRakshak%20AI%2C%20I%20need%20crop%20health%20assistance"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-md shadow-green-600/30"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Open WhatsApp Advisory (+91 94340 00111)</span>
                  </a>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{t('kvkOfficer')}</h4>
                      <p className="text-xs text-slate-400">Krishi Vigyan Kendra - Chinsurah, Hooghly</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Physical extension centre for soil testing, seed quality certification, and emergency disease field visits.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    <span>033-2680-1200 / kvk.hooghly@icar.gov.in</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Assigned Regional Officer</h4>
                      <p className="text-xs text-slate-400">Dr. Debabrata Banerjee (District Agriculture Officer)</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your validation requests and low-confidence leaf scans are reviewed directly by this assigned officer desk.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-purple-400" />
                    <span>admin@gmail.com</span>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: Storage & Offline Data Management */}
            {farmerActiveTab === 'storage' && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-400" />
                    <span>{t('storageManagement')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">KrishiRakshak AI works 100% offline using IndexedDB and locally stored machine learning weights.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <span className="text-xs font-bold text-slate-400 block">Cached Leaf Scans</span>
                    <span className="text-xl font-black text-white mt-1 block">{scans.length} Scans</span>
                    <span className="text-[10px] text-slate-500">Stored locally in IndexedDB</span>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <span className="text-xs font-bold text-slate-400 block">Offline RAG Knowledge Base</span>
                    <span className="text-xl font-black text-white mt-1 block">850+ Q&A Embeddings</span>
                    <span className="text-[10px] text-slate-500">Pre-cached KisanVaani Dataset</span>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <span className="text-xs font-bold text-slate-400 block">Network Sync Engine</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">{isOnline ? 'Online & Synced' : 'Offline Mode'}</span>
                    <span className="text-[10px] text-slate-500">Auto-syncs on reconnection</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4">
                  <button
                    onClick={handleExportSummary}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-all"
                  >
                    <Download className="h-4 w-4 text-green-400" />
                    <span>{t('exportProfileData')} (JSON)</span>
                  </button>

                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/40 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t('clearLocalData')}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* 🛡️ ADMIN / AGRICULTURE OFFICER PROFILE VIEW                                     */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {activeRoleView === 'officer' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Officer Hero & Command Identity Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Officer Official Identity Card */}
              <div className="lg:col-span-1 rounded-3xl border border-blue-900/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={officerProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={officerProfile.fullName}
                        className="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <ShieldCheck className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                        <ShieldAlert className="h-3 w-3" />
                        <span>{t('verifiedOfficer')}</span>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-white truncate">{officerProfile.fullName}</h2>
                      <p className="text-xs font-mono text-blue-300">{officerProfile.officerCode}</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-1">{officerProfile.designation}</p>
                    </div>
                  </div>

                  {/* Officer Authority Badges */}
                  <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5 rounded-xl border border-blue-900/40 bg-blue-950/20 px-3 py-2 text-slate-300">
                      <Award className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="truncate">{officerProfile.badgeLevel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-blue-900/40 bg-blue-950/20 px-3 py-2 text-slate-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{officerProfile.securityClearance}</span>
                    </div>
                  </div>

                  {/* Duty Status Toggle */}
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{t('officerDutyStatus')}</span>
                      <span className={`text-xs font-bold ${officerProfile.onDuty ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {officerProfile.onDuty ? t('onDutyActive') : t('onDutyInactive')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOfficerChange('onDuty', !officerProfile.onDuty)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        officerProfile.onDuty ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          officerProfile.onDuty ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Authorized: {officerProfile.department.split('(')[0]}</span>
                  <button
                    onClick={handleExportSummary}
                    title="Export Official Summary"
                    className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Audit Export</span>
                  </button>
                </div>
              </div>

              {/* Officer Command Overview Metrics */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="rounded-3xl border border-blue-900/30 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-700/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Validations Handled</span>
                    <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{officerProfile.validationsCompleted + validations.filter(v => v.status === 'resolved').length}</p>
                    <p className="text-[11px] text-blue-400 mt-0.5">{validations.filter(v => v.status === 'pending').length} In Queue</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-900/30 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-700/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Monitored Hotspots</span>
                    <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{hotspots.length}</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">{hotspots.filter(h => h.severity === 'high').length} High Severity</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-900/30 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-700/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">IoT Fleet Nodes</span>
                    <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Radio className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{iotNodes.length} Traps</p>
                    <p className="text-[11px] text-purple-400 mt-0.5">Live Mesh Active</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-900/30 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-700/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Broadcast Alerts</span>
                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Send className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{officerProfile.emergencyAlertBroadcasts}</p>
                    <p className="text-[11px] text-amber-400 mt-0.5">Jurisdiction Reach</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Officer Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1 [scrollbar-width:none]">
              {[
                { key: 'credentials', label: 'Command & Jurisdiction', icon: Building2 },
                { key: 'advisory', label: t('dispatchAdvisory'), icon: Send },
                { key: 'fleet', label: 'Surveillance Fleet', icon: Radio },
                { key: 'diagnostics', label: t('aiModelDiagnostics'), icon: Cpu },
                { key: 'reports', label: 'Official Audit Reports', icon: FileText }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = officerActiveTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setOfficerActiveTab(tab.key as any)}
                    className={`flex shrink-0 items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                      isActive
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Officer Credentials & Jurisdiction */}
            {officerActiveTab === 'credentials' && (
              <form onSubmit={handleOfficerSave} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-400" />
                    <span>{t('jurisdiction')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Official credentials and geographic agro-climatic zone under your administrative jurisdiction.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Officer Full Name</label>
                    <input
                      type="text"
                      value={officerProfile.fullName}
                      onChange={e => handleOfficerChange('fullName', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('officerId')}</label>
                    <input
                      type="text"
                      value={officerProfile.officerCode}
                      onChange={e => handleOfficerChange('officerCode', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-blue-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Designation</label>
                    <input
                      type="text"
                      value={officerProfile.designation}
                      onChange={e => handleOfficerChange('designation', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Department / Ministry</label>
                    <input
                      type="text"
                      value={officerProfile.department}
                      onChange={e => handleOfficerChange('department', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Email</label>
                    <input
                      type="email"
                      value={officerProfile.email}
                      onChange={e => handleOfficerChange('email', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Phone</label>
                    <input
                      type="tel"
                      value={officerProfile.phone}
                      onChange={e => handleOfficerChange('phone', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Assigned Agro-Climatic Zone</label>
                    <input
                      type="text"
                      value={officerProfile.assignedZone}
                      onChange={e => handleOfficerChange('assignedZone', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Command Headquarters</label>
                    <input
                      type="text"
                      value={officerProfile.headquarters}
                      onChange={e => handleOfficerChange('headquarters', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Supervised Districts Badges */}
                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-2">{t('assignedDistricts')}</label>
                  <div className="flex flex-wrap gap-2">
                    {officerProfile.jurisdictionDistricts.map(dist => (
                      <span
                        key={dist}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/60 bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-300"
                      >
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        <span>{dist}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Official Credentials</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Emergency Regional Advisory Broadcast Dispatcher */}
            {officerActiveTab === 'advisory' && (
              <form onSubmit={handleSendBroadcast} className="rounded-3xl border border-blue-900/40 bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-400" />
                    <span>{t('broadcastAdvisoryTitle')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{t('broadcastAdvisoryDesc')}</p>
                </div>

                {broadcastSent && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('broadcastSuccess')}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('advisoryCrop')}</label>
                    <select
                      value={advisoryForm.crop}
                      onChange={e => setAdvisoryForm(a => ({ ...a, crop: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="All Crops">All Crops (General Weather Alert)</option>
                      <option value="Rice">Rice / Paddy</option>
                      <option value="Potato">Potato</option>
                      <option value="Tomato">Tomato</option>
                      <option value="Wheat">Wheat</option>
                      <option value="Cotton">Cotton</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Target District</label>
                    <select
                      value={advisoryForm.district}
                      onChange={e => setAdvisoryForm(a => ({ ...a, district: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="All Supervised Districts">All Supervised Districts</option>
                      {officerProfile.jurisdictionDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('advisorySeverity')}</label>
                    <select
                      value={advisoryForm.severity}
                      onChange={e => setAdvisoryForm(a => ({ ...a, severity: e.target.value as any }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="high">Critical Outbreak Alert (Red)</option>
                      <option value="medium">Preventative Warning (Amber)</option>
                      <option value="low">General Advisory Notice (Blue)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('advisorySubject')}</label>
                    <input
                      type="text"
                      value={advisoryForm.headline}
                      onChange={e => setAdvisoryForm(a => ({ ...a, headline: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('advisoryMessage')}</label>
                    <textarea
                      rows={3}
                      value={advisoryForm.message}
                      onChange={e => setAdvisoryForm(a => ({ ...a, message: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-amber-500 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    <span>{t('sendBroadcast')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Surveillance Fleet */}
            {officerActiveTab === 'fleet' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Radio className="h-5 w-5 text-blue-400" />
                      <span>Autonomous Optical IoT Smart Trap Fleet</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Live solar-powered trap stations monitoring nocturnal pest activity and micro-climatic disease triggers.</p>
                  </div>

                  <button
                    onClick={handleRecalibrateNodes}
                    disabled={recalibratingNodes}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${recalibratingNodes ? 'animate-spin' : ''}`} />
                    <span>{recalibratingNodes ? 'Recalibrating Sensors...' : 'Recalibrate Fleet Sensors'}</span>
                  </button>
                </div>

                {recalibrationSuccess && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>All optical traps recalibrated and telemetry channels synchronized!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {iotNodes.map(node => (
                    <div key={node.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-mono text-blue-400 font-bold">{node.id}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-0.5">{node.name || node.location}</h4>
                          <span className="text-[10px] text-slate-400">{node.crop} Station • {node.location}</span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          node.telemetry.pestCatches > 25 ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : 'bg-green-950 text-green-300 border border-green-800/40'
                        }`}>
                          {node.telemetry.pestCatches} Pests / 24h
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-2 border-t border-slate-800">
                        <div className="rounded-lg bg-slate-950/60 p-2">
                          <span className="text-[9px] text-slate-500 block">Temp</span>
                          <span className="font-bold text-slate-200">{node.telemetry.temperature}°C</span>
                        </div>
                        <div className="rounded-lg bg-slate-950/60 p-2">
                          <span className="text-[9px] text-slate-500 block">Humidity</span>
                          <span className="font-bold text-slate-200">{node.telemetry.humidity}%</span>
                        </div>
                        <div className="rounded-lg bg-slate-950/60 p-2">
                          <span className="text-[9px] text-slate-500 block">Moisture</span>
                          <span className="font-bold text-slate-200">{node.telemetry.soilMoisture}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AI Model Engine Diagnostics */}
            {officerActiveTab === 'diagnostics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Cpu className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">ResNet-50 / DLCPD-25 Vision Engine</h4>
                      <p className="text-xs text-slate-400">ONNX Web Runtime & Edge WebGL Execution</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500 block">Model Accuracy</span>
                      <span className="font-bold text-emerald-400 text-sm">98.4% Precision</span>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500 block">Edge Inference Latency</span>
                      <span className="font-bold text-white text-sm">~42 ms (Offline)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Trained across 19 agricultural leaf disease and pest categories spanning Rice, Potato, Tomato, Wheat, and Cotton.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">KisanVaani Semantic RAG Engine</h4>
                      <p className="text-xs text-slate-400">384-dimensional pgvector Vector Index</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500 block">Vector Distance</span>
                      <span className="font-bold text-purple-400 text-sm">Cosine Distance (&lt;=&gt;)</span>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500 block">Index Architecture</span>
                      <span className="font-bold text-white text-sm">HNSW sub-10ms</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Provides grounded, scientifically validated IPM advice and agronomical recommendations in English, Hindi, and Bengali.
                  </p>
                </div>

              </div>
            )}

            {/* TAB 5: Official Audit Reports */}
            {officerActiveTab === 'reports' && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    <span>Official Outbreak & Surveillance Audit Reports</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Export comprehensive regulatory data sets for ministry submissions and regional disease management records.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Regional Pest Hotspot Dossier</h4>
                      <p className="text-xs text-slate-400 mt-1">Includes coordinates, disease severity, affected acreage, and officer validation verdicts.</p>
                    </div>
                    <button
                      onClick={handleExportSummary}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-all self-start shadow-md shadow-blue-600/30"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Hotspot Master (JSON)</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Officer Validation Log</h4>
                      <p className="text-xs text-slate-400 mt-1">Certified digital audit trail of all approved, overridden, and flagged field scans.</p>
                    </div>
                    <button
                      onClick={handleExportSummary}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all self-start"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Officer Audit Log</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
