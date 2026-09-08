'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isNativePlatform } from '../utils/nativeBridge';

export function CapacitorInit() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanupBackButton: (() => void) | undefined;

    const setupCapacitor = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#14532d' });
      } catch (err) {
        console.warn('[Capacitor] StatusBar init failed:', err);
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (err) {
        console.warn('[Capacitor] SplashScreen hide failed:', err);
      }

      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const cleanPath = (pathname || '/').replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
          if (cleanPath === '/' || cleanPath === '/login' || !canGoBack) {
            CapApp.minimizeApp();
          } else {
            router.back();
          }
        });

        cleanupBackButton = () => {
          listener.remove();
        };
      } catch (err) {
        console.warn('[Capacitor] App backButton init failed:', err);
      }
    };

    setupCapacitor();

    return () => {
      if (cleanupBackButton) {
        cleanupBackButton();
      }
    };
  }, [router, pathname]);

  return null;
}
