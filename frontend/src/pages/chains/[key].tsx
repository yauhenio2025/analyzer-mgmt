import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
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
