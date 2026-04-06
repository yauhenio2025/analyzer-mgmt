import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  GitMerge,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  GitBranch,
  Link2,
  Database,
  Layers,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Workflow, WorkflowPhase, AudienceType, EngineChainSpec, TransformationTemplate } from '@/types';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<string, string> = {
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

function PhaseCard({
  phase,
  workflowKey,
  allPhases,
  chain,
}: {
  phase: WorkflowPhase;
  workflowKey: string;
  allPhases: WorkflowPhase[];
  chain: EngineChainSpec | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [audience, setAudience] = useState<AudienceType>('analyst');

  const {
    data: promptData,
    isLoading: promptLoading,
  } = useQuery({
    queryKey: ['workflow-phase-prompt', workflowKey, phase.phase_number, audience],
    queryFn: () => api.workflows.getPhasePrompt(workflowKey, phase.phase_number, audience),
    enabled: showPrompt,
  });

  const dependencyNames = phase.depends_on_phases.map((pn) => {
    const dep = allPhases.find((p) => p.phase_number === pn);
    return dep ? `${pn}. ${dep.phase_name}` : `Phase ${pn}`;
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 hover:bg-gray-50 text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm">
          {phase.phase_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{phase.phase_name}</h3>
            {phase.requires_external_docs && (
              <span className="badge text-xs bg-violet-100 text-violet-800">
                external docs
              </span>
            )}
            {phase.caches_result && (
              <span className="badge text-xs bg-emerald-100 text-emerald-800">
                cached
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{phase.phase_description}</p>
          {phase.depends_on_phases.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <Link2 className="h-3 w-3" />
              <span>Depends on: {dependencyNames.join(', ')}</span>
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-3">
          {phase.engine_key ? (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Engine:</span>
              <Link
                href={`/engines/${phase.engine_key}`}
                className="text-primary-600 hover:underline font-mono text-xs"
              >
                {phase.engine_key}
              </Link>
            </div>
          ) : chain ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-violet-500" />
                <span className="text-gray-600">Chain:</span>
                <Link
                  href={`/chains/${chain.chain_key}`}
                  className="text-violet-700 hover:underline font-mono text-xs"
                >
                  {chain.chain_key}
                </Link>
                <span className="badge text-xs bg-violet-100 text-violet-800">
                  {chain.blend_mode}
                </span>
              </div>
              {chain.engine_keys.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Cpu className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {chain.engine_keys.map((engineKey) => (
                      <Link
                        key={engineKey}
                        href={`/engines/${engineKey}`}
                        className="badge text-xs bg-white text-primary-700 border border-primary-200 hover:bg-primary-50"
                      >
                        {engineKey}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Dependencies */}
          {phase.depends_on_phases.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Link2 className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-600">Dependencies:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {phase.depends_on_phases.map((pn) => {
                    const dep = allPhases.find((p) => p.phase_number === pn);
                    return (
                      <span key={pn} className="badge badge-gray text-xs">
                        {pn}. {dep?.phase_name || `Phase ${pn}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Database className="h-4 w-4 text-gray-400" />
              Cache: {phase.caches_result ? 'Yes' : 'No'}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-gray-400" />
              External docs: {phase.requires_external_docs ? 'Yes' : 'No'}
            </span>
          </div>

          {/* Prompt Preview Toggle */}
          <div className="pt-2 border-t">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showPrompt ? 'Hide' : 'Show'} composed prompt
            </button>

            {showPrompt && (
              <div className="mt-2 space-y-2">
                {/* Audience Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Audience:</span>
                  {(['researcher', 'analyst', 'executive', 'activist'] as AudienceType[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={clsx(
                        'badge text-xs cursor-pointer capitalize',
                        audience === a ? 'badge-primary' : 'badge-gray hover:bg-gray-200'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                {promptLoading && (
                  <div className="bg-white rounded border p-4 text-sm text-gray-500 animate-pulse">
                    Loading prompt...
                  </div>
                )}

                {promptData && (
                  <div className="bg-white rounded border max-h-96 overflow-auto">
                    <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                      {promptData.prompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Simple dependency graph visualization */
function DependencyGraph({ phases }: { phases: WorkflowPhase[] }) {
  // Build a simple layer layout based on topological ordering
  const layers: WorkflowPhase[][] = [];
  const placed = new Set<number>();

  // Layer 0: phases with no dependencies
  while (placed.size < phases.length) {
    const layer: WorkflowPhase[] = [];
    for (const phase of phases) {
      if (placed.has(phase.phase_number)) continue;
      const allDepsMet = phase.depends_on_phases.every((d) => placed.has(d));
      if (allDepsMet) {
        layer.push(phase);
      }
    }
    if (layer.length === 0) break; // avoid infinite loop
    for (const p of layer) placed.add(p.phase_number);
    layers.push(layer);
  }

  return (
    <div className="space-y-3">
      {layers.map((layer, layerIdx) => (
        <div key={layerIdx} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
            Layer {layerIdx + 1}
          </span>
          <div className="flex flex-wrap gap-2">
            {layer.map((phase) => (
              <div
                key={phase.phase_number}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs"
              >
                <span className="font-bold text-amber-700">{phase.phase_number}</span>
                <span className="text-amber-900">{phase.phase_name}</span>
                {phase.depends_on_phases.length > 0 && (
                  <span className="text-amber-500 ml-1">
                    ({phase.depends_on_phases.map((d) => `←${d}`).join(' ')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ['workflow', key],
    queryFn: () => api.workflows.get(key as string),
    enabled: !!key,
  });

  const chainKeys = Array.from(new Set((workflow?.phases ?? []).flatMap((phase) => phase.chain_key ? [phase.chain_key] : [])));

  const { data: chainsData } = useQuery({
    queryKey: ['workflow-chain-details', chainKeys],
    queryFn: async () => {
      const results = await Promise.all(chainKeys.map((chainKey) => api.chains.get(chainKey)));
      return new Map(results.map((chain) => [chain.chain_key, chain] as const));
    },
    enabled: chainKeys.length > 0,
  });

  const { data: linkedTransformations } = useQuery({
    queryKey: ['workflow-linked-transformations', workflow?.workflow_key, workflow?.linked_transformation_keys],
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="space-y-6">
        <Link href="/workflows" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workflows
        </Link>
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Failed to load workflow
        </div>
      </div>
    );
  }

  const phases = workflow.phases || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/workflows"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Workflows
          </Link>
          <div className="flex items-center gap-3">
            <GitMerge className="h-8 w-8 text-amber-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workflow.workflow_name}</h1>
              <p className="text-gray-500 font-mono text-sm">{workflow.workflow_key}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 border border-indigo-200 bg-indigo-50/70">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-indigo-900">Canonical composition view</p>
            <p className="mt-1 text-sm text-indigo-800">
              For chain-backed workflows, use the implementation detail page as the canonical composition
              surface. This workflow page stays useful for quick phase inspection and prompt preview.
            </p>
          </div>
          <Link
            href={`/implementations/${workflow.workflow_key}`}
            className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Open implementation detail
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Description</label>
            <p className="text-gray-700 text-sm">{workflow.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <span
                className={clsx(
                  'badge',
                  CATEGORY_COLORS[workflow.category] || 'badge-gray'
                )}
              >
                {workflow.category?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="label">Version</label>
              <span className="text-gray-700 font-medium">{workflow.version}</span>
            </div>
            <div>
              <label className="label">Phases</label>
              <span className="text-gray-700 font-medium">{phases.length}</span>
            </div>
            <div>
              <label className="label">Transforms</label>
              <span className="text-gray-700 font-medium">{workflow.linked_transformation_keys?.length ?? 0}</span>
            </div>
            <div>
              <label className="label">Source Project</label>
              <span className="badge badge-gray capitalize">{workflow.source_project}</span>
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
                  <span key={input} className="badge text-xs badge-gray">
                    {input}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {workflow.output_description && (
          <div className="mt-4">
            <label className="label">Output</label>
            <p className="text-sm text-gray-600">{workflow.output_description}</p>
          </div>
        )}
      </div>

      {(workflow.linked_transformation_keys?.length ?? 0) > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">Linked Transformations</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Explicit workflow-to-transformation linkage for the artifacts this workflow materializes.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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

      {/* Dependency Graph */}
      {phases.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase Dependency Graph</h2>
          <p className="text-sm text-gray-500 mb-4">
            Phases are arranged in execution layers. A phase can only execute after all its dependencies complete.
          </p>
          <DependencyGraph phases={phases} />
        </div>
      )}

      {/* Phases */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Workflow Phases ({phases.length})
        </h2>
        <p className="text-sm text-gray-500">
          Click a phase to view details and composed prompts
        </p>
        <div className="space-y-2 mt-3">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.phase_number}
              phase={phase}
              workflowKey={workflow.workflow_key}
              allPhases={phases}
              chain={phase.chain_key ? (chainsData?.get(phase.chain_key) ?? null) : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
