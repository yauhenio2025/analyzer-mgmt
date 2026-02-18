import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  Workflow as WorkflowType,
  WorkflowPass,
  EngineChainSpec,
  CapabilityEngineDefinition,
  EngineOperationalization,
  DepthLevel,
  PassDefinition,
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
// Engine Mini Card (inside a pass)
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

  // Get depth level info from capability definition
  const depthLevel = capDef?.depth_levels?.find((d) => d.key === depth);

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

            {/* Depth level passes (from capability definition) */}
            {depthLevel && depthLevel.passes && depthLevel.passes.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {depth} depth — {depthLevel.passes.length} passes
                </span>
                <div className="mt-1 space-y-1">
                  {depthLevel.passes.map((p: PassDefinition) => (
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
// Pass Block (chain or standalone engine)
// ============================================================================

function PassBlock({
  pass,
  allPasses,
  chain,
  capDefs,
  opDefs,
  depth,
}: {
  pass: WorkflowPass;
  allPasses: WorkflowPass[];
  chain: EngineChainSpec | null;
  capDefs: Map<string, CapabilityEngineDefinition | null>;
  opDefs: Map<string, EngineOperationalization | null>;
  depth: string;
}) {
  const isChain = !!chain;
  const engineKeys = isChain ? (chain.engine_keys ?? []) : (pass.engine_key ? [pass.engine_key] : []);
  const blendInfo = isChain ? BLEND_MODE_LABELS[chain.blend_mode] : null;

  // Context parameters — show what data this pass consumes from upstream
  const contextParams = pass.context_parameters;
  const hasContext = contextParams && Object.keys(contextParams).length > 0;

  // Dependency info
  const depNames = pass.depends_on_passes.map((pn) => {
    const dep = allPasses.find((p) => p.pass_number === pn);
    return dep ? `${pn}. ${dep.pass_name}` : `Pass ${pn}`;
  });

  return (
    <div className="relative">
      <div className={clsx(
        'border-2 rounded-xl p-4 space-y-3',
        isChain ? 'border-violet-200 bg-violet-50/30' : 'border-gray-200 bg-white'
      )}>
        {/* Pass Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                {pass.pass_number}
              </span>
              <h3 className="font-semibold text-gray-900">{pass.pass_name}</h3>
              {pass.requires_external_docs && (
                <span className="badge text-xs bg-violet-100 text-violet-800 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  external docs
                </span>
              )}
              {pass.caches_result && (
                <span className="badge text-xs bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  cached
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{pass.pass_description}</p>
          </div>
        </div>

        {/* Chain info */}
        {isChain && (
          <div className="flex items-center gap-2 flex-wrap">
            <GitBranch className="h-4 w-4 text-violet-500" />
            <Link
              href={`/workflows/${pass.chain_key}`}
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
        {pass.depends_on_passes.length > 0 && (
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
      </div>
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

  // 1. Fetch workflow
  const { data: workflow, isLoading: workflowLoading, error: workflowError } = useQuery({
    queryKey: ['workflow', key],
    queryFn: () => api.workflows.get(key as string),
    enabled: !!key,
  });

  // 2. Collect chain keys from workflow passes
  const chainKeys = useMemo(() => {
    if (!workflow) return [];
    return [...new Set(workflow.passes.filter((p) => p.chain_key).map((p) => p.chain_key!))];
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
    if (!workflow) return [];
    const keys = new Set<string>();
    for (const pass of workflow.passes) {
      if (pass.engine_key) keys.add(pass.engine_key);
      if (pass.chain_key && chainsData) {
        const chain = chainsData.get(pass.chain_key);
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

  const capDefs = capDefsData ?? new Map<string, CapabilityEngineDefinition | null>();
  const opDefs = opDefsData ?? new Map<string, EngineOperationalization | null>();
  const chainMap = chainsData ?? new Map<string, EngineChainSpec>();

  // Compute summary stats
  const passes = workflow?.passes ?? [];
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
              <label className="label">Passes</label>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <Layers className="h-4 w-4 text-gray-400" />
                {passes.length}
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

      {/* Depth Toggle */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Flow</h2>
        <p className="text-sm text-gray-500">
          Pass-by-pass execution flow. Chains are expanded to show their constituent engines.
        </p>

        <div className="space-y-0 mt-4">
          {passes.map((pass, idx) => {
            const chain = pass.chain_key ? chainMap.get(pass.chain_key) ?? null : null;
            return (
              <div key={pass.pass_number}>
                <PassBlock
                  pass={pass}
                  allPasses={passes}
                  chain={chain}
                  capDefs={capDefs}
                  opDefs={opDefs}
                  depth={depth}
                />
                {/* Connector arrow between passes */}
                {idx < passes.length - 1 && (
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
      <DataFlowSummary passes={passes} />

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

function DataFlowSummary({ passes }: { passes: WorkflowPass[] }) {
  const [expanded, setExpanded] = useState(false);

  const passesWithContext = passes.filter(
    (p) => p.context_parameters && Object.keys(p.context_parameters).length > 0
  );

  if (passesWithContext.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Data Flow Summary</h2>
          <span className="badge badge-gray text-xs">{passesWithContext.length} passes with context</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-3">
          {passesWithContext.map((pass) => (
            <div key={pass.pass_number} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
                {pass.pass_number}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{pass.pass_name}</p>
                <div className="mt-1 space-y-0.5">
                  {Object.entries(pass.context_parameters!).map(([param, source]) => (
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
