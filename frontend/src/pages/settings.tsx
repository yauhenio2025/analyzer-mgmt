import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ANALYZER_V2_URL, API_BASE } from '@/lib/config';

interface Probe {
  label: string;
  url: string;
  describe: (body: unknown) => string;
}

const probes: Probe[] = [
  {
    label: 'Engines',
    url: `${ANALYZER_V2_URL}/v1/engines`,
    describe: (b) => {
      const list = Array.isArray(b) ? b : (b as { engines?: unknown[] })?.engines;
      return Array.isArray(list) ? `${list.length} engines` : 'reachable';
    },
  },
  {
    label: 'Workflows',
    url: `${ANALYZER_V2_URL}/v1/workflows`,
    describe: (b) => {
      const list = Array.isArray(b) ? b : (b as { workflows?: unknown[] })?.workflows;
      return Array.isArray(list) ? `${list.length} workflows` : 'reachable';
    },
  },
  {
    label: 'Executor',
    url: `${ANALYZER_V2_URL}/v1/executor/jobs?limit=1`,
    describe: (b) => `${(b as { count?: number })?.count ?? '?'} job(s) sampled`,
  },
  {
    label: 'Dossier route',
    url: `${ANALYZER_V2_URL}/v1/dossier/health`,
    describe: (b) => (b as { status?: string })?.status || 'reachable',
  },
  {
    label: 'Legacy mgmt-api',
    url: `${API_BASE}/stats`,
    describe: () => 'reachable',
  },
];

function useProbe(probe: Probe) {
  return useQuery({
    queryKey: ['settings-probe', probe.url],
    queryFn: async () => {
      const started = performance.now();
      const res = await fetch(probe.url);
      const ms = Math.round(performance.now() - started);
      if (!res.ok) return { ok: false, text: `HTTP ${res.status}`, ms };
      const body = await res.json().catch(() => null);
      return { ok: true, text: probe.describe(body), ms };
    },
    retry: false,
    staleTime: 30_000,
  });
}

function ProbeRow({ probe }: { probe: Probe }) {
  const { data, isLoading } = useProbe(probe);
  return (
    <tr className="border-t border-ink-100">
      <td className="py-2.5 pr-4 text-sm text-ink-900">{probe.label}</td>
      <td className="py-2.5 pr-4 font-mono text-xs text-ink-500 break-all">{probe.url}</td>
      <td className="py-2.5 text-sm">
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> probing
          </span>
        ) : data?.ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {data.text}
            <span className="font-mono text-[11px] text-ink-400">{data.ms} ms</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-red-700">
            <XCircle className="h-4 w-4" /> {data?.text || 'unreachable'}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <div className="mono-label mb-1">Console</div>
        <h1 className="display-title text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-ink-500 max-w-2xl">
          Backend targets are fixed at build time from <code className="font-mono text-xs">NEXT_PUBLIC_*</code>{' '}
          environment variables. Change them on the hosting service and redeploy; nothing here is editable at
          runtime.
        </p>
      </div>

      <section className="console-panel-light p-5 space-y-3">
        <div className="mono-label">Backends</div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm text-ink-900">The Analyst</dt>
          <dd className="font-mono text-xs text-ink-600 break-all">
            {ANALYZER_V2_URL}
            <span className="ml-2 text-ink-400">NEXT_PUBLIC_ANALYZER_V2_URL</span>
          </dd>
          <dt className="text-sm text-ink-900">Legacy mgmt-api</dt>
          <dd className="font-mono text-xs text-ink-600 break-all">
            {API_BASE}
            <span className="ml-2 text-ink-400">NEXT_PUBLIC_API_URL</span>
          </dd>
        </dl>
      </section>

      <section className="console-panel-light p-5">
        <div className="mono-label mb-2">Health</div>
        <table className="w-full">
          <tbody>
            {probes.map((probe) => (
              <ProbeRow key={probe.url} probe={probe} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
