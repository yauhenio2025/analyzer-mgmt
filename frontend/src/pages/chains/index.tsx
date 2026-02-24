import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Info } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChainSummary } from '@/types';
import clsx from 'clsx';
import { useState } from 'react';

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

const categoryAccentColors: Record<string, string> = {
  genealogy: 'border-l-rose-400',
  critique: 'border-l-amber-400',
  concepts: 'border-l-sky-400',
  domain: 'border-l-emerald-400',
  evidence: 'border-l-violet-400',
  rhetoric: 'border-l-orange-400',
  methodology: 'border-l-teal-400',
  synthesis: 'border-l-indigo-400',
};

function ChainCard({ chain }: { chain: ChainSummary }) {
  return (
    <Link
      href={`/chains/${chain.chain_key}`}
      className={clsx(
        'card p-5 hover:shadow-md transition-shadow group border-l-4',
        categoryAccentColors[chain.category || ''] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900">{chain.chain_name}</h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                blendModeColors[chain.blend_mode] || 'bg-gray-50 text-gray-600 border-gray-200'
              )}
            >
              {blendModeLabels[chain.blend_mode] || chain.blend_mode}
            </span>
            {chain.category && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {chain.category}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
            {chain.description}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">
              {chain.engine_count} engine{chain.engine_count !== 1 ? 's' : ''}
            </span>
            {chain.has_context_parameters && (
              <span className="px-1.5 py-0.5 text-xs bg-violet-50 text-violet-600 rounded border border-violet-200">
                parameterized
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function ChainsPage() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterBlendMode, setFilterBlendMode] = useState<string | null>(null);

  const { data: chains, isLoading, error } = useQuery({
    queryKey: ['chains'],
    queryFn: () => api.chains.list(),
  });

  const categories = chains
    ? [...new Set(chains.map((c) => c.category).filter(Boolean))] as string[]
    : [];

  const filtered = chains?.filter((c) => {
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterBlendMode && c.blend_mode !== filterBlendMode) return false;
    return true;
  });

  // Group by category
  const grouped: Record<string, ChainSummary[]> = {};
  filtered?.forEach((c) => {
    const cat = c.category || 'uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load chains from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Engine Chains</h1>
        <p className="mt-1 text-gray-500">
          {chains?.length ?? 0} multi-engine composition specifications
        </p>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-indigo-50 border-indigo-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-medium">Engine Composition Blueprints</p>
            <p className="mt-1 text-indigo-600">
              Chains define how multiple engines work together &mdash; sequentially building on each
              other&apos;s output, running in parallel, merging results, or letting an LLM pick the
              best subset. These are used by the orchestrator to execute multi-engine analysis workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Category:</span>
          <button
            onClick={() => setFilterCategory(null)}
            className={clsx(
              'px-2 py-1 text-xs rounded-full transition-colors',
              filterCategory === null
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {categories.sort().map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={clsx(
                'px-2 py-1 text-xs rounded-full transition-colors capitalize',
                filterCategory === cat
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blend mode filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Mode:</span>
          {Object.entries(blendModeLabels).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setFilterBlendMode(filterBlendMode === mode ? null : mode)}
              className={clsx(
                'px-2 py-1 text-xs rounded-full border transition-colors',
                filterBlendMode === mode
                  ? blendModeColors[mode]
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chains Grid - grouped by category */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse border-l-4 border-l-gray-200">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-5/6 mb-3" />
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <div className="h-5 bg-gray-200 rounded w-24" />
                <div className="h-5 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categoryChains]) => (
              <div key={category}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 capitalize">
                  {category} ({categoryChains.length})
                </h2>
                <div className="grid gap-4 grid-cols-1">
                  {categoryChains
                    .sort((a, b) => a.chain_name.localeCompare(b.chain_name))
                    .map((chain) => (
                      <ChainCard key={chain.chain_key} chain={chain} />
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
