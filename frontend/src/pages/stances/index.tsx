import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Info } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalyticalStanceType } from '@/types';
import clsx from 'clsx';

const positionColors: Record<string, string> = {
  early: 'bg-sky-50 text-sky-700 border-sky-200',
  middle: 'bg-amber-50 text-amber-700 border-amber-200',
  late: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  any: 'bg-gray-50 text-gray-600 border-gray-200',
};

const stanceAccentColors: Record<string, string> = {
  discovery: 'border-l-sky-400',
  inference: 'border-l-violet-400',
  confrontation: 'border-l-rose-400',
  architecture: 'border-l-amber-400',
  integration: 'border-l-emerald-400',
  reflection: 'border-l-slate-400',
};

function StanceCard({ stance }: { stance: AnalyticalStanceType }) {
  const firstParagraph = stance.stance.split('\n\n')[0].trim();

  return (
    <Link
      href={`/stances/${stance.key}`}
      className={clsx(
        'card p-5 hover:shadow-md transition-shadow group border-l-4',
        stanceAccentColors[stance.key] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900">{stance.name}</h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                positionColors[stance.typical_position] || positionColors.any
              )}
            >
              {stance.typical_position}
            </span>
          </div>

          <p className="text-sm font-medium text-gray-500 italic mb-3">
            {stance.cognitive_mode}
          </p>

          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {firstParagraph}
          </p>

          {stance.pairs_well_with.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-xs text-gray-400">pairs with</span>
              {stance.pairs_well_with.map((key) => (
                <span
                  key={key}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function StancesPage() {
  const { data: stances, isLoading, error } = useQuery({
    queryKey: ['stances-full'],
    queryFn: () => api.stances.listFull(),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load stances from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytical Stances</h1>
        <p className="mt-1 text-gray-500">
          {stances?.length ?? 0} cognitive postures for multi-pass analysis
        </p>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-indigo-50 border-indigo-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-medium">Cognitive Postures, Not Output Templates</p>
            <p className="mt-1 text-indigo-600">
              Stances describe HOW the LLM should think in a given pass &mdash; discovery mode vs.
              confrontation mode vs. integration mode. The output is always connected analytical prose.
              The stance guides the cognitive approach.
            </p>
          </div>
        </div>
      </div>

      {/* Position Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Typical position:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" /> early
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> middle
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> late
        </span>
      </div>

      {/* Stances Grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse border-l-4 border-l-gray-200">
              <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-5/6 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {stances?.map((stance) => (
            <StanceCard key={stance.key} stance={stance} />
          ))}
        </div>
      )}
    </div>
  );
}
