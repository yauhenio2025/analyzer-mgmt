import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Search, Filter, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { EngineSummary, EngineCategory } from '@/types';
import clsx from 'clsx';

const CATEGORIES: EngineCategory[] = [
  'argument',
  'epistemology',
  'methodology',
  'systems',
  'concepts',
  'evidence',
  'temporal',
  'power',
  'institutional',
  'market',
  'rhetoric',
  'scholarly',
];

const CATEGORY_COLORS: Record<EngineCategory, string> = {
  argument: 'bg-red-100 text-red-800',
  epistemology: 'bg-purple-100 text-purple-800',
  methodology: 'bg-blue-100 text-blue-800',
  systems: 'bg-green-100 text-green-800',
  concepts: 'bg-yellow-100 text-yellow-800',
  evidence: 'bg-orange-100 text-orange-800',
  temporal: 'bg-cyan-100 text-cyan-800',
  power: 'bg-rose-100 text-rose-800',
  institutional: 'bg-indigo-100 text-indigo-800',
  market: 'bg-emerald-100 text-emerald-800',
  rhetoric: 'bg-pink-100 text-pink-800',
  scholarly: 'bg-slate-100 text-slate-800',
};

function EngineCard({ engine }: { engine: EngineSummary }) {
  return (
    <Link
      href={`/engines/${engine.engine_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {engine.engine_name}
            </h3>
            <span className={clsx('badge text-xs', CATEGORY_COLORS[engine.category])}>
              {engine.category}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{engine.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span>v{engine.version}</span>
            <span>•</span>
            <span className="capitalize">{engine.kind}</span>
            {engine.paradigm_keys.length > 0 && (
              <>
                <span>•</span>
                <span>{engine.paradigm_keys.join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function EnginesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['engines', { search, category: selectedCategory }],
    queryFn: () =>
      api.engines.list({
        search: search || undefined,
        category: selectedCategory || undefined,
        limit: 200,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['engines', 'categories'],
    queryFn: () => api.engines.getCategories(),
  });

  const engines = data?.engines ?? [];
  const categories = categoriesData?.categories ?? {};

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load engines
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engines</h1>
          <p className="mt-1 text-gray-500">
            {data?.total ?? 0} analytical engines
          </p>
        </div>
        <Link href="/engines/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Engine
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search engines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'btn-secondary',
              showFilters && 'bg-primary-100 text-primary-700'
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Category Filters */}
        {showFilters && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={clsx(
                  'badge cursor-pointer',
                  selectedCategory === null ? 'badge-primary' : 'badge-gray hover:bg-gray-200'
                )}
              >
                All ({Object.values(categories).reduce((a, b) => a + b, 0)})
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === category ? null : category)
                  }
                  className={clsx(
                    'badge cursor-pointer capitalize',
                    selectedCategory === category
                      ? CATEGORY_COLORS[category]
                      : 'badge-gray hover:bg-gray-200'
                  )}
                >
                  {category} ({categories[category] ?? 0})
                </button>
              ))}
            </div>
          </div>
        )}
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

      {/* Engine Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {engines.map((engine) => (
            <EngineCard key={engine.engine_key} engine={engine} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && engines.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No engines found</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
