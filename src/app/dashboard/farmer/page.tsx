'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useOffline } from '../../../context/OfflineContext';
import { Header } from '../../../components/Header';
import { localDB, ScanRecord } from '../../../utils/db';
import {
  Thermometer,
  Droplets,
  CloudRain,
  Heart,
  TrendingUp,
  Scan,
  Calendar,
  MapPin,
  WifiOff,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Bug,
  Activity,
  Plus,
  Radio,
  Wifi,
  Link2,
  Unlink,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sprout,
  Wind,
  Signal,
  Info,
  X
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import Link from 'next/link';
import { LocationSelector } from '../../../components/LocationSelector';
import { weatherService } from '../../../utils/weatherService';
import { IoTDevice, IoTTelemetry, loadIoTDevices, saveIoTDevices } from '../../../utils/iotDevices';

// ─── IoT Device Types ─────────────────────────────────────────────────────────
// ─── Mock telemetry generator for a specific device & crop ───────────────────
function generateDeviceTelemetry(deviceId: string, crop: string): IoTTelemetry {
  // Seed randomness based on deviceId for stable mock data per device
  const seed = deviceId.charCodeAt(deviceId.length - 1) || 42;
  const rand = (min: number, max: number) =>
    Math.round((min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min)) * 10) / 10;

  const temp = rand(22, 38);
  const moisture = rand(30, 80);
  const humidity = rand(45, 90);
  const nitrogen = rand(25, 120);
  const phosphorus = rand(15, 90);
  const potassium = rand(20, 160);
  const ph = rand(5.2, 7.8);
  const rainChance = rand(0, 85);
  const windSpeed = rand(4, 28);
  const pestCatches = rand(0, 45);

  let health: 'good' | 'warning' | 'poor' = 'good';
  if (humidity > 78 || rainChance > 65 || temp > 36) health = 'warning';
  if (moisture < 30 || pestCatches > 35) health = 'poor';

  return {
    temperature: temp,
    soilMoisture: moisture,
    humidity,
    nitrogen,
    phosphorus,
    potassium,
    ph,
    rainChance,
    windSpeed,
    pestCatches,
    healthStatus: health,
    lastSync: new Date().toISOString()
  };
}

function generateTelemetryHistory(deviceId: string, crop: string): IoTTelemetry[] {
  return Array.from({ length: 7 }, (_, index) => {
    const reading = generateDeviceTelemetry(`${deviceId}-${index + 1}`, crop);
    return { ...reading, lastSync: new Date(Date.now() - (6 - index) * 86400000).toISOString() };
  });
}

// ─── LocalStorage helpers for IoT devices (offline-first) ───────────────────
// ─── Agmarknet mock 30-day price generator ────────────────────────────────────
const generateMockMandiPrices = (crop: string) => {
  const basePrices: Record<string, number> = {
    Wheat: 2200, Rice: 2900, Potato: 1300, Tomato: 1800, Cotton: 6800
  };
  const base = basePrices[crop] || 2000;
  const today = new Date();
  return Array.from({ length: 31 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (30 - i));
    return {
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      [crop]: Math.round(base + Math.sin(i / 3) * 150 + (Math.random() - 0.5) * 80)
    };
  });
};

