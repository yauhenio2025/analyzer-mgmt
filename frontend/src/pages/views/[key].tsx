import { useState, useCallback, useEffect, useMemo } from 'react';
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
  Eye,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  ViewDefinition,
  DataSourceRef,
  TransformationSpec,
  TransformationTemplateSummary,
  RendererDefinition,
  RendererRecommendResponse,
} from '@/types';
import clsx from 'clsx';

// ============================================================================
// Tab Types & Component
// ============================================================================

type TabId = 'identity' | 'target' | 'renderer' | 'data_source' | 'transformation' | 'preview';

const TABS: { id: TabId; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'target', label: 'Target' },
  { id: 'renderer', label: 'Renderer' },
  { id: 'data_source', label: 'Data Source' },
  { id: 'transformation', label: 'Transformation' },
  { id: 'preview', label: 'Preview' },
];

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        active
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx('input min-h-[80px]', mono && 'font-mono text-sm')}
          rows={3}
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

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="input"
        step={step}
        min={min}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TagEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewItem('');
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-sm text-gray-700"
          >
            {item}
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="input flex-1"
          placeholder={placeholder || 'Add tag...'}
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="btn-secondary py-2"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function JsonEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value || {}, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value || {}, null, 2));
  }, [value]);

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      onChange(parsed);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className={clsx(
          'input font-mono text-sm min-h-[120px]',
          parseError && 'border-red-300 focus:ring-red-500'
        )}
        rows={6}
      />
      {parseError && (
        <p className="text-xs text-red-500 mt-1">Invalid JSON: {parseError}</p>
      )}
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

function IdentityTab({
  view,
  onChange,
  isCreate,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
  isCreate: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="View Key"
            value={view.view_key}
            onChange={(v) => onChange({ ...view, view_key: v })}
            placeholder="snake_case_key"
            readOnly={!isCreate}
            mono
          />
          <TextField
            label="View Name"
            value={view.view_name}
            onChange={(v) => onChange({ ...view, view_name: v })}
            placeholder="Human-readable name"
          />
        </div>
        <TextField
          label="Description"
          value={view.description}
          onChange={(v) => onChange({ ...view, description: v })}
          multiline
          placeholder="What this view shows and why it's useful"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Version"
            value={view.version}
            onChange={(v) => onChange({ ...view, version: v })}
            min={1}
          />
          <SelectField
            label="Status"
            value={view.status}
            onChange={(v) => onChange({ ...view, status: v })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'deprecated', label: 'Deprecated' },
            ]}
          />
          <TextField
            label="Source Project"
            value={view.source_project || ''}
            onChange={(v) => onChange({ ...view, source_project: v || null })}
            placeholder="e.g. the-critic"
          />
        </div>
        <TagEditor
          label="Tags"
          items={view.tags}
          onChange={(tags) => onChange({ ...view, tags })}
          placeholder="Add tag..."
        />
      </div>
    </div>
  );
}

function TargetTab({
  view,
  onChange,
  allViews,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
  allViews: { view_key: string; view_name: string }[];
}) {
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Target Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Target App"
            value={view.target_app}
            onChange={(v) => onChange({ ...view, target_app: v })}
            placeholder="the-critic"
          />
          <TextField
            label="Target Page"
            value={view.target_page}
            onChange={(v) => onChange({ ...view, target_page: v })}
            placeholder="genealogy"
          />
          <SelectField
            label="Target Section"
            value={view.target_section}
            onChange={(v) => onChange({ ...view, target_section: v })}
            options={[
              { value: 'results', label: 'Results' },
              { value: 'sidebar', label: 'Sidebar' },
              { value: 'config', label: 'Config' },
              { value: 'debug', label: 'Debug' },
            ]}
          />
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Position"
            value={view.position}
            onChange={(v) => onChange({ ...view, position: v })}
            step={0.5}
          />
          <div>
            <label className="label">Parent View</label>
            <select
              value={view.parent_view_key || ''}
              onChange={(e) =>
                onChange({
                  ...view,
                  parent_view_key: e.target.value || null,
                })
              }
              className="input"
            >
              <option value="">None (top-level)</option>
              {allViews
                .filter((v) => v.view_key !== view.view_key)
                .map((v) => (
                  <option key={v.view_key} value={v.view_key}>
                    {v.view_name} ({v.view_key})
                  </option>
                ))}
            </select>
          </div>
          <SelectField
            label="Visibility"
            value={view.visibility}
            onChange={(v) =>
              onChange({
                ...view,
                visibility: v as 'always' | 'if_data_exists' | 'on_demand',
              })
            }
            options={[
              { value: 'always', label: 'Always' },
              { value: 'if_data_exists', label: 'If Data Exists' },
              { value: 'on_demand', label: 'On Demand' },
            ]}
          />
        </div>
        <TextField
          label="Tab Count Field"
          value={view.tab_count_field || ''}
          onChange={(v) => onChange({ ...view, tab_count_field: v || null })}
          placeholder="JSONPath for count badge, e.g. ideas.length"
          mono
        />
      </div>
    </div>
  );
}

// ── Sub-renderer config field definitions ────────────────────────
const RENDERER_CONFIG_FIELDS: Record<string, { field: string; label: string; placeholder: string }[]> = {
  mini_card_list: [
    { field: 'title_field', label: 'Title Field', placeholder: 'e.g. name, framework_name' },
    { field: 'subtitle_field', label: 'Subtitle Field', placeholder: 'e.g. type, category' },
    { field: 'badge_field', label: 'Badge Field', placeholder: 'e.g. count, score' },
    { field: 'description_field', label: 'Description Field', placeholder: 'e.g. description, summary' },
  ],
  chip_grid: [
    { field: 'label_field', label: 'Label Field', placeholder: 'e.g. term, name' },
    { field: 'count_field', label: 'Count Field', placeholder: 'e.g. count, frequency' },
  ],
  key_value_table: [
    { field: 'key_field', label: 'Key Field', placeholder: 'e.g. term, concept' },
    { field: 'value_field', label: 'Value Field', placeholder: 'e.g. meaning, definition' },
  ],
  prose_block: [],
  stat_row: [],
  comparison_panel: [
    { field: 'left_field', label: 'Left Column', placeholder: 'e.g. pole_a, option_a' },
    { field: 'right_field', label: 'Right Column', placeholder: 'e.g. pole_b, option_b' },
  ],
  timeline_strip: [
    { field: 'label_field', label: 'Label Field', placeholder: 'e.g. concept, stage_name' },
    { field: 'stages_field', label: 'Stages Field', placeholder: 'e.g. stages, phases' },
  ],
};

