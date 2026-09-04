import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ExternalLink, Image as ImageIcon, PlayCircle, AlertCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type { EngineSummary, Workflow } from '@/types';
import { FAMILY_META, familyChipClass, formatCount } from '@/lib/families';
import { EstateMap, EstateMapCaption } from '@/components/estate/EstateMap';
import { ProcessCard } from '@/components/estate/PhaseRail';

const DOSSIER_RUN_URL = 'https://the-analyst-desk.onrender.com/d/dossier-43f34a0abe5c/console';
const DOSSIER_PLATES_URL = 'https://the-analyst-desk.onrender.com/d/dossier-43f34a0abe5c/plates';

const GRAMMAR_PARTS: { path: string; label: string }[] = [
  { path: 'renderers', label: 'renderers' },
  { path: 'sub-renderers', label: 'sub-renderers' },
  { path: 'views/patterns', label: 'view patterns' },
  { path: 'transformations', label: 'transformations' },
  { path: 'styles', label: 'styles' },
  { path: 'primitives', label: 'primitives' },
];

const COUNT_PATHS = ['chains', 'paradigms', 'audiences', 'operations/stances', ...GRAMMAR_PARTS.map((g) => g.path)];

function sum(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number');
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
}

function Stat({
  label,
  value,
  href,
  title,
}: {
  label: string;
  value: number | null | undefined;
  href: string;
  title?: string;
}) {
  return (
    <Link href={href} className="group min-w-0" title={title}>
      <div className="text-2xl font-bold text-gray-900 group-hover:text-primary-700 tabular-nums">
        {value === undefined ? <span className="inline-block h-6 w-10 bg-gray-100 rounded animate-pulse" /> : value === null ? '—' : formatCount(value)}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400 group-hover:text-primary-600">{label}</div>
    </Link>
  );
}

function SectionHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <AlertCircle className="h-4 w-4" />
      {children}
    </div>
  );
}

