import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Target, AlertCircle, ChevronRight, Plus, Trash2 } from 'lucide-react';

const ANALYZER_V2_URL = process.env.NEXT_PUBLIC_ANALYZER_V2_URL || 'https://analyzer-v2.onrender.com';

interface AnalysisObjective {
  objective_key: string;
  objective_name: string;
  primary_goals: string[];
  quality_criteria: string[];
  preferred_engine_functions: string[];
  preferred_categories: string[];
  expected_deliverables: string[];
  baseline_workflow_key: string | null;
  preferred_views: string[];
  planner_strategy: string;
}

function ObjectiveCard({
  objective,
  onDelete,
  isDeleting,
}: {
  objective: AnalysisObjective;
  onDelete: (key: string) => void;
  isDeleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="card p-4 hover:shadow-md transition-shadow group relative">
      <Link
        href={`/objectives/${objective.objective_key}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${objective.objective_name}`}
      />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {objective.objective_name}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {objective.primary_goals.slice(0, 3).map((goal, i) => (
              <p key={i} className="text-sm text-gray-500 line-clamp-1">
                {goal}
              </p>
            ))}
            {objective.primary_goals.length > 3 && (
              <p className="text-xs text-gray-400">
                +{objective.primary_goals.length - 3} more goals
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {objective.preferred_engine_functions.map((fn) => (
              <span key={fn} className="badge bg-indigo-100 text-indigo-800 text-xs">
                {fn}
              </span>
            ))}
            {objective.preferred_categories.map((cat) => (
              <span key={cat} className="badge bg-gray-100 text-gray-700 text-xs">
                {cat}
              </span>
            ))}
            {objective.baseline_workflow_key && (
              <span className="badge bg-amber-100 text-amber-800 text-xs">
                baseline: {objective.baseline_workflow_key}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {objective.expected_deliverables.length} deliverables {objective.quality_criteria.length} quality criteria
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
          {showConfirm ? (
            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-md px-2 py-1">
              <span className="text-xs text-red-600 mr-1">Delete?</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(objective.objective_key);
                }}
                disabled={isDeleting}
                className="text-xs font-medium text-red-700 hover:text-red-900 px-1.5 py-0.5 rounded hover:bg-red-100"
              >
                {isDeleting ? '...' : 'Yes'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-red-50"
              title="Delete objective"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

export default function ObjectivesPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['objectives'],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives`);
      if (!res.ok) throw new Error('Failed to fetch objectives');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives/${key}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to delete objective');
      }
      return res.json();
    },
    onSuccess: (_data, key) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setFeedback({ type: 'success', message: `Objective "${key}" deleted.` });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', message: err.message });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load objectives
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis Objectives</h1>
          <p className="mt-1 text-gray-500">
            Goal definitions that drive adaptive pipeline composition
          </p>
        </div>
        <Link
          href="/objectives/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Objective
        </Link>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`px-4 py-2 rounded-md text-sm border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full mt-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.objectives?.map((obj: AnalysisObjective) => (
            <ObjectiveCard
              key={obj.objective_key}
              objective={obj}
              onDelete={(key) => deleteMutation.mutate(key)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {!isLoading && data?.objectives?.length === 0 && (
        <div className="card p-12 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No objectives defined</p>
          <Link
            href="/objectives/new"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create your first objective
          </Link>
        </div>
      )}
    </div>
  );
}
