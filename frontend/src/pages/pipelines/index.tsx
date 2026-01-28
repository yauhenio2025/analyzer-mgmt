import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, GitBranch, AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { PipelineSummary } from '@/types';
import clsx from 'clsx';

const BLEND_MODE_COLORS = {
  sequential: 'bg-blue-100 text-blue-800',
  parallel: 'bg-green-100 text-green-800',
  merge: 'bg-purple-100 text-purple-800',
  llm_selection: 'bg-amber-100 text-amber-800',
};

function PipelineCard({ pipeline }: { pipeline: PipelineSummary }) {
  return (
    <Link
      href={`/pipelines/${pipeline.pipeline_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {pipeline.pipeline_name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{pipeline.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={clsx('badge text-xs', BLEND_MODE_COLORS[pipeline.blend_mode])}>
              {pipeline.blend_mode.replace('_', ' ')}
            </span>
            <span className="badge badge-gray text-xs">
              {pipeline.stage_count} stages
            </span>
            {pipeline.category && (
              <span className="badge badge-gray text-xs">{pipeline.category}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function PipelinesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.pipelines.list(),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load pipelines
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="mt-1 text-gray-500">
            Multi-stage analysis pipelines
          </p>
        </div>
        <Link href="/pipelines/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Pipeline
        </Link>
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

      {/* Pipeline Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.pipelines.map((pipeline) => (
            <PipelineCard key={pipeline.pipeline_key} pipeline={pipeline} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.pipelines.length === 0 && (
        <div className="card p-12 text-center">
          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No pipelines found</p>
          <Link href="/pipelines/new" className="btn-primary mt-4">
            Create your first pipeline
          </Link>
        </div>
      )}
    </div>
  );
}
