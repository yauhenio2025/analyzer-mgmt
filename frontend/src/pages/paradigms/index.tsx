import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Layers, AlertCircle, ChevronRight, GitBranch, Filter, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { ParadigmSummary } from '@/types';
import clsx from 'clsx';

function ParadigmCard({ paradigm }: { paradigm: ParadigmSummary }) {
  const isBranch = !!paradigm.parent_paradigm_key;
  const isGenerating = paradigm.generation_status === 'generating';

  return (
    <Link
      href={`/paradigms/${paradigm.paradigm_key}`}
      className={clsx(
        "card p-6 hover:shadow-md transition-shadow group",
        isGenerating && "border-primary-300 bg-primary-50/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isBranch ? (
              <GitBranch className="h-5 w-5 text-purple-500" />
            ) : (
              <Layers className="h-5 w-5 text-purple-500" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{paradigm.paradigm_name}</h3>
            {isGenerating && (
              <span className="badge bg-primary-100 text-primary-700 text-xs flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating
              </span>
            )}
            {paradigm.generation_status === 'failed' && (
              <span className="badge bg-red-100 text-red-700 text-xs">
                Failed
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{paradigm.description}</p>
          <p className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Thinkers:</span> {paradigm.guiding_thinkers}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="badge badge-gray">v{paradigm.version}</span>
            <span className="badge badge-primary">{paradigm.engine_count} engines</span>
            {isBranch && (
              <span className="badge bg-purple-100 text-purple-700 text-xs">
                Branch (depth: {paradigm.branch_depth})
              </span>
            )}
            {paradigm.active_traits.slice(0, 2).map((trait) => (
              <span key={trait} className="badge badge-success text-xs">
                {trait.replace('_trait', '')}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

type FilterType = 'all' | 'root' | 'branches';

export default function ParadigmsPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['paradigms', filter],
    queryFn: () => api.paradigms.list({
      is_root: filter === 'root' ? true : undefined,
      parent_key: undefined, // We don't filter by specific parent on list page
    }),
  });

  // Filter branches client-side since we don't have a direct "has parent" query param
  const filteredParadigms = data?.paradigms.filter((p) => {
    if (filter === 'branches') return !!p.parent_paradigm_key;
    if (filter === 'root') return !p.parent_paradigm_key;
    return true;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load paradigms
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paradigms</h1>
          <p className="mt-1 text-gray-500">
            4-layer ontology frameworks for analysis
          </p>
        </div>
        <Link href="/paradigms/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Paradigm
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'root', label: 'Root Only' },
            { value: 'branches', label: 'Branches Only' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as FilterType)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                filter === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {data && (
          <span className="text-sm text-gray-500 ml-2">
            {filteredParadigms?.length || 0} paradigm{(filteredParadigms?.length || 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full mt-4" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Paradigm Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredParadigms?.map((paradigm) => (
            <ParadigmCard key={paradigm.paradigm_key} paradigm={paradigm} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredParadigms?.length === 0 && (
        <div className="card p-12 text-center">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No paradigms found</p>
          <Link href="/paradigms/new" className="btn-primary mt-4">
            Create your first paradigm
          </Link>
        </div>
      )}
    </div>
  );
}
