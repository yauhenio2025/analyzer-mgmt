import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, Loader2, AlertCircle, Play } from 'lucide-react';
import { api } from '@/lib/api';
import type { BranchProgressResponse } from '@/types';
import clsx from 'clsx';

interface BranchGenerationProgressProps {
  paradigmKey: string;
  onComplete?: () => void;
}

const LAYER_LABELS: Record<string, string> = {
  identity: 'Identity',
  foundational: 'Foundational',
  structural: 'Structural',
  dynamic: 'Dynamic',
  explanatory: 'Explanatory',
  traits: 'Traits',
  critique: 'Critique Patterns',
};

export default function BranchGenerationProgress({
  paradigmKey,
  onComplete,
}: BranchGenerationProgressProps) {
  const queryClient = useQueryClient();

  const { data: progress, isLoading, error } = useQuery({
    queryKey: ['branch-progress', paradigmKey],
    queryFn: () => api.paradigms.getBranchProgress(paradigmKey),
    refetchInterval: (data) => {
      // Poll while generating
      if (data?.state?.data?.generation_status === 'generating') {
        return 2000; // Poll every 2 seconds
      }
      return false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.paradigms.generateBranch(paradigmKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-progress', paradigmKey] });
      queryClient.invalidateQueries({ queryKey: ['paradigms', paradigmKey] });
    },
  });

  // Notify when complete
  useEffect(() => {
    if (progress?.generation_status === 'complete' && onComplete) {
      onComplete();
    }
  }, [progress?.generation_status, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load generation progress</span>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  // Group fields by layer
  const fieldsByLayer = progress.field_status.reduce((acc, field) => {
    if (!acc[field.layer]) {
      acc[field.layer] = [];
    }
    acc[field.layer].push(field);
    return acc;
  }, {} as Record<string, typeof progress.field_status>);

  const layers = Object.keys(fieldsByLayer);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            Generation Progress
          </h3>
          <StatusBadge status={progress.generation_status} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>
            {progress.progress.completed} of {progress.progress.total} fields
          </span>
          <span>{progress.progress.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={clsx(
              'h-2.5 rounded-full transition-all duration-500',
              progress.generation_status === 'complete'
                ? 'bg-green-500'
                : progress.generation_status === 'failed'
                ? 'bg-red-500'
                : 'bg-primary-500'
            )}
            style={{ width: `${progress.progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Layer progress */}
      <div className="divide-y">
        {layers.map((layer) => {
          const fields = fieldsByLayer[layer];
          const completedCount = fields.filter((f) => f.status === 'complete').length;
          const isCurrentLayer = progress.current_layer === layer;
          const isComplete = completedCount === fields.length;

          return (
            <div
              key={layer}
              className={clsx(
                'px-4 py-3',
                isCurrentLayer && 'bg-primary-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : isCurrentLayer ? (
                    <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                  <span
                    className={clsx(
                      'font-medium',
                      isComplete
                        ? 'text-green-700'
                        : isCurrentLayer
                        ? 'text-primary-700'
                        : 'text-gray-500'
                    )}
                  >
                    {LAYER_LABELS[layer] || layer}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {completedCount}/{fields.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start generation button (if not started) */}
      {progress.generation_status === 'generating' &&
        progress.progress.completed === 0 && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Generation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Generation
                </>
              )}
            </button>
          </div>
        )}

      {/* Completion message */}
      {progress.generation_status === 'complete' && (
        <div className="px-4 py-3 border-t bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Generation complete!</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {progress.generation_status === 'failed' && (
        <div className="px-4 py-3 border-t bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Generation failed</span>
          </div>
          {progress.branch_metadata?.generation_errors && (
            <div className="mt-2 text-sm text-red-600">
              {progress.branch_metadata.generation_errors.map((err, i) => (
                <div key={i}>
                  {err.field}: {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return (
        <span className="badge bg-green-100 text-green-700">Complete</span>
      );
    case 'generating':
      return (
        <span className="badge bg-primary-100 text-primary-700">
          Generating...
        </span>
      );
    case 'failed':
      return (
        <span className="badge bg-red-100 text-red-700">Failed</span>
      );
    default:
      return (
        <span className="badge bg-gray-100 text-gray-700">{status}</span>
      );
  }
}
