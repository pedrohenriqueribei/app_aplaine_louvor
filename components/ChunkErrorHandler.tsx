'use client';

import { useEffect } from 'react';

export function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChunkError = (errorOrEvent: any) => {
      const err = errorOrEvent?.reason || errorOrEvent?.error || errorOrEvent;
      const str = (
        (err?.name || '') + ' ' +
        (err?.message || '') + ' ' +
        (err?.stack || '') + ' ' +
        String(err || '')
      ).toLowerCase();

      const isChunkLoadError =
        str.includes('chunkloaderror') ||
        str.includes('loading chunk') ||
        str.includes('failed to fetch dynamically imported module');

      if (isChunkLoadError) {
        console.warn('ChunkLoadError detected. Reloading to fetch latest version...', err);
        const lastReload = sessionStorage.getItem('chunk_reload_attempt');
        const now = Date.now();
        // Prevent infinite reload loops (must wait at least 8 seconds between automatic reloads)
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem('chunk_reload_attempt', now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleChunkError);
    window.addEventListener('error', handleChunkError);

    return () => {
      window.removeEventListener('unhandledrejection', handleChunkError);
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  return null;
}
