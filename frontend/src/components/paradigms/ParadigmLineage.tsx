import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, GitBranch, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { LineageItem, ParadigmSummary } from '@/types';
import clsx from 'clsx';

interface ParadigmLineageProps {
  paradigmKey: string;
  className?: string;
}

export default function ParadigmLineage({
  paradigmKey,
  className,
}: ParadigmLineageProps) {
  const { data: lineageData, isLoading: lineageLoading, error: lineageError } = useQuery({
    queryKey: ['paradigm-lineage', paradigmKey],
    queryFn: () => api.paradigms.getLineage(paradigmKey),
  });

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['paradigm-branches', paradigmKey],
    queryFn: () => api.paradigms.getBranches(paradigmKey),
  });

  const isLoading = lineageLoading || branchesLoading;

  if (isLoading) {
    return (
      <div className={clsx('flex items-center justify-center p-4', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (lineageError) {
    return (
      <div className={clsx('text-red-600 p-4', className)}>
        <AlertCircle className="h-5 w-5 inline mr-2" />
        Failed to load lineage
      </div>
    );
  }

  const lineage = lineageData?.lineage || [];
  const branches = branchesData?.branches || [];
  const hasParent = lineage.length > 1;
  const hasBranches = branches.length > 0;

  // If no parent and no branches, don't show the section
  if (!hasParent && !hasBranches) {
    return null;
  }

  // Reverse lineage so root is first
  const reversedLineage = [...lineage].reverse();

  return (
    <div className={clsx('card p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Paradigm Lineage</h3>
      </div>

      {/* Parent lineage (ancestors) */}
      {hasParent && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Ancestry</h4>
          <div className="flex items-center flex-wrap gap-1">
            {reversedLineage.map((item, index) => (
              <div key={item.paradigm_key} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                )}
                {item.paradigm_key === paradigmKey ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                    {item.paradigm_name}
                  </span>
                ) : (
                  <Link
                    href={`/paradigms/${item.paradigm_key}`}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    {item.paradigm_name}
                  </Link>
                )}
              </div>
            ))}
          </div>
          {lineage.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              Depth: {lineage[0].branch_depth} (root = 0)
            </p>
          )}
        </div>
      )}

      {/* Child branches */}
      {hasBranches && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Branches ({branches.length})
          </h4>
          <div className="space-y-2">
            {branches.map((branch) => (
              <BranchCard key={branch.paradigm_key} branch={branch} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCard({ branch }: { branch: ParadigmSummary }) {
  return (
    <Link
      href={`/paradigms/${branch.paradigm_key}`}
      className="block p-3 border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {branch.paradigm_name}
            </span>
            <GenerationStatusBadge status={branch.generation_status} />
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-1">
            {branch.description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </Link>
  );
}

function GenerationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return null; // Don't show badge for complete
    case 'generating':
      return (
        <span className="badge bg-primary-100 text-primary-700 text-xs">
          Generating...
        </span>
      );
    case 'failed':
      return (
        <span className="badge bg-red-100 text-red-700 text-xs">
          Failed
        </span>
      );
    default:
      return null;
  }
}
