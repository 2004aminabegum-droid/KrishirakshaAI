import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KrishiRakshak AI - Crop Health Sentinel',
    short_name: 'KrishiRakshak',
    description: 'AI-Powered Crop Disease Detection, Pest Monitor, and Mandi Price Tracker.',
    start_url: '/',
    display: 'standalone',
    background_color: '#14532d', // dark forest green
    theme_color: '#15803d',      // green-700
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
  };
}
