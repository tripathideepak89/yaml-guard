import { useEffect, useState } from 'react';
import { API_BASE } from '../api/client';

export function useHealth(pollMs = 0) {
  const [status, setStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [detail, setDetail] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const hit = async () => {
      try {
        const r = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        if (!cancelled) {
          setStatus(r.ok ? 'ok' : 'error');
          if (!r.ok) setDetail(`${r.status}`);
        }
      } catch (e: any) {
        if (!cancelled) { setStatus('error'); setDetail(e.message); }
      }
      if (pollMs > 0 && !cancelled) {
        timer = window.setTimeout(hit, pollMs) as any;
      }
    };
    hit();
  return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [pollMs]);
  return { status, detail, apiBase: API_BASE };
}