// ─── SUPPORTED CROPS ─────────────────────────────────────────────────────────
const SUPPORTED_CROPS = ['Wheat', 'Rice', 'Potato', 'Tomato', 'Cotton', 'Maize', 'Pepper'];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FARMER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function FarmerDashboard() {
  const { t } = useLanguage();
  const { isOnline } = useOffline();

  const [role, setRole] = useState<'farmer' | 'officer'>('farmer');

  // IoT Device state
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [showPairModal, setShowPairModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Pair form state
  const [pairFieldName, setPairFieldName] = useState('');
  const [pairCrop, setPairCrop] = useState('Rice');
  const [pairLocation, setPairLocation] = useState('');
  const [pairSerial, setPairSerial] = useState('');
  const [pairLoading, setPairLoading] = useState(false);

  // Market data
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [priceData, setPriceData] = useState<any[]>([]);
  const [mandiName, setMandiName] = useState('Khanna Mandi, Punjab');
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Location & Recent Scans
  const [userLocation, setUserLocation] = useState({ name: 'Singur, Hooghly', lat: 22.81, lon: 88.23, isGeo: false });
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  const activeDevice = devices.find(d => d.id === activeDeviceId) ?? devices[0] ?? null;

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadIoTDevices();
    setDevices(saved);
    if (saved.length > 0) setActiveDeviceId(saved[0].id);
    const savedLoc = weatherService.getSavedLocation();
    setUserLocation({ ...savedLoc, isGeo: savedLoc.isGeo ?? false });
    localDB.getScans().then(s => setRecentScans(s.slice(0, 4))).catch(console.error);
    fetchAgmarknetPrices(selectedCrop);
  }, []);

  // ── Pair a New IoT Device ────────────────────────────────────────────────
  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairFieldName.trim() || !pairSerial.trim() || !pairLocation.trim()) return;
    setPairLoading(true);

    await new Promise(r => setTimeout(r, 1200)); // simulate pairing handshake

    const newDevice: IoTDevice = {
      id: `KR-${Date.now().toString().slice(-6)}`,
      name: pairFieldName.trim(),
      crop: pairCrop,
      location: pairLocation.trim(),
      deviceSerial: pairSerial.trim().toUpperCase(),
      pairedAt: new Date().toISOString(),
      status: 'online',
      telemetry: generateDeviceTelemetry(pairSerial, pairCrop),
      historicalReadings: generateTelemetryHistory(pairSerial, pairCrop),
      latitude: userLocation.lat,
      longitude: userLocation.lon
    };

    const updated = [newDevice, ...devices];
    setDevices(updated);
    saveIoTDevices(updated);
    setActiveDeviceId(newDevice.id);
    setShowPairModal(false);
    setPairFieldName(''); setPairCrop('Rice'); setPairLocation(''); setPairSerial('');
    setPairLoading(false);
  };

  // ── Remove / Unpair Device ───────────────────────────────────────────────
  const handleUnpairDevice = (deviceId: string) => {
    const updated = devices.filter(d => d.id !== deviceId);
    setDevices(updated);
    saveIoTDevices(updated);
    if (activeDeviceId === deviceId) {
      setActiveDeviceId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // ── Manual Telemetry Sync for a Device ──────────────────────────────────
  const handleSyncDevice = async (deviceId: string) => {
    setSyncingId(deviceId);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
    const updated = devices.map(d =>
      d.id === deviceId
        ? { ...d, status: 'online' as const, telemetry: generateDeviceTelemetry(d.deviceSerial, d.crop) }
        : d
    );
    setDevices(updated);
    saveIoTDevices(updated);
    setSyncingId(null);
  };

  // ── Agmarknet Prices ──────────────────────────────────────────────────────
  const fetchAgmarknetPrices = useCallback(async (crop: string) => {
    setLoadingPrices(true);
    const mandiLocations: Record<string, string> = {
      Wheat: 'Khanna Mandi, Punjab', Rice: 'Bardhaman Mandi, West Bengal',
      Potato: 'Agra Mandi, Uttar Pradesh', Tomato: 'Kolar Mandi, Karnataka', Cotton: 'Adoni Mandi, Andhra Pradesh',
      Maize: 'Gulbarga Mandi, Karnataka', Pepper: 'Kochi Mandi, Kerala'
    };
    setMandiName(mandiLocations[crop] || 'Local Mandi');
    setTimeout(async () => {
      const data = generateMockMandiPrices(crop);
      setPriceData(data);
      await localDB.saveCachedPrices(data);
      setLoadingPrices(false);
    }, 400);
  }, []);

  useEffect(() => { fetchAgmarknetPrices(selectedCrop); }, [selectedCrop, fetchAgmarknetPrices]);

  const getLocalizedCrop = (crop: string) => {
    const map: Record<string, string> = {
      wheat: t('cropWheat'), rice: t('cropRice'), potato: t('cropPotato'),
      tomato: t('cropTomato'), cotton: t('cropCotton'), maize: t('cropMaize'), pepper: t('cropPepper')
    };
    return map[crop.toLowerCase()] ?? crop;
  };

  const getHealthColor = (h: 'good' | 'warning' | 'poor') =>
    h === 'good' ? 'text-green-400' : h === 'warning' ? 'text-amber-400' : 'text-rose-400';

  const getHealthBg = (h: 'good' | 'warning' | 'poor') =>
    h === 'good' ? 'bg-green-400' : h === 'warning' ? 'bg-amber-400' : 'bg-rose-400';

  const getStatusBadge = (s: IoTDevice['status']) => {
    if (s === 'online') return <span className="flex items-center gap-1 text-[10px] font-bold text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />LIVE</span>;
    if (s === 'syncing') return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><RefreshCw className="h-3 w-3 animate-spin" />SYNCING</span>;
    return <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-600" />OFFLINE</span>;
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header role={role} setRole={setRole} />

      {/* IoT Device Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="glass-card w-full max-w-md border border-slate-700 shadow-2xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-400" /> Pair IoT Device
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Enter your physical pest trap & sensor unit's serial number</p>
              </div>
              <button onClick={() => setShowPairModal(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePairDevice} className="space-y-4">
              {/* Device Serial Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-green-400" /> Device Serial Number
                </label>
                <input
                  required
                  value={pairSerial}
                  onChange={e => setPairSerial(e.target.value)}
                  placeholder="e.g. KR-PT-20240001"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-mono text-green-300 placeholder-slate-600 focus:border-green-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Found on the label at the back of your IoT pest trap unit
                </p>
              </div>

              {/* Field Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sprout className="h-3.5 w-3.5 text-emerald-400" /> Field Name
                </label>
                <input
                  required
                  value={pairFieldName}
                  onChange={e => setPairFieldName(e.target.value)}
                  placeholder="e.g. North Rice Field, Plot 2"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Crop Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Crop Grown in this Field</label>
                <select
                  value={pairCrop}
                  onChange={e => setPairCrop(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none"
                >
                  {SUPPORTED_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" /> Field Location / Village
                </label>
                <input
                  required
                  value={pairLocation}
                  onChange={e => setPairLocation(e.target.value)}
                  placeholder="e.g. Singur, Hooghly District"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={pairLoading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-green-600/20"
              >
                {pairLoading
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Pairing Device...</>
                  : <><Link2 className="h-4 w-4" /> Pair & Connect Device</>}
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-200 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">{t('offline')}</p>
              <p className="text-xs text-amber-300/80">{t('usingLastRecordedData')}</p>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              Farmer <span className="text-gradient-green">Field Hub</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Monitor your paired IoT pest trap & sensor devices across all fields.
            </p>
          </div>
          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-green-600/20 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" /> Pair New IoT Device
          </button>
        </div>

        {/* ═══ SECTION 1: IoT Device List + Active Device Telemetry ═══════════ */}

        {/* ── ZERO-DEVICE ONBOARDING PANEL ──────────────────────────────────── */}
        {devices.length === 0 && (
          <div className="mb-8">
            {/* Hero onboarding banner */}
            <div className="relative rounded-2xl overflow-hidden border border-green-800/30 bg-gradient-to-br from-slate-900 via-green-950/20 to-slate-900 p-8 sm:p-12">
              {/* Decorative background grid */}
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)', backgroundSize: '28px 28px' }} />
              {/* Glowing orb */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-10">

                {/* Left: Title + description + CTA */}
                <div className="flex-1 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-900/60 text-green-300 border border-green-700/50 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" /> No Devices Connected
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      Connect Your
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300"> IoT Field Devices</span>
                    </h3>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-xl">
                      Pair each pest trap & environmental sensor unit you have deployed in your fields.
                      Once connected, you'll see live temperature, soil moisture, rain chance, humidity,
                      wind speed and real-time insect catch counts — per field, per device.
                    </p>
                  </div>

                  {/* Step-by-step guide */}
                  <div className="space-y-2.5">
                    {[
                      { step: '01', icon: '📦', text: 'Get your KrishiRakshak IoT pest trap & sensor unit deployed in your field' },
                      { step: '02', icon: '🔖', text: 'Find the Device Serial Number printed on the label at the back of the unit (e.g. KR-PT-20240001)' },
                      { step: '03', icon: '📡', text: 'Click "Pair New IoT Device", enter the serial and your field details' },
                      { step: '04', icon: '📊', text: 'View live telemetry for all paired devices across all your fields' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-green-900/60 border border-green-700/50 flex items-center justify-center text-[10px] font-black text-green-400 shrink-0 mt-0.5">{item.step}</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <span className="mr-1.5">{item.icon}</span>{item.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowPairModal(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-green-600/30 transition-all hover:scale-105 active:scale-100"
                  >
                    <Radio className="h-5 w-5" />
                    Pair Your First IoT Device
                  </button>
                </div>

                {/* Right: Sensor metric preview cards */}
                <div className="w-full lg:w-80 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Sensor Data You Will See</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '🌡️', label: 'Temperature', value: '—°C', color: 'text-orange-400', bar: 'bg-orange-400' },
                      { icon: '💧', label: 'Soil Moisture', value: '—%', color: 'text-blue-400', bar: 'bg-blue-400' },
                      { icon: '🌧️', label: 'Rain Chance', value: '—%', color: 'text-sky-400', bar: 'bg-sky-400' },
                      { icon: '💨', label: 'Air Humidity', value: '—%', color: 'text-teal-400', bar: 'bg-teal-400' },
                      { icon: '🌬️', label: 'Wind Speed', value: '— km/h', color: 'text-slate-300', bar: 'bg-slate-400' },
                      { icon: '🪲', label: 'Pest Catches', value: '—', color: 'text-amber-400', bar: 'bg-amber-400' },
                    ].map(metric => (
                      <div key={metric.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 opacity-70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400">{metric.label}</span>
                          <span className="text-base">{metric.icon}</span>
                        </div>
                        <p className={`text-lg font-black ${metric.color}`}>{metric.value}</p>
                        <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full w-0 ${metric.bar} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 text-center mt-3 italic">Live data will appear here after pairing</p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── PAIRED DEVICES LAYOUT (only shown when devices exist) ────────── */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 ${devices.length === 0 ? 'hidden' : ''}`}>

          {/* ── Device List Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5 text-green-400" /> Paired Field Devices ({devices.length})
            </h3>

            {/* Sidebar is only rendered when devices.length > 0 (handled by parent hidden class) */}

            {devices.map(device => (
              <div
                key={device.id}
                onClick={() => setActiveDeviceId(device.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all group ${
                  activeDeviceId === device.id
                    ? 'border-green-500/60 bg-green-950/20 shadow-lg shadow-green-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activeDeviceId === device.id ? 'bg-green-600/20 border border-green-500/30' : 'bg-slate-800/60'
                    }`}>
                      <Radio className={`h-4 w-4 ${activeDeviceId === device.id ? 'text-green-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{device.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{device.deviceSerial}</p>
                    </div>
                  </div>
                  {getStatusBadge(syncingId === device.id ? 'syncing' : device.status)}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Sprout className="h-3 w-3 text-green-500" />{device.crop}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-600" />{device.location}</span>
                </div>

                {/* Mini telemetry strip */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-slate-950/60 rounded-lg p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">Temp</p>
                    <p className="text-xs font-bold text-white">{device.telemetry.temperature}°C</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">Moisture</p>
                    <p className="text-xs font-bold text-white">{device.telemetry.soilMoisture}%</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">Pests</p>
                    <p className={`text-xs font-bold ${device.telemetry.pestCatches > 30 ? 'text-rose-400' : 'text-amber-400'}`}>
                      {device.telemetry.pestCatches}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleSyncDevice(device.id); }}
                    disabled={syncingId === device.id}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg py-1.5 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleUnpairDevice(device.id); }}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/30 text-rose-400 hover:text-rose-300 transition-all"
                    title="Unpair device"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Active Device Full Telemetry Panel ──────────────────────────── */}
          <div className="lg:col-span-2">
            {!activeDevice ? (
              <div className="glass-card border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 h-full">
                <WifiOff className="h-8 w-8 text-slate-700" />
                <p className="text-slate-500 text-sm">Select a paired device to view its live telemetry</p>
              </div>
            ) : (
              <div className="glass-card border border-slate-800 rounded-2xl p-6 space-y-6 h-full">

                {/* Device Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-green-600/15 border border-green-500/30 flex items-center justify-center text-green-400">
                      <Radio className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{activeDevice.name}</h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-green-400">{activeDevice.deviceSerial}</span>
                        <span className="flex items-center gap-1"><Sprout className="h-3 w-3 text-green-500" />{activeDevice.crop}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-600" />{activeDevice.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(syncingId === activeDevice.id ? 'syncing' : activeDevice.status)}
                    <button
                      onClick={() => handleSyncDevice(activeDevice.id)}
                      disabled={syncingId === activeDevice.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingId === activeDevice.id ? 'animate-spin' : ''}`} />
                      Live Sync
                    </button>
                  </div>
                </div>

                {/* ── Health Status Banner ─────────────────────────────────── */}
                <div className={`p-3 rounded-xl flex items-center gap-3 ${
                  activeDevice.telemetry.healthStatus === 'good'
                    ? 'bg-green-950/40 border border-green-800/40'
                    : activeDevice.telemetry.healthStatus === 'warning'
                    ? 'bg-amber-950/40 border border-amber-800/40'
                    : 'bg-rose-950/40 border border-rose-800/40'
                }`}>
                  <Heart className={`h-5 w-5 shrink-0 ${getHealthColor(activeDevice.telemetry.healthStatus)}`} />
                  <div>
                    <p className={`text-xs font-extrabold ${getHealthColor(activeDevice.telemetry.healthStatus)}`}>
                      {activeDevice.telemetry.healthStatus === 'good' ? t('healthGood')
                        : activeDevice.telemetry.healthStatus === 'warning' ? t('healthWarning')
                        : t('healthPoor')}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Last sync: {new Date(activeDevice.telemetry.lastSync).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* ── 6-Metric Telemetry Grid ──────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Temperature */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">{t('sensorTemp')}</span>
                      <Thermometer className="h-4 w-4 text-orange-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{activeDevice.telemetry.temperature}°C</p>
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(activeDevice.telemetry.temperature / 50) * 100}%` }} />
                    </div>
                  </div>

                  {/* Soil Moisture */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">{t('sensorMoisture')}</span>
                      <Droplets className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{activeDevice.telemetry.soilMoisture}%</p>
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${activeDevice.telemetry.soilMoisture}%` }} />
                    </div>
                  </div>

                  {/* Rain Chance */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">{t('sensorRainProbability')}</span>
                      <CloudRain className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{activeDevice.telemetry.rainChance}%</p>
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${activeDevice.telemetry.rainChance}%` }} />
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">Air Humidity</span>
                      <Wind className="h-4 w-4 text-teal-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{activeDevice.telemetry.humidity}%</p>
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${activeDevice.telemetry.humidity}%` }} />
                    </div>
                  </div>

                  {/* Wind Speed */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">Wind Speed</span>
                      <Wind className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{activeDevice.telemetry.windSpeed}</p>
                    <p className="text-[10px] text-slate-500">km/h</p>
                  </div>

                  {/* Pest Catches */}
                  <div className={`border rounded-xl p-4 ${
                    activeDevice.telemetry.pestCatches > 35
                      ? 'bg-rose-950/40 border-rose-800/50'
                      : activeDevice.telemetry.pestCatches > 20
                      ? 'bg-amber-950/40 border-amber-800/50'
                      : 'bg-slate-950/60 border-slate-800/60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-400">Pest Catches Today</span>
                      <Bug className={`h-4 w-4 ${activeDevice.telemetry.pestCatches > 20 ? 'text-rose-400' : 'text-amber-400'}`} />
                    </div>
                    <p className={`text-2xl font-black ${
                      activeDevice.telemetry.pestCatches > 35 ? 'text-rose-400'
                        : activeDevice.telemetry.pestCatches > 20 ? 'text-amber-400'
                        : 'text-white'
                    }`}>
                      {activeDevice.telemetry.pestCatches}
                    </p>
                    {activeDevice.telemetry.pestCatches > 30 && (
                      <p className="text-[10px] text-rose-400 font-bold mt-1">⚠ ETL Breach Alert</p>
                    )}
                  </div>
                </div>

                {/* Paired Since Info */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/50">
                  <span>Paired: {new Date(activeDevice.pairedAt).toLocaleDateString()}</span>
                  <span>Device ID: <span className="font-mono text-green-400">{activeDevice.id}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ SECTION 2: Surveillance Banner ══════════════════════════════════ */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-green-950/80 via-slate-900 to-amber-950/60 border border-green-800/40 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/60 text-green-300 border border-green-700/50 flex items-center gap-1">
                  <Bug className="h-3 w-3 text-amber-400" /> IoT Optical AI Network
                </span>
                {activeDevice && activeDevice.telemetry.pestCatches > 30 && (
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                    ETL Breach Alert Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white">Autonomous Smart Pest Surveillance & Trends</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Monitor live IoT pheromone trap feeds, real-time insect counts, and 7-day predictive population growth curves to trigger bio-control interventions.
              </p>
            </div>
            <Link href="/surveillance" className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shrink-0 transition-all">
              <Activity className="h-4 w-4" /> Open Surveillance Hub
            </Link>
          </div>
        </div>

        {/* ═══ SECTION 3: Mandi Prices + Quick Commands + Scans ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Mandi Price Chart */}
          <div className="lg:col-span-2 glass-card p-6 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />{t('liveMandiPrices')}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-500" />{mandiName}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Wheat','Rice','Potato','Tomato','Cotton'].map(crop => (
                  <button key={crop} onClick={() => setSelectedCrop(crop)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      selectedCrop === crop
                        ? 'bg-green-600/25 border-green-500 text-green-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    {getLocalizedCrop(crop)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px] w-full">
              {loadingPrices ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey={selectedCrop} name={`${getLocalizedCrop(selectedCrop)} (INR/Q)`} stroke="#22c55e" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 text-center border-t border-slate-900 pt-3 flex justify-between text-[11px] text-slate-500">
              <span>Source: Ministry of Agriculture (Agmarknet Portal)</span>
              <span className="flex items-center gap-1 text-slate-400 cursor-pointer hover:text-white">View records <ExternalLink className="h-3 w-3" /></span>
            </div>
          </div>

          {/* Sidebar: Quick Commands + Recent Scans */}
          <div className="space-y-6">

            {/* Quick Commands */}
            <div className="glass-card p-6 border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-4 border-b border-slate-900 pb-2">Quick Commands</h3>
              <div className="space-y-2.5">
                <Link href="/detect" className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-green-950/20 border border-slate-800 hover:border-green-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-105 transition-transform">
                      <Scan className="h-4 w-4" />
                    </div>
                    <div><p className="text-xs font-bold text-white group-hover:text-green-400 transition-colors">{t('navDetect')}</p><p className="text-[10px] text-slate-400">Scan crop anomalies</p></div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link href="/forecasting" className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-sky-950/20 border border-slate-800 hover:border-sky-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                      <CloudRain className="h-4 w-4" />
                    </div>
                    <div><p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">{t('navForecasting')}</p><p className="text-[10px] text-slate-400">Microclimate risk index</p></div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link href="/ipm" className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-amber-950/20 border border-slate-800 hover:border-amber-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div><p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">{t('navIPM')}</p><p className="text-[10px] text-slate-400">Eco management guides</p></div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>

            {/* Recent Scans */}
            <div className="glass-card p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-2">
                <h3 className="font-bold text-white text-sm">{t('historyTitle')}</h3>
                <Link href="/detect" className="text-[10px] text-green-400 font-bold hover:underline">View All</Link>
              </div>
              <div className="space-y-2.5">
                {recentScans.length === 0 ? (
                  <div className="text-center py-5 text-slate-500 text-xs">{t('noHistory')}</div>
                ) : (
                  recentScans.map(scan => (
                    <div key={scan.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-900 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={scan.image} alt={scan.crop} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{scan.crop} · {scan.diagnosis.slice(0, 28)}...</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{new Date(scan.date).toLocaleDateString()}</span>
                          <span className={scan.confidence > 0.75 ? 'text-green-400' : 'text-amber-400'}>{Math.round(scan.confidence * 100)}%</span>
                        </p>
                      </div>
                      {scan.validationRequested && (
                        <span className={`h-2 w-2 rounded-full shrink-0 ${scan.expertVerdict ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI · Agricultural prices powered by Agmarknet portal.
        </p>
      </footer>
    </div>
  );
}
