import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Save,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { EngineOperationalization, StanceOperationalization, DepthSequence } from '@/types';
import clsx from 'clsx';
import { useState } from 'react';

const stanceColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  discovery: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' },
  inference: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  confrontation: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  architecture: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  integration: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  reflection: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
  dialectical: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
};

const defaultColors = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' };

function StanceCard({ op, engineKey }: { op: StanceOperationalization; engineKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const colors = stanceColors[op.stance_key] || defaultColors;

  const loadPreview = async () => {
    if (previewContent) {
      setPreviewOpen(!previewOpen);
      return;
    }
    setLoadingPreview(true);
    try {
      const result = await api.operationalizations.composePreview(engineKey, 'deep', 1);
      setPreviewContent(result.prompt);
      setPreviewOpen(true);
    } catch {
      setPreviewContent('Failed to load preview');
      setPreviewOpen(true);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Split description into paragraphs
  const paragraphs = op.description.split('\n\n').filter(Boolean);
  const firstParagraph = paragraphs[0] || '';
  const hasMore = paragraphs.length > 1;

  return (
    <div className={clsx('rounded-lg border-l-4 bg-white shadow-sm', colors.border)}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={clsx('w-3 h-3 rounded-full', colors.dot)} />
            <div>
              <h3 className="text-base font-semibold text-gray-900">{op.label}</h3>
              <span className={clsx('text-xs font-medium', colors.text)}>{op.stance_key}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-3 text-sm text-gray-600 leading-relaxed">
          <p>{firstParagraph}</p>
          {hasMore && expanded && (
            <div className="mt-2 space-y-2">
              {paragraphs.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Show less' : `${paragraphs.length - 1} more paragraph${paragraphs.length > 2 ? 's' : ''}`}
          </button>
        )}

        {/* Focus badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {op.focus_dimensions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Dims</span>
              {op.focus_dimensions.map((d) => (
                <span key={d} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
        {op.focus_capabilities.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Caps</span>
            {op.focus_capabilities.map((c) => (
              <span key={c} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-md">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DepthSequenceView({ seq, ops }: { seq: DepthSequence; ops: StanceOperationalization[] }) {
  const depthLabels: Record<string, string> = {
    surface: 'Surface',
    standard: 'Standard',
    deep: 'Deep',
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">{depthLabels[seq.depth_key] || seq.depth_key}</h4>
      <div className="flex items-start gap-2">
        {seq.passes.map((pass, idx) => {
          const stanceOp = ops.find((o) => o.stance_key === pass.stance_key);
          const colors = stanceColors[pass.stance_key] || defaultColors;
          return (
            <div key={pass.pass_number} className="flex items-start gap-2">
              {/* Pass node */}
              <div
                className={clsx(
                  'rounded-lg border px-3 py-2 min-w-[120px]',
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={clsx('w-2 h-2 rounded-full', colors.dot)} />
                  <span className="text-xs font-bold text-gray-800">Pass {pass.pass_number}</span>
                </div>
                <div className={clsx('text-xs font-medium', colors.text)}>
                  {pass.stance_key}
                </div>
                {stanceOp && (
                  <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[140px]" title={stanceOp.label}>
                    {stanceOp.label}
                  </div>
                )}
                {pass.consumes_from.length > 0 && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    from: {pass.consumes_from.join(', ')}
                  </div>
                )}
              </div>
              {/* Connector arrow */}
              {idx < seq.passes.length - 1 && (
                <div className="flex items-center pt-4">
                  <div className="w-4 h-px bg-gray-300" />
                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-gray-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OperationalizationDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: op, isLoading, error } = useQuery({
    queryKey: ['operationalization', key],
    queryFn: () => api.operationalizations.get(key as string),
    enabled: !!key,
  });

  if (isLoading || !key) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
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
            <h3 className="font-medium text-red-800">Failed to load operationalization</h3>
            <p className="text-sm text-red-600 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!op) return null;

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await api.operationalizations.generateAll(key as string);
      queryClient.invalidateQueries({ queryKey: ['operationalization', key] });
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/operationalizations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          All Operationalizations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{op.engine_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {op.stance_operationalizations.length} stance operationalizations &middot;{' '}
              {op.depth_sequences.length} depth sequences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/engines/${op.engine_key}`}
              className="btn btn-sm btn-secondary"
            >
              View Engine
            </Link>
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              className="btn btn-sm btn-primary flex items-center gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Regenerate All'}
            </button>
          </div>
        </div>
      </div>

      {/* Depth Sequences */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Depth Sequences</h2>
        <div className="space-y-6">
          {op.depth_sequences
            .sort((a, b) => {
              const order = ['surface', 'standard', 'deep'];
              return order.indexOf(a.depth_key) - order.indexOf(b.depth_key);
            })
            .map((seq) => (
              <DepthSequenceView
                key={seq.depth_key}
                seq={seq}
                ops={op.stance_operationalizations}
              />
            ))}
        </div>
      </div>

      {/* Stance Operationalizations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stance Operationalizations</h2>
        <div className="grid gap-4">
          {op.stance_operationalizations.map((stanceOp) => (
            <StanceCard
              key={stanceOp.stance_key}
              op={stanceOp}
              engineKey={op.engine_key}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
