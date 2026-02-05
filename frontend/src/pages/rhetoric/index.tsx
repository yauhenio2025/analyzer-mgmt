import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, ChevronRight, AlertCircle, FileText, Target } from 'lucide-react';
import { api } from '@/lib/api';
import type { RhetoricSummary, RhetoricCategory } from '@/types';
import clsx from 'clsx';

const CATEGORY_TABS: { key: RhetoricCategory; label: string; description: string }[] = [
  {
    key: 'rhetoric',
    label: 'Round 1: Rhetoric',
    description: "Analyze the subject's response for weaknesses",
  },
  {
    key: 'vulnerability',
    label: 'Round 2: Vulnerability',
    description: 'Analyze your counter-response for exposed flanks',
  },
];

const CATEGORY_COLORS: Record<RhetoricCategory, string> = {
  rhetoric: 'bg-blue-100 text-blue-800',
  vulnerability: 'bg-amber-100 text-amber-800',
};

function RequirementBadge({ requirement }: { requirement: string }) {
  const colors: Record<string, string> = {
    Subject: 'bg-purple-100 text-purple-700',
    Critique: 'bg-green-100 text-green-700',
    Response: 'bg-orange-100 text-orange-700',
    'Counter-Response': 'bg-red-100 text-red-700',
  };
  return (
    <span className={clsx('badge text-xs', colors[requirement] || 'badge-gray')}>
      {requirement}
    </span>
  );
}

function RhetoricCard({ rhetoric }: { rhetoric: RhetoricSummary }) {
  return (
    <Link
      href={`/rhetoric/${rhetoric.rhetoric_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">
              {rhetoric.name}
            </h3>
            <span className={clsx('badge text-xs', CATEGORY_COLORS[rhetoric.category])}>
              {rhetoric.category === 'rhetoric' ? 'Round 1' : 'Round 2'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{rhetoric.description}</p>

          {/* Document requirements */}
          <div className="mt-3 flex flex-wrap gap-1">
            {rhetoric.document_requirements.map((req) => (
              <RequirementBadge key={req} requirement={req} />
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span>v{rhetoric.version}</span>
            <span>•</span>
            <span>{(rhetoric.thinking_budget / 1000).toFixed(0)}k thinking</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function RhetoricPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RhetoricCategory>('rhetoric');

  const { data, isLoading, error } = useQuery({
    queryKey: ['rhetoric', { search, category: selectedCategory }],
    queryFn: () =>
      api.rhetoric.list({
        search: search || undefined,
        category: selectedCategory,
        limit: 100,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['rhetoric', 'categories'],
    queryFn: () => api.rhetoric.getCategories(),
  });

  const rhetoricItems = data?.rhetoric ?? [];
  const categories = categoriesData?.categories ?? {};

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load rhetoric analyzers
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rhetoric Analyzers</h1>
          <p className="mt-1 text-gray-500">
            {data?.total ?? 0} rhetoric and vulnerability analyzers
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={clsx(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                selectedCategory === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2">
                {tab.key === 'rhetoric' ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                {tab.label}
                <span
                  className={clsx(
                    'ml-1 badge text-xs',
                    selectedCategory === tab.key ? 'badge-primary' : 'badge-gray'
                  )}
                >
                  {categories[tab.key] ?? 0}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600">
        {CATEGORY_TABS.find((t) => t.key === selectedCategory)?.description}
      </p>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search analyzers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
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

      {/* Rhetoric Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rhetoricItems.map((rhetoric) => (
            <RhetoricCard key={rhetoric.rhetoric_key} rhetoric={rhetoric} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && rhetoricItems.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No analyzers found</p>
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
