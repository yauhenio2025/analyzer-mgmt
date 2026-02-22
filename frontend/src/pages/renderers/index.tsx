import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronRight,
  Info,
  Plus,
  Search,
  Monitor,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RendererSummary } from '@/types';
import clsx from 'clsx';

const categoryColors: Record<string, string> = {
  container: 'bg-blue-50 text-blue-700 border-blue-200',
  list: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  narrative: 'bg-violet-50 text-violet-700 border-violet-200',
  comparative: 'bg-amber-50 text-amber-700 border-amber-200',
  diagnostic: 'bg-red-50 text-red-700 border-red-200',
};

const categoryBorderColors: Record<string, string> = {
  container: 'border-l-blue-500',
  list: 'border-l-emerald-500',
  narrative: 'border-l-violet-500',
  comparative: 'border-l-amber-500',
  diagnostic: 'border-l-red-500',
};

function RendererCard({ renderer }: { renderer: RendererSummary }) {
  const topStances = Object.entries(renderer.stance_affinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Link
      href={`/renderers/${renderer.renderer_key}`}
      className={clsx(
        'card p-5 hover:shadow-md transition-shadow group border-l-4',
        categoryBorderColors[renderer.category] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900">
              {renderer.renderer_name}
            </h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                categoryColors[renderer.category] || categoryColors.container
              )}
            >
              {renderer.category}
            </span>
            {renderer.status !== 'active' && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                {renderer.status}
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-gray-400 mb-2">
            {renderer.renderer_key}
          </p>

          {renderer.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
              {renderer.description}
            </p>
          )}

          {/* Top stance affinities */}
          {topStances.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {topStances.map(([stance, score]) => (
                <span
                  key={stance}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200"
                >
                  {stance}
                  <span className="text-gray-400 font-mono">{score.toFixed(1)}</span>
                </span>
              ))}
              {renderer.supported_apps.map((app) => (
                <span
                  key={app}
                  className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded"
                >
                  {app}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function RenderersListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const {
    data: renderers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['renderers'],
    queryFn: () => api.renderers.list(),
  });

  const categories = useMemo(() => {
    if (!renderers) return [];
    const cats = new Set(renderers.map((r) => r.category));
    return Array.from(cats).sort();
  }, [renderers]);

  const filtered = useMemo(() => {
    if (!renderers) return [];
    return renderers.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.renderer_key.toLowerCase().includes(q) ||
          r.renderer_name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [renderers, categoryFilter, searchQuery]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load renderer definitions from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renderers</h1>
          <p className="mt-1 text-gray-500">
            {renderers?.length ?? 0} visual rendering strategies
          </p>
        </div>
        <Link href="/renderers/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Renderer
        </Link>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-violet-50 border-violet-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-violet-800">
            <p className="font-medium">Renderer Catalog with Primitive Cross-References</p>
            <p className="mt-1 text-violet-600">
              Renderers declare HOW analytical output is presented. Each renderer can declare
              <strong> primitive affinities</strong> (which analytical concepts it visualizes),
              <strong> input data schemas</strong> (what structured data it expects), and
              <strong> named variants</strong> (preset configurations for common use-cases).
              The planner discovers renderers via: primitive &rarr; renderer &rarr; transformation.
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
            placeholder="Search renderers..."
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

      {/* Renderer List */}
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
          <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No renderers found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map((r) => (
            <RendererCard key={r.renderer_key} renderer={r} />
          ))}
        </div>
      )}
    </div>
  );
}
