import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  Cpu,
  GitBranch,
  Workflow,
  Database,
  FileText,
  Link2,
  Layers,
  Puzzle,
  Star,
  Diamond,
  Circle,
  BarChart3,
  Zap,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { buildPassesByDepth } from '@/enginePasses';
import type {
  Workflow as WorkflowType,
  WorkflowPhase,
  EngineChainSpec,
  CapabilityEngineDefinition,
  EngineOperationalization,
  WorkflowExtensionAnalysis,
  PhaseExtensionPoint,
  CandidateEngine,
  DimensionCoverage,
  CapabilityGap,
  TransformationTemplate,
} from '@/types';
import clsx from 'clsx';

// ============================================================================
// Stance Colors (shared pattern from operationalizations)
// ============================================================================

const stanceColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  discovery: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' },
  inference: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  confrontation: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  architecture: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  integration: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  reflection: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
  dialectical: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
};

const defaultStanceColor = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' };

const BLEND_MODE_LABELS: Record<string, { label: string; color: string }> = {
  sequential: { label: 'sequential', color: 'bg-blue-100 text-blue-800' },
  parallel: { label: 'parallel', color: 'bg-green-100 text-green-800' },
  merge: { label: 'merge', color: 'bg-purple-100 text-purple-800' },
  llm_selection: { label: 'LLM selection', color: 'bg-amber-100 text-amber-800' },
};

const CATEGORY_COLORS: Record<string, string> = {
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

const TIER_STYLES: Record<string, { icon: typeof Star; color: string; bg: string; border: string; label: string }> = {
  strong: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Strong Recommendations' },
  moderate: { icon: Diamond, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Moderate Fit' },
  exploratory: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Exploratory' },
};

const POTENTIAL_COLORS: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-600',
};

// ============================================================================
// Stance Badge
// ============================================================================

function StanceBadge({ stance }: { stance: string }) {
  const colors = stanceColors[stance] || defaultStanceColor;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.text)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {stance}
    </span>
  );
}

// ============================================================================
// Engine Mini Card (inside a phase)
// ============================================================================

