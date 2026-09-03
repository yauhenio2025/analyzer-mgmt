import { useEffect, useState } from 'react';

export type Reachability = 'none' | 'checking' | 'reachable' | 'no-answer';

/**
 * Probe a URL from the browser without blocking render.
 *
 * `mode: 'no-cors'` yields an opaque response for any answering server (even a 404),
 * so "reachable" means "something answered at that origin within 6 s". A sleeping
 * Render service, a localhost-only organ or a blocked mixed-content request all
 * land on "no-answer".
 */
export function useReachable(url: string | undefined | null): Reachability {
  const [state, setState] = useState<Reachability>(url ? 'checking' : 'none');

  useEffect(() => {
    if (!url) {
      setState('none');
      return;
    }
    let cancelled = false;
    setState('checking');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    fetch(url, { mode: 'no-cors', signal: controller.signal })
      .then(() => {
        if (!cancelled) setState('reachable');
      })
      .catch(() => {
        if (!cancelled) setState('no-answer');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  return state;
}

/** Which URL to probe for an organ: health, else API, else UI. */
export function probeUrl(urls: { health?: string; api?: string; ui?: string } | undefined): string | undefined {
  if (!urls) return undefined;
  return urls.health || urls.api || urls.ui || undefined;
}
