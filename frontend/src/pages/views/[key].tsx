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
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ViewDefinition, DataSourceRef, TransformationSpec, TransformationTemplateSummary } from '@/types';
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

function RendererTab({
  view,
  onChange,
}: {
  view: ViewDefinition;
  onChange: (view: ViewDefinition) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Renderer</h3>
        <SelectField
          label="Renderer Type"
          value={view.renderer_type}
          onChange={(v) => onChange({ ...view, renderer_type: v })}
          options={[
            { value: 'tab', label: 'Tab' },
            { value: 'card_grid', label: 'Card Grid' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'prose', label: 'Prose' },
            { value: 'matrix', label: 'Matrix' },
            { value: 'accordion', label: 'Accordion' },
            { value: 'card', label: 'Card' },
            { value: 'stat_summary', label: 'Stat Summary' },
            { value: 'table', label: 'Table' },
            { value: 'raw_json', label: 'Raw JSON' },
          ]}
        />
        <JsonEditor
          label="Renderer Config"
          value={view.renderer_config}
          onChange={(v) => onChange({ ...view, renderer_config: v })}
        />
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
        <RendererTab view={displayView} onChange={handleChange} />
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