export default function MapPage() {
  const organsQ = useQuery({ queryKey: ['organs'], queryFn: () => api.organs.list() });
  const enginesQ = useQuery({
    queryKey: ['engines', { limit: 500 }],
    queryFn: () => api.engines.list({ limit: 500 }),
  });
  const workflowsQ = useQuery({ queryKey: ['workflows', 'detailed'], queryFn: () => api.workflows.listDetailed() });
  const dossierQ = useQuery({ queryKey: ['workflow', 'dossier_standard'], queryFn: () => api.workflows.get('dossier_standard') });
  const countsQ = useQuery({ queryKey: ['registry-counts', COUNT_PATHS], queryFn: () => api.registry.counts(COUNT_PATHS) });

  const engines: EngineSummary[] = enginesQ.data?.engines ?? [];
  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of engines) {
      const f = e.family ?? 'analytical';
      counts[f] = (counts[f] ?? 0) + 1;
    }
    return counts;
  }, [engines]);

  const organs = organsQ.data ?? [];
  const organName = useMemo(() => new Map(organs.map((o) => [o.organ_key, o.organ_name])), [organs]);
  const workflows: Workflow[] = workflowsQ.data ?? [];
  const estateProcesses = workflows.filter((w) => w.category === 'process' || w.category === 'rendering');

  const counts = countsQ.data;
  const grammarTotal = counts ? sum(GRAMMAR_PARTS.map((g) => counts[g.path])) : undefined;
  const grammarTitle = counts
    ? GRAMMAR_PARTS.map((g) => `${counts[g.path] ?? '—'} ${g.label}`).join(' · ')
    : 'renderers · sub-renderers · view patterns · transformations · styles · primitives';

  const dossierPhases = dossierQ.data?.phases ?? [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl bg-ink-900 border border-ink-700 px-8 py-10 text-paper">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl tracking-tight text-paper">The Mastermind</span>
          <span className="mono-label text-gold-500">Method Registry</span>
        </div>
        <p className="mt-4 max-w-3xl text-lg text-ink-100 leading-snug">
          One registry of methods. Every organ draws its engines, processes and grammars from here.
        </p>
        <p className="mt-5 max-w-3xl font-display text-sm italic text-ink-300 leading-relaxed">
          &ldquo;a repository of best practices and techniques of engaging with textual inputs… relatively modular
          sets of reasoning capacities which describe the kinds of questions being asked, and the sequence in
          which they are asked&rdquo;
          <span className="not-italic mono-label ml-2">dictation, 10 July 2026</span>
        </p>
      </div>

      {/* Live counts strip */}
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <Link href="/engines" className="group lg:w-[38%] min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400 group-hover:text-primary-600">Engines</div>
            <div className="text-4xl font-bold text-gray-900 group-hover:text-primary-700 tabular-nums">
              {enginesQ.isLoading ? <span className="inline-block h-8 w-16 bg-gray-100 rounded animate-pulse" /> : enginesQ.isError ? '—' : formatCount(engines.length)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FAMILY_META.filter((f) => familyCounts[f.key]).map((f) => (
                <span key={f.key} className={clsx('rounded border px-1.5 py-0.5 text-[11px] font-medium', familyChipClass(f.key))}>
                  {f.label} <span className="opacity-70">{familyCounts[f.key]}</span>
                </span>
              ))}
            </div>
            {enginesQ.isError && <InlineError>Engines unavailable</InlineError>}
          </Link>
          <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-5 lg:border-l lg:border-gray-200 lg:pl-6">
            <Stat label="Processes" value={workflowsQ.isError ? null : workflowsQ.data ? workflows.length : undefined} href="/processes" />
            <Stat label="Chains" value={counts?.chains} href="/chains" />
            <Stat label="Paradigms" value={counts?.paradigms} href="/paradigms" />
            <Stat label="Audiences" value={counts?.audiences} href="/audiences" />
            <Stat label="Stances" value={counts?.['operations/stances']} href="/stances" />
            <Stat label="Organs" value={organsQ.isError ? null : organsQ.data ? organs.length : undefined} href="/organs" />
            <Stat label="Grammar" value={grammarTotal} href="/renderers" title={grammarTitle} />
          </div>
        </div>
      </div>

      {/* Estate map */}
      <section className="space-y-3">
        <SectionHeading
          title="The estate"
          subtitle="Organs by layer. Each draws its methods from this registry, natively or as a mirror."
        >
          <Link href="/organs" className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center">
            All organs <ChevronRight className="h-4 w-4 ml-0.5" />
          </Link>
        </SectionHeading>
        {organsQ.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-28" />
            ))}
          </div>
        )}
        {organsQ.isError && <InlineError>Failed to load organs from the registry</InlineError>}
        {organsQ.data && (
          <div className="card p-5">
            <EstateMap organs={organs} />
            <div className="mt-4 pt-3 border-t border-gray-100">
              <EstateMapCaption />
            </div>
          </div>
        )}
      </section>

      {/* How a dossier is made */}
      <section className="space-y-3">
        <SectionHeading
          title="How a dossier is made"
          subtitle="The eleven phases of dossier_standard, The Analyst's meaning-making process. Every step is a named method in this registry."
        >
          <div className="flex gap-2">
            <a href={DOSSIER_RUN_URL} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Watch a real run
              <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
            </a>
            <a href={DOSSIER_PLATES_URL} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
              <ImageIcon className="h-4 w-4 mr-1.5" />
              See its plates
              <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
            </a>
          </div>
        </SectionHeading>
        {dossierQ.isError && <InlineError>dossier_standard is not in the registry</InlineError>}
        <div className="card p-5">
          {dossierQ.isLoading && <div className="h-32 animate-pulse bg-gray-50 rounded" />}
          {dossierPhases.length > 0 && (
            <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {dossierPhases.map((phase, i) => (
                <li key={phase.phase_number} className="relative">
                  <Link
                    href={`/processes/dossier_standard#phase-${phase.phase_number}`}
                    className="h-full rounded-lg border border-gray-200 bg-white p-3 hover:border-primary-300 hover:shadow-sm transition-all flex flex-col"
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-mono text-sm text-amber-600 font-semibold">{phase.phase_number}</span>
                      {i < dossierPhases.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">{phase.phase_name}</span>
                    <span className="text-[11px] text-gray-500 mt-1.5 line-clamp-5 leading-snug">{phase.phase_description}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Processes across the estate */}
      <section className="space-y-3">
        <SectionHeading
          title="Processes across the estate"
          subtitle="Cross-organ processes and rendering pipelines the registry sequences; each phase names its method."
        >
          <Link href="/processes" className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center">
            All processes <ChevronRight className="h-4 w-4 ml-0.5" />
          </Link>
        </SectionHeading>
        {workflowsQ.isError && <InlineError>Failed to load processes</InlineError>}
        {workflowsQ.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-36" />
            ))}
          </div>
        )}
        {estateProcesses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {estateProcesses.map((w) => (
              <ProcessCard key={w.workflow_key} workflow={w} organName={organName.get(w.source_project || 'the-analyst')} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
