import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Route, GitMerge, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { ProcessSpine } from '@/components/estate/ProcessSpine';
import { workflowCategoryClass, workflowOrganKey } from '@/components/estate/PhaseRail';

export default function ProcessDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const workflowKey = typeof key === 'string' ? key : null;

  const workflowQ = useQuery({
    queryKey: ['workflow', workflowKey],
    queryFn: () => api.workflows.get(workflowKey as string),
    enabled: !!workflowKey,
  });
  const organsQ = useQuery({ queryKey: ['organs'], queryFn: () => api.organs.list() });

  if (!workflowKey || workflowQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const workflow = workflowQ.data;
  if (workflowQ.error || !workflow) {
    return (
      <div className="space-y-6">
        <Link href="/processes" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Processes
        </Link>
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Process not found
        </div>
      </div>
    );
  }

  const organKey = workflowOrganKey(workflow);
  const organ = organsQ.data?.find((o) => o.organ_key === organKey);
  const phases = workflow.phases ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/processes" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Processes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Route className="h-8 w-8 text-violet-500 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{workflow.workflow_name}</h1>
              <p className="font-mono text-sm text-gray-500">{workflow.workflow_key}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={clsx('badge', workflowCategoryClass(workflow.category))}>
                  {workflow.category?.replace('_', ' ')}
                </span>
                <span className="badge badge-gray">{phases.length} phases</span>
                <span className="badge badge-gray">v{workflow.version}</span>
                <span className="text-sm text-gray-500">
                  runs in{' '}
                  <Link href={`/organs/${organKey}`} className="font-medium text-primary-600 hover:underline">
                    {organ?.organ_name ?? organKey}
                  </Link>
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/workflows/${workflow.workflow_key}`}
            className="btn-secondary text-sm"
            title="Prompt preview, dependency graph and chain expansion"
          >
            <GitMerge className="h-4 w-4 mr-1.5" />
            Workflow view
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-gray-800">{workflow.description}</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {workflow.required_inputs?.length > 0 && (
            <div>
              <div className="label">Required inputs</div>
              <div className="flex flex-wrap gap-1">
                {workflow.required_inputs.map((i) => (
                  <span key={i} className="badge text-xs bg-red-50 text-red-700 border border-red-200">{i}</span>
                ))}
              </div>
            </div>
          )}
          {workflow.optional_inputs?.length > 0 && (
            <div>
              <div className="label">Optional inputs</div>
              <div className="flex flex-wrap gap-1">
                {workflow.optional_inputs.map((i) => (
                  <span key={i} className="badge badge-gray text-xs">{i}</span>
                ))}
              </div>
            </div>
          )}
          {workflow.output_description && (
            <div>
              <div className="label">Output</div>
              <p className="text-gray-600">{workflow.output_description}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Spine</h2>
        <p className="text-sm text-gray-500 mb-5">
          {phases.length} phases in order. A phase runs after the phases it depends on.
        </p>
        {phases.length > 0 ? (
          <ProcessSpine phases={phases} />
        ) : (
          <div className="card p-8 text-center text-sm text-gray-400">No phases recorded for this process.</div>
        )}
      </div>
    </div>
  );
}
