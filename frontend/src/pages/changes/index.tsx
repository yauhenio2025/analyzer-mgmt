import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { History, AlertCircle, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChangeSummary, ChangeType, PropagationStatus } from '@/types';
import clsx from 'clsx';

const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

const PROPAGATION_STATUS_COLORS: Record<PropagationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
};

function ChangeCard({ change }: { change: ChangeSummary }) {
  const formattedDate = change.changed_at
    ? new Date(change.changed_at).toLocaleString()
    : 'Unknown date';

  return (
    <Link
      href={`/changes/${change.id}`}
      className="card p-4 hover:shadow-md transition-shadow group block"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('badge text-xs capitalize', CHANGE_TYPE_COLORS[change.change_type])}>
              {change.change_type}
            </span>
            <span className="text-sm font-medium text-gray-900">{change.construct_key}</span>
            <span className="badge badge-gray text-xs">{change.construct_type}</span>
          </div>

          {change.change_summary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{change.change_summary}</p>
          )}

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>{formattedDate}</span>
            {change.changed_by && <span>by {change.changed_by}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'badge text-xs',
              PROPAGATION_STATUS_COLORS[change.propagation_status]
            )}
          >
            {change.propagation_status}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function ChangesPage() {
  const [filters, setFilters] = useState<{
    construct_type?: string;
    change_type?: string;
    status?: string;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['changes', filters],
    queryFn: () => api.changes.list({ ...filters, limit: 50 }),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load changes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change History</h1>
          <p className="mt-1 text-gray-500">Track all changes to definitions</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
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
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="pt-4 border-t grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Construct Type</label>
              <select
                value={filters.construct_type || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    construct_type: e.target.value || undefined,
                  }))
                }
                className="input"
              >
                <option value="">All</option>
                <option value="engine">Engine</option>
                <option value="paradigm">Paradigm</option>
                <option value="pipeline">Pipeline</option>
              </select>
            </div>
            <div>
              <label className="label">Change Type</label>
              <select
                value={filters.change_type || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    change_type: e.target.value || undefined,
                  }))
                }
                className="input"
              >
                <option value="">All</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value || undefined }))
                }
                className="input"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full mt-3" />
              <div className="h-3 bg-gray-200 rounded w-1/4 mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Changes List */}
      {!isLoading && (
        <div className="space-y-4">
          {data?.changes.map((change) => (
            <ChangeCard key={change.id} change={change} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.changes.length === 0 && (
        <div className="card p-12 text-center">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No changes found</p>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
