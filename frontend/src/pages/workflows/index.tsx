import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { GitMerge, AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkflowSummary, WorkflowCategory } from '@/types';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<string, string> = {
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  return (
    <Link
      href={`/workflows/${workflow.workflow_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {workflow.workflow_name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{workflow.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={clsx('badge text-xs', CATEGORY_COLORS[workflow.category] || 'badge-gray')}>
              {workflow.category?.replace('_', ' ')}
            </span>
            <span className="badge badge-gray text-xs">
              {workflow.phase_count} phases
            </span>
            {workflow.source_project && (
              <span className="badge badge-gray text-xs capitalize">
                {workflow.source_project}
              </span>
            )}
          </div>
          {workflow.required_inputs.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs text-gray-400">Requires:</span>
              {workflow.required_inputs.map((input) => (
                <span key={input} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {input}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function WorkflowsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.workflows.list(),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load workflows
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="mt-1 text-gray-500">
            Multi-phase analysis workflows from analyzer-v2
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full mt-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Workflow Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.workflows.map((workflow) => (
            <WorkflowCard key={workflow.workflow_key} workflow={workflow} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.workflows.length === 0 && (
        <div className="card p-12 text-center">
          <GitMerge className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No workflows found</p>
        </div>
      )}
    </div>
  );
}
