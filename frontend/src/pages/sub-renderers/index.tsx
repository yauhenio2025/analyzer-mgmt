import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronRight,
  Component,
  Info,
  Plus,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SubRendererSummary } from '@/types';
import clsx from 'clsx';

const categoryColors: Record<string, string> = {
  atomic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  composite: 'bg-violet-50 text-violet-700 border-violet-200',
  specialized: 'bg-blue-50 text-blue-700 border-blue-200',
  meta: 'bg-amber-50 text-amber-700 border-amber-200',
};

const categoryBorderColors: Record<string, string> = {
  atomic: 'border-l-emerald-500',
  composite: 'border-l-violet-500',
  specialized: 'border-l-blue-500',
  meta: 'border-l-amber-500',
};

function SubRendererCard({ subRenderer }: { subRenderer: SubRendererSummary }) {
  const topStances = Object.entries(subRenderer.stance_affinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Link
      href={`/sub-renderers/${subRenderer.sub_renderer_key}`}
      className={clsx(
        'card p-5 hover:shadow-md transition-shadow group border-l-4',
        categoryBorderColors[subRenderer.category] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900">
              {subRenderer.sub_renderer_name}
            </h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                categoryColors[subRenderer.category] || categoryColors.atomic
              )}
            >
              {subRenderer.category}
            </span>
            {subRenderer.status !== 'active' && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                {subRenderer.status}
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-gray-400 mb-2">
            {subRenderer.sub_renderer_key}
          </p>

          {subRenderer.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
              {subRenderer.description}
            </p>
          )}

          {/* Data shapes + parent renderers + stances */}
          <div className="flex items-center gap-2 flex-wrap">
            {subRenderer.parent_renderer_types.map((parent) => (
              <span
                key={parent}
                className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded border border-indigo-200"
              >
                {parent}
              </span>
            ))}
            {subRenderer.ideal_data_shapes.slice(0, 2).map((shape) => (
              <span
                key={shape}
                className="px-1.5 py-0.5 text-xs bg-gray-50 text-gray-500 rounded border border-gray-200"
              >
                {shape}
              </span>
            ))}
            {topStances.map(([stance, score]) => (
              <span
                key={stance}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200"
              >
                {stance}
                <span className="text-gray-400 font-mono">{(score as number).toFixed(1)}</span>
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function SubRenderersListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const {
    data: subRenderers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sub-renderers'],
    queryFn: () => api.subRenderers.list(),
  });

  const categories = useMemo(() => {
    if (!subRenderers) return [];
    const cats = new Set(subRenderers.map((r) => r.category));
    return Array.from(cats).sort();
  }, [subRenderers]);

  const filtered = useMemo(() => {
    if (!subRenderers) return [];
    return subRenderers.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.sub_renderer_key.toLowerCase().includes(q) ||
          r.sub_renderer_name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [subRenderers, categoryFilter, searchQuery]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load sub-renderer definitions from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sub-Renderers</h1>
          <p className="mt-1 text-gray-500">
            {subRenderers?.length ?? 0} atomic UI components within container renderers
          </p>
        </div>
        <Link href="/sub-renderers/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Sub-Renderer
        </Link>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-emerald-50 border-emerald-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium">Atomic Rendering Components</p>
            <p className="mt-1 text-emerald-600">
              Sub-renderers are the building blocks inside container renderers like
              <strong> accordion</strong> and <strong>tab</strong>. Each section in an accordion
              uses a sub-renderer (chip_grid, mini_card_list, prose_block, etc.) to display its data.
              The orchestrator selects sub-renderers based on data shape and stance affinity.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sub-renderers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-auto min-w-[180px]"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Category Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span className="font-medium">Categories:</span>
        {Object.entries(categoryBorderColors).map(([cat, cls]) => (
          <span key={cat} className="flex items-center gap-1">
            <span
              className={clsx(
                'inline-block w-2 h-2 rounded-full',
                cls.replace('border-l-', 'bg-')
              )}
            />
            {cat}
          </span>
        ))}
      </div>

      {/* Sub-Renderer List */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 border-l-4 border-l-gray-200 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <Component className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No sub-renderers found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map((r) => (
            <SubRendererCard key={r.sub_renderer_key} subRenderer={r} />
          ))}
        </div>
      )}
    </div>
  );
}
