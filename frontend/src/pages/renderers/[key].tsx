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
  Link2,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RendererDefinition } from '@/types';
import clsx from 'clsx';

// ============================================================================
// Tab Types & Component
// ============================================================================

type TabId = 'identity' | 'data_contract' | 'primitives' | 'stances' | 'config' | 'preview';

const TABS: { id: TabId; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'data_contract', label: 'Data Contract' },
  { id: 'primitives', label: 'Primitives & Variants' },
  { id: 'stances', label: 'Stance Affinities' },
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
// Reusable Field Components (mirrors transformations/[key].tsx pattern)
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
      <label className="label">Stance Affinities (0.0 – 1.0)</label>
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
              className="flex-1 accent-violet-600"
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
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-violet-50 hover:text-violet-700 transition-colors"
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
// Default Renderer
// ============================================================================

function makeDefaultRenderer(): RendererDefinition {
  return {
    renderer_key: '',
    renderer_name: '',
    description: '',
    category: 'narrative',
    ideal_data_shapes: [],
    input_data_schema: null,
    primitive_affinities: [],
    variants: {},
    stance_affinities: {},
    available_section_renderers: [],
    config_schema: {},
    supported_apps: ['the-critic'],
    status: 'active',
    tags: [],
  };
}

// ============================================================================
// Main Page
// ============================================================================

