import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Trash2,
  Plus,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SubRendererDefinition } from '@/types';
import clsx from 'clsx';

// ============================================================================
// Tab Types & Component
// ============================================================================

type TabId = 'identity' | 'data_shapes' | 'parents_stances' | 'config' | 'preview';

const TABS: { id: TabId; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'data_shapes', label: 'Data Shapes' },
  { id: 'parents_stances', label: 'Parents & Stances' },
  { id: 'config', label: 'Config Schema' },
  { id: 'preview', label: 'Preview' },
];

function Tab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
        active
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded-full font-mono">
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Reusable Field Components
// ============================================================================

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  readOnly = false,
  mono = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx('input min-h-[80px]', mono && 'font-mono text-sm')}
          rows={rows}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx('input', mono && 'font-mono text-sm', readOnly && 'bg-gray-50')}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

function TagEditor({
  label,
  tags,
  onChange,
  chipColor = 'bg-indigo-50 text-indigo-700',
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  chipColor?: string;
}) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded', chipColor)}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          className="input flex-1"
          placeholder="Add..."
        />
        <button type="button" onClick={addTag} className="btn-secondary text-sm">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function JsonEditor({
  label,
  value,
  onChange,
  rows = 8,
  description,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  rows?: number;
  description?: string;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2) || '{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2) || '{}');
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setJsonError(null);
      onChange(parsed);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <div>
      <label className="label">
        {label}
        {jsonError && (
          <span className="ml-2 text-red-500 text-xs font-normal">{jsonError}</span>
        )}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mb-1">{description}</p>
      )}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className={clsx('input font-mono text-sm min-h-[120px]', jsonError && 'border-red-300')}
        rows={rows}
      />
    </div>
  );
}

// ============================================================================
// Stance Affinity Editor
// ============================================================================

const COMMON_STANCES = ['narrative', 'comparison', 'evidence', 'summary', 'interactive', 'diagnostic'];

