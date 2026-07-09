'use client';
import { useEffect, useRef, useState } from 'react';

// Polls an endpoint every `ms`, keeps last good data, exposes loading state.
export function usePoll<T>(url: string, ms = 2500) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`${r.status}`);
        const j = await r.json();
        if (mounted.current) { setData(j); setError(null); }
      } catch (e) {
        if (mounted.current) setError(String(e));
      } finally {
        if (mounted.current) timer = setTimeout(tick, ms);
      }
    };
    tick();
    return () => { mounted.current = false; clearTimeout(timer); };
  }, [url, ms]);

  return { data, error };
}
