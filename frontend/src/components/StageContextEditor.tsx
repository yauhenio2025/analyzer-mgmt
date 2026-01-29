/**
 * StageContextEditor Component
 *
 * Provides UI for editing stage_context fields that are used
 * to compose prompts at runtime using Jinja2 templates.
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import clsx from 'clsx';
import type { StageContext, ExtractionContext, CurationContext, ConcretizationContext } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface StageContextEditorProps {
  stageContext: StageContext;
  onChange: (updated: StageContext) => void;
  onImproveField?: (stage: string, field: string) => void;
  isImproving?: string | null; // Currently improving field
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  helpText?: string;
  onImprove?: () => void;
  isImproving?: boolean;
}

interface KeyValueEditorProps {
  label: string;
  items: Record<string, string>;
  onChange: (items: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  helpText?: string;
}

interface IdExampleEditorProps {
  items: Array<{ from: string; to: string }>;
  onChange: (items: Array<{ from: string; to: string }>) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

function CollapsibleSection({ title, subtitle, children, defaultExpanded = true }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left"
      >
        <div>
          <span className="font-medium text-gray-900">{title}</span>
          {subtitle && (
            <span className="ml-2 text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder = 'Add item...',
  helpText,
  onImprove,
  isImproving,
}: StringListEditorProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {onImprove && (
          <button
            onClick={onImprove}
            disabled={isImproving}
            className="btn-secondary text-xs py-1 px-2"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {isImproving ? 'Improving...' : 'Improve'}
          </button>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="h-3 w-3" /> {helpText}
        </p>
      )}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={(e) => handleUpdate(index, e.target.value)}
              className="input flex-1 text-sm"
            />
            <button
              onClick={() => handleRemove(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm w-6">{items.length + 1}.</span>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={placeholder}
            className="input flex-1 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyValueEditor({
  label,
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  helpText,
}: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(items);

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      onChange({ ...items, [newKey.trim()]: newValue.trim() });
      setNewKey('');
      setNewValue('');
    }
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = items;
    onChange(rest);
  };

  const handleUpdate = (oldKey: string, newKeyValue: string, value: string) => {
    const { [oldKey]: _, ...rest } = items;
    onChange({ ...rest, [newKeyValue]: value });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {helpText && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="h-3 w-3" /> {helpText}
        </p>
      )}
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => handleUpdate(key, e.target.value, value)}
              className="input w-1/3 text-sm"
              placeholder={keyPlaceholder}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleUpdate(key, key, e.target.value)}
              className="input flex-1 text-sm"
              placeholder={valuePlaceholder}
            />
            <button
              onClick={() => handleRemove(key)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="input w-1/3 text-sm"
            placeholder={keyPlaceholder}
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="input flex-1 text-sm"
            placeholder={valuePlaceholder}
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim() || !newValue.trim()}
            className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IdExampleEditor({ items, onChange }: IdExampleEditorProps) {
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  const handleAdd = () => {
    if (newFrom.trim() && newTo.trim()) {
      onChange([...items, { from: newFrom.trim(), to: newTo.trim() }]);
      setNewFrom('');
      setNewTo('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        ID Transformation Examples
      </label>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Info className="h-3 w-3" /> Examples of how to transform abstract IDs into concrete names
      </p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded w-20">{item.from}</code>
            <span className="text-gray-400">→</span>
            <input
              type="text"
              value={item.to}
              onChange={(e) => {
                const updated = [...items];
                updated[index] = { ...item, to: e.target.value };
                onChange(updated);
              }}
              className="input flex-1 text-sm"
            />
            <button
              onClick={() => handleRemove(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            className="input w-20 text-sm font-mono"
            placeholder="C1"
          />
          <span className="text-gray-400">→</span>
          <input
            type="text"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="input flex-1 text-sm"
            placeholder="The 'Clear Description' commitment"
          />
          <button
            onClick={handleAdd}
            disabled={!newFrom.trim() || !newTo.trim()}
            className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StageContextEditor({
  stageContext,
  onChange,
  onImproveField,
  isImproving,
}: StageContextEditorProps) {
  // Helper to update nested fields
  const updateExtraction = useCallback(
    (updates: Partial<ExtractionContext>) => {
      onChange({
        ...stageContext,
        extraction: { ...stageContext.extraction, ...updates },
      });
    },
    [stageContext, onChange]
  );

  const updateCuration = useCallback(
    (updates: Partial<CurationContext>) => {
      onChange({
        ...stageContext,
        curation: { ...stageContext.curation, ...updates },
      });
    },
    [stageContext, onChange]
  );

  const updateConcretization = useCallback(
    (updates: Partial<ConcretizationContext>) => {
      onChange({
        ...stageContext,
        concretization: { ...stageContext.concretization, ...updates },
      });
    },
    [stageContext, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Framework Selection */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-4">Framework Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Framework
            </label>
            <select
              value={stageContext.framework_key || ''}
              onChange={(e) =>
                onChange({ ...stageContext, framework_key: e.target.value || undefined })
              }
              className="input"
            >
              <option value="">None</option>
              <option value="brandomian">Brandomian Inferentialism</option>
              <option value="dennett">Dennett's Critical Toolkit</option>
              <option value="toulmin">Toulmin Argumentation Model</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skip Concretization
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={stageContext.skip_concretization}
                onChange={(e) =>
                  onChange({ ...stageContext, skip_concretization: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">
                Skip the concretization stage for this engine
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Extraction Context */}
      <CollapsibleSection title="Extraction Context" subtitle="What to extract from documents">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Type
            </label>
            <input
              type="text"
              value={stageContext.extraction.analysis_type}
              onChange={(e) => updateExtraction({ analysis_type: e.target.value })}
              className="input"
              placeholder="inferential commitments"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Type (Plural)
            </label>
            <input
              type="text"
              value={stageContext.extraction.analysis_type_plural}
              onChange={(e) => updateExtraction({ analysis_type_plural: e.target.value })}
              className="input"
              placeholder="inferential commitments"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Core Question
          </label>
          <textarea
            value={stageContext.extraction.core_question}
            onChange={(e) => updateExtraction({ core_question: e.target.value })}
            className="input"
            rows={2}
            placeholder="What are you really signing up for when you accept this claim?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Field Name
            </label>
            <input
              type="text"
              value={stageContext.extraction.id_field}
              onChange={(e) => updateExtraction({ id_field: e.target.value })}
              className="input font-mono text-sm"
              placeholder="commitment_id"
            />
          </div>
        </div>

        <StringListEditor
          label="Extraction Steps"
          items={stageContext.extraction.extraction_steps}
          onChange={(items) => updateExtraction({ extraction_steps: items })}
          placeholder="Add extraction step..."
          helpText="Numbered steps the LLM follows during extraction"
          onImprove={onImproveField ? () => onImproveField('extraction', 'extraction_steps') : undefined}
          isImproving={isImproving === 'extraction.extraction_steps'}
        />

        <StringListEditor
          label="Key Relationships"
          items={stageContext.extraction.key_relationships}
          onChange={(items) => updateExtraction({ key_relationships: items })}
          placeholder="Add relationship type..."
          helpText="Relationship types to identify between items"
        />

        <KeyValueEditor
          label="Key Fields"
          items={stageContext.extraction.key_fields}
          onChange={(items) => updateExtraction({ key_fields: items })}
          keyPlaceholder="Field name"
          valuePlaceholder="Description"
          helpText="Output fields and their descriptions"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            value={stageContext.extraction.special_instructions || ''}
            onChange={(e) => updateExtraction({ special_instructions: e.target.value || undefined })}
            className="input"
            rows={3}
            placeholder="Any additional engine-specific extraction instructions..."
          />
        </div>
      </CollapsibleSection>

      {/* Curation Context */}
      <CollapsibleSection title="Curation Context" subtitle="How to synthesize across documents">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Type
            </label>
            <input
              type="text"
              value={stageContext.curation.item_type}
              onChange={(e) => updateCuration({ item_type: e.target.value })}
              className="input"
              placeholder="inferential commitment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Type (Plural)
            </label>
            <input
              type="text"
              value={stageContext.curation.item_type_plural}
              onChange={(e) => updateCuration({ item_type_plural: e.target.value })}
              className="input"
              placeholder="inferential commitments"
            />
          </div>
        </div>

        <StringListEditor
          label="Consolidation Rules"
          items={stageContext.curation.consolidation_rules}
          onChange={(items) => updateCuration({ consolidation_rules: items })}
          placeholder="Add consolidation rule..."
          helpText="Rules for merging/deduplicating items across documents"
        />

        <StringListEditor
          label="Cross-Document Patterns"
          items={stageContext.curation.cross_doc_patterns}
          onChange={(items) => updateCuration({ cross_doc_patterns: items })}
          placeholder="Add pattern..."
          helpText="Patterns to identify across documents"
        />

        <StringListEditor
          label="Synthesis Outputs"
          items={stageContext.curation.synthesis_outputs}
          onChange={(items) => updateCuration({ synthesis_outputs: items })}
          placeholder="Add output..."
          helpText="Named outputs to produce"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            value={stageContext.curation.special_instructions || ''}
            onChange={(e) => updateCuration({ special_instructions: e.target.value || undefined })}
            className="input"
            rows={3}
            placeholder="Any additional engine-specific curation instructions..."
          />
        </div>
      </CollapsibleSection>

      {/* Concretization Context */}
      {!stageContext.skip_concretization && (
        <CollapsibleSection title="Concretization Context" subtitle="How to make output vivid">
          <IdExampleEditor
            items={stageContext.concretization.id_examples}
            onChange={(items) => updateConcretization({ id_examples: items })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naming Guidance
            </label>
            <textarea
              value={stageContext.concretization.naming_guidance}
              onChange={(e) => updateConcretization({ naming_guidance: e.target.value })}
              className="input"
              rows={3}
              placeholder="Guidance for creating vivid, concrete names..."
            />
          </div>

          <StringListEditor
            label="Recommended Table Types"
            items={stageContext.concretization.recommended_table_types}
            onChange={(items) => updateConcretization({ recommended_table_types: items })}
            placeholder="Add table type..."
            helpText="Table types for visualizing this engine's output"
          />

          <StringListEditor
            label="Recommended Visual Patterns"
            items={stageContext.concretization.recommended_visual_patterns}
            onChange={(items) => updateConcretization({ recommended_visual_patterns: items })}
            placeholder="Add visual pattern..."
            helpText="Graph/diagram patterns for visualization"
          />
        </CollapsibleSection>
      )}
    </div>
  );
}

export default StageContextEditor;
