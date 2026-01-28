import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Layers, AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { ParadigmSummary } from '@/types';

function ParadigmCard({ paradigm }: { paradigm: ParadigmSummary }) {
  return (
    <Link
      href={`/paradigms/${paradigm.paradigm_key}`}
      className="card p-6 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">{paradigm.paradigm_name}</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{paradigm.description}</p>
          <p className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Thinkers:</span> {paradigm.guiding_thinkers}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="badge badge-gray">v{paradigm.version}</span>
            <span className="badge badge-primary">{paradigm.engine_count} engines</span>
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

export default function ParadigmsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['paradigms'],
    queryFn: () => api.paradigms.list(),
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
          {data?.paradigms.map((paradigm) => (
            <ParadigmCard key={paradigm.paradigm_key} paradigm={paradigm} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.paradigms.length === 0 && (
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
