'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { localDB, ScanRecord, formatConfidencePercent } from '../../utils/db';
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
  ChevronRight,
  ShieldAlert,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  Database,
  Check,
  X,
  Camera,
  Upload,
  CloudRain,
  ExternalLink,
  Lock,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Curated avatar presets for Farmers & Officers
const FARMER_AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'
];

export default function ProfilePage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, role: authRole } = useAuth();
  const { isOnline } = useOffline();
  const router = useRouter();

  // Strict Role Guard: Farmers can NEVER view officer/admin profile
  const isOfficerUser = authRole === 'officer' || user?.email === 'admin@gmail.com';
  const activeRoleView: 'farmer' | 'officer' = isOfficerUser ? 'officer' : 'farmer';

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

  // Modals UI State
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isHelplineModalOpen, setIsHelplineModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Toast feedback state
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Profile Edit Temp Form State (Farmer)
  const [editFarmerForm, setEditFarmerForm] = useState<FarmerProfileData>(farmerProfile);
  // Profile Edit Temp Form State (Officer)
  const [editOfficerForm, setEditOfficerForm] = useState<OfficerProfileData>(officerProfile);

  // File input ref for avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advisory Form State for Officers
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
      if (isOfficerUser) {
        const p = profileService.getOfficerProfile(user.email, user.user_metadata?.full_name);
        setOfficerProfile(p);
        setEditOfficerForm(p);
      } else {
        const p = profileService.getFarmerProfile(user.email, user.user_metadata?.full_name);
        setFarmerProfile(p);
        setEditFarmerForm(p);
      }
    }
  }, [user, isOfficerUser]);

  const showNotificationToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    if (activeRoleView === 'farmer') {
      setEditFarmerForm({ ...farmerProfile });
    } else {
      setEditOfficerForm({ ...officerProfile });
    }
    setIsEditProfileModalOpen(true);
  };

  // Handle Avatar Image File Upload
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      if (activeRoleView === 'farmer') {
        setEditFarmerForm(prev => ({ ...prev, avatarUrl: base64Url }));
      } else {
        setEditOfficerForm(prev => ({ ...prev, avatarUrl: base64Url }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Farmer Profile
  const handleSaveFarmerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    profileService.saveFarmerProfile(editFarmerForm);
    setFarmerProfile(editFarmerForm);
    if (editFarmerForm.primaryLanguage !== language) {
      setLanguage(editFarmerForm.primaryLanguage);
    }
    setIsEditProfileModalOpen(false);
    showNotificationToast(t('profileSaved'));
  };

  // Save Officer Profile
  const handleSaveOfficerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    profileService.saveOfficerProfile(editOfficerForm);
    setOfficerProfile(editOfficerForm);
    setIsEditProfileModalOpen(false);
    showNotificationToast(t('profileSaved'));
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
    setTimeout(() => {
      setBroadcastSent(false);
      setIsAdvisoryModalOpen(false);
    }, 2500);
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
      <Header role={activeRoleView} />

      {/* Floating Save / Toast Alert */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-emerald-900/50 animate-bounce">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* 🌾 FARMER PROFILE VIEW                                                          */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {activeRoleView === 'farmer' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Farmer Hero Profile Card with Edit Icon */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Farmer Photo, Name, and Contact Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative group shrink-0">
                    <img
                      src={farmerProfile.avatarUrl || FARMER_AVATAR_PRESETS[0]}
                      alt={farmerProfile.fullName}
                      className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover ring-2 ring-green-500/50 shadow-2xl shadow-green-500/10"
                    />
                    <button
                      onClick={handleOpenEditModal}
                      title={t('editProfile') || 'Edit Profile & Photo'}
                      className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 text-white"
                    >
                      <Camera className="h-6 w-6 text-green-400" />
                    </button>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-slate-950 shadow-md">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-extrabold text-green-400 border border-green-500/20">
                        <Leaf className="h-3.5 w-3.5" />
                        <span>{t('verifiedFarmer')}</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        {farmerProfile.kisanId}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {farmerProfile.fullName}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        <span>{farmerProfile.village}, {farmerProfile.district}, {farmerProfile.state}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{farmerProfile.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{farmerProfile.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Profile Icon Button (Replaces "Your personal & contact information" static text) */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                  <button
                    onClick={handleOpenEditModal}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-green-600/30 hover:from-green-500 hover:to-emerald-500 transition-all hover:scale-[1.02] active:scale-95"
                    title={t('editProfile') || 'Edit Profile & Photo'}
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{t('editProfile') || 'Edit Profile & Photo'}</span>
                  </button>

                  <button
                    onClick={handleExportSummary}
                    title="Export Profile Summary"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white transition-all shadow-md"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Verification & Benefit Badges */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-3.5 py-2.5 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate">PM-KISAN Linked</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-3.5 py-2.5 text-slate-300">
                  <Award className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate">Soil Health Card</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-3.5 py-2.5 text-slate-300">
                  <Radio className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="truncate">IoT Station Live</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-3.5 py-2.5 text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="truncate">KCC Credit Ready</span>
                </div>
              </div>

            </div>

            {/* Quick Farm Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">{t('totalArea')}</span>
                  <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-white">{totalFarmArea.toFixed(1)} <span className="text-xs font-normal text-slate-400">Acres</span></p>
                  <p className="text-[11px] text-green-400 mt-0.5">{farmerProfile.farms?.length || 0} Registered Plots</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
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

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
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

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">IoT Station</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Wifi className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-white">{iotNodes.length} <span className="text-xs font-normal text-slate-400">Traps</span></p>
                  <p className="text-[11px] text-purple-400 mt-0.5">Live Mesh Active</p>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════════ */}
            {/* 📋 ROW-WISE PROFILE OPTIONS (Redirects to respective pages)                 */}
            {/* ═════════════════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-400" />
                    <span>{t('servicesAndFeatures') || 'Services & Farm Operations'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">Access and manage all specialized agricultural tools, telemetry feeds, and extension support.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                
                {/* 1. My Farm Plots & Land Holdings */}
                <Link
                  href="/dashboard/farmer"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-green-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-green-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-500 p-0.5 shadow-lg shadow-green-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-green-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Sprout className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-green-300 transition-colors">
                          {t('farmHoldings')}
                        </h3>
                        <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20">
                          {farmerProfile.farms?.length || 0} Registered Plots
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Register individual crop plots, manage acreage, irrigation types, and linked optical IoT telemetry nodes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-slate-300 hidden md:inline">
                      {totalFarmArea.toFixed(1)} Acres Total
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 2. AI Scan History & Leaf Diagnostics */}
                <Link
                  href="/detect"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-sky-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-sky-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 p-0.5 shadow-lg shadow-sky-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-sky-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Leaf className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                          AI Scan History & Leaf Diagnostics
                        </h3>
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/20">
                          {scans.length} Scans Saved
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Review past disease inspections, AI confidence scores, symptoms, and immediate IPM treatment remedies.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-sky-300 hidden md:inline">
                      ResNet-50 Engine
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-sky-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 3. Pest Surveillance & IoT Fleet */}
                <Link
                  href="/surveillance"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-purple-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-purple-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-purple-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Radio className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                          {t('surveillanceTitle') || 'Autonomous Pest Surveillance & Smart Traps'}
                        </h3>
                        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                          {iotNodes.length} Optical Traps Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Monitor nocturnal insect catches, localized threshold triggers, and regional pest movement trends.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-purple-300 hidden md:inline">
                      Live Telemetry
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 4. Weather & Outbreak Forecasting */}
                <Link
                  href="/forecasting"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-cyan-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-cyan-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 p-0.5 shadow-lg shadow-cyan-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-cyan-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <CloudRain className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {t('forecastingTitle') || 'Weather-Based Disease Risk Forecast'}
                        </h3>
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
                          5-Day Predictive Grid
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Combine local microclimate sensor telemetry with regional meteorological models to predict crop disease outbreaks.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-cyan-300 hidden md:inline">
                      Prophylactic Advice
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 5. Environmental Disease Risk & Soil Intelligence */}
                <Link
                  href="/environmental-risk"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-emerald-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 p-0.5 shadow-lg shadow-emerald-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-emerald-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Activity className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {t('environmentalRiskTitle') || 'Environmental Disease Risk & Soil Intelligence'}
                        </h3>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          {avgHealthScore}% Vitality Score
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Assess NPK balance, canopy humidity, and soil moisture thresholds to prevent fungal outbreaks.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-emerald-300 hidden md:inline">
                      Real-Time Sensor Link
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 6. IPM Guidelines & Crop Handbook */}
                <Link
                  href="/ipm"
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-amber-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-amber-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-lg shadow-amber-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-amber-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <FileText className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          {t('navIPM') || 'IPM Guidelines & Chemical Dosage Calculator'}
                        </h3>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          19 Crop Classes
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Scientifically verified Integrated Pest Management protocols, organic remedies, and precise spray dosage tables.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-amber-300 hidden md:inline">
                      KisanVaani RAG
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 7. Kisan Emergency Helpline & Support (Opens Helpline Dialog) */}
                <button
                  type="button"
                  onClick={() => setIsHelplineModalOpen(true)}
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-rose-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hover:shadow-rose-500/5 text-left w-full cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 p-0.5 shadow-lg shadow-rose-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-rose-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <PhoneCall className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                          {t('kisanHelpline') || '24x7 Kisan Helpline & Extension Support'}
                        </h3>
                        <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                          Toll-Free 1551
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Connect with verified agronomists, access WhatsApp automated crop doctor, or locate your local Krishi Vigyan Kendra.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-rose-300 hidden md:inline">
                      Direct Support
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </button>

                {/* 8. Offline Storage & Local Cache Management */}
                <button
                  type="button"
                  onClick={() => setIsStorageModalOpen(true)}
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-600 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl text-left w-full cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-500 p-0.5 shadow-lg shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-slate-300 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Database className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-slate-200 transition-colors">
                          {t('storageManagement') || 'Offline Cache & Storage Management'}
                        </h3>
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                          {isOnline ? 'Online & Synced' : 'Offline Ready'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Export local diagnostics summary, clear cached leaf photos, and inspect IndexedDB storage status.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-slate-400 hidden md:inline">
                      IndexedDB Engine
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </button>

              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* 🛡️ AGRICULTURE OFFICER PROFILE VIEW (Only for Authorized Officers)              */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {activeRoleView === 'officer' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Officer Official Identity Card */}
            <div className="relative overflow-hidden rounded-3xl border border-blue-900/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative group shrink-0">
                    <img
                      src={officerProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt={officerProfile.fullName}
                      className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover ring-2 ring-blue-500/50 shadow-2xl"
                    />
                    <button
                      onClick={handleOpenEditModal}
                      title={t('editProfile') || 'Edit Official Details'}
                      className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 text-white"
                    >
                      <Camera className="h-6 w-6 text-blue-400" />
                    </button>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
                      <ShieldCheck className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-extrabold text-blue-400 border border-blue-500/20">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>{t('verifiedOfficer')}</span>
                      </span>
                      <span className="text-xs font-mono text-blue-300 bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-blue-900/40">
                        {officerProfile.officerCode}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {officerProfile.fullName}
                    </h1>

                    <p className="text-xs text-slate-300 leading-tight">
                      {officerProfile.designation} • {officerProfile.department.split('(')[0]}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-blue-400" />
                        <span>Zone: {officerProfile.assignedZone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-blue-400" />
                        <span>{officerProfile.email}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                  <button
                    onClick={handleOpenEditModal}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Officer Credentials</span>
                  </button>
                  <button
                    onClick={handleExportSummary}
                    title="Export Audit Summary"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-300 hover:border-blue-700 hover:text-white transition-all shadow-md"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Officer Badges & Status */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
                <div className="flex items-center gap-2 rounded-2xl border border-blue-900/40 bg-blue-950/20 px-3.5 py-2.5 text-slate-300">
                  <Award className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="truncate">{officerProfile.badgeLevel}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-blue-900/40 bg-blue-950/20 px-3.5 py-2.5 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{officerProfile.securityClearance}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-blue-900/40 bg-blue-950/20 px-3.5 py-2.5 text-slate-300">
                  <MapPin className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="truncate">HQ: {officerProfile.headquarters}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-blue-900/40 bg-blue-950/20 px-3.5 py-2.5 text-slate-300">
                  <span className="text-xs font-bold text-emerald-400">Duty: On-Duty</span>
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Officer Command Row-wise Actions */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Officer Command & Regional Operations</span>
              </h2>

              <div className="grid grid-cols-1 gap-3.5">
                
                {/* 1. Regional Geospatial Outbreak Map */}
                <Link
                  href="/map"
                  className="group rounded-3xl border border-blue-900/40 bg-slate-900/70 p-5 hover:border-blue-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-600/20 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-blue-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <MapPin className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                          Regional Geospatial Outbreak Map
                        </h3>
                        <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                          {hotspots.length} Active Hotspots
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Interactive GIS satellite layers tracking pest densities, infected acreage, and containment perimeters.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-blue-300 hidden md:inline">Open GIS Map</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 2. Officer Triage & Validation Panel */}
                <Link
                  href="/dashboard/officer"
                  className="group rounded-3xl border border-blue-900/40 bg-slate-900/70 p-5 hover:border-blue-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 p-0.5 shadow-lg shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-indigo-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Layers className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          Expert Validation & Triage Desk
                        </h3>
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                          {validations.filter(v => v.status === 'pending').length} In Queue
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Review low-accuracy scans escalated by farmers, verify diagnoses, and issue certified digital advisories.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-indigo-300 hidden md:inline">Triage Center</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                {/* 3. Emergency Regional Advisory Dispatcher */}
                <button
                  type="button"
                  onClick={() => setIsAdvisoryModalOpen(true)}
                  className="group rounded-3xl border border-blue-900/40 bg-slate-900/70 p-5 hover:border-amber-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl text-left w-full cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-500 p-0.5 shadow-lg shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-amber-400 group-hover:bg-transparent group-hover:text-white transition-colors">
                        <Send className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          {t('dispatchAdvisory')}
                        </h3>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          Broadcast Dispatcher
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Instantly publish urgent high-priority outbreak bulletins across all registered farmers in supervised districts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-amber-300 hidden md:inline">Publish Alert</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </button>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {/* ✏️ MODAL 1: EDIT PROFILE & PROFILE PICTURE                                       */}
      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 [scrollbar-width:none]">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {activeRoleView === 'farmer' ? t('editProfile') : 'Edit Officer Credentials'}
                  </h3>
                  <p className="text-xs text-slate-400">Update your account details and profile picture.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Picture Update Section */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 sm:p-5 space-y-4">
              <label className="block text-xs font-bold text-slate-300">
                {t('changePhoto') || 'Profile Picture'}
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                  <img
                    src={
                      activeRoleView === 'farmer'
                        ? editFarmerForm.avatarUrl || FARMER_AVATAR_PRESETS[0]
                        : editOfficerForm.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                    }
                    alt="Profile Avatar"
                    className="h-20 w-20 rounded-2xl object-cover ring-2 ring-green-500/40 shadow-lg"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
                    >
                      <Upload className="h-3.5 w-3.5 text-green-400" />
                      <span>{t('uploadPhoto') || 'Upload Device Image'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Supports JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              </div>

              {/* Avatar Presets */}
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  {t('choosePreset') || 'Or select from avatar presets:'}
                </span>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {FARMER_AVATAR_PRESETS.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (activeRoleView === 'farmer') {
                          setEditFarmerForm(prev => ({ ...prev, avatarUrl: presetUrl }));
                        } else {
                          setEditOfficerForm(prev => ({ ...prev, avatarUrl: presetUrl }));
                        }
                      }}
                      className="h-10 w-10 shrink-0 rounded-xl overflow-hidden ring-2 transition-all hover:scale-105 active:scale-95 border border-slate-700"
                    >
                      <img src={presetUrl} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Farmer Form Fields */}
            {activeRoleView === 'farmer' && (
              <form onSubmit={handleSaveFarmerProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={editFarmerForm.fullName}
                      onChange={e => setEditFarmerForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('kisanId')}</label>
                    <input
                      type="text"
                      value={editFarmerForm.kisanId}
                      onChange={e => setEditFarmerForm(f => ({ ...f, kisanId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-300 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Mobile Number (WhatsApp) *</label>
                    <input
                      type="tel"
                      value={editFarmerForm.phone}
                      onChange={e => setEditFarmerForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      value={editFarmerForm.email}
                      onChange={e => setEditFarmerForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Village / Gram Panchayat *</label>
                    <input
                      type="text"
                      value={editFarmerForm.village}
                      onChange={e => setEditFarmerForm(f => ({ ...f, village: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Block / Taluka</label>
                    <input
                      type="text"
                      value={editFarmerForm.block}
                      onChange={e => setEditFarmerForm(f => ({ ...f, block: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">District *</label>
                    <input
                      type="text"
                      value={editFarmerForm.district}
                      onChange={e => setEditFarmerForm(f => ({ ...f, district: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">State *</label>
                    <input
                      type="text"
                      value={editFarmerForm.state}
                      onChange={e => setEditFarmerForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Postal Pincode</label>
                    <input
                      type="text"
                      value={editFarmerForm.pincode}
                      onChange={e => setEditFarmerForm(f => ({ ...f, pincode: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Preferred Application Language</label>
                    <select
                      value={editFarmerForm.primaryLanguage}
                      onChange={e => setEditFarmerForm(f => ({ ...f, primaryLanguage: e.target.value as any }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-green-600/30 hover:from-green-500 hover:to-emerald-500 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* Officer Form Fields */}
            {activeRoleView === 'officer' && (
              <form onSubmit={handleSaveOfficerProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={editOfficerForm.fullName}
                      onChange={e => setEditOfficerForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Officer Code</label>
                    <input
                      type="text"
                      value={editOfficerForm.officerCode}
                      onChange={e => setEditOfficerForm(f => ({ ...f, officerCode: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-blue-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Designation *</label>
                    <input
                      type="text"
                      value={editOfficerForm.designation}
                      onChange={e => setEditOfficerForm(f => ({ ...f, designation: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Department</label>
                    <input
                      type="text"
                      value={editOfficerForm.department}
                      onChange={e => setEditOfficerForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Email *</label>
                    <input
                      type="email"
                      value={editOfficerForm.email}
                      onChange={e => setEditOfficerForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Phone *</label>
                    <input
                      type="tel"
                      value={editOfficerForm.phone}
                      onChange={e => setEditOfficerForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Officer Details</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {/* 📞 MODAL 2: 24x7 KISAN HELPLINE & EXTENSION SUPPORT                              */}
      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {isHelplineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t('kisanHelpline') || '24x7 Kisan Emergency & Extension Support'}</h3>
                  <p className="text-xs text-slate-400">Government agricultural advisory channels and instant diagnostic bots.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHelplineModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 1. Toll Free 1551 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Phone className="h-4 w-4" />
                    <h4 className="text-sm font-bold text-white">{t('tollFreeHelpline')}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    24x7 toll-free helpline providing live agronomical recommendations in Bengali, Hindi, and English.
                  </p>
                </div>
                <a
                  href="tel:1551"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Toll-Free: 1551</span>
                </a>
              </div>

              {/* 2. WhatsApp Agronomist */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-green-400">
                    <MessageSquare className="h-4 w-4" />
                    <h4 className="text-sm font-bold text-white">{t('whatsappAgronomist')}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Send photos directly to our automated WhatsApp bot to receive instantaneous multimodal disease checks.
                  </p>
                </div>
                <a
                  href="https://wa.me/919434000111?text=Hi%20KrishiRakshak%20AI%2C%20I%20need%20crop%20health%20assistance"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-md shadow-green-600/20"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Open WhatsApp (+91 94340 00111)</span>
                </a>
              </div>

              {/* 3. Krishi Vigyan Kendra */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Building2 className="h-4 w-4" />
                  <h4 className="text-sm font-bold text-white">{t('kvkOfficer')}</h4>
                </div>
                <p className="text-xs text-slate-300">
                  Krishi Vigyan Kendra - Chinsurah, Hooghly District, West Bengal (ICAR Extension Center).
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>Phone: 033-2680-1200</span>
                  <span>Email: kvk.hooghly@icar.gov.in</span>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsHelplineModalOpen(false)}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {/* 💾 MODAL 3: OFFLINE STORAGE & DATA CACHE MANAGEMENT                             */}
      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-800 flex items-center justify-center text-green-400 border border-slate-700">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t('storageManagement') || 'Offline Storage Management'}</h3>
                  <p className="text-xs text-slate-400">IndexedDB local store & offline neural embeddings status.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStorageModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-[10px] font-bold text-slate-500 block">Cached Scans</span>
                <span className="text-xl font-black text-white mt-1 block">{scans.length} Scans</span>
                <span className="text-[10px] text-slate-500">IndexedDB Local</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-[10px] font-bold text-slate-500 block">RAG Embeddings</span>
                <span className="text-xl font-black text-white mt-1 block">850+ Q&A</span>
                <span className="text-[10px] text-slate-500">Offline Vector DB</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-[10px] font-bold text-slate-500 block">Network Sync</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">{isOnline ? 'Online' : 'Offline'}</span>
                <span className="text-[10px] text-slate-500">Auto Reconnection</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportSummary}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-md shadow-green-600/20"
              >
                <Download className="h-4 w-4" />
                <span>Export Profile JSON</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/40 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Scan Cache</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {/* 📢 MODAL 4: OFFICER ADVISORY BROADCAST DISPATCHER                               */}
      {/* ═════════════════════════════════════════════════════════════════════════════════ */}
      {isAdvisoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl border border-blue-900/50 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t('broadcastAdvisoryTitle')}</h3>
                  <p className="text-xs text-slate-400">Broadcast live emergency disease/weather alerts to regional farmers.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAdvisoryModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {broadcastSent && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t('broadcastSuccess')}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('advisorySubject')}</label>
                  <input
                    type="text"
                    value={advisoryForm.headline}
                    onChange={e => setAdvisoryForm(a => ({ ...a, headline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdvisoryModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-amber-500 transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>{t('sendBroadcast')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
