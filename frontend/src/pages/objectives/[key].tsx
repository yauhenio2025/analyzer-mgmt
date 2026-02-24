import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Target,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Eye,
  Workflow,
  Sparkles,
} from 'lucide-react';

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

export default function ObjectiveDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data, isLoading, error } = useQuery({
    queryKey: ['objective', key],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives/${key}`);
      if (!res.ok) throw new Error('Failed to fetch objective');
      return res.json() as Promise<AnalysisObjective>;
    },
    enabled: !!key,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load objective
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/objectives"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {data.objective_name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Key: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{data.objective_key}</code>
            {data.baseline_workflow_key && (
              <>
                {' • '}Baseline:{' '}
                <Link
                  href={`/workflows/${data.baseline_workflow_key}`}
                  className="text-indigo-600 hover:underline"
                >
                  {data.baseline_workflow_key}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {data.preferred_engine_functions.map((fn) => (
          <span key={fn} className="badge bg-indigo-100 text-indigo-800 text-sm px-3 py-1">
            function: {fn}
          </span>
        ))}
        {data.preferred_categories.map((cat) => (
          <span key={cat} className="badge bg-gray-100 text-gray-700 text-sm px-3 py-1">
            category: {cat}
          </span>
        ))}
      </div>

      {/* Primary Goals */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Primary Goals
        </h2>
        <ol className="space-y-2">
          {data.primary_goals.map((goal, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                {i + 1}
              </span>
              {goal}
            </li>
          ))}
        </ol>
      </div>

      {/* Quality Criteria */}
      {data.quality_criteria.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Quality Criteria
          </h2>
          <ul className="space-y-2">
            {data.quality_criteria.map((criterion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Deliverables */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-amber-500" />
          Expected Deliverables
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.expected_deliverables.map((deliverable, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
              {deliverable}
            </li>
          ))}
        </ul>
      </div>

      {/* Preferred Views */}
      {data.preferred_views.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-blue-500" />
            Preferred Views
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.preferred_views.map((view) => (
              <Link
                key={view}
                href={`/views?search=${view}`}
                className="badge bg-blue-100 text-blue-800 text-sm px-3 py-1 hover:bg-blue-200 transition-colors"
              >
                {view}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Planner Strategy */}
      {data.planner_strategy && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Workflow className="h-5 w-5 text-purple-500" />
            Planner Strategy
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm font-mono">
              {data.planner_strategy}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
