import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  FileJson,
  Layers,
  Network,
  RefreshCw,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AnalysisResultManifest,
  ConceptAnalysisArtifactLookup,
  DecisionTraceEntry,
  EffectiveManifestView,
  EffectivePresentationManifest,
  ExecutorJobSummary,
  PagePresentation,
  PresentationDecisionTrace,
  PresentationStatusResponse,
  RunDetail,
  RuntimeConsumerSummary,
  VariantSelectionRecord,
  VariantTargetResponse,
  VariantSetResponse,
  ViewPayload,
} from '@/types';

type TabKey = 'summary' | 'manifest' | 'decision-trace' | 'page-structure' | 'steering' | 'result-boundary';

const DEFAULT_CONSUMER_KEY = 'the-critic';

const tabs: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'summary', label: 'Summary', icon: BookOpen },
  { key: 'manifest', label: 'Manifest', icon: Layers },
  { key: 'decision-trace', label: 'Decision Trace', icon: Brain },
  { key: 'page-structure', label: 'Page Structure', icon: Network },
  { key: 'steering', label: 'The-Critic Steering', icon: SlidersHorizontal },
  { key: 'result-boundary', label: 'Result Boundary', icon: Shield },
];

function formatDateTime(value?: string | null) {
  if (!value) return '---';
  return new Date(value).toLocaleString();
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function summarizeStructuredData(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return Object.keys(value as Record<string, unknown>);
}

function sortConsumers(consumers: RuntimeConsumerSummary[]) {
  return [...consumers].sort((a, b) => {
    if (a.consumer_key === DEFAULT_CONSUMER_KEY) return -1;
    if (b.consumer_key === DEFAULT_CONSUMER_KEY) return 1;
    return a.consumer_name.localeCompare(b.consumer_name);
  });
}

function resolveRuntimeStyleSchool(
  status?: PresentationStatusResponse,
  page?: PagePresentation,
  manifest?: EffectivePresentationManifest
) {
  return status?.style_school || page?.style_school || manifest?.style_school || '';
}

function resolveRuntimePolishState(
  status?: PresentationStatusResponse,
  page?: PagePresentation,
  manifest?: EffectivePresentationManifest
) {
  return status?.polish_state || page?.polish_state || manifest?.polish_state || 'raw';
}

function runtimeStylingSummary(
  status?: PresentationStatusResponse,
  page?: PagePresentation,
  manifest?: EffectivePresentationManifest
) {
  const styleSchool = resolveRuntimeStyleSchool(status, page, manifest);
  const polishState = resolveRuntimePolishState(status, page, manifest);

  if (!styleSchool) {
    return { label: 'semantic-only', tone: 'gray' as const };
  }
  if (polishState === 'polished') {
    return { label: 'delivery-polished', tone: 'green' as const };
  }
  if (polishState === 'partial') {
    return { label: 'partially polished', tone: 'amber' as const };
  }
  return { label: 'activated / no cached polish applied', tone: 'blue' as const };
}

function getPhase2CandidateViews(
  views: EffectiveManifestView[],
  targetResponse?: VariantTargetResponse
) {
  const targetKeys = new Set(targetResponse?.view_keys || []);
  return views.filter((view) => targetKeys.has(view.view_key));
}

function variantPatchSummary(variant: VariantSetResponse['variants'][number]) {
  const sectionRenderers = (variant.renderer_config.section_renderers || {}) as Record<string, unknown>;
  const patchedSections = Object.entries(sectionRenderers)
    .map(([sectionKey, spec]) => {
      if (!spec || typeof spec !== 'object') {
        return sectionKey;
      }
      const rendererType = (spec as Record<string, unknown>).renderer_type;
      return rendererType ? `${sectionKey} -> ${String(rendererType)}` : sectionKey;
    });

  return patchedSections.length > 0 ? patchedSections.join(', ') : null;
}

function variantDifferenceSummary(
  currentView: EffectiveManifestView | undefined,
  variant: VariantSetResponse['variants'][number]
) {
  const parts: string[] = [];
  if (currentView && currentView.renderer_type !== variant.renderer_type) {
    parts.push(`${currentView.renderer_type} -> ${variant.renderer_type}`);
  }
  const patchSummary = variantPatchSummary(variant);
  if (patchSummary) {
    parts.push(`Section patch: ${patchSummary}`);
  }
  if (parts.length === 0) {
    parts.push('Matches current canonical renderer contract');
  }
  return parts.join(' | ');
}

function InfoBadge({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode;
  tone?: 'gray' | 'green' | 'amber' | 'blue' | 'purple' | 'red';
}) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={clsx('badge text-xs px-2 py-0.5', tones[tone])}>{children}</span>;
}

function ExpandableCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'green'
      : status === 'running'
      ? 'amber'
      : status === 'failed' || status === 'cancelled'
      ? 'red'
      : 'gray';
  return <InfoBadge tone={tone}>{status}</InfoBadge>;
}

