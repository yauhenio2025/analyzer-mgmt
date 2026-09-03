/**
 * Run-event feed hook for the Run Console.
 *
 * Strategy (in order):
 *   1. fixture (dev)              — `?fixture=1`; optional progressive replay
 *   2. GET /v1/events/{id}?after= — initial replay from seq 0
 *   3. SSE  /v1/events/{id}/stream (event name `run_event`) while the job runs
 *   4. polling GET ?after=<last_seq> every 2 s if SSE is unavailable/drops
 * A 404 on the initial GET means the ledger is not deployed on this backend:
 * status becomes `unavailable` and the console degrades to plan+results only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ANALYZER_V2_URL } from '@/lib/config';
import type { RunEvent } from '@/types';

export type EventsFeedStatus =
  | 'idle'
  | 'loading'
  | 'sse'
  | 'polling'
  | 'static'
  | 'unavailable'
  | 'fixture'
  | 'error';

export interface UseRunEventsOptions {
  enabled?: boolean;
  /** Keep streaming/polling (true while the job is running). */
  live?: boolean;
  /** Dev: serve these events instead of the network. Must be a stable reference. */
  fixture?: RunEvent[] | null;
  /** Dev: reveal fixture events one by one to exercise live pips. */
  replay?: boolean;
  replayIntervalMs?: number;
  pollIntervalMs?: number;
}

export function parseEventsResponse(data: unknown): RunEvent[] {
  if (Array.isArray(data)) return data as RunEvent[];
  if (data && typeof data === 'object') {
    const obj = data as { events?: unknown; items?: unknown };
    if (Array.isArray(obj.events)) return obj.events as RunEvent[];
    if (Array.isArray(obj.items)) return obj.items as RunEvent[];
  }
  return [];
}

export function useRunEvents(jobId: string | undefined, options: UseRunEventsOptions = {}) {
  const {
    enabled = true,
    live = false,
    fixture = null,
    replay = false,
    replayIntervalMs = 420,
    pollIntervalMs = 2000,
  } = options;

  const [events, setEvents] = useState<RunEvent[]>([]);
  const [status, setStatus] = useState<EventsFeedStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Map<number, RunEvent>>(new Map());
  const lastSeq = useRef(0);

  const append = useCallback((incoming: RunEvent[]) => {
    let changed = false;
    for (const ev of incoming) {
      if (!ev || typeof ev.seq !== 'number' || seen.current.has(ev.seq)) continue;
      seen.current.set(ev.seq, ev);
      if (ev.seq > lastSeq.current) lastSeq.current = ev.seq;
      changed = true;
    }
    if (changed) {
      setEvents(Array.from(seen.current.values()).sort((a, b) => a.seq - b.seq));
    }
  }, []);

  // Reset the buffer only when the job (or the fixture source) changes.
  useEffect(() => {
    seen.current = new Map();
    lastSeq.current = 0;
    setEvents([]);
    setError(null);
  }, [jobId, fixture]);

  useEffect(() => {
    if (!jobId || !enabled) {
      setStatus('idle');
      return;
    }

    // ── Fixture mode ────────────────────────────────────────────
    if (fixture) {
      setStatus('fixture');
      if (!replay) {
        append(fixture);
        return;
      }
      let i = 0;
      const timer = setInterval(() => {
        if (i >= fixture.length) {
          clearInterval(timer);
          return;
        }
        append([fixture[i]]);
        i += 1;
      }, replayIntervalMs);
      return () => clearInterval(timer);
    }

    // ── Network mode ────────────────────────────────────────────
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchAfter = async (after: number): Promise<RunEvent[] | null> => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/events/${encodeURIComponent(jobId)}?after=${after}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseEventsResponse(await res.json());
    };

    const startPolling = () => {
      if (cancelled) return;
      setStatus('polling');
      const tick = async () => {
        if (cancelled) return;
        try {
          const batch = await fetchAfter(lastSeq.current);
          if (batch) append(batch);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
        if (!cancelled) pollTimer = setTimeout(tick, pollIntervalMs);
      };
      pollTimer = setTimeout(tick, pollIntervalMs);
    };

    const startSse = () => {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        startPolling();
        return;
      }
      try {
        es = new EventSource(
          `${ANALYZER_V2_URL}/v1/events/${encodeURIComponent(jobId)}/stream?after=${lastSeq.current}`
        );
      } catch {
        startPolling();
        return;
      }
      const handle = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          append(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          /* ignore non-JSON keepalives */
        }
      };
      es.onopen = () => setStatus('sse');
      es.addEventListener('run_event', handle as EventListener);
      es.onmessage = handle;
      es.onerror = () => {
        es?.close();
        es = null;
        startPolling();
      };
    };

    (async () => {
      setStatus('loading');
      try {
        const initial = await fetchAfter(0);
        if (cancelled) return;
        if (initial === null) {
          setStatus('unavailable');
          return;
        }
        append(initial);
        if (live) startSse();
        else setStatus('static');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId, enabled, live, fixture, replay, replayIntervalMs, pollIntervalMs, append]);

  return { events, status, error, lastSeq: lastSeq.current };
}
