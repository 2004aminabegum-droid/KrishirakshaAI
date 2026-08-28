export interface IoTTelemetry {
  temperature: number;
  soilMoisture: number;
  humidity: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  ph?: number;
  rainChance: number;
  windSpeed: number;
  pestCatches: number;
  pestSpecies?: Record<string, number>;
  healthStatus: 'good' | 'warning' | 'poor';
  lastSync: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  crop: string;
  location: string;
  deviceSerial: string;
  pairedAt: string;
  status: 'online' | 'offline' | 'syncing';
  telemetry: IoTTelemetry;
  historicalReadings?: IoTTelemetry[];
  latitude?: number;
  longitude?: number;
}

export const DEVICES_KEY = 'krishirakshak_iot_devices';

export function loadIoTDevices(): IoTDevice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveIoTDevices(devices: IoTDevice[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}