const SUB_RENDERER_OPTIONS = [
  { value: 'mini_card_list', label: 'Mini Card List' },
  { value: 'chip_grid', label: 'Chip Grid' },
  { value: 'key_value_table', label: 'Key-Value Table' },
  { value: 'prose_block', label: 'Prose Block' },
  { value: 'stat_row', label: 'Stat Row' },
  { value: 'comparison_panel', label: 'Comparison Panel' },
  { value: 'timeline_strip', label: 'Timeline Strip' },
];

const SECTION_RENDERER_OPTIONS = [
  { value: 'nested_sections', label: 'Nested Sections (contains sub-renderers)' },
  ...SUB_RENDERER_OPTIONS,
];

// ── Sub-renderer config editor (field mapping inputs) ────────────
function RendererConfigFields({
  rendererType,
  config,
  onChange,
}: {
  rendererType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const fields = RENDERER_CONFIG_FIELDS[rendererType];
  if (!fields || fields.length === 0) {
    return <p className="text-xs text-gray-400 italic">No config fields for {rendererType}</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
      {fields.map((f) => (
        <div key={f.field}>
          <label className="text-xs font-medium text-gray-500">{f.label}</label>
          <input
            type="text"
            value={(config[f.field] as string) || ''}
            onChange={(e) => onChange({ ...config, [f.field]: e.target.value || undefined })}
            className="input font-mono text-sm"
            placeholder={f.placeholder}
          />
        </div>
      ))}
    </div>
  );
}

// ── Single sub-renderer card ─────────────────────────────────────
function SubRendererCard({
  sectionKey,
  hint,
  onChangeKey,
  onChangeHint,
  onRemove,
}: {
  sectionKey: string;
  hint: { renderer_type: string; config?: Record<string, unknown> };
  onChangeKey: (newKey: string) => void;
  onChangeHint: (hint: { renderer_type: string; config?: Record<string, unknown> }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-indigo-200 bg-indigo-50/30 rounded-md p-3 space-y-2 relative">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500">Data Key</label>
          <input
            type="text"
            value={sectionKey}
            onChange={(e) => onChangeKey(e.target.value)}
            className="input font-mono text-sm"
            placeholder="e.g. summary, frameworks"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Renderer Type</label>
          <select
            value={hint.renderer_type}
            onChange={(e) => onChangeHint({ ...hint, renderer_type: e.target.value, config: hint.config || {} })}
            className="input text-sm"
          >
            {SUB_RENDERER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <RendererConfigFields
        rendererType={hint.renderer_type}
        config={hint.config || {}}
        onChange={(c) => onChangeHint({ ...hint, config: c })}
      />
    </div>
  );
}

// ── Section renderer card (top-level, may contain sub-renderers) ─
function SectionRendererCard({
  sectionKey,
  entry,
  onChangeKey,
  onChange,
  onRemove,
}: {
  sectionKey: string;
  entry: Record<string, unknown>;
  onChangeKey: (newKey: string) => void;
  onChange: (entry: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const rendererType = (entry.renderer_type as string) || 'mini_card_list';
  const isNested = rendererType === 'nested_sections';
  const subRenderers = (entry.sub_renderers || {}) as Record<string, { renderer_type: string; config?: Record<string, unknown> }>;
  const config = (entry.config || {}) as Record<string, unknown>;

  const updateSubRenderer = (oldKey: string, newKey: string, hint: { renderer_type: string; config?: Record<string, unknown> }) => {
    const updated = { ...subRenderers };
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = hint;
    onChange({ ...entry, sub_renderers: updated });
  };

  const removeSubRenderer = (key: string) => {
    const updated = { ...subRenderers };
    delete updated[key];
    onChange({ ...entry, sub_renderers: updated });
  };

  const addSubRenderer = () => {
    const newKey = `field_${Object.keys(subRenderers).length + 1}`;
    onChange({
      ...entry,
      sub_renderers: { ...subRenderers, [newKey]: { renderer_type: 'prose_block', config: {} } },
    });
  };

  // Color coding based on renderer type
  const borderColor = isNested ? 'border-purple-300' : 'border-blue-300';
  const headerBg = isNested ? 'bg-purple-50' : 'bg-blue-50';

  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${headerBg} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm text-gray-800">{sectionKey}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isNested ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>
            {rendererType.replace(/_/g, ' ')}
          </span>
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500" title="Remove section renderer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Section Key</label>
            <input
              type="text"
              value={sectionKey}
              onChange={(e) => onChangeKey(e.target.value)}
              className="input font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Renderer Type</label>
            <select
              value={rendererType}
              onChange={(e) => {
                const newType = e.target.value;
                if (newType === 'nested_sections') {
                  onChange({ renderer_type: newType, sub_renderers: entry.sub_renderers || {} });
                } else {
                  onChange({ renderer_type: newType, config: entry.config || {} });
                }
              }}
              className="input text-sm"
            >
              {SECTION_RENDERER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Non-nested: show config fields directly */}
        {!isNested && (
          <RendererConfigFields
            rendererType={rendererType}
            config={config}
            onChange={(c) => onChange({ ...entry, config: c })}
          />
        )}

        {/* Nested: show sub-renderers */}
        {isNested && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Sub-renderers ({Object.keys(subRenderers).length})</span>
              <button onClick={addSubRenderer} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {Object.entries(subRenderers).map(([key, hint]) => (
              <SubRendererCard
                key={key}
                sectionKey={key}
                hint={hint}
                onChangeKey={(newKey) => updateSubRenderer(key, newKey, hint)}
                onChangeHint={(newHint) => updateSubRenderer(key, key, newHint)}
                onRemove={() => removeSubRenderer(key)}
              />
            ))}
            {Object.keys(subRenderers).length === 0 && (
              <p className="text-xs text-gray-400 italic pl-1">No sub-renderers. Click + Add to create one.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sections list editor ─────────────────────────────────────────
function SectionsEditor({
  sections,
  onChange,
}: {
  sections: { key: string; title: string }[];
  onChange: (sections: { key: string; title: string }[]) => void;
}) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Accordion Sections ({sections.length})</h3>
        <button
          onClick={() => onChange([...sections, { key: `section_${sections.length + 1}`, title: 'New Section' }])}
          className="btn-secondary text-sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Section
        </button>
      </div>
      {sections.map((sec, i) => (
        <div key={i} className="flex items-center gap-2 border border-gray-200 rounded-md p-2">
          <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
          <input
            type="text"
            value={sec.key}
            onChange={(e) => {
              const updated = [...sections];
              updated[i] = { ...sec, key: e.target.value };
              onChange(updated);
            }}
            className="input font-mono text-sm flex-1"
            placeholder="section_key"
          />
          <input
            type="text"
            value={sec.title}
            onChange={(e) => {
              const updated = [...sections];
              updated[i] = { ...sec, title: e.target.value };
              onChange(updated);
            }}
            className="input text-sm flex-1"
            placeholder="Section Title"
          />
          <button
            onClick={() => onChange(sections.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {sections.length === 0 && (
        <p className="text-sm text-gray-400 italic">No sections defined.</p>
      )}
    </div>
  );
}

// ── Section renderers visual editor ──────────────────────────────
function SectionRenderersEditor({
  sectionRenderers,
  onChange,
}: {
  sectionRenderers: Record<string, Record<string, unknown>>;
  onChange: (sr: Record<string, Record<string, unknown>>) => void;
}) {
  const updateEntry = (oldKey: string, newKey: string, entry: Record<string, unknown>) => {
    const updated = { ...sectionRenderers };
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = entry;
    onChange(updated);
  };

  const removeEntry = (key: string) => {
    const updated = { ...sectionRenderers };
    delete updated[key];
    onChange(updated);
  };

  const addEntry = () => {
    const newKey = `new_section_${Object.keys(sectionRenderers).length + 1}`;
    onChange({
      ...sectionRenderers,
      [newKey]: { renderer_type: 'prose_block', config: {} },
    });
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Section Renderers ({Object.keys(sectionRenderers).length})
        </h3>
        <button onClick={addEntry} className="btn-secondary text-sm">
          <Plus className="h-4 w-4 mr-1" /> Add Renderer
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Configure how each accordion section renders its data. Choose a renderer type and map data fields to display positions.
      </p>
      {Object.entries(sectionRenderers).map(([key, entry]) => (
        <SectionRendererCard
          key={key}
          sectionKey={key}
          entry={entry as Record<string, unknown>}
          onChangeKey={(newKey) => updateEntry(key, newKey, entry as Record<string, unknown>)}
          onChange={(newEntry) => updateEntry(key, key, newEntry)}
          onRemove={() => removeEntry(key)}
        />
      ))}
      {Object.keys(sectionRenderers).length === 0 && (
        <p className="text-sm text-gray-400 italic">
          No section renderers configured. Sections will use generic rendering.
        </p>
      )}
    </div>
  );
}

// ── Wiring Explainer ────────────────────────────────────────────

const STANCE_EXPLANATIONS: Record<string, { mode: string; means: string; ui: string }> = {
  summary: {
    mode: 'distillation',
    means: 'compress to headlines and key points',
    ui: 'stat cards, bullet lists, executive briefs',
  },
  evidence: {
    mode: 'evidentiary',
    means: 'foreground sources, quotes, traceability',
    ui: 'quote cards with attribution, citation trails',
  },
  comparison: {
    mode: 'differential',
    means: 'side-by-side highlighting of contrasts',
    ui: 'split panels, diff views, parallel layouts',
  },
  narrative: {
    mode: 'narrative',
    means: 'flowing prose with structure markers',
    ui: 'formatted long-form with section anchors',
  },
  interactive: {
    mode: 'explorative',
    means: 'drill-down affordances, user-driven navigation',
    ui: 'expandable cards, nested tabs, filter controls',
  },
  diagnostic: {
    mode: 'meta-analytical',
    means: 'expose methodology, confidence levels, gaps',
    ui: 'confidence meters, coverage matrices, debug panels',
  },
};

const SHAPE_EXPLANATIONS: Record<string, { label: string; because: string; implies: string }> = {
  object_array: {
    label: 'Array of objects',
    because: 'the result path contains [*] or references a collection (ideas, findings, entities)',
    implies: 'each item can be a card, row, or list entry — renderers like card_grid and table excel here',
  },
  nested_sections: {
    label: 'Nested sections',
    because: 'the output has named subsections (default for multi-part analytical output)',
    implies: 'each section is a collapsible region — accordion and tab containers handle this naturally',
  },
  prose_text: {
    label: 'Prose / narrative text',
    because: 'the result path references a summary, overview, or narrative block',
    implies: 'long-form continuous text — the prose renderer is the clear fit',
  },
  timeline_data: {
    label: 'Timeline / evolution data',
    because: 'the result path references temporal evolution or timeline data',
    implies: 'chronologically ordered entries — the timeline renderer is purpose-built for this',
  },
  comparison_pairs: {
    label: 'Comparison pairs',
    because: 'the result path references comparisons, contrasts, or versus structures',
    implies: 'paired data needing side-by-side presentation — table or split-panel renderers fit',
  },
  key_value_pairs: {
    label: 'Key-value pairs',
    because: 'the result path references a table, matrix, or grid structure',
    implies: 'labeled data pairs — table renderer with two-column layout works best',
  },
};

function WiringExplainer({
  view,
  allViews,
  inferredShape,
  topRenderer,
}: {
  view: ViewDefinition;
  allViews: { view_key: string; view_name: string }[];
  inferredShape: string;
  topRenderer?: ScoredRenderer;
}) {
  const ds = view.data_source;
  const children = allViews.filter(
    (v) => (v as unknown as ViewDefinition).parent_view_key === view.view_key
  );
  const hasChildren = children.length > 0;
  const stance = view.presentation_stance;
  const stanceInfo = stance ? STANCE_EXPLANATIONS[stance] : null;
  const shapeInfo = SHAPE_EXPLANATIONS[inferredShape] || SHAPE_EXPLANATIONS['nested_sections'];

  return (
    <div className="card p-5 space-y-3 bg-indigo-50/40 border-indigo-200">
      <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
        How this view is wired
      </h3>

      <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
        {/* Data source */}
        <p>
          <span className="font-medium text-gray-900">Data source:</span>{' '}
          {ds?.chain_key ? (
            <>
              chain <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{ds.chain_key}</code>
            </>
          ) : ds?.engine_key ? (
            <>
              engine <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{ds.engine_key}</code>
            </>
          ) : (
            <span className="text-gray-500">not specified</span>
          )}
          {ds?.result_path ? (
            <>
              {' → '}path <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{ds.result_path}</code>
            </>
          ) : null}
          {ds?.scope ? (
            <span className="text-gray-500"> ({ds.scope})</span>
          ) : null}
        </p>

        {/* Data shape */}
        <p>
          <span className="font-medium text-gray-900">Data shape:</span>{' '}
          <span className="font-medium text-indigo-700">{shapeInfo.label}</span>
          {' — '}
          {shapeInfo.because}.{' '}
          <span className="text-gray-500">{shapeInfo.implies}</span>
        </p>

        {/* Stance */}
        {stance && stanceInfo ? (
          <p>
            <span className="font-medium text-gray-900">Stance:</span>{' '}
            <span className="font-medium text-indigo-700">{stance}</span>
            {' = '}{stanceInfo.mode} mode — {stanceInfo.means}.{' '}
            <span className="text-gray-500">Typical UI: {stanceInfo.ui}.</span>
          </p>
        ) : stance ? (
          <p>
            <span className="font-medium text-gray-900">Stance:</span>{' '}
            <span className="font-medium text-indigo-700">{stance}</span>
          </p>
        ) : (
          <p>
            <span className="font-medium text-gray-900">Stance:</span>{' '}
            <span className="text-gray-500">none set — scoring ignores stance affinity.</span>
          </p>
        )}

        {/* Children / container need */}
        <p>
          <span className="font-medium text-gray-900">Structure:</span>{' '}
          {hasChildren ? (
            <>
              This view has <span className="font-semibold text-indigo-700">{children.length} child view{children.length > 1 ? 's' : ''}</span>
              {' '}({children.map(c => c.view_name || c.view_key).join(', ')}),
              so it <span className="font-semibold">needs a container renderer</span> (accordion or tab).
              Non-container renderers are penalized.
            </>
          ) : view.parent_view_key ? (
            <>
              This is a <span className="font-semibold text-indigo-700">child view</span> (inside{' '}
              <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{view.parent_view_key}</code>).
              It renders its own slice of data — container renderers are unnecessary overhead.
            </>
          ) : (
            <>
              This is a <span className="font-semibold text-indigo-700">standalone leaf view</span> with no children.
              Container renderers (accordion, tab) get a slight penalty since there is nothing to contain.
            </>
          )}
        </p>

        {/* Why top renderer wins */}
        {topRenderer && (
          <p className="pt-1 border-t border-indigo-200/50">
            <span className="font-medium text-gray-900">→ Best fit:</span>{' '}
            <span className="font-semibold text-indigo-700">{topRenderer.renderer_name}</span>{' '}
            ({Math.round(topRenderer.compositeScore * 100)}%) because
            {topRenderer.containerScore >= 0.8 && hasChildren && ' it is a container'}
            {topRenderer.dataShapeScore >= 0.8 && ` it handles ${shapeInfo.label.toLowerCase()}`}
            {topRenderer.stanceScore !== null && topRenderer.stanceScore >= 0.5 && stance &&
              ` and has ${topRenderer.stanceScore >= 0.7 ? 'strong' : 'moderate'} ${stance} affinity (${topRenderer.stanceScore.toFixed(1)})`}
            {topRenderer.appScore >= 0.8 && ` and is supported by ${view.target_app}`}
            .
            {topRenderer.renderer_key !== view.renderer_type && view.renderer_type && (
              <span className="text-amber-700">
                {' '}Your current renderer ({view.renderer_type}) is not the top pick.
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Deterministic Renderer Scoring ──────────────────────────────

function inferDataShape(view: ViewDefinition): string {
  const path = view.data_source?.result_path || '';
  if (!path) return 'nested_sections';
  if (path.includes('[*]')) return 'object_array';
  const lp = path.toLowerCase();
  if (/ideas|concepts|findings|items|entities/.test(lp)) return 'object_array';
  if (/summary|overview|narrative|prose/.test(lp)) return 'prose_text';
  if (/timeline|evolution|temporal/.test(lp)) return 'timeline_data';
  if (/comparison|versus|contrast/.test(lp)) return 'comparison_pairs';
  if (/table|matrix|grid/.test(lp)) return 'key_value_pairs';
  return 'nested_sections';
}

interface ScoredRenderer {
  renderer_key: string;
  renderer_name: string;
  category: string;
  description: string;
  compositeScore: number;
  stanceScore: number | null;
  dataShapeScore: number;
  containerScore: number;
  appScore: number;
  isCurrent: boolean;
}

function scoreRenderers(
  renderers: RendererDefinition[],
  view: ViewDefinition,
  allViews: { view_key: string; view_name: string }[],
): ScoredRenderer[] {
  const inferredShape = inferDataShape(view);
  const hasChildren = allViews.some((v) => v.view_key !== view.view_key && false) ||
    // Check by counting children directly from allViews
    allViews.filter((v) => (v as unknown as ViewDefinition).parent_view_key === view.view_key).length > 0;
  const childCount = allViews.filter(
    (v) => (v as unknown as ViewDefinition).parent_view_key === view.view_key
  ).length;

  return renderers.map((r) => {
    // Stance affinity (0.0-1.0)
    let stanceScore: number | null = null;
    if (view.presentation_stance && Object.keys(r.stance_affinities).length > 0) {
      stanceScore = r.stance_affinities[view.presentation_stance] ?? 0;
    }

    // Data shape match (0.0-1.0)
    let dataShapeScore = 0.3; // default partial
    if (r.ideal_data_shapes.includes(inferredShape)) {
      dataShapeScore = 1.0;
    } else if (r.ideal_data_shapes.length === 0) {
      dataShapeScore = 0.5; // unknown → neutral
    }

    // Container fit (0.0-1.0)
    const isContainer = r.category === 'container';
    let containerScore = 0.5;
    if (hasChildren || childCount > 0) {
      containerScore = isContainer ? 1.0 : 0.2;
    } else {
      containerScore = isContainer ? 0.4 : 0.7;
    }

    // App support (0.0-1.0)
    const appScore = r.supported_apps.includes(view.target_app) ? 1.0 : 0.2;

    // Adaptive weighted composite — data shape matters MORE for structured renderers,
    // stance matters MORE for narrative/prose renderers
    const isStructuredRenderer = ['list', 'diagnostic'].includes(r.category);
    const weights = {
      stance: stanceScore !== null ? (isStructuredRenderer ? 0.25 : 0.35) : 0,
      shape: isStructuredRenderer ? 0.40 : 0.30,
      container: 0.20,
      app: 0.15,
    };
    const totalWeight = weights.stance + weights.shape + weights.container + weights.app;
    const composite =
      ((stanceScore ?? 0) * weights.stance +
        dataShapeScore * weights.shape +
        containerScore * weights.container +
        appScore * weights.app) /
      totalWeight;

    return {
      renderer_key: r.renderer_key,
      renderer_name: r.renderer_name,
      category: r.category,
      description: r.description,
      compositeScore: composite,
      stanceScore,
      dataShapeScore,
      containerScore,
      appScore,
      isCurrent: r.renderer_key === view.renderer_type,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 0.4) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function scoreDot(score: number): string {
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.4) return 'bg-yellow-500';
  return 'bg-red-400';
}

// ── Main Renderer Tab ────────────────────────────────────────────
function RendererTab({
  view,
  onChange,
  allViews,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
  allViews: { view_key: string; view_name: string }[];
}) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [llmResult, setLlmResult] = useState<RendererRecommendResponse | null>(null);
  const [showMigration, setShowMigration] = useState(false);

  // Fetch full renderer definitions (not just summaries) for scoring
  const { data: rendererDefs } = useQuery({
    queryKey: ['renderers-full'],
    queryFn: async () => {
      const summaries = await api.renderers.list();
      const defs = await Promise.all(
        summaries.map((s) => api.renderers.get(s.renderer_key))
      );
      return defs;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Deterministic scored list
  const scoredList = useMemo(() => {
    if (!rendererDefs || rendererDefs.length === 0) return [];
    return scoreRenderers(rendererDefs, view, allViews);
  }, [rendererDefs, view, allViews]);

  // LLM recommendation mutation
  const recommendMutation = useMutation({
    mutationFn: () =>
      api.renderers.recommend({
        view_key: view.view_key,
        view_name: view.view_name,
        description: view.description,
        presentation_stance: view.presentation_stance,
        renderer_type: view.renderer_type,
        renderer_config: view.renderer_config,
        data_source: view.data_source as unknown as Record<string, unknown>,
        has_children: allViews.some(
          (v) => (v as unknown as ViewDefinition).parent_view_key === view.view_key
        ),
        child_count: allViews.filter(
          (v) => (v as unknown as ViewDefinition).parent_view_key === view.view_key
        ).length,
        parent_view_key: view.parent_view_key,
        target_app: view.target_app,
        include_config_migration: !!view.renderer_type,
        migrate_from: view.renderer_type || undefined,
      }),
    onSuccess: (data) => setLlmResult(data),
  });

  const config = view.renderer_config || {};
  const sections = (config.sections || []) as { key: string; title: string }[];
  const sectionRenderers = (config.section_renderers || {}) as Record<string, Record<string, unknown>>;
  const expandFirst = config.expand_first as boolean | undefined;

  const updateConfig = (patch: Record<string, unknown>) => {
    onChange({ ...view, renderer_config: { ...config, ...patch } });
  };

  const applyRenderer = (rendererKey: string) => {
    onChange({ ...view, renderer_type: rendererKey });
  };

  const inferredShape = inferDataShape(view);

  return (
    <div className="space-y-6">
      {/* Wiring Explainer */}
      <WiringExplainer
        view={view}
        allViews={allViews}
        inferredShape={inferredShape}
        topRenderer={scoredList[0]}
      />

      {/* Scored Renderer List */}
      <div className="card p-6 space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Renderer Selection</h3>
        <p className="text-sm text-gray-500">
          Renderers scored by stance affinity, data shape, container fit, and app support.
        </p>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {scoredList.map((sr) => (
            <button
              key={sr.renderer_key}
              onClick={() => applyRenderer(sr.renderer_key)}
              className={clsx(
                'w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm',
                sr.isCurrent
                  ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={clsx('h-2.5 w-2.5 rounded-full', scoreDot(sr.compositeScore))} />
                  <span className="font-medium text-sm text-gray-900">
                    {Math.round(sr.compositeScore * 100)}%
                  </span>
                  <span className="text-sm text-gray-800">{sr.renderer_name}</span>
                  <span className="text-xs text-gray-400">({sr.category})</span>
                  {sr.isCurrent && (
                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                      current
                    </span>
                  )}
                </div>
                {sr.isCurrent && <Check className="h-4 w-4 text-blue-600" />}
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{sr.description}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {sr.stanceScore !== null && (
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', scoreColor(sr.stanceScore))}>
                    Stance: {sr.stanceScore.toFixed(1)}
                  </span>
                )}
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', scoreColor(sr.dataShapeScore))}>
                  Shape: {sr.dataShapeScore === 1 ? '✓' : sr.dataShapeScore >= 0.5 ? '~' : '✗'}
                </span>
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', scoreColor(sr.containerScore))}>
                  Container: {sr.containerScore === 1 ? '✓' : sr.containerScore >= 0.5 ? '~' : '✗'}
                </span>
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', scoreColor(sr.appScore))}>
                  App: {sr.appScore === 1 ? '✓' : '✗'}
                </span>
              </div>
            </button>
          ))}
          {scoredList.length === 0 && (
            <p className="text-sm text-gray-400 italic">Loading renderer catalog...</p>
          )}
        </div>
      </div>

      {/* AI Recommendation Panel */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Recommendation
          </h3>
          <button
            onClick={() => recommendMutation.mutate()}
            disabled={recommendMutation.isPending}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              recommendMutation.isPending
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            )}
          >
            {recommendMutation.isPending ? 'Analyzing...' : 'Recommend Renderer'}
          </button>
        </div>

        {recommendMutation.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            {(recommendMutation.error as Error).message}
          </div>
        )}

        {llmResult && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
              {llmResult.analysis_summary}
            </p>
            <div className="space-y-2">
              {llmResult.recommendations.slice(0, 5).map((rec) => (
                <div
                  key={rec.renderer_key}
                  className="rounded-lg border border-gray-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        #{rec.rank}
                      </span>
                      <span className="font-medium text-sm text-gray-800">
                        {rec.renderer_name}
                      </span>
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded border font-medium',
                        scoreColor(rec.score)
                      )}>
                        {rec.score.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => applyRenderer(rec.renderer_key)}
                      className={clsx(
                        'text-xs px-3 py-1 rounded-md font-medium transition-colors',
                        rec.renderer_key === view.renderer_type
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {rec.renderer_key === view.renderer_type ? 'Current' : 'Apply'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">{rec.reasoning}</p>
                  <div className="flex gap-3 text-[10px] text-gray-500">
                    <span>Stance: {rec.stance_fit}</span>
                    <span>|</span>
                    <span>Shape: {rec.data_shape_fit}</span>
                  </div>
                  {rec.warnings.length > 0 && (
                    <div className="text-[10px] text-amber-600">
                      {rec.warnings.map((w, i) => (
                        <span key={i} className="block">⚠ {w}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Config Migration */}
            {llmResult.config_migration && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <button
                  onClick={() => setShowMigration(!showMigration)}
                  className="flex items-center gap-2 text-sm font-medium text-amber-800 w-full"
                >
                  {showMigration ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Config Migration: {llmResult.config_migration.from_renderer} → {llmResult.config_migration.to_renderer}
                </button>
                {showMigration && (
                  <div className="text-xs text-amber-700 space-y-1 pl-6">
                    <p>{llmResult.config_migration.explanation}</p>
                    {llmResult.config_migration.fields_to_add.length > 0 && (
                      <p>
                        <span className="font-semibold">Add:</span>{' '}
                        {llmResult.config_migration.fields_to_add.join(', ')}
                      </p>
                    )}
                    {llmResult.config_migration.fields_to_remove.length > 0 && (
                      <p>
                        <span className="font-semibold">Remove:</span>{' '}
                        {llmResult.config_migration.fields_to_remove.join(', ')}
                      </p>
                    )}
                    {Object.keys(llmResult.config_migration.fields_to_transform).length > 0 && (
                      <p>
                        <span className="font-semibold">Transform:</span>{' '}
                        {Object.entries(llmResult.config_migration.fields_to_transform)
                          .map(([k, v]) => `${k} → ${v}`)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand first toggle */}
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Renderer Config</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!!expandFirst}
            onChange={(e) => updateConfig({ expand_first: e.target.checked })}
            className="rounded border-gray-300"
          />
          Auto-expand first section
        </label>
      </div>

      {/* Sections list (only for accordion/tab renderers) */}
      {(view.renderer_type === 'accordion' || view.renderer_type === 'tab') && sections.length > 0 && (
        <SectionsEditor
          sections={sections}
          onChange={(s) => updateConfig({ sections: s })}
        />
      )}

      {/* Section renderers (visual editor) */}
      {(view.renderer_type === 'accordion' || view.renderer_type === 'tab') && (
        <SectionRenderersEditor
          sectionRenderers={sectionRenderers}
          onChange={(sr) => updateConfig({ section_renderers: sr })}
        />
      )}

      {/* Raw JSON fallback */}
      <div className="card p-6">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          {showRawJson ? 'Hide' : 'Show'} Raw JSON
        </button>
        {showRawJson && (
          <div className="mt-3">
            <JsonEditor
              label="Renderer Config (JSON)"
              value={view.renderer_config}
              onChange={(v) => onChange({ ...view, renderer_config: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DataSourceTab({
  view,
  onChange,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
}) {
  const updateSource = (field: keyof DataSourceRef, value: unknown) => {
    onChange({
      ...view,
      data_source: { ...view.data_source, [field]: value },
    });
  };

  const addSecondarySource = () => {
    onChange({
      ...view,
      secondary_sources: [
        ...view.secondary_sources,
        {
          workflow_key: null,
          phase_number: null,
          engine_key: null,
          chain_key: null,
          result_path: '',
          scope: 'aggregated' as const,
        },
      ],
    });
  };

  const updateSecondary = (
    index: number,
    field: keyof DataSourceRef,
    value: unknown
  ) => {
    const updated = [...view.secondary_sources];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...view, secondary_sources: updated });
  };

  const removeSecondary = (index: number) => {
    onChange({
      ...view,
      secondary_sources: view.secondary_sources.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Primary Data Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Workflow Key"
            value={view.data_source.workflow_key || ''}
            onChange={(v) => updateSource('workflow_key', v || null)}
            placeholder="e.g. intellectual_genealogy"
            mono
          />
          <NumberField
            label="Phase Number"
            value={view.data_source.phase_number || 0}
            onChange={(v) => updateSource('phase_number', v || null)}
            step={0.5}
          />
          <TextField
            label="Engine Key"
            value={view.data_source.engine_key || ''}
            onChange={(v) => updateSource('engine_key', v || null)}
            placeholder="e.g. concept_analyzer"
            mono
          />
          <TextField
            label="Chain Key"
            value={view.data_source.chain_key || ''}
            onChange={(v) => updateSource('chain_key', v || null)}
            placeholder="e.g. genealogy_synthesis"
            mono
          />
        </div>
        <TextField
          label="Result Path"
          value={view.data_source.result_path}
          onChange={(v) => updateSource('result_path', v)}
          placeholder="JSONPath expression, e.g. ideas[*].vocabulary"
          mono
        />
        <SelectField
          label="Scope"
          value={view.data_source.scope}
          onChange={(v) => updateSource('scope', v)}
          options={[
            { value: 'aggregated', label: 'Aggregated (single result)' },
            { value: 'per_item', label: 'Per Item (one result per input)' },
          ]}
        />
      </div>

      {/* Secondary Sources */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Secondary Sources ({view.secondary_sources.length})
          </h3>
          <button onClick={addSecondarySource} className="btn-secondary text-sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Source
          </button>
        </div>
        {view.secondary_sources.map((source, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-md p-4 space-y-3 relative"
          >
            <button
              onClick={() => removeSecondary(i)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs font-medium text-gray-500">Source #{i + 1}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label="Workflow Key"
                value={source.workflow_key || ''}
                onChange={(v) =>
                  updateSecondary(i, 'workflow_key', v || null)
                }
                mono
              />
              <NumberField
                label="Phase Number"
                value={source.phase_number || 0}
                onChange={(v) =>
                  updateSecondary(i, 'phase_number', v || null)
                }
                step={0.5}
              />
              <TextField
                label="Engine Key"
                value={source.engine_key || ''}
                onChange={(v) =>
                  updateSecondary(i, 'engine_key', v || null)
                }
                mono
              />
              <TextField
                label="Result Path"
                value={source.result_path}
                onChange={(v) => updateSecondary(i, 'result_path', v)}
                mono
              />
            </div>
          </div>
        ))}
        {view.secondary_sources.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No secondary sources configured.
          </p>
        )}
      </div>
    </div>
  );
}

function TransformationTab({
  view,
  onChange,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
}) {
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);

  // Fetch transformation templates for the "Apply Template" dropdown
  const { data: templates } = useQuery({
    queryKey: ['transformations'],
    queryFn: () => api.transformations.list(),
  });

  const handleApplyTemplate = async (templateKey: string) => {
    if (!templateKey) return;
    setApplyingTemplate(true);
    try {
      const template = await api.transformations.get(templateKey);
      // One-time copy: transfer template spec fields into view's transformation
      onChange({
        ...view,
        transformation: {
          type: template.transformation_type,
          field_mapping: template.field_mapping || null,
          llm_extraction_schema: template.llm_extraction_schema || null,
          llm_prompt_template: template.llm_prompt_template || null,
          stance_key: template.stance_key || null,
        },
      });
      setAppliedTemplateName(template.template_name);
      setTimeout(() => setAppliedTemplateName(null), 3000);
    } catch (e) {
      console.error('Failed to apply template:', e);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const updateTransform = (field: keyof TransformationSpec, value: unknown) => {
    onChange({
      ...view,
      transformation: { ...view.transformation, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Apply Template Section */}
      {templates && templates.length > 0 && (
        <div className="card p-4 bg-teal-50 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-800 mb-1">
                Apply Transformation Template
              </p>
              <p className="text-xs text-teal-600">
                One-time copy of a template's spec into this view. Fields can be edited after applying.
              </p>
            </div>
            <select
              onChange={(e) => handleApplyTemplate(e.target.value)}
              value=""
              disabled={applyingTemplate}
              className="input w-auto min-w-[220px] text-sm"
            >
              <option value="">Select template...</option>
              {templates.map((t: TransformationTemplateSummary) => (
                <option key={t.template_key} value={t.template_key}>
                  {t.template_name} ({t.transformation_type})
                </option>
              ))}
            </select>
          </div>
          {appliedTemplateName && (
            <p className="text-xs text-teal-700 mt-2 font-medium">
              Applied "{appliedTemplateName}" — fields copied below. Remember to save.
            </p>
          )}
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Transformation</h3>
        <SelectField
          label="Type"
          value={view.transformation.type}
          onChange={(v) => updateTransform('type', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'schema_map', label: 'Schema Map' },
            { value: 'llm_extract', label: 'LLM Extract' },
            { value: 'llm_summarize', label: 'LLM Summarize' },
            { value: 'aggregate', label: 'Aggregate' },
          ]}
        />

        {(view.transformation.type === 'schema_map' ||
          view.transformation.type === 'llm_extract') && (
          <JsonEditor
            label="Field Mapping"
            value={
              (view.transformation.field_mapping as Record<string, unknown>) ||
              null
            }
            onChange={(v) => updateTransform('field_mapping', v)}
          />
        )}

        {view.transformation.type === 'llm_extract' && (
          <JsonEditor
            label="LLM Extraction Schema"
            value={view.transformation.llm_extraction_schema || null}
            onChange={(v) => updateTransform('llm_extraction_schema', v)}
          />
        )}

        {(view.transformation.type === 'llm_extract' ||
          view.transformation.type === 'llm_summarize') && (
          <TextField
            label="LLM Prompt Template"
            value={view.transformation.llm_prompt_template || ''}
            onChange={(v) =>
              updateTransform('llm_prompt_template', v || null)
            }
            multiline
            placeholder="Supports {data}, {stance}, {format} placeholders"
          />
        )}

        <TextField
          label="Stance Key Override"
          value={view.transformation.stance_key || ''}
          onChange={(v) => updateTransform('stance_key', v || null)}
          placeholder="Override parent view's presentation_stance"
          mono
        />
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Presentation Stance
        </h3>
        <TextField
          label="Presentation Stance"
          value={view.presentation_stance || ''}
          onChange={(v) =>
            onChange({ ...view, presentation_stance: v || null })
          }
          placeholder="summary, evidence, comparison, narrative, interactive, diagnostic"
          mono
        />
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Audience Overrides
        </h3>
        <JsonEditor
          label="Audience Overrides (JSON)"
          value={view.audience_overrides}
          onChange={(v) =>
            onChange({
              ...view,
              audience_overrides: v as Record<
                string,
                Record<string, unknown>
              >,
            })
          }
        />
      </div>
    </div>
  );
}

function PreviewTab({ view }: { view: ViewDefinition }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          View Definition Preview
        </h3>
        <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono text-gray-700 overflow-x-auto max-h-[600px] overflow-y-auto">
          {JSON.stringify(view, null, 2)}
        </pre>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Composition Tree Position
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">App:</span>
            <span className="font-medium">{view.target_app}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Page:</span>
            <span className="font-medium">{view.target_page}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Section:</span>
            <span className="font-medium">{view.target_section}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Position:</span>
            <span className="font-medium">{view.position}</span>
          </div>
          {view.parent_view_key && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Parent:</span>
              <Link
                href={`/views/${view.parent_view_key}`}
                className="text-primary-600 hover:underline font-medium"
              >
                {view.parent_view_key}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Visibility:</span>
            <span className="font-medium">{view.visibility}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Renderer:</span>
            <span className="font-medium">{view.renderer_type}</span>
          </div>
          {view.presentation_stance && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Stance:</span>
              <span className="font-medium">{view.presentation_stance}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Default new view template
// ============================================================================

function createEmptyView(): ViewDefinition {
  return {
    view_key: '',
    view_name: '',
    description: '',
    version: 1,
    target_app: 'generic',
    target_page: '',
    target_section: 'results',
    renderer_type: 'prose',
    renderer_config: {},
    data_source: {
      workflow_key: null,
      phase_number: null,
      engine_key: null,
      chain_key: null,
      result_path: '',
      scope: 'aggregated',
    },
    secondary_sources: [],
    transformation: {
      type: 'none',
      field_mapping: null,
      llm_extraction_schema: null,
      llm_prompt_template: null,
      stance_key: null,
    },
    presentation_stance: null,
    position: 0,
    parent_view_key: null,
    tab_count_field: null,
    visibility: 'if_data_exists',
    audience_overrides: {},
    status: 'draft',
    tags: [],
    source_project: null,
  };
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ViewDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();
  const isCreate = key === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [hasChanges, setHasChanges] = useState(false);
  const [localView, setLocalView] = useState<ViewDefinition | null>(
    isCreate ? createEmptyView() : null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch existing view (skip for create mode)
  const {
    data: view,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['views', key],
    queryFn: () => api.views.get(key as string),
    enabled: !!key && !isCreate,
  });

  // Fetch all views for parent dropdown
  const { data: allViews } = useQuery({
    queryKey: ['views'],
    queryFn: () => api.views.list(),
  });

  // Initialize local state when view data loads
  useEffect(() => {
    if (view && !localView) {
      setLocalView(view);
    }
  }, [view, localView]);

  // Initialize for create mode
  useEffect(() => {
    if (isCreate && !localView) {
      setLocalView(createEmptyView());
    }
  }, [isCreate, localView]);

  const updateMutation = useMutation({
    mutationFn: (data: ViewDefinition) =>
      isCreate
        ? api.views.create(data)
        : api.views.update(key as string, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['views', key] });
      queryClient.invalidateQueries({ queryKey: ['views'] });
      setLocalView(updated);
      setHasChanges(false);
      if (isCreate) {
        router.push(`/views/${updated.view_key}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.views.delete(key as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views'] });
      router.push('/views');
    },
  });

  const handleChange = useCallback((updated: ViewDefinition) => {
    setLocalView(updated);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (localView) {
      updateMutation.mutate(localView);
    }
  }, [localView, updateMutation]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  if (!isCreate && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isCreate && (error || !view)) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        View not found
      </div>
    );
  }

  const displayView = localView || view || createEmptyView();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/views"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCreate ? 'Create New View' : displayView.view_name}
            </h1>
            {!isCreate && (
              <p className="mt-1 text-gray-500 font-mono text-sm">
                {displayView.view_key}
              </p>
            )}
            {!isCreate && (
              <div className="mt-2 flex items-center gap-2">
                <span className="badge badge-primary">
                  {displayView.renderer_type}
                </span>
                <span className="badge badge-gray">
                  {displayView.target_app}:{displayView.target_page}
                </span>
                <span className="badge badge-gray">v{displayView.version}</span>
                <span
                  className={clsx(
                    'badge',
                    displayView.status === 'active'
                      ? 'badge-success'
                      : displayView.status === 'draft'
                      ? 'badge-warning'
                      : 'badge-gray'
                  )}
                >
                  {displayView.status}
                </span>
                {displayView.presentation_stance && (
                  <span className="badge badge-primary">
                    {displayView.presentation_stance}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCreate && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-red-200 rounded-md shadow-lg p-4 z-10 w-64">
                  <p className="text-sm text-gray-700 mb-3">
                    Delete this view definition? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="btn-primary bg-red-600 hover:bg-red-700 text-sm flex-1"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary text-sm flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {hasChanges && (
            <span className="text-sm text-amber-600 mr-2">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={
              (!hasChanges && !isCreate) || updateMutation.isPending
            }
            className="btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending
              ? 'Saving...'
              : isCreate
              ? 'Create'
              : 'Save'}
          </button>
        </div>
      </div>

      {/* Save success/error messages */}
      {updateMutation.isSuccess && !hasChanges && !isCreate && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
          Changes saved successfully.
        </div>
      )}
      {updateMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
          Failed to save:{' '}
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : 'Unknown error'}
        </div>
      )}
      {deleteMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
          Failed to delete:{' '}
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : 'Unknown error'}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'identity' && (
        <IdentityTab
          view={displayView}
          onChange={handleChange}
          isCreate={isCreate}
        />
      )}
      {activeTab === 'target' && (
        <TargetTab
          view={displayView}
          onChange={handleChange}
          allViews={allViews || []}
        />
      )}
      {activeTab === 'renderer' && (
        <RendererTab view={displayView} onChange={handleChange} allViews={allViews || []} />
      )}
      {activeTab === 'data_source' && (
        <DataSourceTab view={displayView} onChange={handleChange} />
      )}
      {activeTab === 'transformation' && (
        <TransformationTab view={displayView} onChange={handleChange} />
      )}
      {activeTab === 'preview' && <PreviewTab view={displayView} />}
    </div>
  );
}
