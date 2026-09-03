/**
 * Run Console — "under the hood" for one execution.
 *
 *   top    : objective / strategy rationale + alternatives considered
 *   left   : phase tree (phases → chains → engines → passes → calls) with live pips
 *   center : selected node — prompt | output, model, tokens, cost, duration
 *   bottom : event timeline
 *
 * Data: executor job + plan + pipeline-visualization + results + phase prose,
 * plus the events ledger (SSE/poll). Degrades to plan+results when the ledger
 * 404s. Dev: `?fixture=1` (add `&replay=1` to animate, `&exec=1` for executive view).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useRunEvents } from '@/lib/events';
import type {
  ExecutorJobSummary,
  JobResultsResponse,
  PipelineVisualization,
  PlanDetail,
  RunEvent,
} from '@/types';
import { buildConsoleTree, defaultSelection } from '@/components/console/model';
import { PhaseTree } from '@/components/console/PhaseTree';
import { NodeDetail } from '@/components/console/NodeDetail';
import { Timeline } from '@/components/console/Timeline';
import { CostMeter, StatusTag, Toggle } from '@/components/console/widgets';
import { elapsedMs, fmtDateTime, humanize } from '@/components/console/format';
import type { NodeStatus } from '@/components/console/model';

interface Fixture {
  job: ExecutorJobSummary;
  plan: PlanDetail;
  pipeline: PipelineVisualization;
  results: JobResultsResponse;
  events: RunEvent[];
}

const EXEC_STORAGE_KEY = 'analyst.console.executive';

function jobStatus(status?: string): NodeStatus {
  if (status === 'completed') return 'completed';
  if (status === 'running' || status === 'pending') return 'running';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  return 'pending';
}

export default function RunConsolePage() {
  const router = useRouter();
  const jobId = typeof router.query.id === 'string' ? router.query.id : undefined;
  const useFixture = router.query.fixture === '1';
  const replay = router.query.replay === '1';

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [executive, setExecutive] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userSelected, setUserSelected] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Executive toggle: URL param wins on first load, then localStorage.
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.exec === '1') {
      setExecutive(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(EXEC_STORAGE_KEY);
      if (stored === '1') setExecutive(true);
    } catch {
      /* storage unavailable */
    }
  }, [router.isReady, router.query.exec]);

  const toggleExecutive = (next: boolean) => {
    setExecutive(next);
    try {
      window.localStorage.setItem(EXEC_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };

  // Dev fixture (dynamic import keeps it out of the production bundle path).
  useEffect(() => {
    if (!useFixture) return;
    let cancelled = false;
    import('@/fixtures/events-sample.json').then((mod) => {
      if (!cancelled) setFixture((mod.default ?? mod) as unknown as Fixture);
    });
    return () => {
      cancelled = true;
    };
  }, [useFixture]);

  const networkEnabled = Boolean(jobId) && !useFixture;

  const jobQuery = useQuery({
    queryKey: ['console-job', jobId],
    queryFn: () => api.executorJobs.get(jobId!),
    enabled: networkEnabled,
    refetchInterval: (q) => (q.state.data?.status === 'running' || q.state.data?.status === 'pending' ? 3000 : false),
  });
  const job = useFixture ? fixture?.job ?? null : jobQuery.data ?? null;
  const planId = job?.plan_id;

  const planQuery = useQuery({
    queryKey: ['console-plan', planId],
    queryFn: () => api.plans.get(planId!),
    enabled: networkEnabled && Boolean(planId),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const vizQuery = useQuery({
    queryKey: ['console-viz', planId],
    queryFn: () => api.plans.pipelineVisualization(planId!),
    enabled: networkEnabled && Boolean(planId),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const resultsQuery = useQuery({
    queryKey: ['console-results', jobId],
    queryFn: () => api.executorJobs.results(jobId!),
    enabled: networkEnabled,
    retry: false,
    refetchInterval: job?.status === 'running' || job?.status === 'pending' ? 8000 : false,
  });
  const summaryQuery = useQuery({
    queryKey: ['console-events-summary', jobId],
    queryFn: () => api.runEvents.summary(jobId!),
    enabled: networkEnabled,
    retry: false,
    refetchInterval: job?.status === 'running' || job?.status === 'pending' ? 5000 : false,
  });

  const plan = useFixture ? fixture?.plan ?? null : planQuery.data ?? null;
  const viz = useFixture ? fixture?.pipeline ?? null : vizQuery.data ?? null;
  const results = useFixture ? fixture?.results ?? null : resultsQuery.data ?? null;
  const isRunning = job?.status === 'running' || job?.status === 'pending';

  const { events, status: eventsStatus, error: eventsError } = useRunEvents(useFixture ? fixture?.job.job_id : jobId, {
    enabled: useFixture ? Boolean(fixture) : networkEnabled,
    live: isRunning,
    fixture: useFixture ? fixture?.events ?? null : null,
    replay,
  });

  const tree = useMemo(
    () => buildConsoleTree({ viz, plan, job, results, events }),
    [viz, plan, job, results, events]
  );

  // Follow the run while it is live, until the user picks a node.
  useEffect(() => {
    if (userSelected && selectedId && tree.index.has(selectedId)) return;
    const next = defaultSelection(tree);
    if (next && next !== selectedId) setSelectedId(next);
  }, [tree, userSelected, selectedId]);

  const selectedNode = selectedId ? tree.index.get(selectedId) ?? null : null;
  const selectedPhase = selectedNode?.phase;

  const phaseOutputsQuery = useQuery({
    queryKey: ['console-phase-outputs', jobId, selectedPhase],
    queryFn: () => api.executorJobs.phaseOutputs(jobId!, selectedPhase!),
    enabled: networkEnabled && selectedPhase != null && selectedNode?.status !== 'pending',
    retry: false,
    staleTime: 60_000,
  });

  const spent = useMemo(() => {
    const fromSummary = summaryQuery.data?.total_cost_usd ?? summaryQuery.data?.cost_usd;
    if (typeof fromSummary === 'number') return fromSummary;
    return tree.totals.cost_usd;
  }, [summaryQuery.data, tree.totals.cost_usd]);

  const alternatives = useMemo(() => {
    const trace = plan?.decision_trace;
    if (!trace) return [] as { phase: number; name: string; items: string[] }[];
    return (trace.phase_decisions ?? [])
      .filter((d) => d.alternatives_considered?.length)
      .map((d) => ({ phase: d.phase_number, name: d.phase_name, items: d.alternatives_considered }));
  }, [plan]);

  const strategy = plan?.decision_trace?.overall_strategy_rationale || plan?.strategy_summary || viz?.strategy_summary || '';
  const objective = plan?.research_question || null;
  const title = plan
    ? `${plan.thinker_name}${plan.target_work?.title ? ` — ${plan.target_work.title}` : ''}`
    : job
      ? humanize(job.workflow_key)
      : 'Run console';

  const notFound = !useFixture && jobQuery.error;
  const loading = useFixture ? !fixture : jobQuery.isLoading;

  return (
    <div className="-m-6 min-h-screen console-surface p-5 lg:p-7">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link href="/jobs" className="text-ink-400 hover:text-paper" aria-label="Back to runs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="mono-label">
                Run console{useFixture ? ' · fixture' : ''}
              </span>
              {job && <StatusTag status={jobStatus(job.status)} />}
              {!executive && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                  events: {eventsStatus}
                  {eventsError ? ` (${eventsError})` : ''}
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-3xl lg:text-4xl text-paper leading-tight truncate">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-400">
              {job && (
                <>
                  <span>{humanize(job.workflow_key)}</span>
                  <span className="text-ink-600">·</span>
                  <span>{tree.phases.length} steps</span>
                  <span className="text-ink-600">·</span>
                  <span>started {fmtDateTime(job.started_at || job.created_at)}</span>
                  {!executive && (
                    <>
                      <span className="text-ink-600">·</span>
                      <span>{job.job_id}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Toggle checked={executive} onChange={toggleExecutive} label={executive ? 'Executive view' : 'Developer view'} />
            {job && !useFixture && (
              <>
                <Link
                  href={`/plans/${job.plan_id}`}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300 hover:text-paper"
                >
                  Plan
                </Link>
                <Link
                  href={`/jobs/${job.job_id}`}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300 hover:text-paper"
                >
                  Inspector
                </Link>
              </>
            )}
            <CostMeter
              spent={spent}
              estimated={plan?.estimated_total_cost_usd ?? null}
              tokensIn={tree.totals.input_tokens}
              tokensOut={tree.totals.output_tokens}
              calls={tree.totals.calls}
              elapsedMs={job ? elapsedMs(job.started_at || job.created_at, job.completed_at) : null}
              live={Boolean(isRunning)}
              executive={executive}
            />
          </div>
        </div>

        {notFound && (
          <div className="console-panel border-red-800 p-4 text-sm text-red-300">
            Could not load this run: {(jobQuery.error as Error).message}
          </div>
        )}

        {loading && !notFound && (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 rounded-md bg-ink-800" />
            <div className="grid grid-cols-[320px_1fr] gap-4">
              <div className="h-96 rounded-md bg-ink-800" />
              <div className="h-96 rounded-md bg-ink-800" />
            </div>
          </div>
        )}

        {!loading && !notFound && (
          <>
            {/* Strategy strip */}
            {(objective || strategy || alternatives.length > 0) && (
              <div className="console-panel p-5">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                  <div className="space-y-3 min-w-0">
                    {objective && (
                      <div>
                        <div className="mono-label mb-1">Objective</div>
                        <p className="font-display text-lg text-paper leading-snug">{objective}</p>
                      </div>
                    )}
                    {strategy && (
                      <div>
                        <div className="mono-label mb-1">Why the run is shaped this way</div>
                        <p className={clsx('text-ink-200 leading-relaxed', executive ? 'font-display text-[15px]' : 'text-sm')}>
                          {showAlternatives || strategy.length <= 520 ? strategy : `${strategy.slice(0, 520)}…`}
                        </p>
                      </div>
                    )}
                  </div>
                  {(alternatives.length > 0 || strategy.length > 520) && (
                    <button
                      type="button"
                      onClick={() => setShowAlternatives(!showAlternatives)}
                      className="self-start inline-flex items-center gap-1.5 rounded-sm border border-ink-600 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300 hover:text-paper whitespace-nowrap"
                    >
                      {showAlternatives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {alternatives.length > 0 ? `Alternatives considered (${alternatives.reduce((s, a) => s + a.items.length, 0)})` : 'Full rationale'}
                    </button>
                  )}
                </div>
                {showAlternatives && alternatives.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border-t border-ink-700 pt-4">
                    {alternatives.map((alt) => (
                      <div key={alt.phase} className="rounded-sm border border-ink-700 bg-ink-900 p-3">
                        <div className="mono-label mb-1">
                          Step {alt.phase} · {alt.name}
                        </div>
                        <ul className="space-y-1.5">
                          {alt.items.map((item, i) => (
                            <li key={i} className="text-[13px] text-ink-200 leading-snug pl-3 border-l border-gold-600/60">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tree + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[400px_1fr] gap-4 items-start">
              <div className="console-panel p-2 lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between px-2 pt-1 pb-2">
                  <span className="mono-label">Steps</span>
                  {userSelected && (
                    <button
                      type="button"
                      onClick={() => setUserSelected(false)}
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-100"
                    >
                      follow live
                    </button>
                  )}
                </div>
                <PhaseTree
                  tree={tree}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setUserSelected(true);
                  }}
                  executive={executive}
                />
              </div>
              <NodeDetail
                tree={tree}
                node={selectedNode}
                executive={executive}
                phaseOutputs={useFixture ? null : phaseOutputsQuery.data?.outputs ?? null}
                phaseOutputsLoading={!useFixture && phaseOutputsQuery.isLoading}
                eventsStatus={eventsStatus}
                onSelect={(id) => {
                  setSelectedId(id);
                  setUserSelected(true);
                }}
              />
            </div>

            {/* Timeline */}
            <div className="console-panel">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-700">
                <span className="mono-label">Timeline</span>
                <span className="font-mono text-[10px] text-ink-500 tabular-nums">
                  {events.length} events{executive ? ' · narrated' : ''}
                </span>
              </div>
              <Timeline
                events={events}
                tree={tree}
                executive={executive}
                selectedId={selectedId}
                onSelectNode={(id) => {
                  setSelectedId(id);
                  setUserSelected(true);
                }}
                live={Boolean(isRunning)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
