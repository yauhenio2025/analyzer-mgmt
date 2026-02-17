import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, Check, Minus, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { CoverageMatrix, OperationalizationSummary } from '@/types';
import clsx from 'clsx';

const stanceColors: Record<string, string> = {
  discovery: 'bg-sky-500',
  inference: 'bg-violet-500',
  confrontation: 'bg-rose-500',
  architecture: 'bg-amber-500',
  integration: 'bg-emerald-500',
  reflection: 'bg-slate-500',
  dialectical: 'bg-teal-500',
};

const stanceBorderColors: Record<string, string> = {
  discovery: 'border-sky-300',
  inference: 'border-violet-300',
  confrontation: 'border-rose-300',
  architecture: 'border-amber-300',
  integration: 'border-emerald-300',
  reflection: 'border-slate-300',
  dialectical: 'border-teal-300',
};

export default function OperationalizationsPage() {
  const { data: summaries, isLoading: loadingSummaries, error: summariesError } = useQuery({
    queryKey: ['operationalizations'],
    queryFn: () => api.operationalizations.list(),
  });

  const { data: coverage, isLoading: loadingCoverage, error: coverageError } = useQuery({
    queryKey: ['operationalizations-coverage'],
    queryFn: () => api.operationalizations.getCoverage(),
  });

  const isLoading = loadingSummaries || loadingCoverage;
  const error = summariesError || coverageError;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Failed to load operationalizations</h3>
            <p className="text-sm text-red-600 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  const allStances = coverage?.all_stance_keys || [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operationalizations</h1>
        <p className="text-sm text-gray-500 mt-1">
          How each analytical stance applies to each engine. The bridge between abstract cognitive postures and concrete analytical work.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{summaries?.length || 0}</div>
          <div className="text-sm text-gray-500">Engines with operationalizations</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{allStances.length}</div>
          <div className="text-sm text-gray-500">Unique stances in use</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">
            {summaries?.reduce((sum, s) => sum + s.stance_count, 0) || 0}
          </div>
          <div className="text-sm text-gray-500">Total operationalizations</div>
        </div>
      </div>

      {/* Coverage Grid */}
      {coverage && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Coverage Matrix</h2>
            <p className="text-xs text-gray-500 mt-0.5">Engine x Stance coverage. Click an engine to view its operationalizations.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 sticky left-0 bg-white z-10 min-w-[200px]">
                    Engine
                  </th>
                  {allStances.map((stance) => (
                    <th
                      key={stance}
                      className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3 min-w-[90px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className={clsx('w-2.5 h-2.5 rounded-full', stanceColors[stance] || 'bg-gray-400')} />
                        <span>{stance}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                    Depths
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coverage.engines.map((engine) => {
                  const summary = summaries?.find((s) => s.engine_key === engine.engine_key);
                  return (
                    <tr key={engine.engine_key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <Link
                          href={`/operationalizations/${engine.engine_key}`}
                          className="group flex items-center gap-2"
                        >
                          <span className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                            {engine.engine_name}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                        </Link>
                      </td>
                      {allStances.map((stance) => {
                        const hasStance = engine.stance_keys.includes(stance);
                        return (
                          <td key={stance} className="text-center px-3 py-3">
                            {hasStance ? (
                              <div className={clsx(
                                'inline-flex items-center justify-center w-7 h-7 rounded-md border',
                                stanceBorderColors[stance] || 'border-gray-200',
                                'bg-opacity-10',
                              )}>
                                <Check className="h-4 w-4 text-gray-700" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-md">
                                <Minus className="h-3.5 w-3.5 text-gray-300" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {summary?.depth_keys.map((dk) => (
                            <span
                              key={dk}
                              className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded"
                            >
                              {dk}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Engine List (card view) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Engines</h2>
        <div className="grid gap-3">
          {summaries?.map((summary) => (
            <Link
              key={summary.engine_key}
              href={`/operationalizations/${summary.engine_key}`}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {summary.engine_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500">
                      {summary.stance_count} stances
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      {summary.depth_count} depths
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      {summary.stance_keys.map((sk) => (
                        <div
                          key={sk}
                          className={clsx('w-2 h-2 rounded-full', stanceColors[sk] || 'bg-gray-400')}
                          title={sk}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
