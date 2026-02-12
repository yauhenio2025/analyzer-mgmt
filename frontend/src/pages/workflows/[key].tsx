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
  FileText,
  Link2,
  Database,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Workflow, WorkflowPass, AudienceType } from '@/types';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<string, string> = {
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

function PassCard({
  pass,
  workflowKey,
  allPasses,
}: {
  pass: WorkflowPass;
  workflowKey: string;
  allPasses: WorkflowPass[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [audience, setAudience] = useState<AudienceType>('analyst');

  const {
    data: promptData,
    isLoading: promptLoading,
  } = useQuery({
    queryKey: ['workflow-pass-prompt', workflowKey, pass.pass_number, audience],
    queryFn: () => api.workflows.getPassPrompt(workflowKey, pass.pass_number, audience),
    enabled: showPrompt,
  });

  const dependencyNames = pass.depends_on_passes.map((pn) => {
    const dep = allPasses.find((p) => p.pass_number === pn);
    return dep ? `${pn}. ${dep.pass_name}` : `Pass ${pn}`;
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 hover:bg-gray-50 text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm">
          {pass.pass_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{pass.pass_name}</h3>
            {pass.requires_external_docs && (
              <span className="badge text-xs bg-violet-100 text-violet-800">
                external docs
              </span>
            )}
            {pass.caches_result && (
              <span className="badge text-xs bg-emerald-100 text-emerald-800">
                cached
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{pass.pass_description}</p>
          {pass.depends_on_passes.length > 0 && (
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
          {/* Engine Link */}
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Engine:</span>
            <Link
              href={`/engines/${pass.engine_key}`}
              className="text-primary-600 hover:underline font-mono text-xs"
            >
              {pass.engine_key}
            </Link>
          </div>

          {/* Dependencies */}
          {pass.depends_on_passes.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Link2 className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-600">Dependencies:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {pass.depends_on_passes.map((pn) => {
                    const dep = allPasses.find((p) => p.pass_number === pn);
                    return (
                      <span key={pn} className="badge badge-gray text-xs">
                        {pn}. {dep?.pass_name || `Pass ${pn}`}
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
              Cache: {pass.caches_result ? 'Yes' : 'No'}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-gray-400" />
              External docs: {pass.requires_external_docs ? 'Yes' : 'No'}
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
function DependencyGraph({ passes }: { passes: WorkflowPass[] }) {
  // Build a simple layer layout based on topological ordering
  const layers: WorkflowPass[][] = [];
  const placed = new Set<number>();

  // Layer 0: passes with no dependencies
  while (placed.size < passes.length) {
    const layer: WorkflowPass[] = [];
    for (const pass of passes) {
      if (placed.has(pass.pass_number)) continue;
      const allDepsMet = pass.depends_on_passes.every((d) => placed.has(d));
      if (allDepsMet) {
        layer.push(pass);
      }
    }
    if (layer.length === 0) break; // avoid infinite loop
    for (const p of layer) placed.add(p.pass_number);
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
            {layer.map((pass) => (
              <div
                key={pass.pass_number}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs"
              >
                <span className="font-bold text-amber-700">{pass.pass_number}</span>
                <span className="text-amber-900">{pass.pass_name}</span>
                {pass.depends_on_passes.length > 0 && (
                  <span className="text-amber-500 ml-1">
                    ({pass.depends_on_passes.map((d) => `←${d}`).join(' ')})
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

  const passes = workflow.passes || [];

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
              <label className="label">Passes</label>
              <span className="text-gray-700 font-medium">{passes.length}</span>
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

      {/* Dependency Graph */}
      {passes.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pass Dependency Graph</h2>
          <p className="text-sm text-gray-500 mb-4">
            Passes are arranged in execution layers. A pass can only execute after all its dependencies complete.
          </p>
          <DependencyGraph passes={passes} />
        </div>
      )}

      {/* Passes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Workflow Passes ({passes.length})
        </h2>
        <p className="text-sm text-gray-500">
          Click a pass to view details and composed prompts
        </p>
        <div className="space-y-2 mt-3">
          {passes.map((pass) => (
            <PassCard
              key={pass.pass_number}
              pass={pass}
              workflowKey={workflow.workflow_key}
              allPasses={passes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
