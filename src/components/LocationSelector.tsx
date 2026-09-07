'use client';

import React, { useState } from 'react';
import { PRESET_LOCATIONS, LocationPreset } from '../utils/weatherService';
import { MapPin, Navigation, Check, RefreshCw, Globe, ChevronDown } from 'lucide-react';
import { getNativeLocation } from '../utils/nativeBridge';

interface LocationSelectorProps {
  currentLocationName: string;
  isGeoDetected?: boolean;
  onSelectLocation: (loc: { name: string; lat: number; lon: number; isGeo?: boolean }) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  currentLocationName,
  isGeoDetected,
  onSelectLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [detectingGeo, setDetectingGeo] = useState(false);
  const [customSearch, setCustomSearch] = useState('');

  // Handle GPS Auto Detection (supports Native Android GPS + Web Geolocation)
  const handleAutoDetect = async () => {
    setDetectingGeo(true);
    try {
      const coords = await getNativeLocation();
      const lat = Math.round(coords.latitude * 100) / 100;
      const lon = Math.round(coords.longitude * 100) / 100;
      const name = `GPS Detected (${lat}°N, ${lon}°E)`;

      onSelectLocation({ name, lat, lon, isGeo: true });
      setIsOpen(false);
    } catch (error) {
      console.warn('Geolocation error:', error);
      alert('Could not retrieve device location. Please check GPS permissions or select your region manually.');
    } finally {
      setDetectingGeo(false);
    }
  };

  const handleSelectPreset = (preset: LocationPreset) => {
    onSelectLocation({
      name: preset.name,
      lat: preset.latitude,
      lon: preset.longitude,
      isGeo: false
    });
    setIsOpen(false);
  };

  const filteredPresets = PRESET_LOCATIONS.filter(p =>
    p.name.toLowerCase().includes(customSearch.toLowerCase()) ||
    p.state.toLowerCase().includes(customSearch.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left z-30">
      
      {/* Current Location Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-green-600/50 text-slate-200 text-xs font-bold transition-all shadow-md cursor-pointer group"
      >
        <MapPin className={`h-4 w-4 ${isGeoDetected ? 'text-sky-400' : 'text-green-400'}`} />
        <span className="truncate max-w-[180px]">{currentLocationName}</span>
        {isGeoDetected && (
          <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-sky-950 text-sky-400 rounded border border-sky-800">
            GPS
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-transform" />
      </button>

      {/* Selector Dropdown Modal */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-2xl z-50 space-y-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-green-400" /> Select Mandi / Village Location
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          {/* GPS Auto Detect Button */}
          <button
            onClick={handleAutoDetect}
            disabled={detectingGeo}
            className="w-full py-2 px-3 rounded-xl bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {detectingGeo ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
            ) : (
              <Navigation className="h-3.5 w-3.5 text-sky-400" />
            )}
            {detectingGeo ? 'Detecting GPS Satellite...' : 'Auto-Detect Device Location (GPS)'}
          </button>

          {/* Search filter input */}
          <input
            type="text"
            placeholder="Search district or mandi..."
            value={customSearch}
            onChange={e => setCustomSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-green-600 focus:outline-none"
          />

          {/* Presets List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredPresets.map(preset => {
              const isSelected = currentLocationName.toLowerCase().includes(preset.name.toLowerCase());
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-green-950/60 border border-green-800/40 text-green-400 font-bold'
                      : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="block font-bold">{preset.name}</span>
                    <span className="text-[10px] text-slate-500">{preset.state}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-green-400" />}
                </button>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