function StanceAffinityEditor({
  affinities,
  onChange,
}: {
  affinities: Record<string, number>;
  onChange: (a: Record<string, number>) => void;
}) {
  const [newStance, setNewStance] = useState('');
  const sorted = Object.entries(affinities).sort(([, a], [, b]) => b - a);

  const addStance = (stance: string) => {
    const s = stance.trim();
    if (s && !(s in affinities)) {
      onChange({ ...affinities, [s]: 0.5 });
    }
    setNewStance('');
  };

  return (
    <div>
      <label className="label">Stance Affinities (0.0 - 1.0)</label>
      <div className="space-y-2 mb-3">
        {sorted.map(([stance, score]) => (
          <div key={stance} className="flex items-center gap-3">
            <span className="text-sm font-mono text-gray-700 w-32">{stance}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={score}
              onChange={(e) =>
                onChange({ ...affinities, [stance]: parseFloat(e.target.value) })
              }
              className="flex-1 accent-emerald-600"
            />
            <span className="text-sm font-mono text-gray-500 w-8 text-right">
              {score.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = { ...affinities };
                delete next[stance];
                onChange(next);
              }}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick-add common stances */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {COMMON_STANCES.filter((s) => !(s in affinities)).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addStance(s)}
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newStance}
          onChange={(e) => setNewStance(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStance(newStance))}
          className="input flex-1"
          placeholder="Custom stance..."
        />
        <button type="button" onClick={() => addStance(newStance)} className="btn-secondary text-sm">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Default Sub-Renderer
// ============================================================================

function makeDefaultSubRenderer(): SubRendererDefinition {
  return {
    sub_renderer_key: '',
    sub_renderer_name: '',
    description: '',
    category: 'atomic',
    ideal_data_shapes: [],
    config_schema: {},
    stance_affinities: {},
    parent_renderer_types: ['accordion'],
    status: 'active',
    tags: [],
  };
}

// ============================================================================
// Main Page
// ============================================================================

export default function SubRendererDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = router.query.key as string;
  const isNew = key === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [form, setForm] = useState<SubRendererDefinition>(makeDefaultSubRenderer());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { data: existing, isLoading, error } = useQuery({
    queryKey: ['sub-renderer', key],
    queryFn: () => api.subRenderers.get(key),
    enabled: !isNew && !!key,
  });

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: SubRendererDefinition) => api.subRenderers.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sub-renderers'] });
      router.push(`/sub-renderers/${result.sub_renderer_key}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: SubRendererDefinition) => api.subRenderers.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-renderers'] });
      queryClient.invalidateQueries({ queryKey: ['sub-renderer', key] });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.subRenderers.delete(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-renderers'] });
      router.push('/sub-renderers');
    },
  });

  const handleSave = useCallback(() => {
    if (isNew) {
      createMut.mutate(form);
    } else {
      updateMut.mutate(form);
    }
  }, [isNew, form, createMut, updateMut]);

  const handleDelete = useCallback(() => {
    if (confirm(`Delete sub-renderer "${form.sub_renderer_key}"? This cannot be undone.`)) {
      deleteMut.mutate();
    }
  }, [form.sub_renderer_key, deleteMut]);

  const update = useCallback(
    (patch: Partial<SubRendererDefinition>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const isSaving = createMut.isPending || updateMut.isPending;
  const mutError = createMut.error || updateMut.error || deleteMut.error;

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading sub-renderer...
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load sub-renderer: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/sub-renderers"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'New Sub-Renderer' : form.sub_renderer_name || key}
            </h1>
            {!isNew && (
              <p className="text-sm font-mono text-gray-400">{form.sub_renderer_key}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> {saveMsg}
            </span>
          )}
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {mutError && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {(mutError as Error).message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex -mb-px">
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              badge={
                tab.id === 'data_shapes' ? form.ideal_data_shapes.length :
                tab.id === 'parents_stances' ? Object.keys(form.stance_affinities).length :
                undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {/* Identity Tab */}
        {activeTab === 'identity' && (
          <div className="space-y-5 max-w-2xl">
            <TextField
              label="Key"
              value={form.sub_renderer_key}
              onChange={(v) => update({ sub_renderer_key: v })}
              placeholder="chip_grid"
              readOnly={!isNew}
              mono
            />
            <TextField
              label="Name"
              value={form.sub_renderer_name}
              onChange={(v) => update({ sub_renderer_name: v })}
              placeholder="Chip Grid"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(v) => update({ description: v })}
              multiline
              rows={4}
              placeholder="What this sub-renderer does and when to use it..."
            />
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                className="input w-auto"
              >
                <option value="atomic">atomic</option>
                <option value="composite">composite</option>
                <option value="specialized">specialized</option>
                <option value="meta">meta</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
                className="input w-auto"
              >
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="deprecated">deprecated</option>
              </select>
            </div>
            <TagEditor
              label="Tags"
              tags={form.tags}
              onChange={(tags) => update({ tags })}
            />
          </div>
        )}

        {/* Data Shapes Tab */}
        {activeTab === 'data_shapes' && (
          <div className="space-y-5 max-w-2xl">
            <TagEditor
              label="Ideal Data Shapes"
              tags={form.ideal_data_shapes}
              onChange={(ideal_data_shapes) => update({ ideal_data_shapes })}
              chipColor="bg-emerald-50 text-emerald-700"
            />
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium">Common data shapes:</p>
              <div className="flex flex-wrap gap-1.5">
                {['flat_list', 'object_array', 'key_value_pairs', 'prose_text', 'timeline_data', 'comparison_pairs', 'nested_sections'].map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => {
                      if (!form.ideal_data_shapes.includes(shape)) {
                        update({ ideal_data_shapes: [...form.ideal_data_shapes, shape] });
                      }
                    }}
                    disabled={form.ideal_data_shapes.includes(shape)}
                    className={clsx(
                      'px-2 py-0.5 rounded border text-xs transition-colors',
                      form.ideal_data_shapes.includes(shape)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                    )}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Parents & Stances Tab */}
        {activeTab === 'parents_stances' && (
          <div className="space-y-6 max-w-2xl">
            <TagEditor
              label="Parent Renderer Types"
              tags={form.parent_renderer_types}
              onChange={(parent_renderer_types) => update({ parent_renderer_types })}
              chipColor="bg-blue-50 text-blue-700"
            />
            <div className="flex flex-wrap gap-1.5 -mt-3">
              {['accordion', 'tab'].filter((p) => !form.parent_renderer_types.includes(p)).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ parent_renderer_types: [...form.parent_renderer_types, p] })}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  + {p}
                </button>
              ))}
            </div>
            <hr />
            <StanceAffinityEditor
              affinities={form.stance_affinities}
              onChange={(stance_affinities) => update({ stance_affinities })}
            />
          </div>
        )}

        {/* Config Schema Tab */}
        {activeTab === 'config' && (
          <div className="space-y-5">
            <JsonEditor
              label="Config Schema (JSON Schema)"
              value={form.config_schema}
              onChange={(v) => update({ config_schema: v as Record<string, unknown> })}
              rows={16}
              description="JSON Schema describing the configuration keys this sub-renderer accepts (label_field, subtitle_field, etc.)"
            />
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div>
            <label className="label mb-2">Full Definition (JSON)</label>
            <pre className="bg-gray-50 border rounded-lg p-4 text-sm font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
              {JSON.stringify(form, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
