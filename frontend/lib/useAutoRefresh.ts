'use client';

import { useEffect, useRef } from 'react';

export function useAutoRefresh(refresh: () => Promise<void>, enabled = true) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const update = async () => {
      if (document.visibilityState !== 'visible' || running) return;
      running = true;
      try { await latest.current(); }
      finally { running = false; }
    };
    const onVisible = () => { void update(); };
    const timer = window.setInterval(onVisible, 15000);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
