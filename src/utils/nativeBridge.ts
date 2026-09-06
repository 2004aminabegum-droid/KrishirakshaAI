import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Network, ConnectionStatus } from '@capacitor/network';

/**
 * Checks if the application is currently running as a native Android or iOS app.
 */
export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
  name: string;
}

/**
 * Captures a high-resolution photo using the native Android Camera
 * or picks an image from the photo gallery.
 */
export async function takeNativePhoto(source: 'camera' | 'photos' = 'camera'): Promise<CapturedPhoto | null> {
  if (!isNativePlatform()) {
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      saveToGallery: false,
      correctOrientation: true,
    });

    if (!image || !image.dataUrl) return null;

    const timestamp = Date.now();
    const format = image.format || 'jpeg';
    const name = `field_scan_${timestamp}.${format}`;

    return {
      dataUrl: image.dataUrl,
      format,
      name,
    };
  } catch (err: any) {
    // User cancelled or camera denied
    if (err?.message !== 'User cancelled photos app') {
      console.warn('[NativeBridge] Camera capture error:', err);
    }
    return null;
  }
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Requests high-accuracy GPS coordinates using Capacitor Geolocation
 * with Android runtime permission handling and browser fallback.
 */
export async function getNativeLocation(): Promise<GeoCoordinates> {
  if (isNativePlatform()) {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          throw new Error('Location permission not granted');
        }
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (err) {
      console.warn('[NativeBridge] Native Geolocation error, falling back to Web API:', err);
    }
  }

  // Fallback to standard Web Geolocation API
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this environment.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Retrieves the current network connectivity status.
 */
export async function getNativeNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  if (isNativePlatform()) {
    try {
      const status: ConnectionStatus = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType,
      };
    } catch (err) {
      console.warn('[NativeBridge] Network status check error:', err);
    }
  }

  return {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  };
}

/**
 * Listens for real-time network connectivity changes.
 */
export function onNativeNetworkChange(callback: (connected: boolean) => void): () => void {
  if (isNativePlatform()) {
    const handle = Network.addListener('networkStatusChange', status => {
      callback(status.connected);
    });

    return () => {
      handle.then(h => h.remove());
    };
  }

  if (typeof window !== 'undefined') {
    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }

  return () => {};
}
