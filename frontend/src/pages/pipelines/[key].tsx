import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, GitBranch, AlertCircle, Play, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

const BLEND_MODE_COLORS: Record<string, string> = {
  sequential: 'bg-blue-100 text-blue-800',
  parallel: 'bg-green-100 text-green-800',
  merge: 'bg-purple-100 text-purple-800',
  llm_selection: 'bg-amber-100 text-amber-800',
};

export default function PipelineDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: pipeline, isLoading, error } = useQuery({
    queryKey: ['pipeline', key],
    queryFn: () => api.pipelines.get(key as string),
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="space-y-6">
        <Link href="/pipelines" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipelines
        </Link>
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Failed to load pipeline
        </div>
      </div>
    );
  }

  const stages = pipeline.stages || pipeline.stage_definitions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/pipelines"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Pipelines
          </Link>
          <div className="flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pipeline.pipeline_name}</h1>
              <p className="text-gray-500">{pipeline.pipeline_key}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </button>
          <button className="btn-primary">
            <Play className="h-4 w-4 mr-2" />
            Run Pipeline
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Description</label>
            <p className="text-gray-700">{pipeline.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Blend Mode</label>
              <span className={clsx('badge', BLEND_MODE_COLORS[pipeline.blend_mode] || 'badge-gray')}>
                {pipeline.blend_mode?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="label">Category</label>
              <span className="badge badge-gray">{pipeline.category || 'Uncategorized'}</span>
            </div>
            <div>
              <label className="label">Status</label>
              <span className={clsx(
                'badge',
                pipeline.status === 'active' ? 'bg-green-100 text-green-800' : 'badge-gray'
              )}>
                {pipeline.status}
              </span>
            </div>
            <div>
              <label className="label">Stages</label>
              <span className="text-gray-700 font-medium">{stages.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="card">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Stages</h2>
          <p className="text-sm text-gray-500 mt-1">
            Execution order and configuration for each stage
          </p>
        </div>
        <div className="divide-y">
          {stages.length > 0 ? (
            stages.map((stage: any, index: number) => (
              <div key={stage.id || index} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {stage.stage_name || stage.name || `Stage ${index + 1}`}
                      </h3>
                      {stage.blend_mode && (
                        <span className={clsx('badge text-xs', BLEND_MODE_COLORS[stage.blend_mode] || 'badge-gray')}>
                          {stage.blend_mode}
                        </span>
                      )}
                    </div>
                    {stage.engine_key && (
                      <p className="text-sm text-gray-500 mt-1">
                        Engine: <Link href={`/engines/${stage.engine_key}`} className="text-primary-600 hover:underline">{stage.engine_key}</Link>
                      </p>
                    )}
                    {stage.sub_pass_engine_keys && stage.sub_pass_engine_keys.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Sub-pass engines:</p>
                        <div className="flex flex-wrap gap-1">
                          {stage.sub_pass_engine_keys.map((engineKey: string) => (
                            <Link
                              key={engineKey}
                              href={`/engines/${engineKey}`}
                              className="badge badge-gray text-xs hover:bg-gray-200"
                            >
                              {engineKey}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {stage.config && Object.keys(stage.config).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View configuration
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(stage.config, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No stages defined for this pipeline
            </div>
          )}
        </div>
      </div>

      {/* Stage Definitions (raw data) */}
      {pipeline.stage_definitions && pipeline.stage_definitions.length > 0 && !pipeline.stages?.length && (
        <div className="card">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Stage Definitions (Raw)</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(pipeline.stage_definitions, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
