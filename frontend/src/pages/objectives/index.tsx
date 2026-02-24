import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Target, AlertCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

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

function ObjectiveCard({ objective }: { objective: AnalysisObjective }) {
  return (
    <Link
      href={`/objectives/${objective.objective_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
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
                • {goal}
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
            {objective.expected_deliverables.length} deliverables • {objective.quality_criteria.length} quality criteria
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function ObjectivesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['objectives'],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives`);
      if (!res.ok) throw new Error('Failed to fetch objectives');
      return res.json();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analysis Objectives</h1>
        <p className="mt-1 text-gray-500">
          Goal definitions that drive adaptive pipeline composition
        </p>
      </div>

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
            <ObjectiveCard key={obj.objective_key} objective={obj} />
          ))}
        </div>
      )}

      {!isLoading && data?.objectives?.length === 0 && (
        <div className="card p-12 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No objectives defined</p>
        </div>
      )}
    </div>
  );
}