function EngineCard({
  engineKey,
  capDef,
  opDef,
  depth,
  showArrow,
}: {
  engineKey: string;
  capDef: CapabilityEngineDefinition | null | undefined;
  opDef: EngineOperationalization | null | undefined;
  depth: string;
  showArrow: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get stance sequence from operationalization for current depth
  const depthSequence = opDef?.depth_sequences?.find((d) => d.depth_key === depth);
  const stanceSequence = depthSequence?.passes?.map((p) => p.stance_key) ?? [];

  const depthPasses = useMemo(() => {
    const passesByDepth = buildPassesByDepth(capDef, opDef);
    return passesByDepth[depth] ?? [];
  }, [capDef, opDef, depth]);

  // First paragraph of problematique
  const problematique = capDef?.problematique ?? '';
  const firstParagraph = problematique.split('\n\n')[0] || problematique;

  return (
    <div className="flex items-start gap-2">
      {showArrow && (
        <div className="flex items-center text-gray-300 mt-3">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Link
                href={`/engines/${engineKey}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-primary-600 hover:underline truncate"
              >
                {capDef?.engine_name || engineKey}
              </Link>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
          {stanceSequence.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {stanceSequence.map((stance, i) => (
                <StanceBadge key={`${stance}-${i}`} stance={stance} />
              ))}
            </div>
          )}
        </button>

        {expanded && (
          <div className="border-t bg-gray-50 p-3 space-y-3">
            {/* Problematique */}
            {firstParagraph && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Problematique</span>
                <p className="mt-1 text-xs text-gray-700 leading-relaxed">{firstParagraph}</p>
              </div>
            )}

            {/* Pass structure (inline capability passes first, then operationalization fallback) */}
            {depthPasses.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {depth} depth — {depthPasses.length} passes
                </span>
                <div className="mt-1 space-y-1">
                  {depthPasses.map((p) => (
                    <div key={p.pass_number} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium text-[10px]">
                        {p.pass_number}
                      </span>
                      <StanceBadge stance={p.stance} />
                      <span className="text-gray-600 truncate">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions */}
            {capDef?.analytical_dimensions && capDef.analytical_dimensions.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dimensions</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {capDef.analytical_dimensions.slice(0, 6).map((d) => (
                    <span key={d.key} className="badge badge-gray text-[10px]">{d.key}</span>
                  ))}
                  {capDef.analytical_dimensions.length > 6 && (
                    <span className="text-[10px] text-gray-400">+{capDef.analytical_dimensions.length - 6} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {capDef?.capabilities && capDef.capabilities.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Capabilities</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {capDef.capabilities.slice(0, 5).map((c) => (
                    <span key={c.key} className="badge badge-gray text-[10px]">{c.key}</span>
                  ))}
                  {capDef.capabilities.length > 5 && (
                    <span className="text-[10px] text-gray-400">+{capDef.capabilities.length - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="pt-2 border-t flex items-center gap-3">
              <Link
                href={`/engines/${engineKey}`}
                className="text-xs text-primary-600 hover:underline"
              >
                Engine detail
              </Link>
              <Link
                href={`/operationalizations/${engineKey}`}
                className="text-xs text-primary-600 hover:underline"
              >
                Operationalization
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple ArrowRight icon since lucide doesn't export it easily in all versions
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ============================================================================
// Candidate Engine Card (for extension points)
// ============================================================================

function CandidateEngineCard({
  candidate,
  workflowKey,
  phaseNumber,
}: {
  candidate: CandidateEngine;
  workflowKey: string;
  phaseNumber: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => api.workflows.addEngineToPhase(workflowKey, phaseNumber, candidate.engine_key),
    onSuccess: () => {
      // Invalidate pipeline/workflow data immediately so the pipeline flow updates
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowKey] });
      queryClient.invalidateQueries({ queryKey: ['chains-batch'] });
      queryClient.invalidateQueries({ queryKey: ['cap-defs-batch'] });
      queryClient.invalidateQueries({ queryKey: ['op-defs-batch'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-full'] });
      // Delay extension points refetch so user sees "Added to phase" confirmation
      // before the card disappears (engine is no longer a candidate after being added)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['extension-points', workflowKey] });
      }, 2500);
    },
  });

  const isAdded = addMutation.isSuccess;
  const isAdding = addMutation.isPending;
  const addError = addMutation.error;
  const addData = addMutation.data;

  return (
    <div className={clsx(
      'border rounded-lg p-3 space-y-2',
      isAdded ? 'bg-emerald-50 border-emerald-300' :
      candidate.has_full_composability ? 'bg-white' : 'bg-gray-50 border-dashed'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/engines/${candidate.engine_key}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-primary-600 hover:underline truncate"
            >
              {candidate.engine_name}
            </Link>
            {!candidate.has_full_composability && (
              <span className="text-[10px] text-gray-400">(basic scoring)</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold text-gray-700">
              {candidate.composite_score.toFixed(2)}
            </span>
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="badge badge-gray text-[10px]">{candidate.category}</span>
          <span className="badge badge-gray text-[10px]">{candidate.kind}</span>
        </div>
      </button>

      {/* Rationale bullets (always visible for strong) */}
      {(candidate.recommendation_tier === 'strong' || expanded) && candidate.rationale.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5 pl-1">
          {candidate.rationale.map((r, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">&bull;</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="pt-2 border-t space-y-2 text-xs">
          {/* Score Breakdown */}
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: 'Synergy', value: candidate.synergy_score },
              { label: 'Dim Prod', value: candidate.dimension_production_score },
              { label: 'Novelty', value: candidate.dimension_novelty_score },
              { label: 'Cap Gap', value: candidate.capability_gap_score },
              { label: 'Category', value: candidate.category_affinity_score },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[10px] text-gray-400">{s.label}</div>
                <div className="font-mono font-medium">{s.value.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Synergy with */}
          {candidate.synergy_with.length > 0 && (
            <div>
              <span className="text-gray-500">Synergizes with:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {candidate.synergy_with.map((e) => (
                  <span key={e} className="badge text-[10px] bg-emerald-50 text-emerald-700">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* New dimensions */}
          {candidate.dimensions_added.length > 0 && (
            <div>
              <span className="text-gray-500">Adds dimensions:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {candidate.dimensions_added.map((d) => (
                  <span key={d} className="badge text-[10px] bg-indigo-50 text-indigo-700">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Potential issues */}
          {candidate.potential_issues.length > 0 && (
            <div className="text-orange-600">
              {candidate.potential_issues.map((issue, i) => (
                <div key={i}>&triangledown; {issue}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add to Phase button */}
      <div className="flex items-center justify-between pt-1">
        {addError && (
          <span className="text-xs text-red-600 truncate mr-2">
            {addError.message}
          </span>
        )}
        {isAdded ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Added to phase
            {addData?.git_committed && (
              <span className="text-emerald-500 font-normal ml-1">
                &middot; committed to git
              </span>
            )}
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addMutation.mutate();
            }}
            disabled={isAdding}
            className={clsx(
              'ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              isAdding
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            )}
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {isAdding ? 'Adding...' : 'Add to Phase'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Extension Panel (inside a PhaseBlock)
// ============================================================================

function ExtensionPanel({ extension, workflowKey }: { extension: PhaseExtensionPoint; workflowKey: string }) {
  const [showModerate, setShowModerate] = useState(false);
  const [showExploratory, setShowExploratory] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const strong = extension.candidate_engines.filter((c) => c.recommendation_tier === 'strong');
  const moderate = extension.candidate_engines.filter((c) => c.recommendation_tier === 'moderate');
  const exploratory = extension.candidate_engines.filter((c) => c.recommendation_tier === 'exploratory');

  const coveredCount = extension.dimension_coverage.filter((d) => d.coverage_ratio > 0).length;
  const totalDims = extension.dimension_coverage.length;
  const coveragePercent = totalDims > 0 ? Math.round((coveredCount / totalDims) * 100) : 0;

  if (extension.candidate_engines.length === 0) return null;

  return (
    <div className="mt-3 border border-dashed border-indigo-200 rounded-lg bg-indigo-50/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-semibold text-indigo-800">Extension Points</span>
        <span className={clsx('badge text-[10px]', POTENTIAL_COLORS[extension.extension_potential])}>
          {extension.extension_potential} potential
        </span>
      </div>

      {/* Dimension Coverage */}
      {totalDims > 0 && (
        <div>
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
          >
            {showDimensions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <BarChart3 className="h-3 w-3" />
            <span>Dimension Coverage</span>
            <span className="font-medium">{coveredCount}/{totalDims} dimensions covered ({coveragePercent}%)</span>
          </button>

          {/* Coverage bar */}
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>

          {showDimensions && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {extension.dimension_coverage.map((dim) => (
                <div key={dim.dimension_key} className="flex items-center gap-1.5 text-[11px]">
                  <div className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    dim.coverage_ratio > 0.5 ? 'bg-emerald-500' : dim.coverage_ratio > 0 ? 'bg-amber-400' : 'bg-red-300'
                  )} />
                  <span className="text-gray-700 truncate">{dim.dimension_key}</span>
                  {dim.covered_by.length > 0 && (
                    <span className="text-gray-400">({dim.covered_by.length})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Capability Gaps */}
      {extension.capability_gaps.length > 0 && (
        <div>
          <button
            onClick={() => setShowGaps(!showGaps)}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
          >
            {showGaps ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Zap className="h-3 w-3" />
            <span>Capability Gaps</span>
            <span className="font-medium">{extension.capability_gaps.length} uncovered</span>
          </button>

          {showGaps && (
            <div className="mt-2 space-y-1">
              {extension.capability_gaps.map((gap) => (
                <div key={gap.capability_key} className="text-[11px] flex items-start gap-1.5">
                  <span className="text-orange-400 mt-0.5 flex-shrink-0">&bull;</span>
                  <div>
                    <span className="font-medium text-gray-700">{gap.capability_key}</span>
                    <span className="text-gray-500 ml-1">— {gap.capability_description}</span>
                    {gap.available_in.length > 0 && (
                      <span className="text-gray-400 ml-1">
                        (available in {gap.available_in.length} engine{gap.available_in.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Engines by Tier */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-600">
          Candidate Engines ({extension.candidate_engines.length})
        </span>

        {/* Strong tier — always visible */}
        {strong.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <Star className="h-3.5 w-3.5" />
              {TIER_STYLES.strong.label} ({strong.length})
            </div>
            <div className="space-y-1.5">
              {strong.map((c) => <CandidateEngineCard key={c.engine_key} candidate={c} workflowKey={workflowKey} phaseNumber={extension.phase_number} />)}
            </div>
          </div>
        )}

        {/* Moderate tier — collapsed */}
        {moderate.length > 0 && (
          <div>
            <button
              onClick={() => setShowModerate(!showModerate)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              {showModerate ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Diamond className="h-3.5 w-3.5" />
              {TIER_STYLES.moderate.label} ({moderate.length})
            </button>
            {showModerate && (
              <div className="mt-1.5 space-y-1.5">
                {moderate.map((c) => <CandidateEngineCard key={c.engine_key} candidate={c} workflowKey={workflowKey} phaseNumber={extension.phase_number} />)}
              </div>
            )}
          </div>
        )}

        {/* Exploratory tier — collapsed */}
        {exploratory.length > 0 && (
          <div>
            <button
              onClick={() => setShowExploratory(!showExploratory)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-700"
            >
              {showExploratory ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Circle className="h-3.5 w-3.5" />
              {TIER_STYLES.exploratory.label} ({exploratory.length})
            </button>
            {showExploratory && (
              <div className="mt-1.5 space-y-1.5">
                {exploratory.map((c) => <CandidateEngineCard key={c.engine_key} candidate={c} workflowKey={workflowKey} phaseNumber={extension.phase_number} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Phase Block (chain or standalone engine)
// ============================================================================

function PhaseBlock({
  phase,
  allPhases,
  chain,
  capDefs,
  opDefs,
  depth,
  extension,
  workflowKey,
}: {
  phase: WorkflowPhase;
  allPhases: WorkflowPhase[];
  chain: EngineChainSpec | null;
  capDefs: Map<string, CapabilityEngineDefinition | null>;
  opDefs: Map<string, EngineOperationalization | null>;
  depth: string;
  extension?: PhaseExtensionPoint;
  workflowKey: string;
}) {
  const isChain = !!chain;
  const engineKeys = isChain ? (chain.engine_keys ?? []) : (phase.engine_key ? [phase.engine_key] : []);
  const blendInfo = isChain ? BLEND_MODE_LABELS[chain.blend_mode] : null;

  // Context parameters — show what data this phase consumes from upstream
  const contextParams = phase.context_parameters;
  const hasContext = contextParams && Object.keys(contextParams).length > 0;

  // Dependency info
  const depNames = phase.depends_on_phases.map((pn) => {
    const dep = allPhases.find((p) => p.phase_number === pn);
    return dep ? `${pn}. ${dep.phase_name}` : `Phase ${pn}`;
  });

  return (
    <div className="relative">
      <div className={clsx(
        'border-2 rounded-xl p-4 space-y-3',
        isChain ? 'border-violet-200 bg-violet-50/30' : 'border-gray-200 bg-white'
      )}>
        {/* Phase Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                {phase.phase_number}
              </span>
              <h3 className="font-semibold text-gray-900">{phase.phase_name}</h3>
              {phase.requires_external_docs && (
                <span className="badge text-xs bg-violet-100 text-violet-800 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  external docs
                </span>
              )}
              {phase.caches_result && (
                <span className="badge text-xs bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  cached
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{phase.phase_description}</p>
          </div>
        </div>

        {/* Chain info */}
        {isChain && (
          <div className="flex items-center gap-2 flex-wrap">
            <GitBranch className="h-4 w-4 text-violet-500" />
            <Link
              href={`/chains/${phase.chain_key}`}
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              {chain.chain_name}
            </Link>
            {blendInfo && (
              <span className={clsx('badge text-xs', blendInfo.color)}>
                {blendInfo.label}
              </span>
            )}
            {chain.pass_context && (
              <span className="text-xs text-gray-500">(pass context enabled)</span>
            )}
          </div>
        )}

        {/* Dependencies */}
        {phase.depends_on_phases.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
            <Link2 className="h-3 w-3" />
            <span>Depends on:</span>
            {depNames.map((name, i) => (
              <span key={i} className="badge badge-gray text-[10px]">{name}</span>
            ))}
          </div>
        )}

        {/* Context Parameters */}
        {hasContext && (
          <div className="flex items-start gap-1 text-xs flex-wrap">
            <span className="text-gray-500 flex-shrink-0">Context:</span>
            {Object.entries(contextParams!).map(([key, value]) => (
              <span key={key} className="badge text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                {key} <span className="text-indigo-400">&larr;</span> {value}
              </span>
            ))}
          </div>
        )}

        {/* Engine Cards */}
        <div className={clsx(
          'gap-2',
          isChain && chain.blend_mode === 'sequential'
            ? 'flex items-start overflow-x-auto pb-1'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}>
          {engineKeys.map((ek, i) => (
            <EngineCard
              key={ek}
              engineKey={ek}
              capDef={capDefs.get(ek)}
              opDef={opDefs.get(ek)}
              depth={depth}
              showArrow={isChain && chain.blend_mode === 'sequential' && i > 0}
            />
          ))}
        </div>

        {/* Extension Points Panel */}
        {extension && <ExtensionPanel extension={extension} workflowKey={workflowKey} />}
      </div>
    </div>
  );
}

// ============================================================================
// Workflow Extension Summary (bottom of page)
// ============================================================================

function WorkflowExtensionSummary({ analysis }: { analysis: WorkflowExtensionAnalysis }) {
  return (
    <div className="card p-6 space-y-4 border-indigo-200 bg-indigo-50/20">
      <div className="flex items-center gap-2">
        <Puzzle className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900">Workflow Extension Summary</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Total Candidates</span>
          <p className="text-2xl font-bold text-gray-900">{analysis.total_candidate_engines}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Strong Recommendations</span>
          <p className="text-2xl font-bold text-amber-600">{analysis.strong_recommendations}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Phases Analyzed</span>
          <p className="text-2xl font-bold text-gray-900">{analysis.phase_extensions.length}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Underserved Dims</span>
          <p className="text-2xl font-bold text-orange-600">{analysis.underserved_dimensions.length}</p>
        </div>
      </div>

      {analysis.underserved_dimensions.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Underserved Dimensions Across Workflow</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {analysis.underserved_dimensions.map((dim) => (
              <span key={dim} className="badge text-xs bg-orange-50 text-orange-700 border border-orange-200">
                {dim}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.workflow_summary && (
        <p className="text-sm text-gray-600">{analysis.workflow_summary}</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ImplementationDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const [depth, setDepth] = useState<string>('standard');
  const [showExtensions, setShowExtensions] = useState(false);

  // 1. Fetch workflow
  const { data: workflow, isLoading: workflowLoading, error: workflowError } = useQuery({
    queryKey: ['workflow', key],
    queryFn: () => api.workflows.get(key as string),
    enabled: !!key,
  });

  // 2. Collect chain keys from workflow phases
  const chainKeys = useMemo(() => {
    if (!workflow?.phases) return [];
    return [...new Set(workflow.phases.filter((p) => p.chain_key).map((p) => p.chain_key!))];
  }, [workflow]);

  // 3. Fetch all chains in parallel
  const { data: chainsData } = useQuery({
    queryKey: ['chains-batch', chainKeys],
    queryFn: async () => {
      const results = await Promise.all(chainKeys.map((ck) => api.chains.get(ck)));
      const map = new Map<string, EngineChainSpec>();
      for (const c of results) {
        map.set(c.chain_key, c);
      }
      return map;
    },
    enabled: chainKeys.length > 0,
  });

  // 4. Collect all unique engine keys (from chains + standalone)
  const allEngineKeys = useMemo(() => {
    if (!workflow?.phases) return [];
    const keys = new Set<string>();
    for (const phase of workflow.phases) {
      if (phase.engine_key) keys.add(phase.engine_key);
      if (phase.chain_key && chainsData) {
        const chain = chainsData.get(phase.chain_key);
        if (chain) {
          for (const ek of chain.engine_keys) keys.add(ek);
        }
      }
    }
    return [...keys];
  }, [workflow, chainsData]);

  // 5. Fetch capability definitions for all engines
  const { data: capDefsData } = useQuery({
    queryKey: ['cap-defs-batch', allEngineKeys],
    queryFn: async () => {
      const results = await Promise.all(
        allEngineKeys.map(async (ek) => {
          try {
            const def = await api.engines.getCapabilityDefinition(ek);
            return [ek, def] as const;
          } catch {
            return [ek, null] as const;
          }
        })
      );
      return new Map(results);
    },
    enabled: allEngineKeys.length > 0,
  });

  // 6. Fetch operationalizations for all engines
  const { data: opDefsData } = useQuery({
    queryKey: ['op-defs-batch', allEngineKeys],
    queryFn: async () => {
      const results = await Promise.all(
        allEngineKeys.map(async (ek) => {
          try {
            const op = await api.operationalizations.get(ek);
            return [ek, op] as const;
          } catch {
            return [ek, null] as const;
          }
        })
      );
      return new Map(results);
    },
    enabled: allEngineKeys.length > 0,
  });

  // 7. Fetch extension points (lazy-loaded, toggle-gated)
  const { data: extensionAnalysis, isLoading: extensionsLoading } = useQuery({
    queryKey: ['extension-points', key, depth],
    queryFn: () => api.workflows.getExtensionPoints(key as string, depth),
    enabled: !!key && showExtensions,
  });

  const capDefs = capDefsData ?? new Map<string, CapabilityEngineDefinition | null>();
  const opDefs = opDefsData ?? new Map<string, EngineOperationalization | null>();
  const chainMap = chainsData ?? new Map<string, EngineChainSpec>();

  const { data: linkedTransformations } = useQuery({
    queryKey: ['workflow-transformations', workflow?.workflow_key, workflow?.linked_transformation_keys],
    queryFn: async () => {
      const keys = workflow?.linked_transformation_keys ?? [];
      const results = await Promise.all(
        keys.map(async (templateKey) => {
          try {
            return await api.transformations.get(templateKey);
          } catch {
            return null;
          }
        })
      );
      return results.filter((template): template is TransformationTemplate => template !== null);
    },
    enabled: !!workflow && (workflow.linked_transformation_keys?.length ?? 0) > 0,
  });

  // Build extension map by phase number
  const extensionMap = useMemo(() => {
    if (!extensionAnalysis) return new Map<number, PhaseExtensionPoint>();
    const map = new Map<number, PhaseExtensionPoint>();
    for (const ext of extensionAnalysis.phase_extensions) {
      map.set(ext.phase_number, ext);
    }
    return map;
  }, [extensionAnalysis]);

  // Compute summary stats
  const phases = workflow?.phases ?? [];
  const chainCount = chainKeys.length;
  const engineCount = allEngineKeys.length;

  // ============================================================================
  // Loading state
  // ============================================================================

  if (workflowLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error state
  // ============================================================================

  if (workflowError || !workflow) {
    return (
      <div className="space-y-6">
        <Link href="/implementations" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Implementations
        </Link>
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Failed to load implementation
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/implementations"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Implementations
        </Link>
        <div className="flex items-center gap-3">
          <Workflow className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workflow.workflow_name}</h1>
            <p className="text-gray-500 font-mono text-sm">{workflow.workflow_key}</p>
          </div>
        </div>
      </div>

      <div className="card p-4 border border-indigo-200 bg-indigo-50/70">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-indigo-900">Canonical composition view</p>
            <p className="mt-1 text-sm text-indigo-800">
              This implementation page is the canonical composition surface for chain-backed workflows.
              Use the workflow detail page for the simpler phase listing; use this page to inspect chain
              composition and linked transformations.
            </p>
          </div>
          <Link
            href={`/workflows/${workflow.workflow_key}`}
            className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Open workflow detail
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Description</label>
            <p className="text-gray-700 text-sm">{workflow.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Category</label>
              <span className={clsx('badge', CATEGORY_COLORS[workflow.category] || 'badge-gray')}>
                {workflow.category?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="label">Version</label>
              <span className="text-gray-700 font-medium">{workflow.version}</span>
            </div>
            <div>
              <label className="label">Source</label>
              <span className="badge badge-gray capitalize">{workflow.source_project}</span>
            </div>
            <div>
              <label className="label">Phases</label>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <Layers className="h-4 w-4 text-gray-400" />
                {phases.length}
              </span>
            </div>
            <div>
              <label className="label">Chains</label>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <GitBranch className="h-4 w-4 text-violet-400" />
                {chainCount}
              </span>
            </div>
            <div>
              <label className="label">Engines</label>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <Cpu className="h-4 w-4 text-gray-400" />
                {engineCount}
              </span>
            </div>
            <div>
              <label className="label">Transforms</label>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <Layers className="h-4 w-4 text-emerald-500" />
                {workflow.linked_transformation_keys?.length ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflow.required_inputs?.length > 0 && (
            <div>
              <label className="label">Required Inputs</label>
              <div className="flex flex-wrap gap-1">
                {workflow.required_inputs.map((input) => (
                  <span key={input} className="badge text-xs bg-red-50 text-red-700 border border-red-200">
                    {input}
                  </span>
                ))}
              </div>
            </div>
          )}
          {workflow.optional_inputs?.length > 0 && (
            <div>
              <label className="label">Optional Inputs</label>
              <div className="flex flex-wrap gap-1">
                {workflow.optional_inputs.map((input) => (
                  <span key={input} className="badge text-xs badge-gray">{input}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(workflow.linked_transformation_keys?.length ?? 0) > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Linked Transformations</h2>
              <p className="mt-1 text-sm text-gray-500">
                Explicit workflow-to-transformation linkage for the artifacts this implementation materializes.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {(linkedTransformations ?? []).map((template) => (
              <Link
                key={template.template_key}
                href={`/transformations/${template.template_key}`}
                className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition-colors hover:bg-emerald-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{template.template_name}</h3>
                    <p className="mt-1 font-mono text-xs text-gray-500">{template.template_key}</p>
                  </div>
                  <span className="badge text-xs bg-white text-emerald-700 border border-emerald-200">
                    {template.transformation_type}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">{template.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Depth Toggle + Extension Points Toggle */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="label mb-0">Depth Level</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {['surface', 'standard', 'deep'].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium transition-colors capitalize',
                  depth === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">
            Changes the stance sequences displayed for each engine
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showExtensions}
                onChange={(e) => setShowExtensions(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Puzzle className="h-4 w-4 text-indigo-400" />
                Show Extension Points
              </span>
            </label>
            {extensionsLoading && (
              <span className="text-xs text-gray-400 animate-pulse">analyzing...</span>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Flow</h2>
        <p className="text-sm text-gray-500">
          Phase-by-phase execution flow. Chains are expanded to show their constituent engines.
        </p>

        <div className="space-y-0 mt-4">
          {phases.map((phase, idx) => {
            const chain = phase.chain_key ? chainMap.get(phase.chain_key) ?? null : null;
            const extension = extensionMap.get(phase.phase_number);
            return (
              <div key={phase.phase_number}>
                <PhaseBlock
                  phase={phase}
                  allPhases={phases}
                  chain={chain}
                  capDefs={capDefs}
                  opDefs={opDefs}
                  depth={depth}
                  extension={showExtensions ? extension : undefined}
                  workflowKey={key as string}
                />
                {/* Connector arrow between phases */}
                {idx < phases.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Flow Summary */}
      <DataFlowSummary phases={phases} />

      {/* Extension Summary */}
      {showExtensions && extensionAnalysis && (
        <WorkflowExtensionSummary analysis={extensionAnalysis} />
      )}

      {/* Output */}
      {workflow.output_description && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Final Output</h2>
          <p className="text-sm text-gray-600">{workflow.output_description}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Data Flow Summary (collapsible)
// ============================================================================

function DataFlowSummary({ phases }: { phases: WorkflowPhase[] }) {
  const [expanded, setExpanded] = useState(false);

  const phasesWithContext = phases.filter(
    (p) => p.context_parameters && Object.keys(p.context_parameters).length > 0
  );

  if (phasesWithContext.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Data Flow Summary</h2>
          <span className="badge badge-gray text-xs">{phasesWithContext.length} phases with context</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-3">
          {phasesWithContext.map((phase) => (
            <div key={phase.phase_number} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
                {phase.phase_number}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{phase.phase_name}</p>
                <div className="mt-1 space-y-0.5">
                  {Object.entries(phase.context_parameters!).map(([param, source]) => (
                    <div key={param} className="text-xs text-gray-600">
                      <span className="font-mono text-indigo-600">{param}</span>
                      <span className="text-gray-400 mx-1">&larr;</span>
                      <span className="font-mono text-gray-700">{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
