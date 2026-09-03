/**
 * Runs — every execution the backend knows about: executor jobs (plan-driven
 * workflow runs) and, when the route exists, dossier jobs.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { ANALYZER_V2_URL } from '@/lib/config';
import type { DossierJobSummary, ExecutorJobSummary, PlanSummary, RunEventsSummary } from '@/types';
import { fmtCost, fmtDateTime, fmtDuration, fmtTokens, humanize, elapsedMs } from '@/components/console/format';
import type { NodeStatus } from '@/components/console/model';
import { StatusPip } from '@/components/console/widgets';

const SUMMARY_PROBE_LIMIT = 24;

function jobStatus(status: string): NodeStatus {
  if (status === 'completed') return 'completed';
  if (status === 'running' || status === 'pending') return 'running';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  return 'pending';
}

function phasesDone(job: ExecutorJobSummary): { done: number; total: number } {
  const statuses = job.progress?.phase_statuses ?? {};
  const done = Object.values(statuses).filter((s) => s === 'completed').length;
  const total = job.progress?.total_phases || Object.keys(statuses).length || 0;
  return { done, total };
}

function summaryCost(summary: RunEventsSummary | null | undefined): number | null {
  if (!summary) return null;
  const v = summary.total_cost_usd ?? summary.cost_usd;
  return typeof v === 'number' ? v : null;
}

function SectionHeader({ title, note, count }: { title: string; note?: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-xl text-ink-900">{title}</h2>
        {count != null && <span className="font-mono text-[11px] text-ink-400 tabular-nums">{count}</span>}
      </div>
      {note && <span className="font-mono text-[11px] text-ink-400">{note}</span>}
    </div>
  );
}

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const jobsQuery = useQuery({
    queryKey: ['runs-executor-jobs'],
    queryFn: () => api.executorJobs.list({ limit: 50 }),
    refetchInterval: (q) => (q.state.data?.jobs.some((j) => j.status === 'running' || j.status === 'pending') ? 5000 : 30000),
  });

  const plansQuery = useQuery({
    queryKey: ['runs-plans'],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/orchestrator/plans`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : data.plans ?? []) as PlanSummary[];
    },
    staleTime: 60_000,
    retry: false,
  });

  const dossierQuery = useQuery({
    queryKey: ['runs-dossier-jobs'],
    queryFn: () => api.dossierJobs.list(),
    retry: false,
    staleTime: 30_000,
  });

  const jobs = useMemo(() => jobsQuery.data?.jobs ?? [], [jobsQuery.data]);
  const planById = useMemo(() => {
    const map = new Map<string, PlanSummary>();
    (plansQuery.data ?? []).forEach((p) => map.set(p.plan_id, p));
    return map;
  }, [plansQuery.data]);

  // Probe the events ledger once (first job). Only fan out per-job summaries when it exists,
  // so a backend without the ledger costs one 404 instead of one per row.
  const probeJobId = jobs[0]?.job_id;
  const ledgerProbe = useQuery({
    queryKey: ['run-events-summary', probeJobId],
    queryFn: () => api.runEvents.summary(probeJobId!),
    enabled: Boolean(probeJobId),
    retry: false,
    staleTime: 60_000,
  });
  const ledgerAvailable = ledgerProbe.data != null;
  const summaryQueries = useQueries({
    queries: jobs.slice(0, SUMMARY_PROBE_LIMIT).map((job) => ({
      queryKey: ['run-events-summary', job.job_id],
      queryFn: () => api.runEvents.summary(job.job_id),
      enabled: ledgerAvailable,
      retry: false,
      staleTime: 60_000,
    })),
  });
  const summaryById = useMemo(() => {
    const map = new Map<string, RunEventsSummary | null>();
    jobs.slice(0, SUMMARY_PROBE_LIMIT).forEach((job, i) => map.set(job.job_id, summaryQueries[i]?.data ?? null));
    return map;
  }, [jobs, summaryQueries]);

  const workflows = useMemo(() => Array.from(new Set(jobs.map((j) => j.workflow_key))).sort(), [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (workflowFilter !== 'all' && job.workflow_key !== workflowFilter) return false;
      if (q) {
        const plan = planById.get(job.plan_id);
        const hay = [job.job_id, job.plan_id, job.workflow_key, job.project_id, plan?.thinker_name, plan?.target_work_title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, workflowFilter, search, planById]);

  const running = jobs.filter((j) => j.status === 'running' || j.status === 'pending').length;

  return (
    <div className="-m-6 min-h-screen bg-paper p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mono-label mb-1">Story · Runs</div>
            <h1 className="display-title text-4xl">Runs</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              Every execution of a plan: which steps ran, in what order, what each one cost. Open a run&apos;s console to
              watch the outputs of one step feed the next.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="mono-label">In progress</div>
              <div className="font-display text-2xl text-ink-900 tabular-nums">{running}</div>
            </div>
            <div className="text-right">
              <div className="mono-label">Listed</div>
              <div className="font-display text-2xl text-ink-900 tabular-nums">{jobs.length}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                jobsQuery.refetch();
                dossierQuery.refetch();
              }}
              className="inline-flex items-center gap-2 rounded-sm border border-ink-300 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700 hover:border-ink-900"
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', jobsQuery.isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search runs, plans, thinkers"
              className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-sm border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700"
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            className="rounded-sm border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700"
          >
            <option value="all">All workflows</option>
            {workflows.map((w) => (
              <option key={w} value={w}>
                {humanize(w)}
              </option>
            ))}
          </select>
          <span className="font-mono text-[11px] text-ink-400 ml-auto">
            {ledgerAvailable ? 'cost from events ledger' : 'cost: ledger not available on this backend'}
          </span>
        </div>

        {/* Executor runs */}
        <section>
          <SectionHeader title="Workflow runs" count={filtered.length} note={`${ANALYZER_V2_URL.replace(/^https?:\/\//, '')}`} />
          {jobsQuery.isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-sm bg-ink-100" />
              ))}
            </div>
          ) : jobsQuery.error ? (
            <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Could not load runs from {ANALYZER_V2_URL}: {(jobsQuery.error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-sm border border-ink-200 bg-white p-8 text-center">
              <Activity className="h-8 w-8 text-ink-300 mx-auto mb-2" />
              <p className="text-sm text-ink-500">No runs match.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-ink-200 bg-white">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr className="text-left">
                    {['Status', 'Run', 'Plan', 'Steps', 'Created', 'Calls · tokens', 'Cost', ''].map((h) => (
                      <th key={h} className="mono-label px-4 py-2.5 border-b border-ink-200 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((job) => {
                    const plan = planById.get(job.plan_id);
                    const { done, total } = phasesDone(job);
                    const status = jobStatus(job.status);
                    const summary = summaryById.get(job.job_id);
                    const cost = summaryCost(summary);
                    const elapsed = elapsedMs(job.started_at, job.completed_at);
                    return (
                      <tr key={job.job_id} className="hover:bg-ink-50/60 align-top">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                            <StatusPip status={status} />
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/jobs/${job.job_id}/console`} className="font-mono text-xs text-ink-900 hover:text-gold-700">
                            {job.job_id}
                          </Link>
                          <div className="text-[12px] text-ink-500">{humanize(job.workflow_key)}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          {plan ? (
                            <>
                              <div className="text-sm text-ink-900 truncate">{plan.thinker_name}</div>
                              <div className="text-[12px] text-ink-500 truncate">{plan.target_work_title}</div>
                            </>
                          ) : (
                            <Link href={`/plans/${job.plan_id}`} className="font-mono text-[11px] text-ink-500 hover:text-gold-700">
                              {job.plan_id}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-20 rounded-full bg-ink-100 overflow-hidden">
                              <div
                                className={clsx('h-full', status === 'failed' ? 'bg-red-500' : 'bg-gold-500')}
                                style={{ width: total ? `${Math.round((done / total) * 100)}%` : '0%' }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-ink-600 tabular-nums">
                              {done}/{total || '?'}
                            </span>
                          </div>
                          {job.status === 'running' && job.progress?.phase_name && (
                            <div className="mt-1 text-[11px] text-ink-500 truncate max-w-[220px]">{job.progress.phase_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-600 tabular-nums whitespace-nowrap">
                          {fmtDateTime(job.created_at)}
                          {elapsed != null && elapsed > 0 && <div className="text-ink-400">{fmtDuration(elapsed)}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-600 tabular-nums whitespace-nowrap">
                          {job.total_llm_calls || 0} · {fmtTokens((job.total_input_tokens || 0) + (job.total_output_tokens || 0))}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                          {cost != null ? <span className="text-gold-700">{fmtCost(cost)}</span> : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/jobs/${job.job_id}/console`}
                              className="inline-flex items-center gap-1 rounded-sm bg-ink-900 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper hover:bg-ink-700"
                            >
                              Console <ArrowUpRight className="h-3 w-3" />
                            </Link>
                            <Link href={`/jobs/${job.job_id}`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 hover:text-ink-900">
                              Inspector
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Dossier runs */}
        <section>
          <SectionHeader
            title="Dossier runs"
            count={dossierQuery.data?.available ? dossierQuery.data.jobs.length : undefined}
            note="document(s) → text + tables + figures"
          />
          {dossierQuery.isLoading ? (
            <div className="h-14 rounded-sm bg-ink-100 animate-pulse" />
          ) : dossierQuery.error ? (
            <div className="rounded-sm border border-ink-200 bg-white p-4 text-sm text-ink-500">
              Dossier route unreachable: {(dossierQuery.error as Error).message}
            </div>
          ) : !dossierQuery.data?.available ? (
            <div className="rounded-sm border border-dashed border-ink-200 bg-white p-5 text-sm text-ink-500">
              Dossier runs will appear here once <code className="font-mono text-xs">/v1/dossier/jobs</code> is deployed on this
              backend.
            </div>
          ) : dossierQuery.data.jobs.length === 0 ? (
            <div className="rounded-sm border border-ink-200 bg-white p-5 text-sm text-ink-500">No dossier runs yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-ink-200 bg-white">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="text-left">
                    {['Status', 'Dossier', 'Brief', 'Audience · depth', 'Created', 'Receipts', ''].map((h) => (
                      <th key={h} className="mono-label px-4 py-2.5 border-b border-ink-200 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {dossierQuery.data.jobs.map((d: DossierJobSummary) => {
                    const consoleTarget = d.analysis_job_id || d.job_id;
                    return (
                      <tr key={d.job_id} className="hover:bg-ink-50/60">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                            <StatusPip status={jobStatus(d.status)} />
                            {d.step || d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-900">{d.job_id}</td>
                        <td className="px-4 py-3 text-sm text-ink-700 max-w-[320px] truncate">{d.title || d.intent || '—'}</td>
                        <td className="px-4 py-3 text-[12px] text-ink-500">
                          {[d.audience, d.depth].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-600 whitespace-nowrap">{fmtDateTime(d.created_at)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-600 tabular-nums">{d.receipts_total ?? '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/jobs/${consoleTarget}/console`}
                            className="inline-flex items-center gap-1 rounded-sm bg-ink-900 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper hover:bg-ink-700"
                          >
                            Console <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
