'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { Header } from '../../components/Header';
import { localDB, ScanRecord } from '../../utils/db';
import { dbService } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  classifyCropHealthOpenSet,
  classifyPestImage,
  ClassificationResult,
  PestClassificationResult,
  PredictionItem
} from '../../utils/imageClassifier';
import { QualityCheckResult } from '../../utils/imageQuality';
import {
  Scan, Upload, Cpu, AlertCircle, CheckCircle, Bug, Activity,
  User, MapPin, BookOpen, ArrowLeft, Camera, RefreshCw, Info, Layers,
  ShieldAlert, AlertTriangle, CheckCircle2, BarChart2, Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EnvironmentalPrediction, EnvironmentalInputs, predictEnvironmentalDisease } from '../../utils/environmentalDiseaseModel';
import { IoTDevice, loadIoTDevices } from '../../utils/iotDevices';
import { NetworkBadge } from '../../components/NetworkBadge';
import { PestBoundingBox } from '../../components/PestBoundingBox';
import { analyzeCropHybrid, HybridResult } from '../../utils/hybridEngine';
import { addNotification } from '../../utils/notifications';

// ─── Disease Handbook Database (19 Classes) ─────────────────────────────────
const DISEASE_DB: Record<string, { symptoms: string; remedy: string }> = {
  'Tomato - Healthy Leaf': {
    symptoms: 'Vibrant green compound leaves, firm tissue, intact margins, no spots or wilting.',
    remedy: 'Maintain balanced NPK fertilizer schedule. Install yellow sticky traps as early vector warning.'
  },
  'Tomato - Early Blight': {
    symptoms: 'Concentric target-board brown spots on older lower leaves surrounded by yellow chlorotic halo.',
    remedy: 'Apply Chlorothalonil 75% WP (0.2%). Remove infected lower leaves and prune near ground level.'
  },
  'Tomato - Late Blight': {
    symptoms: 'Large water-soaked dark brown lesions expanding rapidly; white fuzzy mold on underside in humid weather.',
    remedy: 'Spray Metalaxyl 8% + Mancozeb 64% WP at first detection. Avoid overhead evening irrigation.'
  },
  'Tomato - Leaf Mold': {
    symptoms: 'Pale green to yellow spots on upper leaf surface; olive-green velvety mold growth on leaf undersides.',
    remedy: 'Improve greenhouse ventilation. Apply Copper Oxychloride 50% WP (0.3%). Destroy crop residue.'
  },
  'Tomato - Septoria Leaf Spot': {
    symptoms: 'Numerous small circular spots with grey-white centres and dark brown borders; severe defoliation.',
    remedy: 'Apply Mancozeb 75% WP (0.25%). Practice 3-year crop rotation with non-solanaceous crops.'
  },
  'Tomato - Bacterial Spot': {
    symptoms: 'Small dark water-soaked spots on leaves and fruit surrounded by yellow halo; leaf tattering.',
    remedy: 'Apply Copper Hydroxide + Streptomycin sulphate. Plant certified disease-free seeds.'
  },

  'Potato - Healthy Leaf': {
    symptoms: 'Deep green compound foliage, erect stems, crisp clean leaf tissue.',
    remedy: 'Keep soil moisture consistent. Ridge soil around stems to protect growing tubers.'
  },
  'Potato - Early Blight': {
    symptoms: 'Dark brown spots with characteristic concentric rings starting on lower leaves.',
    remedy: 'Spray Mancozeb 75% WP (0.25%). Maintain adequate nitrogen and potassium nutrition.'
  },
  'Potato - Late Blight': {
    symptoms: 'Rapidly spreading dark water-soaked necrotic patches with white fungal bloom beneath leaf.',
    remedy: 'Apply Dimethomorph 50% WP or Cymoxanil + Mancozeb. Kill haulms 10 days prior to harvest.'
  },

  'Rice - Healthy Paddy Leaf': {
    symptoms: 'Upright uniform green leaf blades, clear mid-vein, healthy tillering.',
    remedy: 'Maintain 5-7cm water depth. Apply potash top-dressing to strengthen stem cell walls.'
  },
  'Rice - Leaf Blast': {
    symptoms: 'Spindle/diamond-shaped lesions with whitish centres and reddish-brown borders.',
    remedy: 'Apply Tricyclazole 75% WP (0.06%). Avoid excessive nitrogen fertilizers.'
  },
  'Rice - Brown Spot': {
    symptoms: 'Small oval reddish-brown spots with yellow halo covering leaf surface.',
    remedy: 'Apply Edifenphos 50% EC or Mancozeb. Correct soil nutrient deficiency (Zinc & Potash).'
  },
  'Rice - Bacterial Leaf Blight': {
    symptoms: 'Water-soaked wavy lesions starting from leaf margins turning yellow to straw-colored.',
    remedy: 'Apply Copper Hydroxide (0.2%) + Agrimycin-100 (0.01%). Drain field water for 3-4 days.'
  },

  'Maize - Healthy Corn Leaf': {
    symptoms: 'Broad dark green leaves, smooth parallel veins, strong whorls.',
    remedy: 'Ensure proper plant spacing for aeration. Apply balanced fertilizer at knee-high stage.'
  },
  'Maize - Common Rust': {
    symptoms: 'Golden-brown to cinnamon-brown powdery pustules on both upper and lower leaf surfaces.',
    remedy: 'Apply Azoxystrobin 23% SC (0.1%). Plant rust-tolerant hybrid maize varieties.'
  },
  'Maize - Northern Leaf Blight': {
    symptoms: 'Long elliptical grayish-green or tan lesions (2.5-15cm length) parallel to leaf margins.',
    remedy: 'Spray Mancozeb or Propiconazole. Incorporate infected crop stubble deeply after harvest.'
  },
  'Maize - Gray Leaf Spot': {
    symptoms: 'Rectangular tan-to-gray lesions restricted by parallel leaf veins.',
    remedy: 'Apply Pyraclostrobin 20% WG. Practice minimum 2-year crop rotation.'
  },

  'Pepper - Healthy Leaf': {
    symptoms: 'Glossy dark green leaves, sturdy stem structure, no spotting or curling.',
    remedy: 'Provide well-drained soil. Monitor regularly for aphid and thrips vectors.'
  },
  'Pepper - Bacterial Spot': {
    symptoms: 'Small irregular dark brown raised spots on leaves causing premature leaf drop.',
    remedy: 'Spray Copper Oxychloride + Streptocycline (200 ppm). Use disease-free seed stock.'
  },

  'UNKNOWN_OR_UNCERTAIN': {
    symptoms: 'Unrecognized plant photo, out-of-distribution image, or low prediction confidence (<55%).',
    remedy: 'The AI model could not confirm a diagnosis with sufficient confidence. Please ensure a clear, well-lit leaf photo is uploaded or request an Agriculture Officer inspection.'
  }
};

