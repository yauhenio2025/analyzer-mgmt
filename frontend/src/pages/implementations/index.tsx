import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Workflow, AlertCircle, ChevronRight, GitBranch, Cpu, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkflowSummary, EngineChainSpec, ChainSummary } from '@/types';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<string, string> = {
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

const SOURCE_COLORS: Record<string, string> = {
  critic: 'bg-indigo-100 text-indigo-800',
  decider: 'bg-cyan-100 text-cyan-800',
  visualizer: 'bg-pink-100 text-pink-800',
};

interface WorkflowWithChainInfo extends WorkflowSummary {
  chain_count: number;
  engine_count: number;
  transformation_count: number;
}

function ImplementationCard({ workflow }: { workflow: WorkflowWithChainInfo }) {
  return (
    <Link
      href={`/implementations/${workflow.workflow_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {workflow.workflow_name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{workflow.description}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={clsx('badge text-xs', CATEGORY_COLORS[workflow.category] || 'badge-gray')}>
              {workflow.category?.replace('_', ' ')}
            </span>
            <span className="badge badge-gray text-xs flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {workflow.phase_count} phases
            </span>
            {workflow.chain_count > 0 && (
              <span className="badge text-xs bg-violet-100 text-violet-800 flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {workflow.chain_count} chains
              </span>
            )}
            {workflow.transformation_count > 0 && (
              <span className="badge text-xs bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {workflow.transformation_count} transforms
              </span>
            )}
            <span className="badge badge-gray text-xs flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {workflow.engine_count} engines
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function ImplementationsPage() {
  const { data: workflowData, isLoading: workflowsLoading, error: workflowsError } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.workflows.list(),
  });

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: () => api.chains.list(),
  });

  const { data: fullWorkflows } = useQuery({
    queryKey: ['workflows-full'],
    queryFn: async () => {
      const summaries = workflowData?.workflows ?? [];
      const results = await Promise.all(
        summaries.map((s) => api.workflows.get(s.workflow_key))
      );
      return results;
    },
    enabled: !!workflowData?.workflows?.length,
  });

  const chainMap = new Map<string, EngineChainSpec | ChainSummary>();
  if (chains) {
    for (const c of chains) {
      chainMap.set(c.chain_key, c);
    }
  }

  // Enrich workflows with chain/engine counts and real source_project/phase_count from full data
  const enriched: WorkflowWithChainInfo[] = (workflowData?.workflows ?? []).map((ws) => {
    const full = fullWorkflows?.find((w) => w.workflow_key === ws.workflow_key);
    if (!full) {
      return { ...ws, chain_count: 0, engine_count: 0, transformation_count: ws.linked_transformation_keys?.length ?? 0 };
    }

    const chainKeys = new Set<string>();
    const engineKeys = new Set<string>();
    let engineCountFromChains = 0;

    for (const phase of (full.phases ?? [])) {
      if (phase.chain_key) {
        chainKeys.add(phase.chain_key);
        const chain = chainMap.get(phase.chain_key);
        if (chain) {
          if ('engine_keys' in chain && Array.isArray(chain.engine_keys)) {
            for (const ek of chain.engine_keys) {
              engineKeys.add(ek);
            }
          } else if ('engine_count' in chain && chain.engine_count) {
            engineCountFromChains += chain.engine_count;
          }
        }
      }
      if (phase.engine_key) {
        engineKeys.add(phase.engine_key);
      }
    }

    return {
      ...ws,
      // Use full workflow data for fields the list API doesn't return
      source_project: full.source_project || ws.source_project || '',
      phase_count: full.phases?.length ?? ws.phase_count,
      chain_count: chainKeys.size,
      engine_count: engineKeys.size + engineCountFromChains,
      transformation_count: full.linked_transformation_keys?.length ?? ws.linked_transformation_keys?.length ?? 0,
    };
  });

  // Group by source_project
  const grouped = new Map<string, WorkflowWithChainInfo[]>();
  for (const w of enriched) {
    const key = w.source_project || 'other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(w);
  }

  const error = workflowsError;
  const isLoading = workflowsLoading;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load implementations
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Implementations</h1>
        <p className="mt-1 text-gray-500">
          Pipeline orchestration view — how workflows wire engines and chains together
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full mt-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Grouped Workflows */}
      {!isLoading && Array.from(grouped.entries()).map(([project, workflows]) => (
        <div key={project} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">{project}</h2>
            <span className={clsx('badge text-xs', SOURCE_COLORS[project] || 'badge-gray')}>
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <ImplementationCard key={workflow.workflow_key} workflow={workflow} />
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {!isLoading && enriched.length === 0 && (
        <div className="card p-12 text-center">
          <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No implementations found</p>
        </div>
      )}
    </div>
  );
}
