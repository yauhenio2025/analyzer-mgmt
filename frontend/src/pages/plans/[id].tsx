import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import {
  Map,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Eye,
  Layers,
  DollarSign,
  Target,
  Cpu,
  Network,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  FileJson,
  Brain,
  Lightbulb,
  BarChart3,
  GitBranch,
  Hash,
  Clock,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type {
  PlanDetail,
  PlannerDecisionTrace,
  PlanPhaseSpec,
  SamplingInsight,
  ObjectiveAlignmentEntry,
  PhaseDecision,
  PerWorkDecision,
  CatalogCoverageEntry,
  ExecutorJobSummary,
} from '@/types';

import { ANALYZER_V2_URL } from '@/lib/config';

type TabKey = 'summary' | 'jobs' | 'decision-trace' | 'phases' | 'raw';

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'summary', label: 'Summary', icon: BookOpen },
  { key: 'jobs', label: 'Jobs', icon: Zap },
  { key: 'decision-trace', label: 'Decision Trace', icon: Brain },
  { key: 'phases', label: 'Phases', icon: Layers },
  { key: 'raw', label: 'Raw JSON', icon: FileJson },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800' },
  executing: { bg: 'bg-amber-100', text: 'text-amber-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
};

const depthColors: Record<string, { bg: string; text: string }> = {
  surface: { bg: 'bg-sky-100', text: 'text-sky-800' },
  standard: { bg: 'bg-blue-100', text: 'text-blue-800' },
  deep: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  comprehensive: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-800' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800' },
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] || statusColors.draft;
  return (
    <span className={clsx('badge text-xs px-2 py-0.5', colors.bg, colors.text)}>
      {status}
    </span>
  );
}

// ============================================================================
// Expandable section component
// ============================================================================

function ExpandableSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="mt-2 ml-6">{children}</div>}
    </div>
  );
}

// ============================================================================
// Summary Tab
// ============================================================================

