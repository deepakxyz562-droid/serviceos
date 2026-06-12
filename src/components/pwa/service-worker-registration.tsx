'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceOS Service Worker registered with scope:', registration.scope);

          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('ServiceOS Service Worker updated and activated');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('ServiceOS Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
