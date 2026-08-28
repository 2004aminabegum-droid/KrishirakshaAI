'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useOffline } from '../../../context/OfflineContext';
import { Header } from '../../../components/Header';
import { dbService, ValidationRequest, HotspotRecord } from '../../../utils/supabase';
import { 
  ShieldAlert, 
  Map, 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  User, 
  Clock, 
  MapPin, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Inbox,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { IoTDevice, loadIoTDevices } from '../../../utils/iotDevices';

export default function OfficerDashboard() {
  const { t, language } = useLanguage();
  const { isOnline } = useOffline();

  // Role switcher hook state
  const [role, setRole] = useState<'farmer' | 'officer'>('officer');

  // Dashboard stats & requests
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [surveillanceNodes, setSurveillanceNodes] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Verdict panel states for active validation
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [verdictType, setVerdictType] = useState<'agree' | 'override' | 'flag'>('agree');
  const [overrideVerdict, setOverrideVerdict] = useState('');
  const [expertNotes, setExpertNotes] = useState('');

  // Initial load
  useEffect(() => {
    loadOfficerData();
  }, []);

  const loadOfficerData = async () => {
    setLoading(true);
    try {
      const pendingReqs = await dbService.getValidationRequests();
      const regionalHotspots = await dbService.getHotspots();
      setRequests(pendingReqs.filter(r => r.status === 'pending'));
      setHotspots(regionalHotspots);
      setSurveillanceNodes(loadIoTDevices().sort((a, b) => {
        const risk = (node: IoTDevice) => node.telemetry.pestCatches > 35 ? 3 : node.telemetry.pestCatches > 20 ? 2 : 1;
        return risk(b) - risk(a) || b.telemetry.pestCatches - a.telemetry.pestCatches;
      }));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Submit verdict
  const submitVerdict = async (request: ValidationRequest) => {
    setSubmittingId(request.id);
    let finalVerdict = '';
    
    if (verdictType === 'agree') {
      finalVerdict = request.original_diagnosis;
    } else if (verdictType === 'override') {
      finalVerdict = overrideVerdict || 'Unknown Overridden Outbreak';
    } else {
      finalVerdict = 'Flagged';
    }

    try {
      // Update verdict in database
      await dbService.updateValidationVerdict(request.id, finalVerdict, expertNotes);
      
      // Reset review UI
      setActiveReviewId(null);
      setVerdictType('agree');
      setOverrideVerdict('');
      setExpertNotes('');

      // Reload
      await loadOfficerData();
    } catch (e) {
      console.error(e);
    }
    setSubmittingId(null);
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

  // Stats calculation
  const highRiskNodes = surveillanceNodes.filter(node => node.telemetry.pestCatches > 30);
  const riskyMoistureNodes = surveillanceNodes.filter(node => node.telemetry.soilMoisture < 35);
  const riskyWeatherNodes = surveillanceNodes.filter(node => node.telemetry.humidity > 78 || node.telemetry.rainChance > 65 || node.telemetry.temperature > 36);
  const suspectedPestImages = requests.filter(request => request.type === 'pest');
  const urgentSignals = highRiskNodes.length + riskyMoistureNodes.length + riskyWeatherNodes.length + suspectedPestImages.length;
  const urgentNodes = surveillanceNodes.filter(node => highRiskNodes.includes(node) || riskyMoistureNodes.includes(node) || riskyWeatherNodes.includes(node));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <div>
        <Header role={role} setRole={setRole} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Welcome Intro */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Outbreak Control, <span className="text-gradient-green">Agriculture Officers</span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Urgent pest, moisture, weather, and suspected-image signals requiring official attention.
              </p>
            </div>
            
            <button
              onClick={loadOfficerData}
              className="flex items-center gap-1.5 self-start sm:self-center px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-white transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Cloud Data
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            <div className="glass-card p-6 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">High pest-risk nodes</span>
                <h4 className="text-3xl font-black text-rose-400 mt-1">{highRiskNodes.length}</h4>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertOctagon className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-6 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Risky soil moisture</span>
                <h4 className="text-3xl font-black text-blue-400 mt-1">{riskyMoistureNodes.length}</h4>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <MapPin className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-6 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Risky weather nodes</span>
                <h4 className="text-3xl font-black text-amber-400 mt-1">{riskyWeatherNodes.length}</h4>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-6 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Urgent official signals</span>
                <h4 className="text-3xl font-black text-white mt-1">{urgentSignals}</h4>
                <span className="text-[10px] text-slate-500">{suspectedPestImages.length} suspected pest images</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>

          </div>

          <section className="glass-card border border-slate-800 p-6 mb-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div><h3 className="font-bold text-white text-lg">Urgent surveillance nodes</h3><p className="text-xs text-slate-500 mt-1">High pest, moisture, or weather-risk nodes needing attention.</p></div>
              <Link href="/surveillance" className="text-xs font-bold text-green-400 hover:text-green-300">Open surveillance</Link>
            </div>
            {urgentNodes.length === 0 ? <p className="py-5 text-sm text-slate-500">No urgent farmer surveillance signals right now.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{urgentNodes.map(node => { const highRisk = node.telemetry.pestCatches > 30; const weatherRisk = node.telemetry.humidity > 78 || node.telemetry.rainChance > 65 || node.telemetry.temperature > 36; const moistureRisk = node.telemetry.soilMoisture < 35; return <div key={node.id} className={`rounded-lg border bg-slate-950 p-4 ${highRisk ? 'border-rose-700/70' : 'border-slate-800'}`}><div className="flex items-center justify-between gap-2"><p className="font-bold text-white truncate">{node.name}</p><span className={`h-2 w-2 rounded-full ${highRisk ? 'bg-rose-400' : node.status === 'online' ? 'bg-green-400' : 'bg-slate-500'}`} /></div><p className="mt-1 text-xs text-slate-400">{node.crop} · {node.location}</p><p className={`mt-2 text-xs font-bold ${highRisk ? 'text-rose-400' : 'text-amber-400'}`}>{node.telemetry.pestCatches} pests today</p><div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold">{moistureRisk && <span className="rounded bg-blue-950 px-1.5 py-0.5 text-blue-300">Low moisture</span>}{weatherRisk && <span className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-300">Weather risk</span>}</div><p className="mt-2 truncate text-[10px] text-slate-600">{node.deviceSerial}</p></div>; })}</div>}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Validation Request Queue (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 border border-slate-800">
                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2 border-b border-slate-900 pb-3">
                  <Clock className="h-5 w-5 text-amber-400" />
                  {t('validationQueue')}
                </h3>

                {loading ? (
                  <div className="py-12 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                    <Inbox className="h-10 w-10 text-slate-700" />
                    <span>{t('noRequests')}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => {
                      const isReviewing = activeReviewId === req.id;
                      return (
                        <div 
                          key={req.id}
                          className={`p-5 rounded-2xl bg-slate-950 border transition-all ${
                            isReviewing ? 'border-green-500/40 ring-1 ring-green-900/30' : 'border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              
                              {/* Leaf Preview */}
                              <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={req.image} alt={req.crop} className="h-full w-full object-cover" />
                              </div>

                              {/* Details */}
                              <div className="text-left">
                                <span className="inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                  {req.type === 'disease' ? 'Disease Anomaly' : 'Pest Anomaly'}
                                </span>
                                <h4 className="text-base font-bold text-white mt-1">
                                  {getLocalizedCrop(req.crop)}: <span className="text-slate-300">{req.original_diagnosis}</span>
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-slate-500" />
                                    <span>{req.farmer_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-500" />
                                    <span>{req.farmer_location}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div>
                                    Confidence: <span className="text-amber-400">{Math.round(req.confidence * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions toggle */}
                            {!isReviewing && (
                              <button
                                onClick={() => {
                                  setActiveReviewId(req.id);
                                  setVerdictType('agree');
                                }}
                                className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-md self-end md:self-start"
                              >
                                Review Request
                              </button>
                            )}
                          </div>

                          {/* Verdict Review Panel Expansion */}
                          {isReviewing && (
                            <div className="mt-5 border-t border-slate-900 pt-5 space-y-4">
                              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Official Verdict Panel</h5>
                              
                              {/* Verdict Type selector */}
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVerdictType('agree')}
                                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                    verdictType === 'agree'
                                      ? 'bg-green-950/40 border-green-700 text-green-300'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Agree with ML
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVerdictType('override')}
                                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                    verdictType === 'override'
                                      ? 'bg-amber-950/40 border-amber-700 text-amber-300'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Override Diagnosis
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVerdictType('flag')}
                                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                    verdictType === 'flag'
                                      ? 'bg-rose-950/40 border-rose-700 text-rose-300'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Flag Request
                                </button>
                              </div>

                              {/* Overriding Diagnosis Input */}
                              {verdictType === 'override' && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-400">{t('fieldVerdict')}</label>
                                  <input 
                                    type="text"
                                    placeholder="Enter correct disease or pathogen name..."
                                    value={overrideVerdict}
                                    onChange={(e) => setOverrideVerdict(e.target.value)}
                                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-green-600 focus:ring-1 focus:ring-green-950"
                                  />
                                </div>
                              )}

                              {/* Action Notes Input */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400">{t('fieldNotes')}</label>
                                <textarea
                                  rows={3}
                                  placeholder="Provide actionable guidance or IPM steps for the farmer..."
                                  value={expertNotes}
                                  onChange={(e) => setExpertNotes(e.target.value)}
                                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-green-600 focus:ring-1 focus:ring-green-950"
                                />
                              </div>

                              {/* Save & Cancel */}
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setActiveReviewId(null)}
                                  className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all font-semibold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingId !== null}
                                  onClick={() => submitVerdict(req)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 text-white rounded-lg transition-all font-bold flex items-center gap-1 shadow-md shadow-green-600/10 cursor-pointer"
                                >
                                  {submittingId === req.id ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3" />
                                      {t('buttonValidate')}
                                    </>
                                  )}
                                </button>
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Outbreak Intel Map Link (1 Col) */}
            <div className="space-y-6">
              
              {/* Regional Hotspots Map Card */}
              <div className="glass-card p-6 border border-slate-800">
                <h3 className="font-bold text-white text-base mb-2">{t('activeOutbreaks')}</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Validated geospatial indicators detailing pathogen concentration areas.
                </p>

                {/* Simulated Geographic view */}
                <div className="h-44 w-full rounded-xl border border-slate-900 bg-slate-950/80 overflow-hidden relative flex items-center justify-center">
                  
                  {/* Grid canvas background */}
                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                  
                  {/* Outbreak Hotspots Circles */}
                  {hotspots.map((hot, idx) => (
                    <div
                      key={hot.id}
                      style={{
                        top: `${40 + (hot.latitude - 22.5) * 120}%`,
                        left: `${50 + (hot.longitude - 88.0) * 120}%`,
                      }}
                      className="absolute group/pin cursor-pointer"
                    >
                      <span className={`absolute -top-1.5 -left-1.5 block h-3 w-3 rounded-full outbreak-ripple ${
                        hot.severity === 'high' ? 'bg-rose-500 animate-pulse' : hot.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <span className={`block h-1.5 w-1.5 rounded-full ${
                        hot.severity === 'high' ? 'bg-rose-500' : hot.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                    </div>
                  ))}

                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest z-10 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    Map Simulation Grid
                  </span>
                </div>

                <Link href="/map" className="group mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-green-950/20 border border-slate-800 hover:border-green-500/20 transition-all text-xs font-bold text-green-400">
                  <span>Open Interactive Hotspot Map</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* IPM Editor Guide Link */}
              <div className="glass-card p-6 border border-slate-800">
                <h3 className="font-bold text-white text-base mb-2">Publish Crop Advisory</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Review or edit the Integrated Pest Management guidelines catalog.
                </p>
                
                <Link href="/ipm" className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-amber-950/20 border border-slate-800 hover:border-amber-500/20 transition-all text-xs font-bold text-amber-400">
                  <span>Manage IPM Guidelines</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>

          </div>

        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI. Agriculture Officer Command Center.
        </p>
      </footer>
    </div>
  );
}