function SummaryTab({ plan }: { plan: PlanDetail }) {
  return (
    <div className="space-y-6">
      {/* Strategy Summary */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Strategy Summary
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {plan.strategy_summary}
        </p>
      </div>

      {/* Target Work */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Target Work
        </h2>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900">{plan.target_work.title}</p>
          {plan.target_work.author && (
            <p className="text-sm text-gray-500">by {plan.target_work.author}</p>
          )}
          {plan.target_work.year && (
            <p className="text-xs text-gray-400">{plan.target_work.year}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">{plan.target_work.description}</p>
        </div>
      </div>

      {/* Prior Works */}
      {plan.prior_works && plan.prior_works.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <GitBranch className="h-5 w-5 text-purple-500" />
            Prior Works ({plan.prior_works.length})
          </h2>
          <div className="space-y-3">
            {plan.prior_works.map((work, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{work.title}</p>
                    {work.author && (
                      <p className="text-xs text-gray-500">by {work.author}</p>
                    )}
                  </div>
                  {work.year && (
                    <span className="text-xs text-gray-400">{work.year}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{work.description}</p>
                <span className="inline-block mt-1 badge bg-purple-50 text-purple-700 text-xs">
                  {work.relationship_hint}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research Question */}
      {plan.research_question && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-red-500" />
            Research Question
          </h2>
          <p className="text-sm text-gray-700 italic">{plan.research_question}</p>
        </div>
      )}

      {/* Recommended Views */}
      {plan.recommended_views && plan.recommended_views.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-blue-500" />
            Recommended Views
          </h2>
          <div className="space-y-2">
            {plan.recommended_views.map((view) => {
              const pColors = priorityColors[view.priority] || priorityColors.medium;
              return (
                <div key={view.view_key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={clsx('badge text-xs px-2 py-0.5 flex-shrink-0 mt-0.5', pColors.bg, pColors.text)}>
                    {view.priority}
                  </span>
                  <div>
                    <Link
                      href={`/views?search=${view.view_key}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {view.view_key}
                    </Link>
                    <p className="text-sm text-gray-600 mt-0.5">{view.rationale}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estimates */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          Estimates
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{plan.phases.length}</p>
            <p className="text-xs text-gray-500 mt-1">Phases</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{plan.estimated_llm_calls}</p>
            <p className="text-xs text-gray-500 mt-1">LLM Calls</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">${(Number(plan.estimated_total_cost_usd) || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Est. Cost</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{plan.generation_tokens?.toLocaleString() || '---'}</p>
            <p className="text-xs text-gray-500 mt-1">Gen Tokens</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.estimated_depth_profile && (
            <span className="badge bg-purple-50 text-purple-700 text-sm">
              Depth: {plan.estimated_depth_profile}
            </span>
          )}
          {plan.model_used && (
            <span className="badge bg-gray-100 text-gray-700 text-sm">
              Model: {plan.model_used}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Decision Trace Tab
// ============================================================================

function DecisionTraceTab({
  trace,
  plan,
}: {
  trace: PlannerDecisionTrace;
  plan: PlanDetail;
}) {
  return (
    <div className="space-y-6">
      {/* Overall Strategy Rationale */}
      {trace.overall_strategy_rationale && (
        <div className="card p-5 border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-indigo-500" />
            Overall Strategy Rationale
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {trace.overall_strategy_rationale}
          </p>
        </div>
      )}

      {/* Sampling Insights */}
      {trace.sampling_insights && trace.sampling_insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            Sampling Insights ({trace.sampling_insights.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {trace.sampling_insights.map((insight: SamplingInsight, i: number) => (
              <SamplingInsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Objective Alignment */}
      {trace.objective_alignment && trace.objective_alignment.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-red-500" />
            Objective Alignment
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Goal</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Serving Engines</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Serving Chains</th>
                  <th className="text-left py-2 font-medium text-gray-600">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trace.objective_alignment.map((entry: ObjectiveAlignmentEntry, i: number) => {
                  const coverageLower = entry.coverage_assessment.toLowerCase();
                  const coverageColor = coverageLower.includes('full')
                    ? 'text-green-700 bg-green-50'
                    : coverageLower.includes('partial')
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-gray-700 bg-gray-50';
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-4 text-gray-900 max-w-xs">{entry.goal}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {entry.serving_engines.map((eng) => (
                            <Link
                              key={eng}
                              href={`/engines/${eng}`}
                              className="badge bg-indigo-50 text-indigo-700 text-xs hover:bg-indigo-100 transition-colors"
                            >
                              {eng}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {entry.serving_chains.map((ch) => (
                            <Link
                              key={ch}
                              href={`/chains/${ch}`}
                              className="badge bg-purple-50 text-purple-700 text-xs hover:bg-purple-100 transition-colors"
                            >
                              {ch}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="py-2">
                        <span className={clsx('badge text-xs px-2 py-0.5', coverageColor)}>
                          {entry.coverage_assessment}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase Decision Flow */}
      {trace.phase_decisions && trace.phase_decisions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            Phase Decision Flow
          </h2>
          <div className="space-y-4">
            {trace.phase_decisions.map((decision: PhaseDecision) => (
              <PhaseDecisionCard
                key={decision.phase_number}
                decision={decision}
                perWorkDecisions={
                  trace.per_work_decisions?.filter(
                    (pw: PerWorkDecision) => pw.phase_number === decision.phase_number
                  ) || []
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Catalog Coverage */}
      {trace.catalog_coverage && trace.catalog_coverage.length > 0 && (
        <CatalogCoverageSection entries={trace.catalog_coverage} />
      )}
    </div>
  );
}

function SamplingInsightCard({ insight }: { insight: SamplingInsight }) {
  const roleColors: Record<string, { bg: string; text: string }> = {
    target: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    prior_work: { bg: 'bg-purple-100', text: 'text-purple-800' },
    target_work: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  };
  const rColors = roleColors[insight.role] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-gray-900">{insight.work_title}</h3>
        <span className={clsx('badge text-xs px-2 py-0.5', rColors.bg, rColors.text)}>
          {insight.role.replace('_', ' ')}
        </span>
      </div>

      {/* Key Observations */}
      {insight.key_observations && insight.key_observations.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Key Observations</p>
          <ul className="space-y-1">
            {insight.key_observations.map((obs, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0 mt-1.5" />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Implications */}
      {insight.implications && insight.implications.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Implications</p>
          <div className="space-y-1">
            {insight.implications.map((imp, i) => (
              <p key={i} className="text-sm text-amber-800 bg-amber-50 rounded px-2 py-1">
                {imp}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Affinity Rationale */}
      {insight.affinity_rationale && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Affinity Rationale</p>
          <p className="text-sm text-gray-600 italic">{insight.affinity_rationale}</p>
        </div>
      )}
    </div>
  );
}

function PhaseDecisionCard({
  decision,
  perWorkDecisions,
}: {
  decision: PhaseDecision;
  perWorkDecisions: PerWorkDecision[];
}) {
  // Determine if it's a chain or engine link
  const isChain = decision.chain_or_engine?.includes('chain') || decision.chain_or_engine?.startsWith('ch_');
  const linkHref = isChain
    ? `/chains/${decision.chain_or_engine}`
    : `/engines/${decision.chain_or_engine}`;

  return (
    <div className="card p-5 border-l-4 border-blue-400">
      {/* Phase header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
          {decision.phase_number}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{decision.phase_name}</h3>
          <Link
            href={linkHref}
            className="text-xs text-indigo-600 hover:underline font-mono"
          >
            {decision.chain_or_engine}
          </Link>
        </div>
      </div>

      {/* Rationale sections */}
      <div className="space-y-3 text-sm">
        {decision.selection_rationale && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Selection Rationale</p>
            <p className="text-gray-700">{decision.selection_rationale}</p>
          </div>
        )}
        {decision.depth_rationale && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Depth Rationale</p>
            <p className="text-gray-700">{decision.depth_rationale}</p>
          </div>
        )}
        {decision.iteration_mode_rationale && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Iteration Mode</p>
            <p className="text-gray-700">{decision.iteration_mode_rationale}</p>
          </div>
        )}
        {decision.dependency_rationale && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Dependencies</p>
            <p className="text-gray-700">{decision.dependency_rationale}</p>
          </div>
        )}
      </div>

      {/* Alternatives Considered */}
      {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
        <div className="mt-3">
          <ExpandableSection title={`Alternatives considered (${decision.alternatives_considered.length})`}>
            <ul className="space-y-1">
              {decision.alternatives_considered.map((alt, i) => (
                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                  <MinusCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  {alt}
                </li>
              ))}
            </ul>
          </ExpandableSection>
        </div>
      )}

      {/* Per-Work Decisions */}
      {perWorkDecisions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Per-Work Assignments
          </p>
          <div className="space-y-2">
            {perWorkDecisions.map((pw, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{pw.work_title}</p>
                  <Link
                    href={`/chains/${pw.chain_key}`}
                    className="text-xs text-indigo-600 hover:underline font-mono"
                  >
                    {pw.chain_key}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{pw.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogCoverageSection({ entries }: { entries: CatalogCoverageEntry[] }) {
  const selected = entries.filter((e) => e.status === 'selected' || e.status === 'used');
  const rejected = entries.filter((e) => e.status !== 'selected' && e.status !== 'used');

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Cpu className="h-5 w-5 text-emerald-500" />
        Catalog Coverage
      </h2>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="inline-flex items-center gap-1 text-green-700">
          <CheckCircle className="h-4 w-4" />
          {selected.length} selected
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500">
          <XCircle className="h-4 w-4" />
          {rejected.length} not used
        </span>
        <span className="text-gray-400">
          {entries.length} total engines evaluated
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Engine</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Phases</th>
              <th className="text-left py-2 font-medium text-gray-600">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Selected engines first */}
            {selected.map((entry: CatalogCoverageEntry) => (
              <tr key={entry.engine_key} className="bg-green-50/30">
                <td className="py-2 pr-4">
                  <Link
                    href={`/engines/${entry.engine_key}`}
                    className="font-mono text-indigo-600 hover:underline"
                  >
                    {entry.engine_key}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <span className="badge bg-green-100 text-green-800 text-xs">{entry.status}</span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {entry.used_in_phases.map((phase) => (
                      <span
                        key={phase}
                        className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {phase}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 text-gray-600">{entry.reason}</td>
              </tr>
            ))}
            {/* Rejected engines */}
            {rejected.map((entry: CatalogCoverageEntry) => (
              <tr key={entry.engine_key} className="text-gray-400">
                <td className="py-2 pr-4">
                  <Link
                    href={`/engines/${entry.engine_key}`}
                    className="font-mono text-gray-500 hover:text-indigo-600 hover:underline transition-colors"
                  >
                    {entry.engine_key}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <span className="badge bg-gray-100 text-gray-600 text-xs">{entry.status}</span>
                </td>
                <td className="py-2 pr-4 text-gray-300">---</td>
                <td className="py-2 text-gray-500">{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Phases Tab
// ============================================================================

function PhasesTab({ phases }: { phases: PlanPhaseSpec[] }) {
  return (
    <div className="space-y-4">
      {phases.map((phase) => (
        <PhaseCard key={phase.phase_number} phase={phase} />
      ))}
    </div>
  );
}

function PhaseCard({ phase }: { phase: PlanPhaseSpec }) {
  const dColors = depthColors[phase.depth] || depthColors.standard;

  return (
    <div
      className={clsx(
        'card p-5',
        phase.skip && 'opacity-50'
      )}
    >
      {/* Phase header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            phase.skip ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'
          )}
        >
          {phase.phase_number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{phase.phase_name}</h3>
            <span className={clsx('badge text-xs px-2 py-0.5', dColors.bg, dColors.text)}>
              {phase.depth}
            </span>
            {phase.skip && (
              <span className="badge bg-red-100 text-red-700 text-xs">skipped</span>
            )}
            {phase.requires_full_documents && (
              <span className="badge bg-amber-100 text-amber-700 text-xs">full docs</span>
            )}
          </div>
        </div>
      </div>

      {/* Chain / Engine link */}
      <div className="flex flex-wrap gap-2 mb-3">
        {phase.chain_key && (
          <Link
            href={`/chains/${phase.chain_key}`}
            className="inline-flex items-center gap-1 badge bg-purple-50 text-purple-700 text-xs hover:bg-purple-100 transition-colors"
          >
            <Network className="h-3 w-3" />
            {phase.chain_key}
          </Link>
        )}
        {phase.engine_key && (
          <Link
            href={`/engines/${phase.engine_key}`}
            className="inline-flex items-center gap-1 badge bg-indigo-50 text-indigo-700 text-xs hover:bg-indigo-100 transition-colors"
          >
            <Cpu className="h-3 w-3" />
            {phase.engine_key}
          </Link>
        )}
        {phase.iteration_mode && (
          <span className="badge bg-sky-50 text-sky-700 text-xs">
            iteration: {phase.iteration_mode}
          </span>
        )}
        {phase.model_hint && (
          <span className="badge bg-gray-100 text-gray-600 text-xs">
            model: {phase.model_hint}
          </span>
        )}
      </div>

      {/* Dependencies */}
      {phase.depends_on && phase.depends_on.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <GitBranch className="h-3.5 w-3.5" />
          Depends on:
          {phase.depends_on.map((dep) => (
            <span
              key={dep}
              className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
            >
              {dep}
            </span>
          ))}
        </div>
      )}

      {/* Per-work chain map */}
      {phase.per_work_chain_map && Object.keys(phase.per_work_chain_map).length > 0 && (
        <ExpandableSection title={`Per-work chain map (${Object.keys(phase.per_work_chain_map).length} entries)`}>
          <div className="space-y-1">
            {Object.entries(phase.per_work_chain_map).map(([work, chain]) => (
              <div key={work} className="flex items-center gap-2 text-sm">
                <span className="text-gray-700 truncate max-w-xs">{work}</span>
                <span className="text-gray-400">-&gt;</span>
                <Link
                  href={`/chains/${chain}`}
                  className="text-indigo-600 hover:underline font-mono text-xs"
                >
                  {chain}
                </Link>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Rationale */}
      {phase.rationale && (
        <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
          {phase.rationale}
        </p>
      )}

      {/* Cost footer */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3 w-3" />
          ~{phase.estimated_tokens.toLocaleString()} tokens
        </span>
        <span className="inline-flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          ${(Number(phase.estimated_cost_usd) || 0).toFixed(3)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Raw JSON Tab
// ============================================================================

function RawJsonTab({ plan }: { plan: PlanDetail }) {
  return (
    <div className="card p-5">
      <pre className="text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-[80vh] overflow-y-auto">
        {JSON.stringify(plan, null, 2)}
      </pre>
    </div>
  );
}

function JobsTab({
  planId,
  active,
}: {
  planId: string;
  active: boolean;
}) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['plan-jobs', planId],
    // analyzer-v2 `GET /v1/executor/jobs` ignores `plan_id` (accepts only status/limit/project_id),
    // so filter client-side.
    queryFn: async () =>
      (await api.executorJobs.list({ limit: 200 })).jobs.filter((job) => job.plan_id === planId),
    enabled: active && !!planId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 border border-red-200 bg-red-50 text-red-700">
        Failed to load jobs for this plan.
      </div>
    );
  }

  const jobs = data || [];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          Jobs
        </h2>
        <p className="text-sm text-gray-600">
          Executor jobs created from this plan. Open the run console to watch each step feed the next; the runtime inspector shows how the result is presented.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No jobs found</h3>
          <p className="text-sm text-gray-500 mt-1">
            This plan does not have any recent executor jobs in the current analyzer-v2 job list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job: ExecutorJobSummary) => (
            <div key={job.job_id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/jobs/${job.job_id}`}
                      className="text-base font-semibold text-indigo-600 hover:underline"
                    >
                      {job.job_id}
                    </Link>
                    <StatusBadge status={job.status} />
                    <span className="badge bg-gray-100 text-gray-700 text-xs">
                      {job.workflow_key}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>Created {new Date(job.created_at).toLocaleString()}</span>
                    {job.completed_at && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>Completed {new Date(job.completed_at).toLocaleString()}</span>
                      </>
                    )}
                    {job.total_llm_calls > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>{job.total_llm_calls} LLM calls</span>
                      </>
                    )}
                  </div>
                  {job.progress?.detail && (
                    <p className="mt-2 text-sm text-gray-600">{job.progress.detail}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/jobs/${job.job_id}/console`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Open run console
                  </Link>
                  <Link
                    href={`/jobs/${job.job_id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Runtime inspector
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PlanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const {
    data: plan,
    isLoading: planLoading,
    error: planError,
  } = useQuery({
    queryKey: ['plan', id],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/orchestrator/plans/${id}`);
      if (!res.ok) throw new Error('Failed to fetch plan');
      return res.json() as Promise<PlanDetail>;
    },
    enabled: !!id,
  });

  const {
    data: decisionTrace,
    isLoading: traceLoading,
  } = useQuery({
    queryKey: ['plan-trace', id],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/orchestrator/plans/${id}/decision-trace`);
      if (!res.ok) return null;
      return res.json() as Promise<PlannerDecisionTrace>;
    },
    enabled: !!id,
  });

  if (planError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load plan
      </div>
    );
  }

  if (planLoading || !plan) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  // Determine the trace to use: from dedicated endpoint, or embedded in plan
  const trace = decisionTrace || plan.decision_trace;
  const hasTrace = !!trace;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/plans"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Map className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {plan.thinker_name}
            </h1>
            <StatusBadge status={plan.status} />
            {hasTrace && (
              <span className="badge bg-green-100 text-green-800 text-xs">Traced</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {plan.plan_id}
            </span>
            {plan.objective_key && (
              <>
                <span className="text-gray-300">|</span>
                <Link
                  href={`/objectives/${plan.objective_key}`}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <Target className="h-3.5 w-3.5" />
                  {plan.objective_key}
                </Link>
              </>
            )}
            {plan.workflow_key && (
              <>
                <span className="text-gray-300">|</span>
                <Link
                  href={`/workflows/${plan.workflow_key}`}
                  className="text-indigo-600 hover:underline"
                >
                  {plan.workflow_key}
                </Link>
              </>
            )}
            {plan.created_at && (
              <>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(plan.created_at).toLocaleString()}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {plan.target_work.title}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDisabled = tab.key === 'decision-trace' && !hasTrace && !traceLoading;
            return (
              <button
                key={tab.key}
                onClick={() => !isDisabled && setActiveTab(tab.key)}
                disabled={isDisabled}
                className={clsx(
                  'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : isDisabled
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === 'decision-trace' && hasTrace && (
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && <SummaryTab plan={plan} />}

      {activeTab === 'jobs' && (
        <JobsTab planId={plan.plan_id} active={activeTab === 'jobs'} />
      )}

      {activeTab === 'decision-trace' && trace && (
        <DecisionTraceTab trace={trace} plan={plan} />
      )}

      {activeTab === 'decision-trace' && !trace && traceLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="card p-5">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-4/5 mt-2" />
          </div>
        </div>
      )}

      {activeTab === 'decision-trace' && !trace && !traceLoading && (
        <div className="card p-12 text-center">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No decision trace available for this plan</p>
          <p className="text-xs text-gray-400 mt-1">
            Decision traces are generated when the planner uses adaptive strategy mode
          </p>
        </div>
      )}

      {activeTab === 'phases' && <PhasesTab phases={plan.phases} />}

      {activeTab === 'raw' && <RawJsonTab plan={plan} />}
    </div>
  );
}
