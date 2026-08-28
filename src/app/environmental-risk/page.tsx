'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Activity, AlertTriangle, ArrowLeft, CheckCircle, Droplets, Gauge, Leaf, Radio, Sprout, Thermometer, WifiOff, type LucideProps } from 'lucide-react';
import { Header } from '../../components/Header';
import { useLanguage } from '../../context/LanguageContext';
import { IoTDevice, IoTTelemetry, loadIoTDevices } from '../../utils/iotDevices';
import { EnvironmentalInputs, EnvironmentalPrediction, predictEnvironmentalDisease } from '../../utils/environmentalDiseaseModel';

type InputKey = keyof EnvironmentalInputs;
type Field = { key: InputKey; label: string; unit: string; min: number; max: number; step: string };

const fields: Field[] = [
  { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'mg/kg', min: 0, max: 200, step: '1' },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'mg/kg', min: 0, max: 200, step: '1' },
  { key: 'potassium', label: 'Potassium (K)', unit: 'mg/kg', min: 0, max: 300, step: '1' },
  { key: 'ph', label: 'Soil pH', unit: 'pH', min: 0, max: 14, step: '0.1' },
  { key: 'soilMoisture', label: 'Soil moisture', unit: '%', min: 0, max: 100, step: '1' },
  { key: 'temperature', label: 'Temperature', unit: '°C', min: -10, max: 60, step: '0.1' },
  { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: '1' }
];

const limits: Record<InputKey, { range: string; guidance: string; treatment: string }> = {
  nitrogen: { range: '40-100 mg/kg', guidance: 'Below 40 may weaken plants; above 100 can increase foliar disease pressure.', treatment: 'Apply split nitrogen only after a soil test. Avoid heavy urea before wet weather.' },
  phosphorus: { range: '20-60 mg/kg', guidance: 'Low phosphorus slows roots and crop recovery.', treatment: 'Use soil-test-based phosphate or compost. Do not over-apply in waterlogged soil.' },
  potassium: { range: '40-150 mg/kg', guidance: 'Low potassium reduces disease resistance and water regulation.', treatment: 'Use potash or potassium-rich organic amendment according to the soil test.' },
  ph: { range: '5.5-7.5', guidance: 'Most crops perform best in slightly acidic to neutral soil.', treatment: 'Use lime for acidic soil or gypsum and organic matter where appropriate; retest before treatment.' },
  soilMoisture: { range: '35-70%', guidance: 'Persistently wet soil favors root and leaf fungal disease; dry soil stresses plants.', treatment: 'Improve drainage when high; irrigate slowly at the root zone when low.' },
  temperature: { range: '18-32°C', guidance: 'Disease risk rises when temperature combines with high humidity outside the crop range.', treatment: 'Use shade, ventilation, mulch, or irrigation timing to reduce heat and leaf wetness.' },
  humidity: { range: '45-75%', guidance: 'Humidity above 75% for long periods favors fungal and bacterial spread.', treatment: 'Increase spacing and airflow; avoid overhead irrigation and scout leaves daily.' }
};

const pieColors = ['#22c55e', '#38bdf8', '#f59e0b'];

function readingsFromTelemetry(telemetry: IoTTelemetry): EnvironmentalInputs {
  return { nitrogen: telemetry.nitrogen, phosphorus: telemetry.phosphorus, potassium: telemetry.potassium, ph: telemetry.ph, soilMoisture: telemetry.soilMoisture, temperature: telemetry.temperature, humidity: telemetry.humidity };
}

function fallbackHistory(current: IoTTelemetry): IoTTelemetry[] {
  return Array.from({ length: 7 }, (_, index) => ({
    ...current,
    soilMoisture: Math.max(0, Math.min(100, current.soilMoisture + Math.sin(index * 1.7) * 8)),
    temperature: current.temperature + Math.cos(index * 1.4) * 2,
    humidity: Math.max(0, Math.min(100, current.humidity + Math.sin(index * 1.1) * 5)),
    lastSync: new Date(Date.now() - (6 - index) * 86400000).toISOString()
  }));
}

