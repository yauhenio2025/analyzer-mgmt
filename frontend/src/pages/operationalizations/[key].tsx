import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  Loader2,
  GripVertical,
  Plus,
  X,
  RotateCcw,
  Check,
  Code2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  EngineOperationalization,
  StanceOperationalization,
  DepthSequence,
  DepthPassEntry,
  StanceSummaryType,
} from '@/types';
import clsx from 'clsx';
import { useState, useRef, useCallback, useEffect } from 'react';

const stanceColors: Record<string, { bg: string; border: string; text: string; dot: string; ring: string }> = {
  discovery: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500', ring: 'ring-sky-300' },
  inference: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', ring: 'ring-violet-300' },
  confrontation: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'ring-rose-300' },
  architecture: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-300' },
  integration: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-300' },
  reflection: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500', ring: 'ring-slate-300' },
  dialectical: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500', ring: 'ring-teal-300' },
};

const defaultColors = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500', ring: 'ring-gray-300' };

// ============================================================================
// Stance Card with Generate + Preview buttons
// ============================================================================

function StanceCard({
  op,
  engineKey,
  onGenerate,
  generating,
}: {
  op: StanceOperationalization;
  engineKey: string;
  onGenerate: (stanceKey: string) => void;
  generating: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const colors = stanceColors[op.stance_key] || defaultColors;
  const isGenerating = generating === op.stance_key;

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
          <div className="flex items-center gap-1.5">
            {/* Compose Preview button */}
            <button
              onClick={loadPreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Preview composed prompt"
            >
              {loadingPreview ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : previewOpen ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Code2 className="h-3 w-3" />
              )}
              Preview
            </button>
            {/* Generate button */}
            <button
              onClick={() => onGenerate(op.stance_key)}
              disabled={isGenerating}
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                isGenerating
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
              )}
              title="Regenerate this stance operationalization with AI"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
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

        {/* Compose Preview panel */}
        {previewOpen && previewContent && (
          <div className="mt-4 rounded-md bg-gray-900 text-gray-100 p-4 text-xs font-mono leading-relaxed max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Composed Prompt Preview</span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{previewContent}</pre>
          </div>
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

// ============================================================================
// Draggable Depth Sequence Editor
// ============================================================================

function DepthSequenceEditor({
  seq,
  ops,
  allStances,
  onUpdate,
  dirty,
}: {
  seq: DepthSequence;
  ops: StanceOperationalization[];
  allStances: StanceSummaryType[];
  onUpdate: (updated: DepthSequence) => void;
  dirty: boolean;
}) {
  const depthLabels: Record<string, { label: string; description: string }> = {
    surface: { label: 'Surface', description: 'Quick scan — 1-2 passes' },
    standard: { label: 'Standard', description: 'Balanced analysis — 2-3 passes' },
    deep: { label: 'Deep', description: 'Exhaustive — 3-5 passes' },
  };

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newPasses = [...seq.passes];
    const [removed] = newPasses.splice(dragIdx, 1);
    newPasses.splice(dropIdx, 0, removed);

    // Renumber passes and fix consumes_from
    const renumbered = newPasses.map((p, i) => ({
      ...p,
      pass_number: i + 1,
      consumes_from: p.consumes_from
        .map((fromNum) => {
          // Find the original pass that was referenced
          const origIdx = seq.passes.findIndex((op) => op.pass_number === fromNum);
          if (origIdx === -1) return -1;
          // Find where it ended up
          const newIdx = newPasses.findIndex((np) => np === seq.passes[origIdx]);
          return newIdx + 1;
        })
        .filter((n) => n > 0 && n < i + 1), // Only consume from earlier passes
    }));

    onUpdate({ ...seq, passes: renumbered });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleRemovePass = (idx: number) => {
    const newPasses = seq.passes.filter((_, i) => i !== idx);
    // Renumber and fix consumes_from
    const renumbered = newPasses.map((p, i) => ({
      ...p,
      pass_number: i + 1,
      consumes_from: p.consumes_from
        .filter((n) => {
          const origPassIdx = seq.passes.findIndex((op) => op.pass_number === n);
          return origPassIdx !== idx && origPassIdx !== -1;
        })
        .map((n) => {
          const origPass = seq.passes.find((op) => op.pass_number === n);
          if (!origPass) return -1;
          const newIdx = newPasses.findIndex((np) => np.stance_key === origPass.stance_key);
          return newIdx + 1;
        })
        .filter((n) => n > 0 && n < i + 1),
    }));
    onUpdate({ ...seq, passes: renumbered });
  };

  const handleAddStance = (stanceKey: string) => {
    const newPassNumber = seq.passes.length + 1;
    const newPass: DepthPassEntry = {
      pass_number: newPassNumber,
      stance_key: stanceKey,
      consumes_from: newPassNumber > 1 ? [newPassNumber - 1] : [],
    };
    onUpdate({ ...seq, passes: [...seq.passes, newPass] });
    setShowAddMenu(false);
  };

  const meta = depthLabels[seq.depth_key] || { label: seq.depth_key, description: '' };
  const usedStanceKeys = seq.passes.map((p) => p.stance_key);

  // Available stances to add (all stances, not just unused — user may want duplicates)
  const availableStances = allStances;

  return (
    <div className={clsx('rounded-lg border p-4 transition-colors', dirty ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white')}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">{meta.label}</h4>
          <p className="text-[11px] text-gray-400">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{seq.passes.length} pass{seq.passes.length !== 1 ? 'es' : ''}</span>
          {dirty && <span className="text-[10px] text-amber-600 font-medium px-1.5 py-0.5 bg-amber-100 rounded">unsaved</span>}
        </div>
      </div>

      {/* Pass pipeline */}
      <div className="flex items-start gap-1.5 flex-wrap">
        {seq.passes.map((pass, idx) => {
          const stanceOp = ops.find((o) => o.stance_key === pass.stance_key);
          const colors = stanceColors[pass.stance_key] || defaultColors;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div key={`${pass.pass_number}-${pass.stance_key}`} className="flex items-start gap-1.5">
              {/* Pass node (draggable) */}
              <div
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className={clsx(
                  'rounded-lg border px-3 py-2 min-w-[130px] cursor-grab active:cursor-grabbing transition-all group relative',
                  colors.bg,
                  colors.border,
                  isDragging && 'opacity-40 scale-95',
                  isDragOver && `ring-2 ${colors.ring}`,
                )}
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemovePass(idx)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove pass"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <div className="flex items-center gap-1.5 mb-1">
                  <GripVertical className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <div className="flex items-center pt-4 flex-shrink-0">
                  <div className="w-3 h-px bg-gray-300" />
                  <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-gray-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Add stance button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 px-3 py-2 min-w-[80px] min-h-[60px] flex flex-col items-center justify-center gap-1 transition-colors"
            title="Add a stance pass"
          >
            <Plus className="h-4 w-4 text-gray-400" />
            <span className="text-[10px] text-gray-400">Add pass</span>
          </button>

          {/* Dropdown menu for adding stances */}
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium border-b border-gray-100">
                Add stance pass
              </div>
              {availableStances.map((stance) => {
                const colors = stanceColors[stance.key] || defaultColors;
                const alreadyUsed = usedStanceKeys.includes(stance.key);
                return (
                  <button
                    key={stance.key}
                    onClick={() => handleAddStance(stance.key)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <div className={clsx('w-2.5 h-2.5 rounded-full', colors.dot)} />
                    <span className="text-sm text-gray-700">{stance.name}</span>
                    {alreadyUsed && (
                      <span className="text-[10px] text-gray-400 ml-auto">in use</span>
                    )}
                  </button>
                );
              })}
              <div className="border-t border-gray-100 mt-1">
                <button
                  onClick={() => setShowAddMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function OperationalizationDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatingStance, setGeneratingStance] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable state — cloned from server data, tracks local changes
  const [editedSequences, setEditedSequences] = useState<DepthSequence[] | null>(null);
  const [dirtyDepths, setDirtyDepths] = useState<Set<string>>(new Set());

  const { data: op, isLoading, error } = useQuery({
    queryKey: ['operationalization', key],
    queryFn: () => api.operationalizations.get(key as string),
    enabled: !!key,
  });

  // Fetch all stances for the "add stance" dropdown
  const { data: allStances } = useQuery({
    queryKey: ['stances-list'],
    queryFn: () => api.stances.list(),
  });

  // Sync server data → editable state when data loads
  useEffect(() => {
    if (op && !editedSequences) {
      setEditedSequences([...op.depth_sequences]);
    }
  }, [op]);

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

  const sequences = editedSequences || op.depth_sequences;

  // Handle depth sequence update (from drag-and-drop or add/remove)
  const handleSequenceUpdate = (depthKey: string, updated: DepthSequence) => {
    setEditedSequences((prev) => {
      const current = prev || [...op.depth_sequences];
      return current.map((s) => (s.depth_key === depthKey ? updated : s));
    });
    setDirtyDepths((prev) => new Set(prev).add(depthKey));
  };

  // Save all dirty sequences
  const handleSave = async () => {
    if (!editedSequences || dirtyDepths.size === 0) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Save the full operationalization
      const updated: EngineOperationalization = {
        ...op,
        depth_sequences: editedSequences,
      };
      await api.operationalizations.update(key as string, updated);
      queryClient.invalidateQueries({ queryKey: ['operationalization', key] });
      setDirtyDepths(new Set());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save changes. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to server state
  const handleReset = () => {
    setEditedSequences([...op.depth_sequences]);
    setDirtyDepths(new Set());
  };

  // Generate all stances
  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await api.operationalizations.generateAll(key as string);
      queryClient.invalidateQueries({ queryKey: ['operationalization', key] });
      setEditedSequences(null); // Reset to let new data load
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Generate single stance
  const handleGenerateStance = async (stanceKey: string) => {
    setGeneratingStance(stanceKey);
    try {
      const result = await api.operationalizations.generate(key as string, stanceKey);
      // The result contains the generated operationalization — save it
      if (result.operationalization) {
        await api.operationalizations.updateStanceOp(key as string, stanceKey, result.operationalization);
        queryClient.invalidateQueries({ queryKey: ['operationalization', key] });
      }
    } catch (err) {
      console.error(`Generation failed for ${stanceKey}:`, err);
    } finally {
      setGeneratingStance(null);
    }
  };

  const hasDirtyChanges = dirtyDepths.size > 0;

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
            {/* Reset button (only when dirty) */}
            {hasDirtyChanges && (
              <button
                onClick={handleReset}
                className="btn btn-sm btn-secondary flex items-center gap-1.5"
                title="Discard changes"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!hasDirtyChanges || saving}
              className={clsx(
                'btn btn-sm flex items-center gap-1.5 transition-all',
                saveSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : hasDirtyChanges
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'btn-secondary opacity-50 cursor-not-allowed'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
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

      {/* Dirty changes banner */}
      {hasDirtyChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-800">
              You have unsaved changes to {dirtyDepths.size} depth sequence{dirtyDepths.size > 1 ? 's' : ''}.
              Drag passes to reorder, or click + to add new stances.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="text-xs text-amber-600 hover:text-amber-800 underline">
              Discard
            </button>
            <button
              onClick={handleSave}
              className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700"
            >
              Save Now
            </button>
          </div>
        </div>
      )}

      {/* Depth Sequences — Editable */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Depth Sequences</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag passes to reorder. Click + to add stances. Click x to remove.</p>
          </div>
        </div>
        <div className="space-y-4">
          {sequences
            .sort((a, b) => {
              const order = ['surface', 'standard', 'deep'];
              return order.indexOf(a.depth_key) - order.indexOf(b.depth_key);
            })
            .map((seq) => (
              <DepthSequenceEditor
                key={seq.depth_key}
                seq={seq}
                ops={op.stance_operationalizations}
                allStances={allStances || []}
                onUpdate={(updated) => handleSequenceUpdate(seq.depth_key, updated)}
                dirty={dirtyDepths.has(seq.depth_key)}
              />
            ))}
        </div>
      </div>

      {/* Stance Operationalizations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Stance Operationalizations</h2>
          <span className="text-xs text-gray-400">Click Generate to regenerate a specific stance with AI</span>
        </div>
        <div className="grid gap-4">
          {op.stance_operationalizations.map((stanceOp) => (
            <StanceCard
              key={stanceOp.stance_key}
              op={stanceOp}
              engineKey={op.engine_key}
              onGenerate={handleGenerateStance}
              generating={generatingStance}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
