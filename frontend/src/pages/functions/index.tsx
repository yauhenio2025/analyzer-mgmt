import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, AlertCircle, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import type { FunctionSummary, FunctionCategory, FunctionTier } from '@/types';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<string, string> = {
  coordination: 'bg-purple-100 text-purple-800',
  generation: 'bg-blue-100 text-blue-800',
  analysis: 'bg-green-100 text-green-800',
  synthesis: 'bg-amber-100 text-amber-800',
  tool: 'bg-cyan-100 text-cyan-800',
  infrastructure: 'bg-slate-100 text-slate-800',
};

const TIER_COLORS: Record<string, string> = {
  strategic: 'bg-red-100 text-red-800',
  tactical: 'bg-orange-100 text-orange-800',
  lightweight: 'bg-lime-100 text-lime-800',
};

const TRACK_COLORS: Record<string, string> = {
  ideas: 'bg-violet-100 text-violet-800',
  process: 'bg-teal-100 text-teal-800',
  both: 'bg-indigo-100 text-indigo-800',
};

const TIER_LABELS: Record<string, string> = {
  strategic: 'Opus',
  tactical: 'Sonnet',
  lightweight: 'Haiku',
};

function FunctionCard({ func }: { func: FunctionSummary }) {
  return (
    <Link
      href={`/functions/${func.function_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {func.function_name}
            </h3>
            <span
              className={clsx(
                'badge text-xs',
                CATEGORY_COLORS[func.category] || 'bg-gray-100 text-gray-800'
              )}
            >
              {func.category}
            </span>
            <span
              className={clsx(
                'badge text-xs',
                TIER_COLORS[func.tier] || 'bg-gray-100 text-gray-800'
              )}
            >
              {TIER_LABELS[func.tier] || func.tier}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{func.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            {func.track && (
              <span
                className={clsx(
                  'badge text-xs',
                  TRACK_COLORS[func.track] || 'bg-gray-100 text-gray-800'
                )}
              >
                {func.track}
              </span>
            )}
            <span>{func.implementation_count} implementation{func.implementation_count !== 1 ? 's' : ''}</span>
            {func.source_projects.length > 0 && (
              <>
                <span>&#183;</span>
                <span>{func.source_projects.join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function FunctionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  const { data: functions, isLoading, error } = useQuery({
    queryKey: ['functions', selectedCategory, selectedTier, selectedProject, searchQuery],
    queryFn: () =>
      api.functions.list({
        category: selectedCategory || undefined,
        tier: selectedTier || undefined,
        project: selectedProject || undefined,
        search: searchQuery || undefined,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['function-categories'],
    queryFn: () => api.functions.getCategories(),
  });

  const { data: projects } = useQuery({
    queryKey: ['function-projects'],
    queryFn: () => api.functions.getProjects(),
  });

  const items = functions ?? [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load functions
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Functions</h1>
          <p className="mt-1 text-gray-500">
            {items.length} LLM-powered function{items.length !== 1 ? 's' : ''} across projects
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-auto"
          >
            <option value="">All categories</option>
            {categories?.categories &&
              Object.entries(categories.categories).map(([cat, count]) => (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              ))}
          </select>

          {/* Tier filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="input w-auto"
          >
            <option value="">All tiers</option>
            <option value="strategic">Strategic (Opus)</option>
            <option value="tactical">Tactical (Sonnet)</option>
            <option value="lightweight">Lightweight (Haiku)</option>
          </select>

          {/* Project filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input w-auto"
          >
            <option value="">All projects</option>
            {projects?.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full mt-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Function Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((func) => (
            <FunctionCard key={func.function_key} func={func} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No functions found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