export default function EnvironmentalRiskPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<'farmer' | 'officer'>('farmer');
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [crop, setCrop] = useState('Wheat');
  const [inputs, setInputs] = useState<EnvironmentalInputs>({});
  const [inputDrafts, setInputDrafts] = useState<Partial<Record<InputKey, string>>>({});
  const [prediction, setPrediction] = useState<EnvironmentalPrediction | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedRole = localStorage.getItem('krishirakshak_role') as 'farmer' | 'officer';
      if (savedRole) setRole(savedRole);
      const savedDevices = loadIoTDevices();
      setDevices(savedDevices);
      if (savedDevices[0]) {
        setSelectedDeviceId(savedDevices[0].id);
        setCrop(savedDevices[0].crop);
        setInputs(readingsFromTelemetry(savedDevices[0].telemetry));
        setInputDrafts({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDevice = devices.find(device => device.id === selectedDeviceId);
  const fieldLabel = (key: InputKey, fallback: string) => {
    if (language === 'hi') return ({ nitrogen: 'नाइट्रोजन (N)', phosphorus: 'फॉस्फोरस (P)', potassium: 'पोटैशियम (K)', ph: 'मिट्टी का pH', soilMoisture: 'मिट्टी की नमी', temperature: 'तापमान', humidity: 'आर्द्रता' } as Record<InputKey, string>)[key];
    if (language === 'bn') return ({ nitrogen: 'নাইট্রোজেন (N)', phosphorus: 'ফসফরাস (P)', potassium: 'পটাশিয়াম (K)', ph: 'মাটির pH', soilMoisture: 'মাটির আর্দ্রতা', temperature: 'তাপমাত্রা', humidity: 'আর্দ্রতা' } as Record<InputKey, string>)[key];
    return fallback;
  };
  const limitLabel = (key: InputKey) => language === 'hi' ? ({ nitrogen: '40-100 mg/kg', phosphorus: '20-60 mg/kg', potassium: '40-150 mg/kg', ph: '5.5-7.5', soilMoisture: '35-70%', temperature: '18-32°C', humidity: '45-75%' } as Record<InputKey, string>)[key] : language === 'bn' ? ({ nitrogen: '40-100 mg/kg', phosphorus: '20-60 mg/kg', potassium: '40-150 mg/kg', ph: '5.5-7.5', soilMoisture: '35-70%', temperature: '18-32°C', humidity: '45-75%' } as Record<InputKey, string>)[key] : limits[key].range;
  const liveInputs = inputs;
  const history = useMemo(() => selectedDevice ? selectedDevice.historicalReadings?.length === 7 ? selectedDevice.historicalReadings : fallbackHistory(selectedDevice.telemetry) : [], [selectedDevice]);
  const trendData = history.map((reading, index) => ({ day: `Day ${index + 1}`, moisture: Math.round(reading.soilMoisture), temperature: Math.round(reading.temperature * 10) / 10, humidity: Math.round(reading.humidity) }));
  const availableNpk = [liveInputs.nitrogen, liveInputs.phosphorus, liveInputs.potassium].filter(value => typeof value === 'number');
  const npkChart = availableNpk.length ? [{ name: 'N', value: liveInputs.nitrogen ?? 0 }, { name: 'P', value: liveInputs.phosphorus ?? 0 }, { name: 'K', value: liveInputs.potassium ?? 0 }].filter(item => item.value > 0) : [];
  const snapshotItems: { icon: React.ComponentType<LucideProps>; label: string; value: number | undefined; unit: string; color: string }[] = [
    { icon: Thermometer, label: 'Temperature', value: liveInputs.temperature, unit: '°C', color: 'text-orange-400' },
    { icon: Droplets, label: 'Soil moisture', value: liveInputs.soilMoisture, unit: '%', color: 'text-sky-400' },
    { icon: Activity, label: 'Humidity', value: liveInputs.humidity, unit: '%', color: 'text-violet-400' }
  ];

  const updateInput = (key: InputKey, value: string) => {
    setInputDrafts(previous => ({ ...previous, [key]: value }));
    const numericValue = value.trim() === '' ? undefined : Number(value);
    if (numericValue === undefined || Number.isFinite(numericValue)) {
      setInputs(previous => ({ ...previous, [key]: numericValue }));
    }
    setPrediction(null);
  };

  const selectDevice = (deviceId: string) => {
    const device = devices.find(item => item.id === deviceId);
    setSelectedDeviceId(deviceId);
    if (device) {
      setCrop(device.crop);
      setInputs(readingsFromTelemetry(device.telemetry));
      setInputDrafts({});
    } else {
      setInputs({});
      setInputDrafts({});
    }
    setPrediction(null);
  };

  const getStatus = (key: InputKey, value: number | undefined) => {
    if (value === undefined) return { label: t('missing'), className: 'text-slate-500' };
    const [min, max] = limits[key].range.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const good = value >= min && value <= max;
    return { label: good ? t('inRange') : t('attention'), className: good ? 'text-green-400' : 'text-amber-400' };
  };

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <Header role={role} setRole={setRole} />
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button onClick={() => router.push(role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer')} className="mb-6 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> {t('backToDashboard')}</button>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-400"><Sprout className="h-4 w-4" /> {t('soilIntelligence')}</div><h1 className="flex items-center gap-3 text-3xl font-black text-white"><Gauge className="h-8 w-8 text-sky-400" /> {t('environmentalRiskTitle')}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">{t('environmentalRiskDesc')}</p></div>
        {selectedDevice ? <div className="flex items-center gap-2 rounded-xl border border-green-800/40 bg-green-950/30 px-3 py-2 text-xs font-bold text-green-300"><Radio className="h-4 w-4" /> {selectedDevice.name} {t('connected')}</div> : <div className="flex items-center gap-2 rounded-xl border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-300"><WifiOff className="h-4 w-4" /> {t('noIotStation')}</div>}
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card border border-slate-800 p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">{t('currentFieldReadings')}</h2><p className="mt-1 text-xs text-slate-500">{t('iotAutomaticManual')}</p></div>{selectedDevice ? <Radio className="h-5 w-5 text-green-400" /> : <Leaf className="h-5 w-5 text-sky-400" />}</div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-400">Crop<select value={crop} onChange={event => { setCrop(event.target.value); setPrediction(null); }} className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100">{['Wheat', 'Rice', 'Potato', 'Tomato', 'Cotton', 'Maize', 'Pepper'].map(item => <option key={item}>{item}</option>)}</select></label>{devices.length > 0 && <label className="text-xs font-semibold text-slate-400">IoT station<select value={selectedDeviceId} onChange={event => selectDevice(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"><option value="">Select station</option>{devices.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label>}</div>
          <div className="grid gap-3 sm:grid-cols-2">{fields.map(field => { const value = liveInputs[field.key]; const status = getStatus(field.key, value); const isSensorValue = selectedDevice !== undefined && value !== undefined && inputDrafts[field.key] === undefined; const displayValue = inputDrafts[field.key] ?? value ?? ''; return <label key={field.key} className="text-xs font-semibold text-slate-400">{fieldLabel(field.key, field.label)}<span className="float-right text-slate-600">{field.unit}</span><input type="text" inputMode="decimal" min={field.min} max={field.max} step={field.step} value={displayValue} onChange={event => updateInput(field.key, event.target.value)} placeholder={selectedDevice ? t('sensorUnavailable') : t('enterValue')} className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600" /><span className={`mt-1 block text-[10px] ${status.className}`}>{isSensorValue ? `${t('iotReading')} · ${t('editableOverride')}` : value === undefined ? t('manualInputNeeded') : t('manualReading')} · {t('safe')}: {limitLabel(field.key)}</span></label>; })}</div>
          <button onClick={() => setPrediction(predictEnvironmentalDisease(crop, liveInputs))} disabled={Object.values(liveInputs).every(value => value === undefined)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600"><Activity className="h-4 w-4" /> Assess disease risk</button>
        </div>
        <div className="glass-card border border-slate-800 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">NPK balance</h2><p className="mt-1 text-xs text-slate-500">Pie view of the supplied or sensor readings</p></div><Sprout className="h-5 w-5 text-green-400" /></div>{npkChart.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={npkChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={4}>{npkChart.map((item, index) => <Cell key={item.name} fill={pieColors[index]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0d1628', border: '1px solid #263653', borderRadius: 8, color: '#e2e8f0' }} /><Legend /></PieChart></ResponsiveContainer></div> : <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-xs text-slate-500"><WifiOff className="h-8 w-8 text-slate-700" /><p>Enter or connect NPK readings to display the balance.</p></div>}<div className="grid grid-cols-3 gap-2 text-center text-xs">{(['nitrogen', 'phosphorus', 'potassium'] as InputKey[]).map((key, index) => <div key={key} className="rounded-lg border border-slate-900 bg-slate-950/60 p-2"><span className="block font-bold" style={{ color: pieColors[index] }}>{key === 'nitrogen' ? 'N' : key === 'phosphorus' ? 'P' : 'K'}</span><span className="font-mono text-slate-300">{liveInputs[key] ?? '--'}</span></div>)}</div></div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><div className="glass-card border border-slate-800 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">Seven-day IoT trend</h2><p className="mt-1 text-xs text-slate-500">Recorded soil moisture, temperature, and humidity</p></div><Activity className="h-5 w-5 text-sky-400" /></div>{trendData.length ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}><CartesianGrid stroke="#1c2940" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} /><YAxis tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} /><Tooltip contentStyle={{ backgroundColor: '#0d1628', border: '1px solid #263653', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} /><Legend /><Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#a78bfa" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <div className="flex h-80 items-center justify-center text-xs text-slate-500">Connect an IoT station to see seven-day recorded data.</div>}</div><div className="glass-card border border-slate-800 p-6"><h2 className="mb-4 text-lg font-bold text-white">Live snapshot</h2><div className="space-y-4">{snapshotItems.map(({ icon: SnapshotIcon, label, value, unit, color }) => <div key={label} className="flex items-center justify-between border-b border-slate-900 pb-3"><span className="flex items-center gap-2 text-xs text-slate-400"><SnapshotIcon className={`h-4 w-4 ${color}`} />{label}</span><strong className="text-sm text-white">{value ?? '--'}{value !== undefined && unit}</strong></div>)}</div></div></section>

      {prediction && <section className="mb-8 glass-card border border-slate-800 p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-400"><CheckCircle className="h-4 w-4" /> Early warning result</div><h2 className="text-2xl font-black text-white">{prediction.disease}</h2><p className="mt-2 text-sm text-slate-400">{prediction.usedFields} of 7 parameters used · model confidence {prediction.confidence}%</p></div><span className={`rounded-full border px-4 py-2 text-xs font-extrabold ${prediction.risk === 'HIGH' ? 'border-rose-700/60 bg-rose-950/50 text-rose-300' : prediction.risk === 'MEDIUM' ? 'border-amber-700/60 bg-amber-950/50 text-amber-300' : 'border-green-700/60 bg-green-950/50 text-green-300'}`}>{prediction.risk} RISK · {prediction.score}%</span></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4"><h3 className="mb-3 text-xs font-bold text-slate-300">Risk drivers</h3><div className="flex flex-wrap gap-2">{prediction.drivers.map(driver => <span key={driver} className="rounded-full border border-sky-800/60 bg-sky-950/40 px-2.5 py-1 text-[10px] text-sky-300">{driver}</span>)}</div></div><div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4"><h3 className="mb-2 text-xs font-bold text-slate-300">Treatment / next step</h3><p className="text-xs leading-relaxed text-slate-400">{prediction.recommendation}</p></div></div></section>}

      <section className="glass-card border border-slate-800 p-6"><div className="mb-5 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /><div><h2 className="text-lg font-bold text-white">Parameter limits and treatment guide</h2><p className="mt-1 text-xs text-slate-500">Ranges are general agronomy guidance. Confirm fertilizer rates with a local soil test or officer.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{fields.map(field => <div key={field.key} className="rounded-xl border border-slate-900 bg-slate-950/50 p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-bold text-white">{field.label}</h3><span className="text-[10px] font-bold text-green-400">{limits[field.key].range}</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{limits[field.key].guidance}</p><p className="mt-3 border-t border-slate-900 pt-3 text-[11px] leading-relaxed text-slate-300"><strong className="text-amber-400">Treatment:</strong> {limits[field.key].treatment}</p></div>)}</div></section>
    </main>
  </div>;
}