function RuntimeSummaryTab({
  job,
  status,
  page,
  manifest,
  trace,
  consumer,
}: {
  job: ExecutorJobSummary;
  status?: PresentationStatusResponse;
  page?: PagePresentation;
  manifest?: EffectivePresentationManifest;
  trace?: PresentationDecisionTrace;
  consumer?: RuntimeConsumerSummary;
}) {
  const ignoredCount = trace?.entries.reduce((sum, entry) => sum + entry.ignored_changes.length, 0) || 0;
  const changeCount = trace?.entries.reduce((sum, entry) => sum + entry.applied_changes.length, 0) || 0;
  const styleSchool = resolveRuntimeStyleSchool(status, page, manifest);
  const styling = runtimeStylingSummary(status, page, manifest);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Execution</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <JobStatusBadge status={job.status} />
            <InfoBadge tone={status?.artifacts_ready ? 'green' : 'amber'}>
              artifacts {status?.artifacts_ready ? 'ready' : 'pending'}
            </InfoBadge>
            <InfoBadge>{job.workflow_key}</InfoBadge>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Created: {formatDateTime(job.created_at)}</p>
            <p>Started: {formatDateTime(job.started_at)}</p>
            <p>Completed: {formatDateTime(job.completed_at)}</p>
            <p>LLM calls: {job.total_llm_calls}</p>
          </div>
          {job.progress?.detail && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{job.progress.detail}</p>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Presenter Runtime</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <InfoBadge tone="blue">{consumer?.consumer_name || status?.consumer_key || DEFAULT_CONSUMER_KEY}</InfoBadge>
            {manifest?.resolver_version && <InfoBadge tone="purple">{manifest.resolver_version}</InfoBadge>}
            <InfoBadge tone={styling.tone}>{styling.label}</InfoBadge>
            <InfoBadge tone={styleSchool ? 'purple' : 'gray'}>
              style {styleSchool || '---'}
            </InfoBadge>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Prepared at: {formatDateTime(status?.prepared_at || manifest?.prepared_at)}</p>
            <p>Ready views: {status?.ready ?? 0} / {status?.total ?? 0}</p>
            <p>Manifest views: {manifest?.view_count ?? 0}</p>
            <p>Trace changes: {changeCount}</p>
            <p>Ignored changes: {ignoredCount}</p>
            <p>Delivery styling: {styling.label}</p>
            <p>Resolved school: {styleSchool || '---'}</p>
          </div>
          {status?.preparation && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Preparation</p>
              <p>Status: {status.preparation.status}</p>
              {status.preparation.detail && <p>{status.preparation.detail}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Current Consumer</h2>
        {consumer ? (
          <>
            <p className="text-sm text-gray-600">{consumer.description || 'No consumer description provided.'}</p>
            <div className="flex flex-wrap gap-2">
              <InfoBadge tone="blue">{consumer.supported_renderers.length} renderers</InfoBadge>
              <InfoBadge tone="purple">{consumer.supported_sub_renderers.length} sub-renderers</InfoBadge>
              <InfoBadge>{consumer.consumer_type}</InfoBadge>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Consumer metadata unavailable.</p>
        )}
      </div>
    </div>
  );
}

function ManifestTab({ manifest }: { manifest: EffectivePresentationManifest }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <InfoBadge tone={manifest.artifacts_ready ? 'green' : 'amber'}>
            {manifest.artifacts_ready ? 'artifacts ready' : 'artifacts incomplete'}
          </InfoBadge>
          <InfoBadge>{manifest.consumer_key}</InfoBadge>
          <InfoBadge tone="purple">{manifest.resolver_version}</InfoBadge>
        </div>
        <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
          <p>Prepared at: {formatDateTime(manifest.prepared_at)}</p>
          <p>Views: {manifest.view_count}</p>
          <p>Presentation hash: <span className="font-mono text-xs">{manifest.presentation_hash.slice(0, 16)}...</span></p>
          <p>Content hash: <span className="font-mono text-xs">{manifest.presentation_content_hash.slice(0, 16)}...</span></p>
        </div>
      </div>

      <div className="card p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-600">View</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Renderer</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Selection</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Parent</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Structuring</th>
              <th className="text-left py-2 font-medium text-gray-600">Derivation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {manifest.views.map((view) => (
              <tr key={view.view_key}>
                <td className="py-2 pr-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{view.view_key}</span>
                    <span className="text-xs text-gray-500">{view.view_name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <InfoBadge tone="blue">{view.renderer_type}</InfoBadge>
                    {view.presentation_stance && <InfoBadge>{view.presentation_stance}</InfoBadge>}
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <InfoBadge>{view.selection_priority}</InfoBadge>
                    {view.promoted_to_top_level && <InfoBadge tone="green">promoted</InfoBadge>}
                  </div>
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {view.display_parent_view_key || view.source_parent_view_key || '---'}
                </td>
                <td className="py-2 pr-4 text-gray-600">{view.structuring_policy || '---'}</td>
                <td className="py-2 text-gray-600">{view.derivation_kind || '---'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DecisionTraceTab({ trace }: { trace: PresentationDecisionTrace }) {
  return (
    <div className="space-y-4">
      {trace.entries.map((entry: DecisionTraceEntry, index) => (
        <ExpandableCard
          key={`${entry.stage}-${index}`}
          title={`${entry.stage} · ${entry.applied_changes.length} changes · ${entry.ignored_changes.length} ignored`}
          defaultOpen={index === trace.entries.length - 1}
        >
          <div className="space-y-4">
            {entry.reason && <p className="text-sm text-gray-700">{entry.reason}</p>}

            {entry.applied_changes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Applied Changes</h3>
                <div className="space-y-2">
                  {entry.applied_changes.map((change, changeIndex) => (
                    <div key={`${change.view_key}-${change.field}-${changeIndex}`} className="rounded-lg bg-green-50 p-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <InfoBadge tone="green">{change.view_key}</InfoBadge>
                        <InfoBadge>{change.field}</InfoBadge>
                      </div>
                      <p className="text-gray-700">{change.reason || 'No explicit reason recorded.'}</p>
                      <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                        before: {formatJson(change.before)}
                        {'\n'}
                        after: {formatJson(change.after)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.ignored_changes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Ignored Changes</h3>
                <div className="space-y-2">
                  {entry.ignored_changes.map((change, changeIndex) => (
                    <div key={`${change.view_key}-${change.field}-${changeIndex}`} className="rounded-lg bg-amber-50 p-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <InfoBadge tone="amber">{change.view_key}</InfoBadge>
                        <InfoBadge>{change.field}</InfoBadge>
                      </div>
                      <p className="text-gray-700">{change.reason || 'No explicit reason recorded.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-800">
                Snapshot ({entry.snapshot.length} views)
              </summary>
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                {formatJson(entry.snapshot)}
              </pre>
            </details>
          </div>
        </ExpandableCard>
      ))}
    </div>
  );
}

function ViewTreeNode({
  view,
  selectedViewKey,
  onSelect,
  depth = 0,
}: {
  view: ViewPayload;
  selectedViewKey: string | null;
  onSelect: (viewKey: string) => void;
  depth?: number;
}) {
  const isSelected = selectedViewKey === view.view_key;
  return (
    <div className="space-y-2">
      <button
        onClick={() => onSelect(view.view_key)}
        className={clsx(
          'w-full rounded-lg border p-3 text-left transition-colors',
          isSelected
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        )}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{view.view_key}</span>
              <InfoBadge tone="blue">{view.renderer_type}</InfoBadge>
              {view.selection_priority && <InfoBadge>{view.selection_priority}</InfoBadge>}
            </div>
            <p className="mt-1 text-xs text-gray-500">{view.view_name}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {view.has_structured_data && <InfoBadge tone="green">structured</InfoBadge>}
            {view.children.length > 0 && <InfoBadge tone="purple">{view.children.length} children</InfoBadge>}
          </div>
        </div>
      </button>

      {view.children.map((child) => (
        <ViewTreeNode
          key={child.view_key}
          view={child}
          selectedViewKey={selectedViewKey}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function PageStructureTab({
  page,
  selectedViewKey,
  onSelectView,
  selectedView,
  selectedViewLoading,
}: {
  page: PagePresentation;
  selectedViewKey: string | null;
  onSelectView: (viewKey: string) => void;
  selectedView?: ViewPayload;
  selectedViewLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] gap-6">
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">View Tree</h2>
            <p className="text-sm text-gray-500">Slim page payload for the current consumer.</p>
          </div>
          <InfoBadge tone={page.artifacts_ready ? 'green' : 'amber'}>
            {page.view_count} views
          </InfoBadge>
        </div>
        <div className="space-y-2">
          {page.views.map((view) => (
            <ViewTreeNode
              key={view.view_key}
              view={view}
              selectedViewKey={selectedViewKey}
              onSelect={onSelectView}
            />
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">View Detail</h2>
        {selectedViewLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        )}
        {!selectedViewLoading && !selectedView && (
          <p className="text-sm text-gray-500">Select a view from the page tree.</p>
        )}
        {!selectedViewLoading && selectedView && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <InfoBadge tone="blue">{selectedView.renderer_type}</InfoBadge>
              {selectedView.presentation_stance && <InfoBadge>{selectedView.presentation_stance}</InfoBadge>}
              {selectedView.structuring_policy && <InfoBadge tone="purple">{selectedView.structuring_policy}</InfoBadge>}
              {selectedView.derivation_kind && <InfoBadge tone="amber">{selectedView.derivation_kind}</InfoBadge>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-900">View:</span> {selectedView.view_name}</p>
              <p><span className="font-medium text-gray-900">Priority:</span> {selectedView.selection_priority || selectedView.priority}</p>
              <p><span className="font-medium text-gray-900">Navigation:</span> {selectedView.navigation_state || '---'}</p>
              <p><span className="font-medium text-gray-900">Parent:</span> {selectedView.source_parent_view_key || '---'}</p>
              <p><span className="font-medium text-gray-900">Structured data:</span> {selectedView.has_structured_data ? 'yes' : 'no'}</p>
            </div>

            {selectedView.description && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {selectedView.description}
              </div>
            )}

            <ExpandableCard title="Renderer Config">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                {formatJson(selectedView.renderer_config)}
              </pre>
            </ExpandableCard>

            <ExpandableCard
              title={`Structured Data${summarizeStructuredData(selectedView.structured_data)?.length ? ` · ${summarizeStructuredData(selectedView.structured_data)?.length} keys` : ''}`}
              defaultOpen
            >
              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                {formatJson(selectedView.structured_data)}
              </pre>
            </ExpandableCard>

            {selectedView.reading_scaffold && (
              <ExpandableCard title="Reading Scaffold">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                  {formatJson(selectedView.reading_scaffold)}
                </pre>
              </ExpandableCard>
            )}

            {(selectedView.items || selectedView.raw_prose) && (
              <ExpandableCard title="Raw Payload Details">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                  {formatJson({
                    item_count: selectedView.items?.length || 0,
                    items: selectedView.items,
                    raw_prose: selectedView.raw_prose,
                    prose_ref_view_key: selectedView.prose_ref_view_key,
                  })}
                </pre>
              </ExpandableCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TheCriticSteeringTab({
  jobId,
  consumerKey,
  manifest,
}: {
  jobId: string;
  consumerKey: string;
  manifest?: EffectivePresentationManifest;
}) {
  const queryClient = useQueryClient();
  const [selectedViewKey, setSelectedViewKey] = useState<string | null>(null);
  const [activeVariantSetId, setActiveVariantSetId] = useState<string | null>(null);
  const { data: variantTargets } = useQuery({
    queryKey: ['variant-targets'],
    queryFn: api.presentationVariants.listTargets,
  });

  const candidateViews = manifest ? getPhase2CandidateViews(manifest.views, variantTargets) : [];
  const selectedManifestView = candidateViews.find((view) => view.view_key === selectedViewKey) || candidateViews[0];

  useEffect(() => {
    if (!selectedManifestView && candidateViews.length === 0) {
      setSelectedViewKey(null);
      return;
    }
    if (!selectedViewKey || !candidateViews.some((view) => view.view_key === selectedViewKey)) {
      setSelectedViewKey(candidateViews[0]?.view_key || null);
    }
  }, [candidateViews, selectedManifestView, selectedViewKey]);

  const isSteeringDisabled = consumerKey !== DEFAULT_CONSUMER_KEY;

  const {
    data: variantSets,
    isLoading: setsLoading,
  } = useQuery({
    queryKey: ['variant-sets', jobId, selectedManifestView?.view_key],
    queryFn: () => api.presentationVariants.listSets(jobId, selectedManifestView!.view_key),
    enabled: !!selectedManifestView && !isSteeringDisabled,
  });

  const { data: selections } = useQuery({
    queryKey: ['variant-selection', jobId, selectedManifestView?.view_key],
    queryFn: () => api.presentationVariants.getSelection(jobId, selectedManifestView!.view_key),
    enabled: !!selectedManifestView && !isSteeringDisabled,
  });

  useEffect(() => {
    if (!variantSets || variantSets.length === 0) {
      setActiveVariantSetId(null);
      return;
    }
    if (!activeVariantSetId || !variantSets.some((variantSet) => variantSet.variant_set_id === activeVariantSetId)) {
      setActiveVariantSetId(variantSets[0].variant_set_id);
    }
  }, [activeVariantSetId, variantSets]);

  const generateMutation = useMutation({
    mutationFn: (dimension: 'renderer_type' | 'sub_renderer_strategy') =>
      api.presentationVariants.generate({
        job_id: jobId,
        view_key: selectedManifestView!.view_key,
        dimension,
        max_variants: 3,
      }),
    onSuccess: async (data) => {
      setActiveVariantSetId(data.variant_set_id);
      await queryClient.invalidateQueries({ queryKey: ['variant-sets', jobId, selectedManifestView?.view_key] });
    },
  });

  const selectMutation = useMutation({
    mutationFn: (params: { variantSetId: string; variantId: string }) =>
      api.presentationVariants.select({
        variant_set_id: params.variantSetId,
        variant_id: params.variantId,
        job_id: jobId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['variant-selection', jobId, selectedManifestView?.view_key] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-manifest', jobId, DEFAULT_CONSUMER_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-trace', jobId, DEFAULT_CONSUMER_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-page', jobId, DEFAULT_CONSUMER_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-status', jobId, DEFAULT_CONSUMER_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-view', jobId, DEFAULT_CONSUMER_KEY] }),
      ]);
    },
  });

  if (isSteeringDisabled) {
    return (
      <div className="card p-6 border border-amber-200 bg-amber-50">
        <h2 className="text-lg font-semibold text-amber-900 mb-2">The-Critic Steering</h2>
        <p className="text-sm text-amber-900">
          Steering actions are only available for <span className="font-semibold">the-critic</span>.
          Selections are stored per job, not per consumer, so this page can still show how the currently selected state is revalidated and adapted for {consumerKey}, but new selection actions belong to the-critic.
        </p>
      </div>
    );
  }

  if (!manifest || candidateViews.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-sm text-gray-500">No bounded steering targets are present in the current manifest.</p>
      </div>
    );
  }

  const activeVariantSet = variantSets?.find((variantSet) => variantSet.variant_set_id === activeVariantSetId) || variantSets?.[0];
  const selectionByDimension = new Map<string, VariantSelectionRecord>();
  (selections || []).forEach((selection) => {
    if (!selectionByDimension.has(selection.dimension)) {
      selectionByDimension.set(selection.dimension, selection);
    }
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
      <div className="card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Target Views</h2>
          <p className="text-sm text-gray-500">Bounded to the existing Phase 2 steering target set.</p>
        </div>
        <div className="space-y-2">
          {candidateViews.map((view) => (
            <button
              key={view.view_key}
              onClick={() => setSelectedViewKey(view.view_key)}
              className={clsx(
                'w-full rounded-lg border p-3 text-left transition-colors',
                selectedManifestView?.view_key === view.view_key
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{view.view_key}</span>
                <InfoBadge tone="blue">{view.renderer_type}</InfoBadge>
              </div>
              <p className="mt-1 text-xs text-gray-500">{view.view_name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedManifestView?.view_key}</h2>
              <p className="text-sm text-gray-500">{selectedManifestView?.view_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generateMutation.mutate('renderer_type')}
                disabled={generateMutation.isPending || !selectedManifestView}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Generate renderer variants
              </button>
              <button
                onClick={() => generateMutation.mutate('sub_renderer_strategy')}
                disabled={generateMutation.isPending || !selectedManifestView}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Generate sub-renderer variants
              </button>
            </div>
          </div>

          {generateMutation.error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {(generateMutation.error as Error).message}
            </div>
          )}

          {selectionByDimension.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(selectionByDimension.entries()).map(([dimension, selection]) => (
                <InfoBadge key={dimension} tone="green">
                  {dimension}: {selection.selected_variant_id}
                </InfoBadge>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Variant Sets</h3>
          {setsLoading && <p className="text-sm text-gray-500">Loading variants…</p>}
          {!setsLoading && (!variantSets || variantSets.length === 0) && (
            <p className="text-sm text-gray-500">No generated variants for this view yet.</p>
          )}
          {variantSets && variantSets.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {variantSets.map((variantSet) => (
                  <button
                    key={variantSet.variant_set_id}
                    onClick={() => setActiveVariantSetId(variantSet.variant_set_id)}
                    className={clsx(
                      'rounded-lg border px-3 py-2 text-sm',
                      activeVariantSet?.variant_set_id === variantSet.variant_set_id
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {variantSet.dimension} · {variantSet.variant_count} variants
                  </button>
                ))}
              </div>

              {activeVariantSet && (
                <div className="space-y-3">
                  {Boolean(activeVariantSet.metadata.reason) && (
                    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      Generation note: {String(activeVariantSet.metadata.reason)}
                    </div>
                  )}
                  {activeVariantSet.variants.map((variant) => {
                    const activeSelection = selectionByDimension.get(activeVariantSet.dimension);
                    const isSelected = activeSelection?.selected_variant_id === variant.variant_id;
                    return (
                      <div
                        key={variant.variant_id}
                        className={clsx(
                          'rounded-lg border p-4',
                          isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {variant.is_control && <InfoBadge>control</InfoBadge>}
                              <InfoBadge tone="blue">{variant.renderer_type}</InfoBadge>
                              <InfoBadge tone="purple">score {variant.compatibility_score}</InfoBadge>
                              {isSelected && <InfoBadge tone="green">selected</InfoBadge>}
                            </div>
                            <p className="text-sm text-gray-700">{variant.rationale || 'No rationale recorded.'}</p>
                            <p className="text-xs text-gray-500">
                              {variantDifferenceSummary(selectedManifestView, variant)}
                            </p>
                          </div>
                          <button
                            onClick={() => selectMutation.mutate({
                              variantSetId: activeVariantSet.variant_set_id,
                              variantId: variant.variant_id,
                            })}
                            disabled={selectMutation.isPending || isSelected}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function resultStateTone(state: string): 'green' | 'amber' | 'blue' | 'red' | 'gray' {
  switch (state) {
    case 'ready': return 'green';
    case 'stale': return 'amber';
    case 'preparing': return 'blue';
    case 'failed': return 'red';
    default: return 'gray';
  }
}

function conceptArtifactLaggingState(
  conceptArtifact: ConceptAnalysisArtifactLookup | undefined,
  run?: RunDetail,
  manifest?: AnalysisResultManifest
) {
  if (!conceptArtifact || conceptArtifact.contract_validation_status !== 'passed') {
    return false;
  }

  const runLagging = !!run && run.result_state !== 'ready';
  const manifestLagging = !!manifest && (manifest.result_state !== 'ready' || !manifest.artifacts_ready);

  return runLagging || manifestLagging;
}

function ConceptArtifactAuthorityCard({
  conceptArtifact,
}: {
  conceptArtifact: ConceptAnalysisArtifactLookup;
}) {
  const validationErrors = conceptArtifact.validation_errors || [];

  return (
    <div className="card p-5 space-y-4 border border-indigo-200 bg-indigo-50/40">
      <div className="flex items-center gap-2 flex-wrap">
        <InfoBadge tone="purple">concept artifact</InfoBadge>
        <InfoBadge tone={conceptArtifact.contract_validation_status === 'passed' ? 'green' : 'red'}>
          validation {conceptArtifact.contract_validation_status}
        </InfoBadge>
        <InfoBadge tone="blue">{conceptArtifact.analysis_mode}</InfoBadge>
        <InfoBadge tone={conceptArtifact.lookup_mode === 'exact_run' ? 'green' : 'amber'}>
          lookup {conceptArtifact.lookup_mode}
        </InfoBadge>
      </div>

      <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
        <p><span className="font-medium text-gray-900">Consumer:</span> {conceptArtifact.consumer_key}</p>
        <p><span className="font-medium text-gray-900">Concept:</span> {conceptArtifact.concept_name}</p>
        <p><span className="font-medium text-gray-900">Project:</span> {conceptArtifact.external_project_id}</p>
        <p><span className="font-medium text-gray-900">Analyzer job:</span> <span className="font-mono text-xs">{conceptArtifact.analyzer_v2_job_id}</span></p>
        <p><span className="font-medium text-gray-900">Workflow:</span> {conceptArtifact.workflow_key}</p>
        <p><span className="font-medium text-gray-900">Engine/Chain:</span> {conceptArtifact.engine_or_chain_key}</p>
        <p><span className="font-medium text-gray-900">Depth:</span> {conceptArtifact.depth}</p>
        <p><span className="font-medium text-gray-900">Produced:</span> {formatDateTime(conceptArtifact.produced_at)}</p>
        <p>
          <span className="font-medium text-gray-900">Transformation:</span>{' '}
          <Link
            href={`/transformations/${conceptArtifact.translation_template_key}`}
            className="text-indigo-600 hover:underline"
          >
            {conceptArtifact.translation_template_key}
          </Link>
        </p>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationErrors.join(' | ')}
        </div>
      )}

      <ExpandableCard title="Translated Host Artifact">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
          {formatJson(conceptArtifact.translated_artifact)}
        </pre>
      </ExpandableCard>
    </div>
  );
}

function ResultBoundaryTab({
  job,
  jobId,
  consumerKey,
}: {
  job: ExecutorJobSummary;
  jobId: string;
  consumerKey: string;
}) {
  const queryClient = useQueryClient();

  const {
    data: resultManifest,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['result-boundary', jobId, consumerKey],
    queryFn: () => api.resultBoundary.getManifest(jobId, consumerKey),
  });

  const {
    data: runDetail,
    isLoading: runLoading,
    error: runError,
  } = useQuery({
    queryKey: ['run-boundary', jobId, consumerKey],
    queryFn: () => api.runBoundary.getRun(jobId, consumerKey),
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.resultBoundary.refreshPresentation(jobId, consumerKey),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['result-boundary', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['run-boundary', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-status', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-manifest', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-trace', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-page', jobId, consumerKey] }),
        queryClient.invalidateQueries({ queryKey: ['presenter-view', jobId, consumerKey] }),
      ]);
    },
  });

  const run = runDetail;
  const workflowKey = resultManifest?.workflow_key || job.workflow_key || null;
  const conceptContext = job.analysis_context || null;
  const conceptArtifactEnabled =
    job.status === 'completed' &&
    !!conceptContext?.consumer_key &&
    !!conceptContext?.external_project_id &&
    !!conceptContext?.concept_name &&
    !!conceptContext?.analysis_mode;

  const {
    data: workflow,
    error: workflowError,
  } = useQuery({
    queryKey: ['workflow', workflowKey],
    queryFn: () => api.workflows.get(workflowKey!),
    enabled: !!workflowKey,
  });

  const {
    data: linkedTransformations,
    error: transformationsError,
  } = useQuery({
    queryKey: ['workflow-linked-transformations', workflowKey, workflow?.linked_transformation_keys],
    queryFn: async () => Promise.all(
      (workflow?.linked_transformation_keys || []).map((templateKey) =>
        api.transformations.get(templateKey)
      )
    ),
    enabled: (workflow?.linked_transformation_keys?.length ?? 0) > 0,
  });

  const {
    data: conceptArtifact,
    isLoading: conceptArtifactLoading,
    error: conceptArtifactError,
  } = useQuery({
    queryKey: [
      'concept-translated-artifact',
      job.job_id,
      conceptContext?.consumer_key,
      conceptContext?.external_project_id,
      conceptContext?.concept_name,
      conceptContext?.analysis_mode,
    ],
    queryFn: () =>
      api.resultBoundary.getConceptArtifact({
        consumerKey: conceptContext!.consumer_key,
        externalProjectId: conceptContext!.external_project_id,
        conceptName: conceptContext!.concept_name,
        analysisMode: conceptContext!.analysis_mode,
        analyzerV2JobId: job.job_id,
      }),
    enabled: conceptArtifactEnabled,
  });

  const showConceptArtifactLagNote = conceptArtifactLaggingState(conceptArtifact, run, resultManifest);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {conceptArtifactEnabled && conceptArtifactLoading && (
          <div className="card p-5 border border-blue-200 bg-blue-50 text-sm text-blue-800">
            Loading translated concept artifact authority from analyzer-v2. This fetch is separate from generic Result Boundary state.
          </div>
        )}
        {conceptContext && conceptArtifact && (
          <ConceptArtifactAuthorityCard conceptArtifact={conceptArtifact} />
        )}
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !resultManifest) {
    return (
      <div className="space-y-6">
        {conceptContext && conceptArtifact && (
          <ConceptArtifactAuthorityCard conceptArtifact={conceptArtifact} />
        )}

        {conceptContext && conceptArtifactError && job.status === 'completed' && (
          <div className="card p-5 border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            Could not load translated concept artifact: {(conceptArtifactError as Error).message}
          </div>
        )}

        <div className="card p-6 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 text-gray-500">
            <Shield className="h-8 w-8 text-gray-300" />
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Result boundary unavailable</h2>
              <p className="text-sm text-gray-500 mt-1">
                {error ? (error as Error).message : 'No result manifest found for this job.'}
              </p>
              {conceptContext && (
                <p className="text-xs text-gray-500 mt-2">
                  Concept artifact authority is queried separately from generic presenter/result state.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rm = resultManifest;

  return (
    <div className="space-y-6">
      {run && (
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <InfoBadge tone={resultStateTone(run.status)}>
                  run {run.status || 'unknown'}
                </InfoBadge>
                <InfoBadge tone={resultStateTone(run.result_state)}>
                  result {run.result_state || 'unknown'}
                </InfoBadge>
                <InfoBadge tone={run.restore_available ? 'green' : 'gray'}>
                  restore {run.restore_available ? 'available' : 'unavailable'}
                </InfoBadge>
                <InfoBadge tone={run.presentation_active ? 'green' : 'gray'}>
                  preparation {run.presentation_active ? 'active' : 'idle'}
                </InfoBadge>
              </div>

              <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <p><span className="font-medium text-gray-900">Current phase:</span> {run.progress?.current_phase ?? '---'} / {run.progress?.total_phases ?? '---'}</p>
                <p><span className="font-medium text-gray-900">Phase name:</span> {run.progress?.phase_name || '---'}</p>
                <p><span className="font-medium text-gray-900">Pass alias:</span> {run.progress?.current_pass ?? '---'} / {run.progress?.total_passes ?? '---'}</p>
                <p><span className="font-medium text-gray-900">Presentation status:</span> {run.presentation_status || '---'}</p>
                <p><span className="font-medium text-gray-900">Created:</span> {formatDateTime(run.created_at || null)}</p>
                <p><span className="font-medium text-gray-900">Completed:</span> {formatDateTime(run.completed_at || null)}</p>
                <p><span className="font-medium text-gray-900">Restore reason:</span> {run.restore_reason || '---'}</p>
                <p><span className="font-medium text-gray-900">Source thinker:</span> {run.selected_source_thinker_name || run.selected_source_thinker_id || '---'}</p>
              </div>

              {run.progress?.detail && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{run.progress.detail}</p>
              )}
            </div>
          </div>
          {run.links && (
            <div className="text-sm text-gray-600 space-y-1">
              {run.links.result_url && <p><span className="font-medium text-gray-900">Result:</span> <span className="font-mono text-xs break-all">{run.links.result_url}</span></p>}
              {run.links.presentation_url && <p><span className="font-medium text-gray-900">Presentation:</span> <span className="font-mono text-xs break-all">{run.links.presentation_url}</span></p>}
            </div>
          )}
        </div>
      )}

      {runError && !runLoading && (
        <div className="card p-5 border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Could not load run-boundary state: {(runError as Error).message}
        </div>
      )}

      {conceptContext && conceptArtifact && (
        <ConceptArtifactAuthorityCard conceptArtifact={conceptArtifact} />
      )}

      {conceptArtifactEnabled && conceptArtifactLoading && !conceptArtifact && !conceptArtifactError && (
        <div className="card p-5 border border-blue-200 bg-blue-50 text-sm text-blue-800">
          Loading translated concept artifact authority from analyzer-v2. Generic Result Boundary state may lag this concept-specific authority check.
        </div>
      )}

      {conceptContext && conceptArtifactError && job.status === 'completed' && (
        <div className="card p-5 border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Could not load translated concept artifact: {(conceptArtifactError as Error).message}
        </div>
      )}

      {showConceptArtifactLagNote && (
        <div className="card p-5 border border-purple-200 bg-purple-50 text-sm text-purple-800">
          Concept artifact authority is already validated from analyzer-v2 even though generic Result Boundary state is still lagging.
          For admitted concept jobs, treat the concept artifact card as the operator truth.
        </div>
      )}

      {/* Header card: state + key metadata */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <InfoBadge tone={resultStateTone(rm.result_state)}>
                {rm.result_state || 'unknown'}
              </InfoBadge>
              <InfoBadge tone={rm.artifacts_ready ? 'green' : 'amber'}>
                artifacts {rm.artifacts_ready ? 'ready' : 'pending'}
              </InfoBadge>
              <InfoBadge tone={rm.presentation_active ? 'green' : 'gray'}>
                presentation {rm.presentation_active ? 'active' : 'inactive'}
              </InfoBadge>
              <InfoBadge tone={rm.restore_available ? 'green' : 'gray'}>
                restore {rm.restore_available ? 'available' : 'unavailable'}
              </InfoBadge>
            </div>

            <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <p><span className="font-medium text-gray-900">Result ID:</span> <span className="font-mono text-xs">{rm.result_id || '---'}</span></p>
              <p><span className="font-medium text-gray-900">Consumer:</span> {rm.consumer_key}</p>
              <p>
                <span className="font-medium text-gray-900">Workflow:</span>{' '}
                {workflowKey ? (
                  <Link href={`/implementations/${workflowKey}`} className="text-indigo-600 hover:underline">
                    {workflowKey}
                  </Link>
                ) : (
                  '---'
                )}
              </p>
              <p><span className="font-medium text-gray-900">Status:</span> {rm.status || '---'}</p>
              <p><span className="font-medium text-gray-900">Presentation status:</span> {rm.presentation_status || '---'}</p>
              <p><span className="font-medium text-gray-900">Contract version:</span> {rm.presentation_contract_version}</p>
              <p><span className="font-medium text-gray-900">Prepared at:</span> {formatDateTime(rm.prepared_at || null)}</p>
              <p><span className="font-medium text-gray-900">Corpus ref:</span> {rm.corpus_ref || '---'}</p>
            </div>

            {linkedTransformations && linkedTransformations.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-sm font-medium text-gray-900">Linked Transformations</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {linkedTransformations.map((template) => (
                    <Link
                      key={template.template_key}
                      href={`/transformations/${template.template_key}`}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      {template.template_key}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(workflowError || transformationsError) && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                Could not load full workflow linkage for this result boundary.
              </p>
            )}

            {rm.preparation_detail && (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{rm.preparation_detail}</p>
            )}
          </div>

          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={clsx('h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
            Refresh Presentation
          </button>
        </div>

        {refreshMutation.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {(refreshMutation.error as Error).message}
          </div>
        )}

        {refreshMutation.isSuccess && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            Presentation refreshed successfully.
          </div>
        )}
      </div>

      {/* Restore reason */}
      {rm.restore_reason && rm.restore_reason !== 'not_prepared' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Restore Reason</h3>
          <p className="text-sm text-gray-700">{rm.restore_reason}</p>
        </div>
      )}

      {/* Staleness reasons */}
      {rm.staleness_reasons.length > 0 && (
        <div className="card p-5 border border-amber-200 bg-amber-50">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Staleness Reasons ({rm.staleness_reasons.length})
          </h3>
          <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
            {rm.staleness_reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Product warnings */}
      {rm.product_warnings.length > 0 && (
        <div className="card p-5 border border-red-200 bg-red-50">
          <h3 className="text-sm font-semibold text-red-900 mb-2">
            Product Warnings ({rm.product_warnings.length})
          </h3>
          <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
            {rm.product_warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Artifact families table */}
      {rm.artifact_families.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Artifact Families ({rm.artifact_families.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Family</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">State</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Format</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">Ready</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">Pending</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">Stale</th>
                  <th className="text-right py-2 font-medium text-gray-600">Unavailable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rm.artifact_families.map((family) => (
                  <tr key={family.artifact_family}>
                    <td className="py-2 pr-4 font-medium text-gray-900">{family.artifact_family}</td>
                    <td className="py-2 pr-4">
                      <InfoBadge tone={resultStateTone(family.state)}>
                        {family.state}
                      </InfoBadge>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{family.format}</td>
                    <td className="py-2 pr-4 text-right text-green-700 font-medium">{family.ready_slots}</td>
                    <td className="py-2 pr-4 text-right text-blue-700 font-medium">{family.pending_slots}</td>
                    <td className="py-2 pr-4 text-right text-amber-700 font-medium">{family.stale_slots}</td>
                    <td className="py-2 text-right text-gray-500 font-medium">{family.unavailable_slots}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rm.artifact_families.length === 0 && (
        <div className="card p-5 text-center text-gray-500">
          No artifact families reported.
        </div>
      )}

      {/* Hashes */}
      <ExpandableCard title="Hashes & Links">
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-900">Presentation hash:</span> <span className="font-mono text-xs">{rm.presentation_hash || '---'}</span></p>
          <p><span className="font-medium text-gray-900">Content hash:</span> <span className="font-mono text-xs">{rm.presentation_content_hash || '---'}</span></p>
          {rm.links && (
            <div className="mt-3 space-y-1">
              {rm.links.page_url && <p><span className="font-medium text-gray-900">Page:</span> <span className="font-mono text-xs break-all">{rm.links.page_url}</span></p>}
              {rm.links.presentation_url && <p><span className="font-medium text-gray-900">Presentation:</span> <span className="font-mono text-xs break-all">{rm.links.presentation_url}</span></p>}
              {rm.links.manifest_url && <p><span className="font-medium text-gray-900">Manifest:</span> <span className="font-mono text-xs break-all">{rm.links.manifest_url}</span></p>}
              {rm.links.trace_url && <p><span className="font-medium text-gray-900">Trace:</span> <span className="font-mono text-xs break-all">{rm.links.trace_url}</span></p>}
            </div>
          )}
        </div>
      </ExpandableCard>
    </div>
  );
}

export default function JobPresentationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawId = router.query.id;
  const jobId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [consumerKey, setConsumerKey] = useState(DEFAULT_CONSUMER_KEY);
  const [selectedViewKey, setSelectedViewKey] = useState<string | null>(null);

  const {
    data: runtimeConsumers,
    isLoading: consumersLoading,
  } = useQuery({
    queryKey: ['runtime-consumers'],
    queryFn: api.runtimeConsumers.list,
  });

  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
  } = useQuery({
    queryKey: ['executor-job', jobId],
    queryFn: () => api.executorJobs.get(jobId!),
    enabled: !!jobId,
  });

  const {
    data: presenterStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['presenter-status', jobId, consumerKey],
    queryFn: () => api.presenter.getStatus(jobId!, consumerKey),
    enabled: !!jobId,
  });

  const {
    data: manifest,
    isLoading: manifestLoading,
    error: manifestError,
  } = useQuery({
    queryKey: ['presenter-manifest', jobId, consumerKey],
    queryFn: () => api.presenter.getManifest(jobId!, { consumerKey, slim: true }),
    enabled: !!jobId,
  });

  const {
    data: trace,
    isLoading: traceLoading,
    error: traceError,
  } = useQuery({
    queryKey: ['presenter-trace', jobId, consumerKey],
    queryFn: () => api.presenter.getTrace(jobId!, consumerKey),
    enabled: !!jobId,
  });

  const {
    data: page,
    isLoading: pageLoading,
    error: pageError,
  } = useQuery({
    queryKey: ['presenter-page', jobId, consumerKey],
    queryFn: () => api.presenter.getPage(jobId!, { consumerKey, slim: true }),
    enabled: !!jobId,
  });

  useEffect(() => {
    if (!page?.views.length) return;
    if (!selectedViewKey) {
      setSelectedViewKey(page.views[0].view_key);
      return;
    }
    const stack = [...page.views];
    let found = false;
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.view_key === selectedViewKey) {
        found = true;
        break;
      }
      stack.push(...current.children);
    }
    if (!found) {
      setSelectedViewKey(page.views[0].view_key);
    }
  }, [page, selectedViewKey]);

  const {
    data: selectedView,
    isLoading: selectedViewLoading,
  } = useQuery({
    queryKey: ['presenter-view', jobId, consumerKey, selectedViewKey],
    queryFn: () => api.presenter.getView(jobId!, selectedViewKey!, consumerKey),
    enabled: !!jobId && !!selectedViewKey && activeTab === 'page-structure',
  });

  const selectedConsumer = sortConsumers(runtimeConsumers || []).find(
    (consumer) => consumer.consumer_key === consumerKey
  );

  const refreshArtifacts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['presenter-status', jobId, consumerKey] }),
      queryClient.invalidateQueries({ queryKey: ['presenter-manifest', jobId, consumerKey] }),
      queryClient.invalidateQueries({ queryKey: ['presenter-trace', jobId, consumerKey] }),
      queryClient.invalidateQueries({ queryKey: ['presenter-page', jobId, consumerKey] }),
      queryClient.invalidateQueries({ queryKey: ['presenter-view', jobId, consumerKey] }),
      queryClient.invalidateQueries({ queryKey: ['result-boundary', jobId, consumerKey] }),
    ]);
  };

  if (jobError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load job
      </div>
    );
  }

  if (jobLoading || !job) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  const artifactError = statusError || manifestError || traceError || pageError;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/plans/${job.plan_id}`}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{job.job_id}</h1>
            <JobStatusBadge status={job.status} />
            {manifest?.artifacts_ready && <InfoBadge tone="green">presenter ready</InfoBadge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Link href={`/plans/${job.plan_id}`} className="text-indigo-600 hover:underline">
              {job.plan_id}
            </Link>
            <span className="text-gray-300">|</span>
            <Link href={`/implementations/${job.workflow_key}`} className="text-indigo-600 hover:underline">
              {job.workflow_key}
            </Link>
            <span className="text-gray-300">|</span>
            <span>{formatDateTime(job.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="consumer-switcher" className="text-sm font-medium text-gray-600">
            Consumer
          </label>
          <select
            id="consumer-switcher"
            value={consumerKey}
            onChange={(event) => setConsumerKey(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            disabled={consumersLoading}
          >
            {sortConsumers(runtimeConsumers || []).map((consumer) => (
              <option key={consumer.consumer_key} value={consumer.consumer_key}>
                {consumer.consumer_name}
              </option>
            ))}
            {!runtimeConsumers?.length && (
              <option value={DEFAULT_CONSUMER_KEY}>{DEFAULT_CONSUMER_KEY}</option>
            )}
          </select>
          <button
            onClick={refreshArtifacts}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href={`/jobs/${job.job_id}/console`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700"
          >
            Run console
          </Link>
        </div>
      </div>

      {artifactError && (
        <div className="card p-5 border border-red-200 bg-red-50 text-red-700">
          {(artifactError as Error).message}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.key === 'steering' && consumerKey !== DEFAULT_CONSUMER_KEY;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {disabled && <InfoBadge tone="amber">read-only</InfoBadge>}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'summary' && (
        <RuntimeSummaryTab
          job={job}
          status={presenterStatus}
          page={page}
          manifest={manifest}
          trace={trace}
          consumer={selectedConsumer}
        />
      )}

      {activeTab === 'manifest' && manifest && <ManifestTab manifest={manifest} />}

      {activeTab === 'decision-trace' && trace && <DecisionTraceTab trace={trace} />}

      {activeTab === 'page-structure' && page && (
        <PageStructureTab
          page={page}
          selectedViewKey={selectedViewKey}
          onSelectView={setSelectedViewKey}
          selectedView={selectedView}
          selectedViewLoading={selectedViewLoading}
        />
      )}

      {activeTab === 'steering' && (
        <TheCriticSteeringTab
          jobId={job.job_id}
          consumerKey={consumerKey}
          manifest={manifest}
        />
      )}

      {activeTab === 'result-boundary' && (
        <ResultBoundaryTab
          job={job}
          jobId={job.job_id}
          consumerKey={consumerKey}
        />
      )}

      {(statusLoading || manifestLoading || traceLoading || pageLoading) && activeTab !== 'summary' && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      )}

      {activeTab === 'manifest' && !manifest && !manifestLoading && !manifestError && (
        <div className="card p-8 text-center text-gray-500">
          <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          Manifest unavailable for this job and consumer.
        </div>
      )}

      {activeTab === 'decision-trace' && !trace && !traceLoading && !traceError && (
        <div className="card p-8 text-center text-gray-500">
          <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          Decision trace unavailable for this job and consumer.
        </div>
      )}

      {activeTab === 'page-structure' && !page && !pageLoading && !pageError && (
        <div className="card p-8 text-center text-gray-500">
          <Network className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          Page structure unavailable for this job and consumer.
        </div>
      )}

      <div className="card p-5">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-800 flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Raw runtime snapshot
          </summary>
          <pre className="mt-4 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
            {formatJson({
              job,
              consumer: selectedConsumer,
              presenterStatus,
              manifest,
              trace,
              page,
            })}
          </pre>
        </details>
      </div>
    </div>
  );
}
