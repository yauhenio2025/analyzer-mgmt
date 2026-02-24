import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, ArrowRight, Eye, Monitor, Component, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChainViewInfo } from '@/types';
import { useState } from 'react';
import clsx from 'clsx';

const blendModeColors: Record<string, string> = {
  sequential: 'bg-blue-50 text-blue-700 border-blue-200',
  parallel: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  merge: 'bg-amber-50 text-amber-700 border-amber-200',
  llm_selection: 'bg-violet-50 text-violet-700 border-violet-200',
};

const blendModeLabels: Record<string, string> = {
  sequential: 'Sequential',
  parallel: 'Parallel',
  merge: 'Merge',
  llm_selection: 'LLM Selection',
};

const blendModeDescriptions: Record<string, string> = {
  sequential: 'Engines run in order. Each engine receives the output of the previous engine as additional context.',
  parallel: 'All engines run independently. Their outputs are kept separate.',
  merge: 'All engines run, then their outputs are merged into a unified result.',
  llm_selection: 'An LLM selects the best subset of engines for the task based on selection criteria.',
};

const rendererTypeColors: Record<string, string> = {
  accordion: 'bg-blue-50 text-blue-700 border-blue-200',
  card_grid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tab: 'bg-amber-50 text-amber-700 border-amber-200',
  prose: 'bg-rose-50 text-rose-700 border-rose-200',
  table: 'bg-gray-50 text-gray-700 border-gray-200',
  stat_summary: 'bg-violet-50 text-violet-700 border-violet-200',
  timeline: 'bg-teal-50 text-teal-700 border-teal-200',
  raw_json: 'bg-gray-50 text-gray-500 border-gray-200',
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function ViewCard({ view, depth = 0 }: { view: ChainViewInfo; depth?: number }) {
  const router = useRouter();
  const sourceLabel = view.source_chain_key
    ? `chain: ${view.source_chain_key}`
    : view.source_engine_key
      ? `engine: ${view.source_engine_key}`
      : 'unknown';

  return (
    <div className={clsx(depth > 0 && 'ml-6 border-l-2 border-gray-100 pl-4')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/views/${view.view_key}`)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/views/${view.view_key}`); }}
        className="block p-4 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                {view.view_name}
              </h4>
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-xs font-medium rounded border',
                  rendererTypeColors[view.renderer_type] || 'bg-gray-50 text-gray-600 border-gray-200'
                )}
              >
                {view.renderer_type}
              </span>
              {view.presentation_stance && (
                <span className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-50 rounded">
                  {view.presentation_stance}
                </span>
              )}
              {view.source_type === 'secondary' && (
                <span className="px-1.5 py-0.5 text-xs text-orange-600 bg-orange-50 rounded border border-orange-200">
                  secondary
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{view.description}</p>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="font-mono">{sourceLabel}</span>
              <span>{view.target_app} / {view.target_page}</span>
              {view.sections_count > 0 && (
                <span>{view.sections_count} sections</span>
              )}
            </div>

            {/* Sub-renderers */}
            {view.sub_renderers_used.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <Component className="h-3 w-3 text-gray-400" />
                {view.sub_renderers_used.map((sr) => (
                  <Link
                    key={sr}
                    href={`/sub-renderers/${sr}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                  >
                    {sr}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {view.children.length > 0 && (
        <div className="space-y-1">
          {view.children.map((child) => (
            <ViewCard key={child.view_key} view={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChainDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: chain, isLoading, error } = useQuery({
    queryKey: ['chain', key],
    queryFn: () => api.chains.get(key as string),
    enabled: !!key,
  });

  const { data: chainViews, isLoading: viewsLoading } = useQuery({
    queryKey: ['chain-views', key],
    queryFn: () => api.chains.views(key as string),
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load chain: {key}</p>
        <Link href="/chains" className="mt-4 text-primary-600 hover:underline">
          Back to Chains
        </Link>
      </div>
    );
  }

  // Count total views including nested children
  const totalViews = chainViews
    ? chainViews.reduce((acc, v) => acc + 1 + v.children.length, 0)
    : 0;

  // Collect all unique renderer types across views
  const allRendererTypes = new Set<string>();
  const allSubRenderers = new Set<string>();
  chainViews?.forEach((v) => {
    allRendererTypes.add(v.renderer_type);
    v.sub_renderers_used.forEach((sr) => allSubRenderers.add(sr));
    v.children.forEach((c) => {
      allRendererTypes.add(c.renderer_type);
      c.sub_renderers_used.forEach((sr) => allSubRenderers.add(sr));
    });
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/chains"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Chains
        </Link>

        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{chain.chain_name}</h1>
          <span
            className={clsx(
              'px-2.5 py-0.5 text-xs font-medium rounded-full border',
              blendModeColors[chain.blend_mode] || 'bg-gray-50 text-gray-600 border-gray-200'
            )}
          >
            {blendModeLabels[chain.blend_mode] || chain.blend_mode}
          </span>
          {chain.category && (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 capitalize">
              {chain.category}
            </span>
          )}
        </div>

        <p className="text-sm font-mono text-gray-400">{chain.chain_key}</p>
      </div>

      {/* Description */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Description</h3>
          <CopyButton text={chain.description} label="Copy" />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{chain.description}</p>
      </div>

      {/* Blend Mode */}
      <div
        className={clsx(
          'card p-6 border-l-4',
          chain.blend_mode === 'sequential' && 'border-l-blue-400',
          chain.blend_mode === 'parallel' && 'border-l-emerald-400',
          chain.blend_mode === 'merge' && 'border-l-amber-400',
          chain.blend_mode === 'llm_selection' && 'border-l-violet-400',
          !['sequential', 'parallel', 'merge', 'llm_selection'].includes(chain.blend_mode) && 'border-l-gray-300'
        )}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Blend Mode: {blendModeLabels[chain.blend_mode] || chain.blend_mode}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {blendModeDescriptions[chain.blend_mode] || 'Unknown blend mode.'}
        </p>
        {chain.blend_mode === 'sequential' && (
          <p className="mt-2 text-xs text-gray-400">
            Context passing: {chain.pass_context ? 'enabled' : 'disabled'}
          </p>
        )}
        {chain.blend_mode === 'llm_selection' && chain.selection_criteria && (
          <div className="mt-3 p-3 bg-violet-50 rounded text-sm text-violet-700">
            <span className="font-medium">Selection criteria:</span> {chain.selection_criteria}
          </div>
        )}
        {chain.blend_mode === 'merge' && chain.merge_strategy && (
          <div className="mt-3 p-3 bg-amber-50 rounded text-sm text-amber-700">
            <span className="font-medium">Merge strategy:</span> {chain.merge_strategy}
          </div>
        )}
      </div>

      {/* Engine Pipeline */}
      <Section title={`Engines (${chain.engine_keys.length})`}>
        <div className="space-y-0">
          {chain.engine_keys.map((engineKey, idx) => (
            <div key={engineKey}>
              <Link
                href={`/engines/${engineKey}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded transition-colors group"
              >
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                  {idx + 1}
                </span>
                <span className="text-sm font-mono text-gray-700 group-hover:text-primary-700 transition-colors">
                  {engineKey}
                </span>
              </Link>
              {chain.blend_mode === 'sequential' && idx < chain.engine_keys.length - 1 && (
                <div className="flex items-center pl-6 py-1">
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                  <span className="ml-2 text-xs text-gray-300">
                    {chain.pass_context ? 'passes context' : 'no context'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── PRESENTATION PIPELINE ────────────────────────────── */}
      <Section
        title={`Presentation Pipeline (${totalViews} view${totalViews !== 1 ? 's' : ''})`}
        icon={<Layers className="h-4 w-4 text-gray-400" />}
      >
        {viewsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4">
                <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : chainViews && chainViews.length > 0 ? (
          <div>
            {/* Summary chips */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b flex-wrap">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">{totalViews} views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-gray-400" />
                {[...allRendererTypes].sort().map((rt) => (
                  <Link
                    key={rt}
                    href={`/renderers/${rt}`}
                    className={clsx(
                      'px-1.5 py-0.5 text-xs rounded border hover:opacity-80 transition-opacity',
                      rendererTypeColors[rt] || 'bg-gray-50 text-gray-600 border-gray-200'
                    )}
                  >
                    {rt}
                  </Link>
                ))}
              </div>
              {allSubRenderers.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <Component className="h-3.5 w-3.5 text-gray-400" />
                  {[...allSubRenderers].sort().map((sr) => (
                    <Link
                      key={sr}
                      href={`/sub-renderers/${sr}`}
                      className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                    >
                      {sr}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* View tree */}
            <div className="space-y-1">
              {chainViews.map((view) => (
                <ViewCard key={view.view_key} view={view} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Eye className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No views consume this chain&apos;s output yet.</p>
            <p className="text-xs text-gray-300 mt-1">
              Views are defined in analyzer-v2 and reference chains by key in their data_source.
            </p>
          </div>
        )}
      </Section>

      {/* Metadata Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Recommended For */}
        <Section title="Recommended For">
          {chain.recommended_for.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chain.recommended_for.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No specific recommendations</p>
          )}
        </Section>

        {/* Quick Reference */}
        <Section title="Quick Reference">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">Chain Key</dt>
              <dd className="mt-0.5 text-sm font-mono text-gray-700">{chain.chain_key}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Version</dt>
              <dd className="mt-0.5 text-sm text-gray-700">v{chain.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Max Engines</dt>
              <dd className="mt-0.5 text-sm text-gray-700">{chain.max_engines}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Pass Context</dt>
              <dd className="mt-0.5 text-sm text-gray-700">{chain.pass_context ? 'Yes' : 'No'}</dd>
            </div>
            {chain.category && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Category</dt>
                <dd className="mt-0.5 text-sm text-gray-700 capitalize">{chain.category}</dd>
              </div>
            )}
          </dl>
        </Section>
      </div>

      {/* Context Parameter Schema */}
      {chain.context_parameter_schema && (
        <Section title="Context Parameter Schema">
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(chain.context_parameter_schema, null, 2)}
            </pre>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Runtime parameters that customize engine behavior when this chain is executed.
          </p>
        </Section>
      )}
    </div>
  );
}
