'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if document is already loaded
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('KrishiRakshak Service Worker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.error('KrishiRakshak Service Worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
