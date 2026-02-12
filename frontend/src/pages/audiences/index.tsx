import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AudienceSummary } from '@/types';
import clsx from 'clsx';

const DETAIL_LEVEL_COLORS: Record<string, string> = {
  expert: 'bg-purple-100 text-purple-800',
  detailed: 'bg-blue-100 text-blue-800',
  standard: 'bg-green-100 text-green-800',
  accessible: 'bg-yellow-100 text-yellow-800',
  executive: 'bg-orange-100 text-orange-800',
};

const STYLE_COLORS: Record<string, string> = {
  academic: 'bg-indigo-100 text-indigo-800',
  professional: 'bg-slate-100 text-slate-800',
  executive: 'bg-amber-100 text-amber-800',
  activist: 'bg-rose-100 text-rose-800',
  creative: 'bg-pink-100 text-pink-800',
};

function AudienceCard({ audience }: { audience: AudienceSummary }) {
  return (
    <Link
      href={`/audiences/${audience.audience_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {audience.audience_name}
            </h3>
            <span
              className={clsx(
                'badge text-xs',
                DETAIL_LEVEL_COLORS[audience.detail_level] || 'bg-gray-100 text-gray-800'
              )}
            >
              {audience.detail_level}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{audience.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
            <span
              className={clsx(
                'badge text-xs',
                STYLE_COLORS[audience.style_preference] || 'bg-gray-100 text-gray-800'
              )}
            >
              {audience.style_preference}
            </span>
            <span>{audience.engine_affinity_count} engine affinities</span>
            <span>&#183;</span>
            <span>{audience.vocabulary_term_count} vocab terms</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function AudiencesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audiences'],
    queryFn: () => api.audiences.list(),
  });

  const audiences = data ?? [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load audiences
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audiences</h1>
          <p className="mt-1 text-gray-500">
            {audiences.length} audience profile{audiences.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full mt-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Audience Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audiences.map((audience) => (
            <AudienceCard key={audience.audience_key} audience={audience} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && audiences.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No audiences found</p>
        </div>
      )}
    </div>
  );
}
