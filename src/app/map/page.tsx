'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { Header } from '../../components/Header';
import { dbService, HotspotRecord } from '../../utils/supabase';
import {
  Map as MapIcon,
  Filter,
  MapPin,
  Activity,
  AlertCircle,
  Info,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Share2,
  ShieldCheck,
  Radio,
  Bug,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Layers,
  Search,
  Send,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadIoTDevices } from '../../utils/iotDevices';
import dynamic from 'next/dynamic';

const CommunityMapCanvas = dynamic(() => import('../../components/CommunityMapCanvas'), { ssr: false });

interface CommunityNode extends HotspotRecord {
  farmCode: string;
  contributorType: 'smart_trap' | 'farmer_scan' | 'officer_report';
  pestCount24h?: number;
  populationGrowth?: string;
  clusterGroup: string;
  needsInspection: boolean;
  inspectionStatus: 'pending' | 'dispatched' | 'completed';
}

const EXTENDED_COMMUNITY_NODES: CommunityNode[] = [
  {
    id: 'node-1',
    farmCode: 'Farm Node A 🔴',
    contributorType: 'smart_trap',
    crop: 'Cotton',
    disease: 'Cotton Bollworm Infestation',
    severity: 'high',
    latitude: 22.84,
    longitude: 88.12,
    village: 'Singur Sector 4 (Farm A)',
    pestCount24h: 24,
    populationGrowth: '+42% (24h)',
    clusterGroup: 'Hooghly Cotton-Bollworm Cluster',
    needsInspection: true,
    inspectionStatus: 'pending',
    created_at: new Date().toISOString()
  },
  {
    id: 'node-2',
    farmCode: 'Farm Node B 🟠',
    contributorType: 'farmer_scan',
    crop: 'Cotton',
    disease: 'Cotton Bollworm Infestation',
    severity: 'medium',
    latitude: 22.88,
    longitude: 88.16,
    village: 'Singur Sector 2 (Farm B)',
    pestCount24h: 14,
    populationGrowth: '+28% (24h)',
    clusterGroup: 'Hooghly Cotton-Bollworm Cluster',
    needsInspection: true,
    inspectionStatus: 'pending',
    created_at: new Date().toISOString()
  },
  {
    id: 'node-3',
    farmCode: 'Farm Node C 🔴',
    contributorType: 'smart_trap',
    crop: 'Potato',
    disease: 'Late Blight',
    severity: 'high',
    latitude: 22.79,
    longitude: 88.08,
    village: 'Dhaniakhali Zone 1 (Farm C)',
    pestCount24h: 0,
    populationGrowth: 'Rapid Fungal Spore Spread',
    clusterGroup: 'Dhaniakhali Potato Blight Cluster',
    needsInspection: true,
    inspectionStatus: 'dispatched',
    created_at: new Date().toISOString()
  },
  {
    id: 'node-4',
    farmCode: 'Farm Node D 🟡',
    contributorType: 'farmer_scan',
    crop: 'Rice',
    disease: 'Rice Blast',
    severity: 'medium',
    latitude: 23.12,
    longitude: 88.48,
    village: 'Ranaghat Sector 3 (Farm D)',
    pestCount24h: 18,
    populationGrowth: '+15% (24h)',
    clusterGroup: 'Nadia Rice Blast Corridor',
    needsInspection: false,
    inspectionStatus: 'completed',
    created_at: new Date().toISOString()
  },
  {
    id: 'node-5',
    farmCode: 'Farm Node E 🔴',
    contributorType: 'smart_trap',
    crop: 'Rice',
    disease: 'Brown Planthopper (Pest Spike)',
    severity: 'high',
    latitude: 23.15,
    longitude: 88.52,
    village: 'Ranaghat East (Farm E)',
    pestCount24h: 38,
    populationGrowth: '+65% (24h Severe Spike)',
    clusterGroup: 'Nadia Rice Blast Corridor',
    needsInspection: true,
    inspectionStatus: 'pending',
    created_at: new Date().toISOString()
  }
];

