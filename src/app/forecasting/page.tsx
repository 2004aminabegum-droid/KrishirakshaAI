'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { Header } from '../../components/Header';
import { LocationSelector } from '../../components/LocationSelector';
import { weatherService, LocationWeatherResult, RealForecastDay } from '../../utils/weatherService';
import { localDB } from '../../utils/db';
import {
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  Activity,
  CheckCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Sun,
  BookOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ForecastingPage() {
  const { t, language } = useLanguage();
  const { isOnline } = useOffline();
  const router = useRouter();

  const [role, setRole] = useState<'farmer' | 'officer'>('farmer');
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<LocationWeatherResult | null>(null);

  // Initial load
  useEffect(() => {
    const savedRole = localStorage.getItem('krishirakshak_role') as 'farmer' | 'officer';
    if (savedRole) setRole(savedRole);

    const initialLoc = weatherService.getSavedLocation();
    loadWeatherForLocation(initialLoc.name, initialLoc.lat, initialLoc.lon, initialLoc.isGeo);
  }, []);

  const loadWeatherForLocation = async (name: string, lat: number, lon: number, isGeo = false) => {
    setLoading(true);
    weatherService.saveSavedLocation({ name, lat, lon, isGeo });

    try {
      const result = await weatherService.fetchLiveWeather(lat, lon, name, isGeo);
      setWeatherData(result);
      if (result.forecasts.length > 0) {
        await localDB.saveCachedWeather(result.forecasts);
      }
    } catch (e) {
      console.error('Failed to load weather:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: 'Low' | 'Medium' | 'High') => {
    switch (risk) {
      case 'High':
        return 'bg-rose-950/40 border border-rose-800/40 text-rose-400 font-bold';
      case 'Medium':
        return 'bg-amber-950/40 border border-amber-800/40 text-amber-400 font-semibold';
      default:
        return 'bg-green-950/30 border border-green-800/30 text-green-400';
    }
  };

  const riskScore = (risk: 'Low' | 'Medium' | 'High') => {
    if (risk === 'High') return 90;
    if (risk === 'Medium') return 60;
    return 25;
  };

  const riskChartData = weatherData?.forecasts.map(forecast => ({
    day: forecast.day,
    'Fungal Blight': riskScore(forecast.blightRisk),
    'Leaf Rust': riskScore(forecast.rustRisk),
    'Powdery Mildew': riskScore(forecast.mildewRisk)
  })) || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <div>
        <Header role={role} setRole={setRole} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Back button */}
          <button
            onClick={() => router.push(role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>

          {/* Heading & Location Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-2">
                <CloudRain className="h-7 w-7 text-green-500" />
                {t('forecastingTitle')}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{t('forecastingDesc')}</p>
            </div>

            {/* Location Selector Component */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Active Region:</span>
              <LocationSelector
                currentLocationName={weatherData?.locationName || 'Singur, Hooghly'}
                isGeoDetected={weatherData?.isDetectedGeo}
                onSelectLocation={loc => loadWeatherForLocation(loc.name, loc.lat, loc.lon, loc.isGeo)}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-green-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Fetching Live Meteorology API & Outbreak Telemetry...</p>
            </div>
          ) : weatherData ? (
            <div className="space-y-8">

              {/* Today's Live Weather Overview Bar */}
              <div className="glass-card p-6 border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-950 text-green-400 border border-green-800/40">
                        Live API Telemetry
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        GPS: {weatherData.latitude.toFixed(2)}°N, {weatherData.longitude.toFixed(2)}°E
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {weatherData.locationName} Weather Telemetry
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time micro-climate metrics updated live for target crop disease modeling.
                    </p>
                  </div>

                  {/* Current Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('tempMax')}</span>
                      <span className="text-lg font-black text-orange-400">{weatherData.currentTemp}°C</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('humidity')}</span>
                      <span className="text-lg font-black text-sky-400">{weatherData.currentHumidity}%</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('sensorRainProbability')}</span>
                      <span className="text-lg font-black text-blue-400">{weatherData.currentRainChance}%</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('windSpeed')}</span>
                      <span className="text-lg font-black text-emerald-400">{weatherData.currentWindSpeed} km/h</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 5-Day Disease Outbreak Forecast Grid */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-400" />
                  {t('forecast5Day')}
                </h3>

                {/* Multi-risk day-wise trend chart */}
                <div className="glass-card border border-slate-800 bg-[#070d1d] p-5 sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">Daily crop disease risk</h4>
                      <p className="mt-1 text-xs text-slate-500">Weather-based risk trend for the next {weatherData.forecasts.length} days</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Risk score (%)</span>
                  </div>
                  <div className="h-[320px] w-full pt-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={riskChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="#1c2940" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} />
                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: '#71809b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#31415d' }} tickFormatter={value => `${value}%`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0d1628', border: '1px solid #263653', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} formatter={(value) => [`${value}%`, 'Risk']} />
                        <Legend wrapperStyle={{ paddingTop: 18, color: '#94a3b8', fontSize: 12 }} />
                        <Line type="monotone" dataKey="Fungal Blight" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Leaf Rust" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Powdery Mildew" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {weatherData.forecasts.map((f, idx) => (
                    <div key={idx} className="glass-card p-5 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
                          <span className="font-bold text-xs text-white">{f.day}</span>
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        </div>

                        <p className="text-xs font-semibold text-green-400 mb-3">{f.condition}</p>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Temp</span>
                            <span className="font-bold text-white">{f.tempMax}° / {f.tempMin}°C</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>{t('humidity')}</span>
                            <span className="font-bold text-white">{f.humidity}%</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Rain Chance</span>
                            <span className="font-bold text-sky-400">{f.rainChance}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Scores Section */}
                      <div className="pt-3 border-t border-slate-900 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Fungal Blight</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${getRiskBadge(f.blightRisk)}`}>
                            {f.blightRisk}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Leaf Rust</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${getRiskBadge(f.rustRisk)}`}>
                            {f.rustRisk}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Powdery Mildew</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${getRiskBadge(f.mildewRisk)}`}>
                            {f.mildewRisk}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preventative IPM Recommendations Card */}
              <div className="glass-card p-6 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-slate-900 pb-3">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  {t('preventativeAction')} ({weatherData.locationName})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                    <span className="font-bold text-amber-400 block">High Humidity / Blight Protection</span>
                    <p className="text-slate-400 leading-relaxed">
                      Relative humidity above 75% detected in {weatherData.locationName}. Apply Mancozeb 75% WP (0.25%) preventively on Potato and Tomato crops before dew condensation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                    <span className="font-bold text-sky-400 block">Rainfall / Rust Management</span>
                    <p className="text-slate-400 leading-relaxed">
                      Ensure proper field drainage. Avoid late urea application on Rice and Wheat during rain spells to prevent spore germination.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                    <span className="font-bold text-green-400 block">IPM Bio-Control Advice</span>
                    <p className="text-slate-400 leading-relaxed">
                      Deploy Trichogramma parasitoid cards and yellow sticky traps to capture whiteflies and bollworm moths early in warm weather.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          ) : null}

        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI · Meteorological telemetry powered by Open-Meteo API.
        </p>
      </footer>
    </div>
  );
}