const getHandbook = (diagnosis: string) => {
  return DISEASE_DB[diagnosis] ?? DISEASE_DB['UNKNOWN_OR_UNCERTAIN'];
};

// ─── Canvas Image Loader Helper ─────────────────────────────────────────────
const getImageData = (src: string, size = 224): Promise<ImageData> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d')!.drawImage(img, 0, 0, size, size);
      resolve(c.getContext('2d')!.getImageData(0, 0, size, size));
    };
    img.onerror = reject;
    img.src = src;
  });



export default function DetectPage() {
  const { t } = useLanguage();
  const { isOnline, queueOfflineAction } = useOffline();
  const { user } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<'farmer' | 'officer'>('farmer');
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [analysisMode, setAnalysisMode] = useState<'disease' | 'pest' | 'environmental'>('disease');
  const [sourceMode, setSourceMode] = useState<'manual' | 'iot'>('manual');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [scanning, setScanning] = useState(false);
  
  // Open-Set ML & Quality state
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [pestClassification, setPestClassification] = useState<PestClassificationResult | null>(null);
  const [hybridResult, setHybridResult] = useState<HybridResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanRecord | null>(null);
  const [farmerName, setFarmerName] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [validationSubmitted, setValidationSubmitted] = useState(false);
  const [environmentalPrediction, setEnvironmentalPrediction] = useState<EnvironmentalPrediction | null>(null);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [environmentalInputs, setEnvironmentalInputs] = useState<EnvironmentalInputs>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('krishirakshak_role') as 'farmer' | 'officer';
      if (saved) setRole(saved);
      if (new URLSearchParams(window.location.search).get('mode') === 'environmental') setAnalysisMode('environmental');
      const savedDevices = loadIoTDevices();
      setDevices(savedDevices);
      if (savedDevices[0]) setSelectedDeviceId(savedDevices[0].id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const environmentalFields: { key: keyof EnvironmentalInputs; label: string; unit: string; min: number; max: number; step: string }[] = [
    { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'mg/kg', min: 0, max: 200, step: '1' },
    { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'mg/kg', min: 0, max: 200, step: '1' },
    { key: 'potassium', label: 'Potassium (K)', unit: 'mg/kg', min: 0, max: 300, step: '1' },
    { key: 'soilMoisture', label: 'Soil moisture', unit: '%', min: 0, max: 100, step: '1' },
    { key: 'ph', label: 'Soil pH', unit: 'pH', min: 0, max: 14, step: '0.1' },
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -10, max: 60, step: '0.1' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: '1' }
  ];

  const updateEnvironmentalInput = (key: keyof EnvironmentalInputs, rawValue: string) => {
    setEnvironmentalInputs(previous => ({ ...previous, [key]: rawValue === '' ? undefined : Number(rawValue) }));
    setEnvironmentalPrediction(null);
  };

  const loadDeviceTelemetry = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const telemetry = devices.find(device => device.id === deviceId)?.telemetry;
    if (!telemetry) return;
    setEnvironmentalInputs({ nitrogen: telemetry.nitrogen, phosphorus: telemetry.phosphorus, potassium: telemetry.potassium, ph: telemetry.ph, soilMoisture: telemetry.soilMoisture, temperature: telemetry.temperature, humidity: telemetry.humidity });
    setEnvironmentalPrediction(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setImageFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleIotCapture = () => {
    setScanning(true);
    setTimeout(() => {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 200;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1a3018';
      ctx.fillRect(0, 0, 300, 200);
      // Healthy leaf body
      ctx.beginPath();
      ctx.moveTo(75, 100);
      ctx.quadraticCurveTo(150, 30, 225, 100);
      ctx.quadraticCurveTo(150, 170, 75, 100);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      // Brown spot lesions
      ctx.fillStyle = '#9a3412';
      for (const [cx, cy, r] of [[115,75,9],[165,110,7],[140,92,6],[180,80,5],[130,120,8]] as [number,number,number][]) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
      }
      setImageFile(c.toDataURL());
      setImageName('IoT_Trap_Capture.png');
      setScanning(false);
    }, 800);
  };

  // ── Main Open-Set & Hybrid ML Scan Handler ──────────────────────────────────
  const analyzeCrop = async () => {
    if (analysisMode !== 'environmental' && !imageFile) return;
    const currentImage = imageFile;
    setScanning(true);
    setScanResult(null);
    setClassification(null);
    setPestClassification(null);
    setEnvironmentalPrediction(null);
    setValidationSubmitted(false);

    try {
      if (analysisMode === 'environmental') {
        setEnvironmentalPrediction(predictEnvironmentalDisease(selectedCrop, environmentalInputs));
        setScanning(false);
        return;
      }

      if (!currentImage) return;
      const imgData = await getImageData(currentImage, 224);

      // Execute Hybrid Decision Engine (Offline ONNX -> Threshold check -> Cloud API escalation)
      const hybridRes = await analyzeCropHybrid(currentImage, imgData, selectedCrop, analysisMode);
      setHybridResult(hybridRes);
      
      const record: ScanRecord = {
        id: `scan_${Date.now()}`,
        image: currentImage,
        crop: hybridRes.crop,
        type: analysisMode === 'pest' ? 'pest' : 'disease',
        diagnosis: hybridRes.diagnosis,
        confidence: hybridRes.confidence,
        symptoms: hybridRes.symptoms.join(' • '),
        remedy: hybridRes.organicRemedies.concat(hybridRes.chemicalRemedies).join(' • '),
        date: new Date().toISOString(),
        accuracyStatus: hybridRes.confidenceCategory === 'HIGH_CONFIDENCE' ? 'high' : 'low',
        validationRequested: false
      };

      setScanResult(record);
      await localDB.saveScan(record);
    } catch (err) {
      console.error('Hybrid scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const submitToExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult) return;
    setSubmittingRequest(true);
    const payload = {
      id: scanResult.id, scan_id: scanResult.id, image: scanResult.image,
      crop: scanResult.crop, type: scanResult.type,
      original_diagnosis: scanResult.diagnosis, confidence: scanResult.confidence,
      farmer_id: user?.id,
      farmer_name: farmerName || user?.user_metadata?.full_name || 'Unknown Farmer',
      farmer_location: farmerLocation || 'Unknown Region'
    };
    const updated = { ...scanResult, validationRequested: true, farmerName, farmerLocation };
    setScanResult(updated);
    await localDB.saveScan(updated);
    try {
      if (isOnline) await dbService.submitValidationRequest(payload);
      else await queueOfflineAction('request_validation', payload);
    } catch { await queueOfflineAction('request_validation', payload); }
    setSubmittingRequest(false);
    setValidationSubmitted(true);
    addNotification({
      id: `validation-${scanResult.id}`,
      audience: 'officer',
      level: 'warning',
      title: 'Expert validation required',
      message: `${farmerName || user?.user_metadata?.full_name || 'A farmer'} submitted a ${scanResult.type} report for review.`,
      href: '/dashboard/officer'
    });
  };

  const resetScanner = () => {
    setImageFile(null); setImageName(''); setScanResult(null); setHybridResult(null);
    setClassification(null); setPestClassification(null); setEnvironmentalPrediction(null); setValidationSubmitted(false);
    setFarmerName(''); setFarmerLocation('');
  };

  const translateKey = (k: string) => {
    const map: Record<string, string> = {
      'Wheat': t('cropWheat'), 'Rice': t('cropRice'), 'Potato': t('cropPotato'),
      'Tomato': t('cropTomato'), 'Cotton': t('cropCotton'), 'Maize': t('cropMaize'),
      'Pepper': t('cropPepper'),
      'HIGH_CONFIDENCE': t('statusHighConfidence'),
      'POSSIBLE_MATCH': t('statusPossibleMatch'),
      'UNKNOWN_OR_UNCERTAIN': t('statusUnknownUncertain'),
      'errImageBlurry': t('errImageBlurry'),
      'errImageDark': t('errImageDark'),
      'errImageOverexposed': t('errImageOverexposed'),
      'errNonLeaf': t('errNonLeaf')
    };
    return map[k] ?? k;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-green-500 selection:text-slate-950">
      <div>
        <Header role={role} setRole={setRole} />
        <main className="max-w-5xl mx-auto px-4 py-8">

          {/* Back button */}
          <button onClick={() => router.push(role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-6 cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>

          {/* Title Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-2">
                <Scan className="h-7 w-7 text-green-500" />{t('detectionTitle')}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{t('detectionDesc')}</p>
            </div>
            <div>
              <NetworkBadge />
            </div>
          </div>

          {/* Dataset Scope Disclaimer Banner */}
          <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${
            analysisMode === 'pest'
              ? 'border-amber-800/40 bg-amber-950/20 text-amber-200'
              : 'border-sky-800/40 bg-sky-950/20 text-sky-200'
          }`}>
            {analysisMode === 'pest' ? (
              <Bug className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            )}
            <p className="text-xs leading-relaxed opacity-95">
              {analysisMode === 'pest'
                ? 'DLCPD-25 25-Class Pest ML Architecture: Recognizes 25 major agricultural crop pests (Aphids, Bollworms, Planthoppers, Whiteflies, Thrips, Fall Armyworms, Stem Borers, Mites, Grubs, Leaf Folders, Weevils, Locusts, etc.) with in-browser offline ONNX execution & cloud hybrid intelligence.'
                : t('datasetScopeNotice')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* ── Left Upload & Settings Panel ───────────────────────────── */}
            <div className="glass-card p-6 border border-slate-800 space-y-6">

              {/* Three model options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onClick={() => { setAnalysisMode('disease'); setSourceMode('manual'); resetScanner(); }} className={`py-3 text-xs font-bold rounded-lg border transition-all ${analysisMode === 'disease' ? 'bg-green-600 border-green-500 text-white shadow' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Upload className="h-3.5 w-3.5 inline mr-1.5" />Disease from leaf
                </button>
                <button onClick={() => { setAnalysisMode('pest'); resetScanner(); }} className={`py-3 text-xs font-bold rounded-lg border transition-all ${analysisMode === 'pest' ? 'bg-amber-600 border-amber-500 text-white shadow' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Bug className="h-3.5 w-3.5 inline mr-1.5" />DLCPD-25 Pest (25 Cls)
                </button>
                <button onClick={() => { setAnalysisMode('environmental'); setSourceMode('manual'); resetScanner(); }} className={`py-3 text-xs font-bold rounded-lg border transition-all ${analysisMode === 'environmental' ? 'bg-sky-600 border-sky-500 text-white shadow' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Activity className="h-3.5 w-3.5 inline mr-1.5" />Soil & climate risk
                </button>
              </div>

              {analysisMode === 'pest' && <div className="grid grid-cols-2 gap-2">
                {(['manual', 'iot'] as const).map(m => <button key={m} onClick={() => { setSourceMode(m); resetScanner(); }} className={`py-2 text-xs font-bold rounded-lg border transition-all ${sourceMode === m ? 'bg-amber-600 border-amber-500 text-white shadow' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {m === 'manual' ? <><Upload className="h-3.5 w-3.5 inline mr-1.5" />Upload insect/field image</> : <><Camera className="h-3.5 w-3.5 inline mr-1.5" />IoT smart trap capture</>}
                </button>)}
              </div>}

              {/* Crop Selector for disease model */}
              {analysisMode === 'disease' && <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Select Target Crop</label>
                <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-green-600">
                  {['Wheat','Rice','Potato','Tomato','Cotton','Maize','Pepper'].map(c =>
                    <option key={c} value={c}>{translateKey(c)}</option>)}
                </select>
              </div>}

              {analysisMode === 'environmental' && <div className="space-y-5">
                <div className="rounded-xl border border-sky-800/50 bg-sky-950/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-sky-200">Advance disease risk from field conditions</p>
                      <p className="text-[11px] leading-relaxed text-sky-300/70">Enter what you have. Missing NPK or sensor readings are allowed and reduce model confidence.</p>
                    </div>
                  </div>
                  {devices.length > 0 && <select value={selectedDeviceId} onChange={e => loadDeviceTelemetry(e.target.value)} className="w-full rounded-lg border border-sky-800/60 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                    <option value="">Manual entry</option>
                    {devices.map(device => <option key={device.id} value={device.id}>Use {device.name} sensor readings</option>)}
                  </select>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {environmentalFields.map(field => <label key={field.key} className="space-y-1.5">
                    <span className="flex items-center justify-between text-[11px] font-semibold text-slate-400"><span>{field.label}</span><span className="text-slate-600">{field.unit}</span></span>
                    <input type="number" min={field.min} max={field.max} step={field.step} value={environmentalInputs[field.key] ?? ''} onChange={e => updateEnvironmentalInput(field.key, e.target.value)} placeholder="Not available" className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-600" />
                  </label>)}
                </div>
                <button onClick={analyzeCrop} disabled={scanning || Object.values(environmentalInputs).every(value => value === undefined)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 font-extrabold text-sm text-white rounded-xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer flex items-center justify-center gap-2">
                  <Activity className="h-4 w-4" /> Predict disease risk
                </button>
              </div>}

              {/* Upload Drop Zone / IoT Camera */}
              {analysisMode !== 'environmental' && (analysisMode === 'disease' || sourceMode === 'manual') ? (
                <div className="relative border-2 border-dashed border-slate-800 hover:border-green-600/40 rounded-xl p-8 text-center bg-slate-950/40 cursor-pointer group transition-all">
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                  {imageFile ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageFile} alt="preview" className="h-44 mx-auto rounded-lg object-cover border border-slate-800 shadow-md" />
                      <p className="text-xs font-semibold text-green-400 truncate">{imageName}</p>
                      <p className="text-[10px] text-slate-500">Click or drag another file to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-8 w-8 text-slate-600 mx-auto group-hover:text-green-500 transition-colors" />
                      <p className="text-xs font-bold text-slate-300">{t('uploadPrompt')}</p>
                      <p className="text-[10px] text-slate-500">{t('supportedFormats')}</p>
                    </div>
                  )}
                </div>
              ) : analysisMode !== 'environmental' && (
                <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-8 text-center space-y-4">
                  {imageFile ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageFile} alt="iot" className="h-44 mx-auto rounded-lg object-cover border border-slate-800" />
                      <p className="text-xs text-green-400 font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> IoT Trap Capture Ready
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <Camera className="h-10 w-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">Retrieve high-res optical feed from active IoT smart trap field station.</p>
                    </div>
                  )}
                  <button onClick={handleIotCapture}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5" />{t('triggerIotCapture')}
                  </button>
                </div>
              )}

              {/* Analyze Button */}
              {analysisMode !== 'environmental' && imageFile && !scanning && !scanResult && (
                <button onClick={analyzeCrop}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-extrabold text-sm text-white rounded-xl transition-all shadow-lg shadow-green-600/20 cursor-pointer flex items-center justify-center gap-2">
                  <Scan className="h-4 w-4" /> {t('scanButton')}
                </button>
              )}

              {scanning && (
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 text-center flex flex-col items-center gap-3">
                  <Cpu className="h-7 w-7 text-green-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-300">Evaluating Edge ML & Pre-Inference Quality Checks...</p>
                </div>
              )}
            </div>

            {/* ── Right Results & Open-Set Classification Panel ────────────── */}
            <div className="space-y-6">
              {environmentalPrediction ? (
                <div className="glass-card p-6 border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="font-bold text-white text-base">Environmental ML forecast</h3>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold border ${environmentalPrediction.risk === 'HIGH' ? 'bg-rose-950/60 border-rose-700/60 text-rose-400' : environmentalPrediction.risk === 'MEDIUM' ? 'bg-amber-950/60 border-amber-700/60 text-amber-400' : 'bg-green-950/60 border-green-700/60 text-green-400'}`}>{environmentalPrediction.risk} RISK</span>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-900 p-4">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Predicted in advance</span>
                    <h4 className="text-xl font-black mt-1 text-sky-300">{environmentalPrediction.disease}</h4>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400"><span>Risk score</span><span className="font-mono font-bold text-slate-200">{environmentalPrediction.score}%</span></div>
                    <div className="mt-2 h-2 rounded-full bg-slate-900 overflow-hidden"><div className={`h-full rounded-full ${environmentalPrediction.risk === 'HIGH' ? 'bg-rose-500' : environmentalPrediction.risk === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${environmentalPrediction.score}%` }} /></div>
                    <p className="mt-3 text-xs text-slate-400">Model confidence: <span className="font-bold text-slate-200">{environmentalPrediction.confidence}%</span> · {environmentalPrediction.usedFields}/7 readings used</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/80 border border-slate-900 p-4 space-y-2"><p className="text-xs font-bold text-slate-300">Main environmental drivers</p><div className="flex flex-wrap gap-2">{environmentalPrediction.drivers.map(driver => <span key={driver} className="rounded-full border border-sky-800/60 bg-sky-950/40 px-2.5 py-1 text-[10px] text-sky-300">{driver}</span>)}</div></div>
                  <div className="text-xs space-y-1"><span className="font-bold text-slate-300">Recommended next step</span><p className="text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900">{environmentalPrediction.recommendation}</p></div>
                  <button onClick={resetScanner} className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer">Adjust readings</button>
                </div>
              ) : pestClassification ? (
                <div className="glass-card p-6 border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="font-bold text-white text-base">Pest model result</h3>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold border ${pestClassification.risk === 'HIGH' ? 'bg-rose-950/60 border-rose-700/60 text-rose-400' : pestClassification.risk === 'MEDIUM' ? 'bg-amber-950/60 border-amber-700/60 text-amber-400' : 'bg-green-950/60 border-green-700/60 text-green-400'}`}>Risk: {pestClassification.risk}</span>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-900 p-4">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Pest detected</span>
                    <h4 className="text-xl font-black mt-1 text-amber-300">{pestClassification.diagnosis}</h4>
                    <p className="mt-2 text-xs text-slate-400">Confidence: {Math.round(pestClassification.topConfidence * 100)}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/80 border border-slate-900 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-300">Top pest predictions</p>
                    {pestClassification.topPredictions.map((pred: { label: string; confidence: number; percentage: number }) => <div key={pred.label} className="flex items-center justify-between text-xs"><span className="text-slate-300">{pred.label}</span><span className="font-mono text-slate-400">{pred.percentage}%</span></div>)}
                  </div>
                  {!pestClassification.qualityCheck.valid && <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 p-3 text-xs text-rose-300">The pest image quality is insufficient. Upload a clear, well-lit insect or trap image.</p>}
                  <button onClick={resetScanner} className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer">Reset and analyze another image</button>
                </div>
              ) : (hybridResult || classification) && scanResult ? (
                <>
                  {/* Quality Pre-Check Rejection Warning */}
                  {((hybridResult && !hybridResult.qualityCheck.valid) || (classification && classification.qualityCheck && !classification.qualityCheck.valid)) && (
                    <div className="glass-card p-5 border border-rose-800/60 bg-rose-950/30 text-rose-200 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>Pre-Inference Image Quality Rejection</span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-300">
                        {hybridResult?.warningMessage || (classification?.qualityCheck && translateKey(classification.qualityCheck.messageKey))}
                      </p>
                    </div>
                  )}

                  {/* Main Result Card */}
                  <div className="glass-card p-6 border border-slate-800 space-y-5">
                    
                    {/* Execution Mode & Confidence Category Pill */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <h3 className="font-bold text-white text-base">{t('resultHeading')}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                        (hybridResult?.confidenceCategory || classification?.confidenceCategory) === 'HIGH_CONFIDENCE'
                          ? 'bg-green-950/60 border-green-700/60 text-green-400'
                          : (hybridResult?.confidenceCategory || classification?.confidenceCategory) === 'POSSIBLE_MATCH'
                          ? 'bg-amber-950/60 border-amber-700/60 text-amber-400'
                          : 'bg-rose-950/60 border-rose-700/60 text-rose-400'
                      }`}>
                        <Layers className="h-3 w-3" />
                        {translateKey(hybridResult?.confidenceCategory || classification?.confidenceCategory || 'UNKNOWN_OR_UNCERTAIN')}
                      </span>
                    </div>

                    {/* Pest Bounding Box Overlay if pests detected */}
                    {hybridResult && hybridResult.pests && hybridResult.pests.length > 0 && imageFile && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-amber-400 block">Pest Detection & Localization</span>
                        <PestBoundingBox imageSrc={imageFile} pests={hybridResult.pests} />
                      </div>
                    )}

                    {/* Diagnosis Headline */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                          {analysisMode === 'pest' || scanResult?.type === 'pest' ? '🎯 DLCPD-25 Pest Identified' : t('diseaseDetected')}
                        </span>
                        {hybridResult?.inferenceTimeMs !== undefined && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                            ⚡ {hybridResult.executionMode.replace(/_/g, ' ')} · {hybridResult.inferenceTimeMs}ms
                          </span>
                        )}
                      </div>

                      <h4 className={`text-xl font-black ${
                        (hybridResult?.diagnosis || classification?.diagnosis) === 'UNKNOWN_OR_UNCERTAIN'
                          ? 'text-rose-400'
                          : (hybridResult?.diagnosis || classification?.diagnosis || '').includes('Healthy') || (hybridResult?.diagnosis || '').includes('Clean')
                          ? 'text-green-400'
                          : 'text-amber-300'
                      }`}>
                        {hybridResult?.diagnosis || classification?.diagnosis}
                      </h4>

                      {/* Confidence Score Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-900/60 text-xs">
                        <span className="text-slate-400">{t('confidenceScore')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-28 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              (hybridResult?.confidence || (classification?.topConfidence ? Math.round(classification.topConfidence * 100) : 0)) >= 75
                                ? 'bg-green-500'
                                : (hybridResult?.confidence || (classification?.topConfidence ? Math.round(classification.topConfidence * 100) : 0)) >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`} style={{ width: `${hybridResult?.confidence || (classification ? Math.round(classification.topConfidence * 100) : 0)}%` }} />
                          </div>
                          <span className="font-mono font-black text-sm text-slate-200">
                            {hybridResult?.confidence || (classification ? Math.round(classification.topConfidence * 100) : 0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top 3 Predictions Breakdown Card */}
                    {((hybridResult && hybridResult.top3Predictions.length > 0) || (classification && classification.topPredictions.length > 0)) && (
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5 text-green-400">
                            <BarChart2 className="h-4 w-4" /> {t('top3PredictionsTitle')}
                          </span>
                          <span className="text-[10px] text-slate-500">ML Confidence %</span>
                        </div>
                        <div className="space-y-2 pt-1">
                          {(hybridResult?.top3Predictions || classification?.topPredictions || []).map((pred: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium text-[11px] truncate max-w-[220px]">
                                  {idx + 1}. {pred.label || pred.displayName}
                                </span>
                                <span className="font-mono text-xs text-slate-400 font-bold">
                                  {pred.percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  idx === 0 ? 'bg-green-500' : idx === 1 ? 'bg-emerald-700' : 'bg-slate-700'
                                }`} style={{ width: `${pred.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Symptoms */}
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-300 block">{t('symptomTitle')}</span>
                      <p className="text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                        {hybridResult ? hybridResult.symptoms.join(' • ') : scanResult.symptoms}
                      </p>
                    </div>

                    {/* Organic & Chemical Remedies */}
                    <div className="text-xs space-y-2">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-amber-500" />{t('remedyTitle')}
                      </span>
                      {hybridResult ? (
                        <div className="space-y-2">
                          {hybridResult.organicRemedies.length > 0 && (
                            <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-lg text-emerald-200">
                              <span className="font-bold block text-[11px] text-emerald-400 mb-1">🌿 Organic & Bio-Control Remedies:</span>
                              <ul className="list-disc list-inside space-y-1">
                                {hybridResult.organicRemedies.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {hybridResult.chemicalRemedies.length > 0 && (
                            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-slate-300">
                              <span className="font-bold block text-[11px] text-amber-400 mb-1">🧪 Chemical Treatment Guidance:</span>
                              <ul className="list-disc list-inside space-y-1 text-slate-400">
                                {hybridResult.chemicalRemedies.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                          {scanResult.remedy}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Officer Validation Form for Low-Confidence or Open-Set Rejections */}
                  {((hybridResult && hybridResult.confidenceCategory !== 'HIGH_CONFIDENCE') || (classification && (classification.isOpenSetRejected || classification.confidenceCategory !== 'HIGH_CONFIDENCE'))) && (
                    <div className="glass-card p-6 border border-slate-800 bg-amber-950/10 space-y-4">
                      <div className="flex items-start gap-3 text-amber-300 text-xs">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">{t('statusAccuracyLow')}</p>
                          <p className="text-[11px] text-amber-300/80 mt-0.5">{t('expertRecommendation')}</p>
                        </div>
                      </div>
                      {validationSubmitted ? (
                        <div className="p-4 rounded-xl border border-green-800/30 bg-green-950/30 text-green-300 text-center text-xs font-semibold flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />{t('requestSubmitted')}
                        </div>
                      ) : (
                        <form onSubmit={submitToExpert} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-500" /> Farmer Full Name
                            </label>
                            <input required placeholder="e.g. Ramesh Kumar" value={farmerName}
                              onChange={e => setFarmerName(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-green-600" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-500" /> Village / Mandi Location
                            </label>
                            <input required placeholder="e.g. Singur, Hooghly District" value={farmerLocation}
                              onChange={e => setFarmerLocation(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-green-600" />
                          </div>
                          <button type="submit" disabled={submittingRequest}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                            {submittingRequest
                              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />{t('submitting')}</>
                              : t('submitToExpert')}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  <button onClick={resetScanner}
                    className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer">
                    Reset and Scan New Leaf
                  </button>
                </>
              ) : (
                <div className="h-full flex items-center justify-center py-20 text-slate-600 text-xs">
                  <div className="text-center space-y-2">
                    <Info className="h-8 w-8 mx-auto text-slate-700" />
                    <p>Analysis results & Top-3 predictions will appear here.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI · ML inference runs locally in your browser.
        </p>
      </footer>
    </div>
  );
}
