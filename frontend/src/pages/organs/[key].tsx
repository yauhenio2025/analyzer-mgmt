import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Code2,
  GitBranch,
  BookOpen,
  Terminal,
  FileText,
  ChevronRight,
  Cpu,
  Route,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type { Organ, OrganSummary } from '@/types';
import {
  LAYER_META,
  familyChipClass,
  familyLabel,
  formatCount,
  humanizeKey,
  organStatusPill,
  syncMeta,
} from '@/lib/families';
import { probeUrl, useReachable } from '@/components/estate/useReachable';
import { ProcessCard, workflowOrganKey } from '@/components/estate/PhaseRail';

const URL_LABELS: Array<{ key: keyof Organ['urls']; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'ui', label: 'Open', icon: ExternalLink },
  { key: 'api', label: 'API', icon: Code2 },
  { key: 'docs', label: 'Docs', icon: BookOpen },
  { key: 'console', label: 'Console', icon: Terminal },
  { key: 'longform', label: 'Long-form', icon: FileText },
  { key: 'repo', label: 'Repo', icon: GitBranch },
  { key: 'registry_repo', label: 'Registry repo', icon: GitBranch },
  { key: 'health', label: 'Health', icon: Code2 },
];

function OrganLink({ organKey, organs }: { organKey: string; organs: OrganSummary[] }) {
  const organ = organs.find((o) => o.organ_key === organKey);
  return (
    <Link
      href={`/organs/${organKey}`}
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-800 hover:border-primary-300 hover:text-primary-700"
    >
      {organ?.organ_name ?? organKey}
      <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
    </Link>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('card p-5', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function OrganDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const organKey = typeof key === 'string' ? key : null;

  const organQ = useQuery({
    queryKey: ['organ', organKey],
    queryFn: () => api.organs.get(organKey as string),
    enabled: !!organKey,
  });
  const organsQ = useQuery({ queryKey: ['organs'], queryFn: () => api.organs.list() });
  const enginesQ = useQuery({
    queryKey: ['organ', organKey, 'engines'],
    queryFn: () => api.organs.engines(organKey as string),
    enabled: !!organKey,
  });
  const workflowsQ = useQuery({ queryKey: ['workflows', 'detailed'], queryFn: () => api.workflows.listDetailed() });

  const organ = organQ.data;
  const reach = useReachable(probeUrl(organ?.urls));

  if (!organKey || organQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (organQ.error || !organ) {
    return (
      <div className="space-y-6">
        <Link href="/organs" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organs
        </Link>
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Organ not found
        </div>
      </div>
    );
  }

  const status = organStatusPill(organ.status);
  const sync = syncMeta(organ.sync);
  const organs = organsQ.data ?? [];
  const engines = enginesQ.data ?? [];
  const processes = (workflowsQ.data ?? []).filter((w) => workflowOrganKey(w) === organ.organ_key);
  const counts = Object.entries(organ.counts ?? {});
  const links = URL_LABELS.filter((l) => organ.urls?.[l.key]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/organs" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Organs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{organ.organ_name}</h1>
              {reach !== 'none' && (
                <span
                  className={clsx(
                    'pip',
                    reach === 'reachable' && 'bg-emerald-500',
                    reach === 'checking' && 'bg-gray-300 animate-pulse',
                    reach === 'no-answer' && 'bg-gray-400'
                  )}
                  title={reach === 'reachable' ? 'reachable' : reach === 'checking' ? 'checking…' : 'no answer'}
                />
              )}
              <span className={clsx('badge', status.pill)}>{status.label}</span>
              <span className={clsx('badge', sync.pill)} title={sync.blurb}>{sync.label}</span>
              <span className="badge badge-gray">{LAYER_META[organ.layer]?.label ?? organ.layer}</span>
              {organ.workspace && <span className="badge badge-gray font-mono">ws: {organ.workspace}</span>}
            </div>
            <p className="mt-1 text-gray-500">{organ.tagline}</p>
            <p className="mt-0.5 font-mono text-xs text-gray-400">{organ.organ_key}</p>
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {links.map(({ key: k, label, icon: Icon }) => (
                <a
                  key={k}
                  href={organ.urls[k]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role */}
      <div className="card p-5">
        <p className="text-gray-800 leading-relaxed">{organ.role}</p>
        <p className="mt-3 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">{sync.label}</span> — {sync.blurb}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Contributes to the registry" className="lg:col-span-2">
          {organ.contributes.length > 0 ? (
            <ul className="space-y-1.5">
              {organ.contributes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Nothing declared yet.</p>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Families">
            {organ.families.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {organ.families.map((f) => (
                  <Link
                    key={f}
                    href={`/engines?family=${f}`}
                    className={clsx('rounded border px-2 py-0.5 text-xs font-medium hover:opacity-80', familyChipClass(f))}
                  >
                    {familyLabel(f)}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No method families (a source or consumer).</p>
            )}
          </Section>

          <Section title="Counts">
            {counts.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {counts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-wider text-gray-400">{humanizeKey(k)}</dt>
                    <dd className="text-lg font-semibold text-gray-900 tabular-nums">{formatCount(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-400">No counts reported.</p>
            )}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Depends on">
          {organ.depends_on.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {organ.depends_on.map((k) => (
                <OrganLink key={k} organKey={k} organs={organs} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No upstream organs.</p>
          )}
        </Section>
        <Section title="Feeds">
          {organ.feeds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {organ.feeds.map((k) => (
                <OrganLink key={k} organKey={k} organs={organs} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No downstream organs.</p>
          )}
        </Section>
      </div>

      {/* Engines hosted here */}
      <div className="card">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Engines hosted here</h2>
            <span className="badge badge-gray">{engines.length}</span>
          </div>
          <Link href={`/engines?organ=${organ.organ_key}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Browse in Engines
          </Link>
        </div>
        {enginesQ.isLoading && <div className="px-5 py-8 text-sm text-gray-400 animate-pulse">Loading engines…</div>}
        {enginesQ.error && <div className="px-5 py-8 text-sm text-red-600">Failed to load engines</div>}
        {enginesQ.data && engines.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No engines have this organ as their home.</div>
        )}
        {engines.length > 0 && (
          <div className="divide-y divide-gray-100">
            {engines
              .slice()
              .sort((a, b) => a.engine_name.localeCompare(b.engine_name))
              .map((engine) => (
                <Link
                  key={engine.engine_key}
                  href={`/engines/${engine.engine_key}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{engine.engine_name}</span>
                      <span className={clsx('rounded border px-1.5 py-0 text-[10px] font-medium', familyChipClass(engine.family ?? 'analytical'))}>
                        {familyLabel(engine.family ?? 'analytical')}
                      </span>
                      <span className="text-xs text-gray-400 capitalize hidden sm:inline">{engine.category}</span>
                      {engine.registry_status && engine.registry_status !== 'live' && (
                        <span className="badge badge-gray text-[10px] py-0">{engine.registry_status}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{engine.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 flex-shrink-0" />
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Processes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-gray-900">Processes</h2>
          <span className="badge badge-gray">{processes.length}</span>
        </div>
        {workflowsQ.isLoading && <div className="card p-4 animate-pulse h-24" />}
        {workflowsQ.data && processes.length === 0 && (
          <div className="card p-6 text-center text-sm text-gray-400">No registered process runs in this organ.</div>
        )}
        {processes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {processes.map((w) => (
              <ProcessCard key={w.workflow_key} workflow={w} organName={organ.organ_name} />
            ))}
          </div>
        )}
      </div>

      {/* Lineage */}
      <Section title="Lineage">
        {organ.lineage.length > 0 ? (
          <ul className="space-y-1">
            {organ.lineage.map((path) => (
              <li key={path} className="font-mono text-xs text-gray-700">{path}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No dictations or memos recorded.</p>
        )}
        {organ.notes && <p className="mt-3 text-sm text-gray-500">{organ.notes}</p>}
      </Section>
    </div>
  );
}