export default function GeospatialMapPage() {
  const { t, language } = useLanguage();
  const { isOnline } = useOffline();
  const router = useRouter();

  const [role, setRole] = useState<'farmer' | 'officer'>('officer');
  const [nodes, setNodes] = useState<CommunityNode[]>(EXTENDED_COMMUNITY_NODES);
  const [selectedNode, setSelectedNode] = useState<CommunityNode>(EXTENDED_COMMUNITY_NODES[0]);
  
  // Filters
  const [cropFilter, setCropFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [showClusterLines, setShowClusterLines] = useState<boolean>(true);
  const [activeViewMode, setActiveViewMode] = useState<'map' | 'inspection_queue'>('map');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedRole = localStorage.getItem('krishirakshak_role') as 'farmer' | 'officer';
      if (savedRole) setRole(savedRole);
      const deviceNodes: CommunityNode[] = loadIoTDevices().map((device, index) => {
        const latitude = device.latitude ?? 22.81 + (index % 3) * 0.04;
        const longitude = device.longitude ?? 88.23 + (index % 3) * 0.04;
        const severity = device.telemetry.pestCatches > 30 ? 'high' : device.telemetry.pestCatches > 12 ? 'medium' : 'low';
        return { id: `device-${device.id}`, farmCode: device.name, contributorType: 'smart_trap', crop: device.crop, disease: `${device.crop} pest activity`, severity, latitude, longitude, village: device.location, pestCount24h: device.telemetry.pestCatches, populationGrowth: severity === 'high' ? 'High activity spike' : 'Monitoring live activity', clusterGroup: `${device.location} surveillance cluster`, needsInspection: severity === 'high', inspectionStatus: 'pending', created_at: device.pairedAt };
      });
      if (deviceNodes.length > 0) {
        setNodes(prev => [...deviceNodes, ...prev.filter(node => !deviceNodes.some(deviceNode => deviceNode.id === node.id))]);
        setSelectedNode(deviceNodes[0]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Filter nodes based on user selections
  const filteredNodes = nodes.filter(node => {
    const matchCrop = cropFilter === 'All' || node.crop.toLowerCase() === cropFilter.toLowerCase();
    const matchSeverity = severityFilter === 'All' || node.severity.toLowerCase() === severityFilter.toLowerCase();
    return matchCrop && matchSeverity;
  });

  // Action: Officer dispatches field inspection
  const handleDispatchInspection = (nodeId: string) => {
    setNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, inspectionStatus: 'dispatched' } : n))
    );
    if (selectedNode.id === nodeId) {
      setSelectedNode(prev => ({ ...prev, inspectionStatus: 'dispatched' }));
    }
  };

  const getLocalizedCrop = (cropName: string) => {
    switch (cropName.toLowerCase()) {
      case 'wheat': return t('cropWheat');
      case 'rice': return t('cropRice');
      case 'potato': return t('cropPotato');
      case 'tomato': return t('cropTomato');
      case 'cotton': return t('cropCotton');
      default: return cropName;
    }
  };

  const emergingHotspotsCount = nodes.filter(n => n.severity === 'high').length;
  const inspectionNeededCount = nodes.filter(n => n.needsInspection && n.inspectionStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        <Header role={role} setRole={setRole} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Top Title & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <button
                onClick={() => router.push(role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-3 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
              
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-950/60 border border-green-800/40 text-green-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Anonymized Farmer Network
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                  Real-time Mesh Telemetry
                </span>
              </div>

              <h1 className="text-3xl font-black text-white mt-2 flex items-center gap-3">
                <MapIcon className="h-8 w-8 text-green-500" />
                {t('communityMapTitle')}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-3xl">
                {t('communityMapDesc')}
              </p>
            </div>

            {/* View Switcher: Map vs Inspection Queue */}
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1.5 shrink-0">
              <button
                onClick={() => setActiveViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeViewMode === 'map'
                    ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" /> {t('tabMeshMap')}
              </button>
              <button
                onClick={() => setActiveViewMode('inspection_queue')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                  activeViewMode === 'inspection_queue'
                    ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                {t('tabInspectionQueue')}
                {inspectionNeededCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                    {inspectionNeededCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Anonymized Data Pipeline Flow Diagram Banner */}
          <div className="glass-card p-4 border border-slate-800 mb-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block">{t('participatingStream')}</span>
                  <span className="text-[11px] text-slate-400">100% Privacy-Preserving Anonymization</span>
                </div>
              </div>

              {/* Anonymized Nodes Graph Visualizer */}
              <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                <span className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/40 text-rose-400">Farm A 🔴</span>
                <span className="text-slate-600">➔</span>
                <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/40 text-amber-400">Farm B 🟠</span>
                <span className="text-slate-600">➔</span>
                <span className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/40 text-rose-400">Farm C 🔴</span>
                <span className="text-slate-600">➔</span>
                <span className="px-3 py-1 rounded bg-green-950/80 border border-green-700 text-green-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-green-400" /> Regional Hotspot Mesh
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                <span>5 Nodes Active Today</span>
              </div>

            </div>
          </div>

          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('emergingHotspots')}</p>
                <h3 className="text-2xl font-black text-rose-400 mt-1">{emergingHotspotsCount} Critical Clusters</h3>
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" /> High Pathogen Spread
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('increasingPestPop')}</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">2 Active Spikes</h3>
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-semibold">
                  <Bug className="h-3.5 w-3.5" /> &gt;35% Population Jump (24h)
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-amber-400">
                <Bug className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('diseaseClusters')}</p>
                <h3 className="text-2xl font-black text-white mt-1">2 Active Corridors</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  Hooghly & Nadia Sectors
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400">
                <Layers className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-5 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('areasNeedingInspection')}</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{inspectionNeededCount} Priority Visits</h3>
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-semibold">
                  <UserCheck className="h-3.5 w-3.5" /> Dispatch Pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-950/50 border border-green-800/40 flex items-center justify-center text-green-400">
                <MapPin className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* VIEW MODE 1: REGIONAL NETWORK MAP */}
          {activeViewMode === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

              {/* Left Column: Filter & Node Cluster List (1 Col) */}
              <div className="space-y-6">
                
                {/* Filters */}
                <div className="glass-card p-5 border border-slate-800 space-y-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-900 pb-2">
                    <Filter className="h-4 w-4 text-green-400" /> Mesh Filters
                  </h3>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-semibold text-slate-400">{t('mapFilterCrops')}</label>
                    <select
                      value={cropFilter}
                      onChange={e => setCropFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-green-600"
                    >
                      <option value="All">{t('allCrops')}</option>
                      <option value="Wheat">{t('cropWheat')}</option>
                      <option value="Rice">{t('cropRice')}</option>
                      <option value="Potato">{t('cropPotato')}</option>
                      <option value="Tomato">{t('cropTomato')}</option>
                      <option value="Cotton">{t('cropCotton')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-semibold text-slate-400">{t('mapFilterSeverity')}</label>
                    <select
                      value={severityFilter}
                      onChange={e => setSeverityFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-green-600"
                    >
                      <option value="All">{t('allSeverities')}</option>
                      <option value="High">{t('severityHigh')}</option>
                      <option value="Medium">{t('severityMedium')}</option>
                      <option value="Low">{t('severityLow')}</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-900">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showClusterLines}
                        onChange={e => setShowClusterLines(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-green-600 focus:ring-green-600"
                      />
                      Draw Cluster Vector Lines
                    </label>
                  </div>
                </div>

                {/* Node List */}
                <div className="glass-card p-5 border border-slate-800">
                  <h3 className="font-bold text-white text-sm mb-4 border-b border-slate-900 pb-2">
                    Community Nodes ({filteredNodes.length})
                  </h3>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {filteredNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                          selectedNode.id === node.id
                            ? 'bg-green-950/30 border-green-600 text-white shadow-md'
                            : 'bg-slate-950/50 border-slate-900 hover:border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white truncate">{node.farmCode}</p>
                          <span className="text-[10px] text-slate-400 block">{node.village}</span>
                          <span className="text-[10px] text-green-400 font-semibold">{getLocalizedCrop(node.crop)}</span>
                        </div>

                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          node.severity === 'high' ? 'bg-rose-500 animate-ping' : node.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Real geographic map */}
              <div className="lg:col-span-2 relative">
                <div className="glass-card p-6 border border-slate-800 h-[560px] flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Map Header */}
                  <div className="shrink-0 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl px-4 py-2.5 text-xs max-w-sm text-left shadow-lg">
                    <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider flex items-center gap-1">
                      <Radio className="h-3 w-3 animate-pulse" /> Community Hotspot Mesh View
                    </span>
                    <h4 className="font-bold text-white mt-0.5">Hooghly / Nadia Regional Cluster Map</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Connecting Farm A 🔴, Farm B 🟠, and Smart IoT Traps</p>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-900 bg-slate-950">
                    <CommunityMapCanvas
                      points={filteredNodes}
                      selectedId={selectedNode.id}
                      showClusterLines={showClusterLines}
                      onSelect={point => setSelectedNode(filteredNodes.find(node => node.id === point.id) ?? selectedNode)}
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-3 text-left">
                    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Click any node marker to view anonymized telemetry, vector spread, and dispatch field inspections.</span>
                  </div>

                </div>
              </div>

              {/* Right Column: Selected Node Intel Sidebar (1 Col) */}
              <div className="space-y-6">
                <div className="glass-card p-6 border border-slate-800 bg-slate-950 text-left space-y-5">
                  
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Activity className="h-4.5 w-4.5 text-green-400" /> Node Intel
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 border border-slate-800 text-slate-300">
                      Anonymized ID
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    
                    {/* Code & Village */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Participating Node</span>
                      <p className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-4 w-4 text-green-400" /> {selectedNode.farmCode}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{selectedNode.village}</p>
                    </div>

                    {/* Pathogen & Crop */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Detected Disease / Pest</span>
                      <p className="text-sm font-black text-slate-200 mt-0.5">
                        {getLocalizedCrop(selectedNode.crop)}: <span className="text-gradient-green">{selectedNode.disease}</span>
                      </p>
                    </div>

                    {/* Population Trend */}
                    {selectedNode.pestCount24h !== undefined && (
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pest Telemetry (24h)</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white">{selectedNode.pestCount24h} insects / day</span>
                          <span className="text-xs font-bold text-rose-400">{selectedNode.populationGrowth}</span>
                        </div>
                      </div>
                    )}

                    {/* Cluster Group */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Regional Corridor Cluster</span>
                      <p className="text-xs font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {selectedNode.clusterGroup}
                      </p>
                    </div>

                    {/* Inspection Status */}
                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Officer Action Status</span>
                      
                      {selectedNode.inspectionStatus === 'dispatched' ? (
                        <div className="p-3 rounded-lg bg-green-950/40 border border-green-800/40 text-green-300 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" /> Field Officer Dispatched to Site
                        </div>
                      ) : selectedNode.inspectionStatus === 'completed' ? (
                        <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-300 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" /> Inspection & Remediation Complete
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDispatchInspection(selectedNode.id)}
                          className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/10 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" /> Dispatch Field Officer Inspection
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}

          {/* VIEW MODE 2: OFFICER INSPECTION QUEUE */}
          {activeViewMode === 'inspection_queue' && (
            <div className="space-y-6">
              
              <div className="glass-card p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-400" />
                      Priority Action List: Areas Needing Inspection
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Farms and smart trap locations where pest/disease density has breached safety thresholds.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-800 text-amber-300">
                    {inspectionNeededCount} Locations Pending Officer Visit
                  </span>
                </div>

                <div className="space-y-4">
                  {nodes.map(node => (
                    <div
                      key={node.id}
                      className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${node.severity === 'high' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                          <h4 className="text-sm font-bold text-white">{node.farmCode} · {node.village}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            node.severity === 'high' ? 'bg-rose-950/60 border-rose-800/40 text-rose-400' : 'bg-amber-950/60 border-amber-800/40 text-amber-400'
                          }`}>
                            {node.severity} Severity
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          Threat: <span className="font-bold text-white">{getLocalizedCrop(node.crop)}</span> — <span className="text-green-400 font-semibold">{node.disease}</span>
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span>Cluster: <strong className="text-slate-200">{node.clusterGroup}</strong></span>
                          <span>Telemetry: <strong className="text-amber-400">{node.populationGrowth}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {node.inspectionStatus === 'dispatched' ? (
                          <span className="px-4 py-2 rounded-lg bg-green-950/60 border border-green-800/40 text-green-400 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Inspector On Site
                          </span>
                        ) : node.inspectionStatus === 'completed' ? (
                          <span className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-slate-500" /> Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDispatchInspection(node.id)}
                            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" /> Dispatch Field Officer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI · Community Hotspot Mesh Network & Inspection System.
        </p>
      </footer>
    </div>
  );
}
