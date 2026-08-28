'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { Header } from '../../components/Header';
import { dbService, ValidationRequest } from '../../utils/supabase';
import {
  Bug,
  Activity,
  TrendingUp,
  Camera,
  Wifi,
  WifiOff,
  BatteryCharging,
  Sun,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Download,
  Filter,
  Eye,
  Zap,
  Info,
  Layers,
  MapPin,
  Calendar,
  ShieldAlert,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
  Plus,
  X,
  Sprout,
  Link2,
  Unlink
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IoTDevice {
  id: string;
  name: string;
  crop: string;
  location: string;
  deviceSerial: string;
  pairedAt: string;
  status: 'online' | 'offline' | 'syncing';
  telemetry: {
    temperature: number;
    soilMoisture: number;
    humidity: number;
    rainChance: number;
    windSpeed: number;
    pestCatches: number;
    pestSpecies?: Record<string, number>;
    healthStatus: 'good' | 'warning' | 'poor';
    lastSync: string;
  };
}

interface TrapDevice {
  id: string;
  name: string;
  location: string;
  crop: string;
  targetPest: string;
  status: 'online' | 'offline';
  battery: number;
  solarState: string;
  lastCaptureTime: string;
  catchCountToday: number;
  etlThreshold: number;
  cameraFeedUrl: string;
  detectedPests: { label: string; conf: number; x: number; y: number; w: number; h: number }[];
  speciesCounts: Record<string, number>;
}

const DEVICES_KEY = 'krishirakshak_iot_devices';

const PEST_MAPPING: Record<string, { name: string; desc: string; control: string }> = {
  rice: {
    name: 'Brown Planthopper (Nilaparvata lugens)',
    desc: 'Nymphs and adults feed at the base of tillers, causing hopper burn (complete yellowing and drying).',
    control: 'Biological: Cyrtorhinus lividipennis predators. Spray Azadirachtin 0.03% or Pymetrozine 50% WG if ETL exceeds 10 planthoppers/tiller.'
  },
  cotton: {
    name: 'Cotton Bollworm (Helicoverpa armigera)',
    desc: 'Larvae bore into bolls/squares, causing massive shedding and internal lint damage.',
    control: 'Biological: Trichogramma chilonis wasps. Spray HaNPV @ 1x10⁹ POB/ml or Chlorantraniliprole 18.5% SC if ETL exceeds 8 moths/trap.'
  },
  tomato: {
    name: 'Tomato Fruit Fly (Bactrocera dorsalis)',
    desc: 'Adult females puncture ripening tomatoes to lay eggs; larvae burrow inside, causing rot and drop.',
    control: 'Hang methyl eugenol pheromone traps @ 10/acre. Collect and destroy infested fruits immediately.'
  },
  potato: {
    name: 'Potato Aphids (Myzus persicae)',
    desc: 'Sap-sucking insects that cause leaf curling, stunt growth, and transmit Potato Virus Y (PVY).',
    control: 'Release ladybird beetles (Coccinella septempunctata). Spray Neem oil 2% or Imidacloprid 17.8% SL if count exceeds 15 aphids/leaf.'
  },
  wheat: {
    name: 'Cereal Aphids (Macrosiphum avenae)',
    desc: 'Suck sap from tender wheat ears, leaving sticky honeydew that fosters black sooty mold.',
    control: 'Release Chrysoperla carnea predators. Maintain balanced nitrogen application to reduce leaf tenderness.'
  },
  maize: {
    name: 'Fall Armyworm (Spodoptera frugiperda)',
    desc: 'Voracious defoliator chewing large holes in corn whorls, leaving sawdust-like frass.',
    control: 'Apply sand-lime mixture (9:1) in whorls. Deploy pheromone traps @ 5/acre. Spray Metarhizium anisopliae.'
  },
  pepper: {
    name: 'Chili Thrips (Scirtothrips dorsalis)',
    desc: 'Feed on tender leaves causing upward curling (boat shape), dry edges, and flower drop.',
    control: 'Hang blue sticky cards @ 15/acre. Spray Lecanicillium lecanii bio-insecticide. Use spinosad 45% SC.'
  }
};

const FEED_IMAGES: Record<string, string> = {
  cotton: 'https://images.unsplash.com/photo-1599598425947-220a85821e1e?q=80&w=600&auto=format&fit=crop',
  rice: 'https://static.vecteezy.com/system/resources/thumbnails/074/337/958/small/golden-rice-grains-ripen-on-green-stalks-in-a-lush-agricultural-field-ready-for-harvest-photo.jpg',
  tomato: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?q=80&w=600&auto=format&fit=crop',
  potato: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=600&auto=format&fit=crop',
  maize: 'https://images.unsplash.com/photo-1551893086-c02c6cbb4198?q=80&w=600&auto=format&fit=crop',
  pepper: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=600&auto=format&fit=crop',
  wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?q=80&w=600&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=600&auto=format&fit=crop'
};

const SUPPORTED_CROPS = ['Wheat', 'Rice', 'Potato', 'Tomato', 'Cotton', 'Maize', 'Pepper'];

// ── Helper to convert local devices to TrapDevice structure ─────────────────
function mapIoTDevicesToTraps(iotDevices: IoTDevice[]): TrapDevice[] {
  return iotDevices.map((d, index) => {
    const cropKey = d.crop.toLowerCase();
    const pestInfo = PEST_MAPPING[cropKey] || {
      name: 'Common Insect Pests',
      desc: 'Sucking and chewing pests native to regional crops.',
      control: 'Use yellow sticky traps and organic bio-pesticides.'
    };

    // Calculate crop specific threshold
    let limit = 8;
    if (cropKey === 'rice') limit = 10;
    if (cropKey === 'potato') limit = 12;
    if (cropKey === 'wheat') limit = 15;

    // Generate detected pest coordinates based on catches
    const detected: TrapDevice['detectedPests'] = [];
    const count = d.telemetry.pestCatches;
    const label = pestInfo.name.split(' (')[0];
    const speciesCounts = d.telemetry.pestSpecies || { [label]: count };

    for (let i = 0; i < Math.min(count, 5); i++) {
      detected.push({
        label,
        conf: Math.round((0.85 + (i * 0.03) % 0.14) * 100) / 100,
        x: Math.round((15 + (i * 17) % 65)),
        y: Math.round((20 + (i * 13) % 55)),
        w: 18 + (i % 2) * 4,
        h: 18 + (i % 2) * 4
      });
    }

    return {
      id: d.id,
      name: d.name,
      location: d.location,
      crop: d.crop,
      targetPest: pestInfo.name,
      status: d.status === 'offline' ? 'offline' : 'online',
      battery: Math.round((85 - (index * 6) % 30)),
      solarState: d.status === 'offline' ? 'Low Irradiance' : 'Charging (4.7W)',
      lastCaptureTime: d.telemetry.lastSync ? `${new Date(d.telemetry.lastSync).toLocaleTimeString()}` : '5 mins ago',
      catchCountToday: d.telemetry.pestCatches,
      etlThreshold: limit,
      cameraFeedUrl: FEED_IMAGES[cropKey] || FEED_IMAGES.default,
      detectedPests: detected,
      speciesCounts
    };
  });
}

// ── Stable mock trends generator based on devices ────────────────────────────
function generateTrendsFromDevices(traps: TrapDevice[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat (Forecast)', 'Sun (Forecast)'];
  const species = Array.from(new Set(traps.flatMap(trap => Object.keys(trap.speciesCounts))));
  return days.map((day, idx) => {
    const result: Record<string, string | number> = { day };

    traps.forEach(t => {
      Object.entries(t.speciesCounts).forEach(([pestName, count]) => {
        const factor = count * (0.55 + idx * 0.08) + Math.sin(idx + t.id.charCodeAt(3)) * 2;
        result[pestName] = Number(result[pestName] || 0) + Math.max(0, Math.round(factor));
      });
    });

    species.forEach(pestName => { if (result[pestName] === undefined) result[pestName] = 0; });
    return result;
  });
}

export default function SurveillancePage() {
  const { t } = useLanguage();
  const { isOnline } = useOffline();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOfficerView = searchParams.get('view') === 'officer';

  const [role, setRole] = useState<'farmer' | 'officer'>(() => {
    if (typeof window === 'undefined') return 'farmer';
    if (new URLSearchParams(window.location.search).get('view') === 'officer') return 'officer';
    return localStorage.getItem('krishirakshak_role') === 'officer' ? 'officer' : 'farmer';
  });
  const [activeTab, setActiveTab] = useState<'surveillance' | 'trends'>('surveillance');

  // Load devices from localStorage
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [suspectedPestImages, setSuspectedPestImages] = useState<ValidationRequest[]>([]);
  const [traps, setTraps] = useState<TrapDevice[]>([]);
  const [selectedTrapId, setSelectedTrapId] = useState<string>('');

  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '14d' | '30d'>('7d');
  const [selectedPestFilter, setSelectedPestFilter] = useState<string>('all');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [infraredMode, setInfraredMode] = useState<boolean>(false);
  const [lureFlushActive, setLureFlushActive] = useState<boolean>(false);

  // Pair Modal state
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairFieldName, setPairFieldName] = useState('');
  const [pairCrop, setPairCrop] = useState('Rice');
  const [pairLocation, setPairLocation] = useState('');
  const [pairSerial, setPairSerial] = useState('');
  const [pairLoading, setPairLoading] = useState(false);

  // Load devices
  const loadDevices = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DEVICES_KEY);
      const list: IoTDevice[] = raw ? JSON.parse(raw) : [];
      setDevices(list);
      const mapped = mapIoTDevicesToTraps(list);
      setTraps(mapped);
      if (mapped.length > 0) {
        setSelectedTrapId(mapped[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const savedRole = localStorage.getItem('krishirakshak_role') as 'farmer' | 'officer';
    if (requestedOfficerView) setRole('officer');
    else if (savedRole) setRole(savedRole);
    dbService.getValidationRequests().then(requests => {
      setSuspectedPestImages(requests.filter(request => request.status === 'pending' && request.type === 'pest'));
    }).catch(console.error);
  }, [loadDevices, requestedOfficerView]);

  const selectedTrap = traps.find(t => t.id === selectedTrapId) || traps[0] || null;

  // Trigger automated camera capture simulation
  const handleTriggerCapture = () => {
    if (!selectedTrapId) return;
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);

      // Update in traps state
      setTraps(prev =>
        prev.map(t => {
          if (t.id === selectedTrapId) {
            return {
              ...t,
              catchCountToday: t.catchCountToday + 1,
              speciesCounts: {
                ...t.speciesCounts,
                [t.targetPest.split(' (')[0]]: (t.speciesCounts[t.targetPest.split(' (')[0]] || 0) + 1
              },
              lastCaptureTime: 'Just now',
              detectedPests: [
                ...t.detectedPests,
                {
                  label: t.targetPest.split(' (')[0],
                  conf: 0.95,
                  x: Math.floor(Math.random() * 60) + 15,
                  y: Math.floor(Math.random() * 60) + 15,
                  w: 20,
                  h: 20
                }
              ]
            };
          }
          return t;
        })
      );

      // Also update in devices localStorage
      const selectedSpeciesName = selectedTrap?.targetPest.split(' (')[0] || 'Common Insect Pests';
      const updatedDevices = devices.map(d => {
        if (d.id === selectedTrapId) {
          const currentSpecies = d.telemetry.pestSpecies || { [selectedSpeciesName]: d.telemetry.pestCatches };
          return {
            ...d,
            telemetry: {
              ...d.telemetry,
              pestCatches: d.telemetry.pestCatches + 1,
              pestSpecies: { ...currentSpecies, [selectedSpeciesName]: (currentSpecies[selectedSpeciesName] || 0) + 1 },
              lastSync: new Date().toISOString()
            }
          };
        }
        return d;
      });
      setDevices(updatedDevices);
      localStorage.setItem(DEVICES_KEY, JSON.stringify(updatedDevices));
    }, 1200);
  };

  // Trigger Pheromone Lure Refresh Flush
  const handleLureFlush = () => {
    setLureFlushActive(true);
    setTimeout(() => {
      setLureFlushActive(false);
    }, 2000);
  };

  // Pair device form submission
  const handlePairDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairFieldName.trim() || !pairSerial.trim() || !pairLocation.trim()) return;
    setPairLoading(true);

    await new Promise(r => setTimeout(r, 1200));

    // Seed mock telemetry
    const newDevice: IoTDevice = {
      id: `KR-${Date.now().toString().slice(-6)}`,
      name: pairFieldName.trim(),
      crop: pairCrop,
      location: pairLocation.trim(),
      deviceSerial: pairSerial.trim().toUpperCase(),
      pairedAt: new Date().toISOString(),
      status: 'online',
      telemetry: {
        temperature: Math.round((24 + Math.random() * 12) * 10) / 10,
        soilMoisture: Math.round(40 + Math.random() * 35),
        humidity: Math.round(50 + Math.random() * 35),
        rainChance: Math.round(Math.random() * 80),
        windSpeed: Math.round(5 + Math.random() * 20),
        pestCatches: Math.round(5 + Math.random() * 30),
        pestSpecies: { [PEST_MAPPING[pairCrop.toLowerCase()]?.name.split(' (')[0] || 'Common Insect Pests']: Math.round(5 + Math.random() * 30) },
        healthStatus: Math.random() > 0.3 ? 'good' : 'warning',
        lastSync: new Date().toISOString()
      }
    };

    const updated = [newDevice, ...devices];
    localStorage.setItem(DEVICES_KEY, JSON.stringify(updated));
    loadDevices();
    setShowPairModal(false);
    setPairFieldName(''); setPairCrop('Rice'); setPairLocation(''); setPairSerial('');
    setPairLoading(false);
  };

  // Compute metrics
  const totalCatchesToday = traps.reduce((acc, curr) => acc + curr.catchCountToday, 0);
  const etlBreachedTrapsCount = traps.filter(t => t.catchCountToday >= t.etlThreshold).length;
  const activeNodesCount = traps.length;
  const onlineNodesCount = traps.filter(t => t.status === 'online').length;
  const offlineNodesCount = traps.filter(t => t.status === 'offline').length;

  const trendsData = generateTrendsFromDevices(traps);
  const pestSpecies = Array.from(new Set(traps.flatMap(trap => Object.keys(trap.speciesCounts))));
  const chartSpecies = selectedPestFilter === 'all' ? pestSpecies : [selectedPestFilter];
  const chartColors = ['#22c55e', '#f59e0b', '#38bdf8', '#f43f5e', '#a78bfa', '#14b8a6'];

  // Get active trap target crop & pest details
  const cropKey = selectedTrap ? selectedTrap.crop.toLowerCase() : '';
  const activePestInfo = PEST_MAPPING[cropKey] || {
    name: 'Common Field Pests',
    desc: 'General insect populations monitoring on agricultural fields.',
    control: 'Deploy yellow sticky sheets, clean weeds, apply systemic organic bio-control agents.'
  };

  const riskScore = (device: IoTDevice) => {
    const telemetry = device.telemetry;
    return (telemetry.pestCatches > 35 ? 4 : telemetry.pestCatches > 30 ? 3 : telemetry.pestCatches > 12 ? 2 : 1)
      + (telemetry.soilMoisture < 35 ? 2 : 0)
      + (telemetry.humidity > 78 || telemetry.rainChance > 65 || telemetry.temperature > 36 ? 1 : 0);
  };
  const sortedOfficerNodes = [...devices].sort((a, b) => riskScore(b) - riskScore(a) || b.telemetry.pestCatches - a.telemetry.pestCatches);

  if (role === 'officer') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header role={role} setRole={setRole} />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3"><Bug className="h-8 w-8 text-amber-400" /> Pest surveillance</h1>
              <p className="text-sm text-slate-400 mt-1">All farmer nodes and suspected pest images, ordered by operational risk.</p>
            </div>
            <button onClick={loadDevices} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Refresh nodes</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 glass-card border border-slate-800 p-6">
              <div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="text-lg font-bold text-white">Farmer surveillance nodes</h2><p className="text-xs text-slate-500 mt-1">Highest combined pest, moisture, and weather risk appears first.</p></div><span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">{sortedOfficerNodes.length} nodes</span></div>
              {sortedOfficerNodes.length === 0 ? <p className="py-8 text-sm text-slate-500">No farmer nodes are reporting yet.</p> : <div className="space-y-3">{sortedOfficerNodes.map(node => { const highRisk = node.telemetry.pestCatches > 30; const moistureRisk = node.telemetry.soilMoisture < 35; const weatherRisk = node.telemetry.humidity > 78 || node.telemetry.rainChance > 65 || node.telemetry.temperature > 36; return <div key={node.id} className={`rounded-xl border p-4 ${highRisk ? 'border-rose-700/70 bg-rose-950/10' : 'border-slate-800 bg-slate-950/60'}`}><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${highRisk ? 'bg-rose-400 animate-pulse' : 'bg-green-400'}`} /><h3 className="font-bold text-white">{node.name}</h3><span className="text-[10px] text-slate-500">{node.deviceSerial}</span></div><p className="text-xs text-slate-400 mt-1">{node.crop} · {node.location}</p></div><div className="text-left sm:text-right"><p className={`text-sm font-black ${highRisk ? 'text-rose-400' : 'text-amber-400'}`}>{node.telemetry.pestCatches} pests today</p><p className="text-[10px] text-slate-500">Risk score {riskScore(node)}</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">{moistureRisk && <span className="rounded bg-blue-950 px-2 py-1 text-blue-300">Low moisture {node.telemetry.soilMoisture}%</span>}{weatherRisk && <span className="rounded bg-amber-950 px-2 py-1 text-amber-300">Weather risk</span>}{highRisk && <span className="rounded bg-rose-950 px-2 py-1 text-rose-300">Urgent pest spike</span>}</div></div>; })}</div>}
            </section>

            <section className="glass-card border border-slate-800 p-6">
              <div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="text-lg font-bold text-white">Suspected pest images</h2><p className="text-xs text-slate-500 mt-1">Pending farmer submissions requiring review.</p></div><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{suspectedPestImages.length}</span></div>
              {suspectedPestImages.length === 0 ? <p className="py-8 text-sm text-slate-500">No suspected pest images awaiting review.</p> : <div className="space-y-3">{suspectedPestImages.map(request => <Link key={request.id} href="/dashboard/officer" className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-amber-700/60"><div className="flex items-start gap-3"><img src={request.image} alt={request.crop} className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0"><p className="font-bold text-white truncate">{request.original_diagnosis}</p><p className="text-xs text-slate-400 mt-1">{request.crop} · {request.farmer_location}</p><p className="text-[10px] text-amber-400 mt-2">Confidence {Math.round(request.confidence * 100)}% · Review now</p></div></div></Link>)}</div>}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        <Header role={role} setRole={setRole} />

        {/* Pair IoT Device Modal */}
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

              <form onSubmit={handlePairDeviceSubmit} className="space-y-4">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Top Title & Subheader */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-950/60 border border-green-800/40 text-green-400 flex items-center gap-1.5">
                  <Radio className="h-3 w-3 animate-pulse text-green-400" /> Live IoT Surveillance Node
                </span>
                {!isOnline && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center gap-1.5">
                    <WifiOff className="h-3 w-3" /> Showing Last Offline Data
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white mt-2 flex items-center gap-3">
                <Bug className="h-8 w-8 text-green-500" />
                {t('surveillanceTitle')}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-3xl">
                {t('surveillanceDesc')}
              </p>
            </div>

            {devices.length > 0 && (
              <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab('surveillance')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'surveillance'
                      ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {t('tabSurveillance')}
                </button>
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'trends'
                      ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  {t('tabTrends')}
                </button>
              </div>
            )}
          </div>

          {/* ── ZERO DEVICES EMPTY STATE ────────────────────────────────────── */}
          {devices.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden border border-green-800/30 bg-gradient-to-br from-slate-900 via-green-950/20 to-slate-900 p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)', backgroundSize: '28px 28px' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />

              <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                <div className="h-16 w-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center mx-auto text-green-400">
                  <Radio className="h-8 w-8 animate-pulse" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  No Active Smart Pest Traps Deployed
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  In order to monitor live insect count, detect species automatically using edge computer vision,
                  and plot population curves, you must pair your deployed field trap hardware first.
                </p>

                <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-900/60 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-900 pb-2">
                    <Info className="h-4 w-4 text-green-400" /> Platform Prerequisites:
                  </p>
                  <div className="grid gap-2 text-xs text-slate-400">
                    <p className="flex gap-2"><span>•</span> <span>Physical Pheromone Trap or Smart Light Trap deployed on crop fields.</span></p>
                    <p className="flex gap-2"><span>•</span> <span>Integrated IoT micro-controller unit and solar power system.</span></p>
                    <p className="flex gap-2"><span>•</span> <span>Valid Device serial credentials for pairing.</span></p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => setShowPairModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-green-600/30 transition-all hover:scale-105"
                  >
                    Pair IoT Device Now
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/farmer')}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm rounded-xl transition-all"
                  >
                    Back to Field Hub
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Trap Nodes KPI Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                
                <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('activeTraps')}</p>
                    <h3 className="text-2xl font-black text-white mt-1">{activeNodesCount} / {activeNodesCount} Nodes</h3>
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1 font-semibold">
                      <Wifi className="h-3.5 w-3.5" /> {onlineNodesCount} Online · {offlineNodesCount} Offline
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-green-950/50 border border-green-800/40 flex items-center justify-center text-green-400">
                    <Radio className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('totalCatches')}</p>
                    <h3 className="text-2xl font-black text-white mt-1">{totalCatchesToday} Insects</h3>
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-semibold">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Live Catch Rate
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-amber-400">
                    <Bug className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ETL Breach Alert</p>
                    <h3 className={`text-2xl font-black mt-1 ${etlBreachedTrapsCount > 0 ? 'text-rose-400' : 'text-green-400'}`}>
                      {etlBreachedTrapsCount > 0 ? `${etlBreachedTrapsCount} Traps Critical` : 'Safe Level'}
                    </h3>
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      {etlBreachedTrapsCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                      {etlBreachedTrapsCount > 0 ? 'Action Required Immediately' : 'Below Economic Threshold'}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${
                    etlBreachedTrapsCount > 0 ? 'bg-rose-950/50 border-rose-800/40 text-rose-400' : 'bg-green-950/50 border-green-800/40 text-green-400'
                  }`}>
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">7-Day Population Forecast</p>
                    <h3 className="text-2xl font-black text-white mt-1">+35% Expected</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-amber-400" /> High Humidity Favorable
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>

              </div>

              {/* ─────────────────────────────────────────────────────────────────────────────
                  TAB 1: AUTONOMOUS SMART PEST SURVEILLANCE VIEW
                 ───────────────────────────────────────────────────────────────────────────── */}
              {activeTab === 'surveillance' && selectedTrap && (
                <div className="space-y-8">
                  
                  {/* Emergency Alert Header Banner if ETL Breached */}
                  {etlBreachedTrapsCount > 0 && (
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-rose-950/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-rose-900/60 text-rose-300 shrink-0">
                          <AlertTriangle className="h-6 w-6 animate-pulse text-rose-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-rose-200">
                            High Pest Threshold Alert: Economic Threshold Level (ETL) Exceeded in {etlBreachedTrapsCount} Traps
                          </h4>
                          <p className="text-xs text-rose-300/80 mt-0.5">
                            Pest threshold density has exceeded critical levels in your fields. Immediate biological or targeted chemical control recommended.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/ipm')}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        View IPM Bio-Control Action Plan
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Trap Selector Grid & Network Health */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-white flex items-center justify-between">
                        <span>IoT Trap Network Nodes</span>
                        <span className="text-xs text-slate-400 font-normal">Select node to inspect feed</span>
                      </h3>

                      <div className="space-y-3">
                        {traps.map(t => {
                          const isSelected = t.id === selectedTrapId;
                          const isEtlBreached = t.catchCountToday >= t.etlThreshold;

                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTrapId(t.id)}
                              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 border-green-500 shadow-md shadow-green-500/10'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${t.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                    <h4 className="text-sm font-bold text-white">{t.name}</h4>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-500" /> {t.location} · <span className="text-green-400 font-semibold">{t.crop}</span>
                                  </p>
                                </div>

                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  isEtlBreached
                                    ? 'bg-rose-950/60 border-rose-800/40 text-rose-400'
                                    : 'bg-green-950/60 border-green-800/40 text-green-400'
                                }`}>
                                  {isEtlBreached ? 'ETL Breach' : 'Normal'}
                                </span>
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                                    <Bug className="h-3.5 w-3.5 text-amber-400" /> {t.catchCountToday} caught
                                  </span>
                                  <span className="text-slate-500">| Limit: {t.etlThreshold}</span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <Sun className="h-3 w-3 text-amber-400" /> {t.battery}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Center & Right Column: Live Optical AI Camera Feed & Control Panel */}
                    <div className="lg:col-span-2 space-y-6">

                      <div className="glass-card p-6 border border-slate-800 space-y-4">
                        
                        {/* Feed Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base">{selectedTrap.name}</h3>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                                ID: {selectedTrap.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Target Species: <span className="text-slate-200 font-semibold">{selectedTrap.targetPest}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Night IR Toggle */}
                            <button
                              onClick={() => setInfraredMode(!infraredMode)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                infraredMode
                                  ? 'bg-purple-950/60 border-purple-700 text-purple-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {infraredMode ? 'IR Night Vision Active' : 'Standard Optical'}
                            </button>
                          </div>
                        </div>

                        {/* Simulated Optical AI Camera Screen */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video group">
                          
                          {/* Base Feed Image */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedTrap.cameraFeedUrl}
                            alt="IoT Smart Trap Live Camera Feed"
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              infraredMode ? 'brightness-125 contrast-150 hue-rotate-90 filter invert' : 'brightness-95'
                            }`}
                          />

                          {/* Optical AI Detection Bounding Boxes Overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            {selectedTrap.detectedPests.map((box, idx) => (
                              <div
                                key={idx}
                                style={{
                                  left: `${box.x}%`,
                                  top: `${box.y}%`,
                                  width: `${box.w}%`,
                                  height: `${box.h}%`
                                }}
                                className="absolute border-2 border-rose-500 bg-rose-500/10 rounded animate-pulse"
                              >
                                <span className="absolute -top-5 left-0 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                                  {box.label} ({Math.round(box.conf * 100)}%)
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Camera Telemetry Header Bar */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono font-semibold text-white bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/60">
                            <span className="flex items-center gap-1.5 text-green-400">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                              REC · LIVE FEED 1080P
                            </span>
                            <span className="text-slate-300 font-mono">ID: {selectedTrap.id}</span>
                            <span className="text-amber-400 font-bold">{selectedTrap.lastCaptureTime}</span>
                          </div>

                          {/* Capturing Animation Indicator */}
                          {isCapturing && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="h-8 w-8 text-green-400 animate-spin" />
                              <p className="text-xs font-bold text-white">Capturing High-Resolution Macro Image & Running Species AI Classifier...</p>
                            </div>
                          )}
                        </div>

                        {/* Camera Control Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <button
                            onClick={handleTriggerCapture}
                            disabled={isCapturing}
                            className="py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-green-600/10 cursor-pointer"
                          >
                            <Camera className="h-4 w-4" /> Trigger Instant Trap Capture
                          </button>

                          <button
                            onClick={handleLureFlush}
                            disabled={lureFlushActive}
                            className="py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Zap className={`h-4 w-4 text-amber-400 ${lureFlushActive ? 'animate-bounce' : ''}`} />
                            {lureFlushActive ? 'Pheromone Flushing...' : 'Deploy Pheromone Lure Refresh'}
                          </button>

                          <button
                            onClick={() => setActiveTab('trends')}
                            className="py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <TrendingUp className="h-4 w-4 text-sky-400" /> View Species Population Curves
                          </button>
                        </div>

                      </div>

                      {/* Species Identification & Action Card */}
                      <div className="glass-card p-6 border border-slate-800 space-y-4">
                        <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-900 pb-2">
                          <Bug className="h-4 w-4 text-amber-500" />
                          Species Diagnostics & Integrated Management (IPM)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          
                          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pest Biology</span>
                            <p className="font-bold text-white text-sm">{selectedTrap.targetPest}</p>
                            <p className="text-slate-400 leading-relaxed">
                              {activePestInfo.desc}
                            </p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recommended Control Measures</span>
                            <p className="text-slate-400 leading-relaxed">
                              {activePestInfo.control}
                            </p>
                          </div>

                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────────────────────
                  TAB 2: PEST POPULATION TREND ANALYSIS VIEW
                 ───────────────────────────────────────────────────────────────────────────── */}
              {activeTab === 'trends' && (
                <div className="space-y-8">

                  {/* Controls Bar: Timeframe & Species Filters */}
                  <div className="glass-card p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-300">Time Horizon:</span>
                      <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
                        {(['7d', '14d', '30d'] as const).map(tf => (
                          <button
                            key={tf}
                            onClick={() => setSelectedTimeframe(tf)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              selectedTimeframe === tf ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {tf === '7d' ? '7 Days' : tf === '14d' ? '14 Days' : '30 Days'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={selectedPestFilter}
                        onChange={e => setSelectedPestFilter(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-green-600 focus:outline-none"
                      >
                        <option value="all">All Pest Species</option>
                        {pestSpecies.map(pestName => <option key={pestName} value={pestName}>{pestName}</option>)}
                      </select>
                    </div>

                  </div>

                  {/* Main Population Curve Graph Component */}
                  <div className="glass-card p-6 border border-slate-800 space-y-6">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                      <div>
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-400" />
                          Daily Catch Trajectory & Predictive Growth Curve
                        </h3>
                        <p className="text-xs text-slate-400">
                          Comparing historical trap catches with the red Economic Threshold Line (ETL limit).
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-green-400">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Actual Catches
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 7-Day Forecast Curve
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <span className="h-0.5 w-4 bg-rose-500" /> ETL Danger Line
                        </span>
                      </div>
                    </div>

                    <div className="h-[340px] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendsData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                          <CartesianGrid stroke="#1c2940" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} />
                          <YAxis allowDecimals={false} tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} label={{ value: 'Individuals', angle: -90, position: 'insideLeft', fill: '#71809b', fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0d1628', border: '1px solid #263653', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} formatter={(value, name) => [`${value} insects`, name]} />
                          <Legend wrapperStyle={{ paddingTop: 16, color: '#94a3b8', fontSize: 12 }} />
                          {chartSpecies.map((pestName, index) => <Line key={pestName} type="monotone" dataKey={pestName} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={{ r: 3, fill: chartColors[index % chartColors.length], strokeWidth: 0 }} activeDot={{ r: 5 }} />)}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                  </div>

                  {/* Regional Sector Breakdown & Risk Matrix */}
                  <div className="glass-card p-6 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-400" /> Regional Sector Pest Density & ETL Risk Matrix
                      </h4>
                      <button
                        onClick={() => alert("Downloading Pest Surveillance Report (CSV)...")}
                        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Export Report (CSV)
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Field / Trap Name</th>
                            <th className="py-3 px-4">Target Crop</th>
                            <th className="py-3 px-4">Dominant Pest Species</th>
                            <th className="py-3 px-4">Catch Rate (Daily)</th>
                            <th className="py-3 px-4">ETL Status</th>
                            <th className="py-3 px-4 text-right">Recommended Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-medium">
                          {traps.map(t => {
                            const isBreached = t.catchCountToday >= t.etlThreshold;
                            return (
                              <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${t.status === 'online' ? 'bg-green-500' : 'bg-slate-500'}`} />
                                  {t.name} <span className="font-mono text-[10px] text-slate-500">({t.id})</span>
                                </td>
                                <td className="py-3 px-4 text-slate-300">{t.crop}</td>
                                <td className="py-3 px-4 text-slate-300">{t.targetPest}</td>
                                <td className="py-3 px-4 font-bold text-white">{t.catchCountToday} insects / day</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    isBreached
                                      ? 'bg-rose-950/60 border-rose-800/40 text-rose-400'
                                      : 'bg-green-950/60 border-green-800/40 text-green-400'
                                  }`}>
                                    {isBreached ? 'ETL BREACH' : 'SAFE'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-bold">
                                  {isBreached ? (
                                    <button
                                      onClick={() => router.push('/ipm')}
                                      className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                                    >
                                      Deploy Parasitoids / Spray
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 font-normal">Monitor Weekly</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI · Autonomous Smart Pest Surveillance & ETL Trend Analysis Node.
        </p>
      </footer>
    </div>
  );
}