export default function RendererDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = router.query.key as string;
  const isNew = key === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [form, setForm] = useState<RendererDefinition>(makeDefaultRenderer());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { data: existing, isLoading, error } = useQuery({
    queryKey: ['renderer', key],
    queryFn: () => api.renderers.get(key),
    enabled: !isNew && !!key,
  });

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: RendererDefinition) => api.renderers.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['renderers'] });
      router.push(`/renderers/${result.renderer_key}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: RendererDefinition) => api.renderers.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renderers'] });
      queryClient.invalidateQueries({ queryKey: ['renderer', key] });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.renderers.delete(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renderers'] });
      router.push('/renderers');
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
    if (confirm(`Delete renderer "${form.renderer_key}"? This cannot be undone.`)) {
      deleteMut.mutate();
    }
  }, [form.renderer_key, deleteMut]);

  const update = useCallback(
    <K extends keyof RendererDefinition>(field: K, value: RendererDefinition[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load renderer
      </div>
    );
  }

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const primCount = form.primitive_affinities?.length || 0;
  const variantCount = Object.keys(form.variants || {}).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/renderers"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'New Renderer' : form.renderer_name || key}
            </h1>
            {!isNew && (
              <p className="text-sm font-mono text-gray-400">{key}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="flex items-center text-sm text-green-600">
              <Check className="h-4 w-4 mr-1" />
              {saveMsg}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">
              {(saveError as Error).message}
            </span>
          )}
          {!isNew && (
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:bg-red-50"
              disabled={deleteMut.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex overflow-x-auto">
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            badge={
              tab.id === 'primitives'
                ? primCount + variantCount
                : undefined
            }
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {/* ── Identity Tab ─────────────────────── */}
        {activeTab === 'identity' && (
          <div className="space-y-4 max-w-2xl">
            <TextField
              label="Renderer Key"
              value={form.renderer_key}
              onChange={(v) => update('renderer_key', v)}
              placeholder="e.g. timeline"
              readOnly={!isNew}
              mono
            />
            <TextField
              label="Renderer Name"
              value={form.renderer_name}
              onChange={(v) => update('renderer_name', v)}
              placeholder="Human-readable name"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(v) => update('description', v)}
              multiline
              placeholder="What this renderer does and when to use it..."
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="input"
                >
                  <option value="container">Container</option>
                  <option value="list">List</option>
                  <option value="narrative">Narrative</option>
                  <option value="comparative">Comparative</option>
                  <option value="diagnostic">Diagnostic</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>
            </div>
            <TagEditor
              label="Tags"
              tags={form.tags}
              onChange={(v) => update('tags', v)}
            />
            <TagEditor
              label="Supported Apps"
              tags={form.supported_apps}
              onChange={(v) => update('supported_apps', v)}
              chipColor="bg-emerald-50 text-emerald-700"
            />
          </div>
        )}

        {/* ── Data Contract Tab ─────────────────── */}
        {activeTab === 'data_contract' && (
          <div className="space-y-6 max-w-3xl">
            <TagEditor
              label="Ideal Data Shapes"
              tags={form.ideal_data_shapes}
              onChange={(v) => update('ideal_data_shapes', v)}
              chipColor="bg-cyan-50 text-cyan-700"
            />

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-500" />
                Input Data Schema
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Formal JSON Schema describing the structured data this renderer expects.
                Used by the planner to match transformation outputs to renderer inputs.
              </p>
              <JsonEditor
                label="JSON Schema"
                value={form.input_data_schema || {}}
                onChange={(v) =>
                  update(
                    'input_data_schema',
                    v && typeof v === 'object' && Object.keys(v as object).length > 0
                      ? (v as Record<string, unknown>)
                      : null
                  )
                }
                rows={12}
              />
              {form.input_data_schema && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                  <Check className="h-3 w-3" />
                  Schema defined — planner can auto-match transformations
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Primitives & Variants Tab ─────────── */}
        {activeTab === 'primitives' && (
          <div className="space-y-6 max-w-3xl">
            {/* Primitive Affinities */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-violet-500" />
                Primitive Affinities
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Which analytical primitives this renderer can visualize. Enables the planner
                discovery chain: <span className="font-mono">primitive &rarr; renderer &rarr; transformation</span>.
              </p>
              <TagEditor
                label="Linked Primitives"
                tags={form.primitive_affinities || []}
                onChange={(v) => update('primitive_affinities', v)}
                chipColor="bg-violet-50 text-violet-700"
              />
              {(form.primitive_affinities || []).length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Try:{' '}
                  {form.primitive_affinities.map((p) => (
                    <code key={p} className="mx-1 px-1 py-0.5 bg-gray-100 rounded text-gray-600">
                      GET /v1/renderers/for-primitive/{p}
                    </code>
                  ))}
                </div>
              )}
            </div>

            {/* Variants */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Named Variants</h3>
              <p className="text-xs text-gray-500 mb-3">
                Preset configurations for common use-cases. Each variant has a description,
                config overrides, and example use. The planner and transformation presets
                can reference variants by name.
              </p>

              {Object.keys(form.variants || {}).length > 0 && (
                <div className="space-y-3 mb-4">
                  {Object.entries(form.variants || {}).map(([vName, vData]) => {
                    const desc = vData.description as string | undefined;
                    const config = vData.config as Record<string, unknown> | undefined;
                    const example = vData.example_use as string | undefined;
                    return (
                      <div
                        key={vName}
                        className="p-4 bg-violet-50/50 border border-violet-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-semibold text-violet-700">
                            {vName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...form.variants };
                              delete next[vName];
                              update('variants', next);
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {desc && (
                          <p className="text-xs text-gray-600 mb-1">{desc}</p>
                        )}
                        {config && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-gray-500">Config:</span>
                            <pre className="mt-1 text-xs font-mono bg-white p-2 rounded border overflow-auto max-h-24">
                              {JSON.stringify(config, null, 2)}
                            </pre>
                          </div>
                        )}
                        {example && (
                          <p className="mt-1 text-xs text-gray-500 italic">
                            Example: {example}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <JsonEditor
                label="Variants JSON (edit all)"
                value={form.variants || {}}
                onChange={(v) => update('variants', (v || {}) as Record<string, Record<string, unknown>>)}
                rows={10}
                description="Each key is a variant name. Value is an object with description, config, example_use."
              />
            </div>
          </div>
        )}

        {/* ── Stance Affinities Tab ─────────────── */}
        {activeTab === 'stances' && (
          <div className="space-y-4 max-w-2xl">
            <StanceAffinityEditor
              affinities={form.stance_affinities}
              onChange={(v) => update('stance_affinities', v)}
            />
          </div>
        )}

        {/* ── Config Schema Tab ─────────────────── */}
        {activeTab === 'config' && (
          <div className="space-y-6 max-w-3xl">
            <JsonEditor
              label="Config Schema (JSON Schema)"
              value={form.config_schema || {}}
              onChange={(v) => update('config_schema', (v || {}) as Record<string, unknown>)}
              rows={12}
              description="JSON Schema describing what renderer_config keys this renderer accepts. Used by the view editor and planner."
            />
            <TagEditor
              label="Available Section Renderers"
              tags={form.available_section_renderers}
              onChange={(v) => update('available_section_renderers', v)}
              chipColor="bg-teal-50 text-teal-700"
            />
          </div>
        )}

        {/* ── Preview Tab ──────────────────────── */}
        {activeTab === 'preview' && (
          <div>
            <label className="label">Full Renderer JSON</label>
            <pre className="p-4 bg-gray-50 rounded-md text-sm font-mono overflow-auto max-h-[600px] border">
              {JSON.stringify(form, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
