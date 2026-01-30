/**
 * EngineProfileEditor Component
 *
 * Rich visual editor for engine profile/about section.
 * Includes theoretical foundations, key thinkers, methodology,
 * use cases, strengths, limitations, and related engines.
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Trash2,
  Info,
  BookOpen,
  Users,
  Compass,
  Target,
  Lightbulb,
  AlertTriangle,
  Link2,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  EngineProfile,
  TheoreticalFoundation,
  KeyThinker,
  Methodology,
  EngineExtracts,
  UseCase,
  RelatedEngine,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

interface EngineProfileEditorProps {
  profile: EngineProfile | null;
  onChange: (updated: EngineProfile) => void;
  onGenerateWithAI?: () => void;
  onImproveField?: (field: string) => void;
  isGenerating?: boolean;
  isImproving?: string | null;
}

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
}

// ============================================================================
// Helper Components
// ============================================================================

function CollapsibleSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  action,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <div onClick={(e) => e.stopPropagation()}>{action}</div>
          )}
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
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
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
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
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
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

// ============================================================================
// Main Component
// ============================================================================

const DEFAULT_PROFILE: EngineProfile = {
  theoretical_foundations: [],
  key_thinkers: [],
  methodology: undefined,
  extracts: undefined,
  use_cases: [],
  strengths: [],
  limitations: [],
  related_engines: [],
  preamble: '',
};

export function EngineProfileEditor({
  profile,
  onChange,
  onGenerateWithAI,
  onImproveField,
  isGenerating,
  isImproving,
}: EngineProfileEditorProps) {
  const currentProfile = profile || DEFAULT_PROFILE;

  const updateProfile = useCallback(
    (updates: Partial<EngineProfile>) => {
      onChange({ ...currentProfile, ...updates });
    },
    [currentProfile, onChange]
  );

  // Theoretical Foundations handlers
  const addFoundation = () => {
    updateProfile({
      theoretical_foundations: [
        ...currentProfile.theoretical_foundations,
        { name: '', description: '', source_thinker: '' },
      ],
    });
  };

  const updateFoundation = (index: number, updates: Partial<TheoreticalFoundation>) => {
    const updated = [...currentProfile.theoretical_foundations];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ theoretical_foundations: updated });
  };

  const removeFoundation = (index: number) => {
    updateProfile({
      theoretical_foundations: currentProfile.theoretical_foundations.filter((_, i) => i !== index),
    });
  };

  // Key Thinkers handlers
  const addThinker = () => {
    updateProfile({
      key_thinkers: [
        ...currentProfile.key_thinkers,
        { name: '', contribution: '', works: [] },
      ],
    });
  };

  const updateThinker = (index: number, updates: Partial<KeyThinker>) => {
    const updated = [...currentProfile.key_thinkers];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ key_thinkers: updated });
  };

  const removeThinker = (index: number) => {
    updateProfile({
      key_thinkers: currentProfile.key_thinkers.filter((_, i) => i !== index),
    });
  };

  // Use Cases handlers
  const addUseCase = () => {
    updateProfile({
      use_cases: [
        ...currentProfile.use_cases,
        { domain: '', description: '', example: '' },
      ],
    });
  };

  const updateUseCase = (index: number, updates: Partial<UseCase>) => {
    const updated = [...currentProfile.use_cases];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ use_cases: updated });
  };

  const removeUseCase = (index: number) => {
    updateProfile({
      use_cases: currentProfile.use_cases.filter((_, i) => i !== index),
    });
  };

  // Related Engines handlers
  const addRelatedEngine = () => {
    updateProfile({
      related_engines: [
        ...currentProfile.related_engines,
        { engine_key: '', relationship: 'complementary' },
      ],
    });
  };

  const updateRelatedEngine = (index: number, updates: Partial<RelatedEngine>) => {
    const updated = [...currentProfile.related_engines];
    updated[index] = { ...updated[index], ...updates } as RelatedEngine;
    updateProfile({ related_engines: updated });
  };

  const removeRelatedEngine = (index: number) => {
    updateProfile({
      related_engines: currentProfile.related_engines.filter((_, i) => i !== index),
    });
  };

  // Methodology handlers
  const updateMethodology = (updates: Partial<Methodology>) => {
    const current = currentProfile.methodology || { approach: '', key_moves: [], conceptual_tools: [] };
    updateProfile({ methodology: { ...current, ...updates } });
  };

  // Extracts handlers
  const updateExtracts = (updates: Partial<EngineExtracts>) => {
    const current = currentProfile.extracts || { primary_outputs: [], secondary_outputs: [], relationships: [] };
    updateProfile({ extracts: { ...current, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* Generate with AI button */}
      {onGenerateWithAI && (
        <div className="flex justify-end">
          <button
            onClick={onGenerateWithAI}
            disabled={isGenerating}
            className="btn-primary"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Profile with AI'}
          </button>
        </div>
      )}

      {/* Theoretical Foundations */}
      <CollapsibleSection
        title="Theoretical Foundations"
        icon={<BookOpen className="h-4 w-4 text-gray-500" />}
        action={
          onImproveField && (
            <button
              onClick={() => onImproveField('theoretical_foundations')}
              disabled={isImproving === 'theoretical_foundations'}
              className="btn-secondary text-xs py-1 px-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Enhance
            </button>
          )
        }
      >
        <div className="space-y-4">
          {currentProfile.theoretical_foundations.map((foundation, index) => (
            <div key={index} className="p-3 border rounded-lg bg-white space-y-2">
              <div className="flex justify-between items-start">
                <input
                  type="text"
                  value={foundation.name}
                  onChange={(e) => updateFoundation(index, { name: e.target.value })}
                  placeholder="Foundation name"
                  className="input text-sm font-medium flex-1"
                />
                <button
                  onClick={() => removeFoundation(index)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={foundation.description}
                onChange={(e) => updateFoundation(index, { description: e.target.value })}
                placeholder="Brief explanation of this foundation..."
                className="input text-sm w-full"
                rows={2}
              />
              <input
                type="text"
                value={foundation.source_thinker || ''}
                onChange={(e) => updateFoundation(index, { source_thinker: e.target.value })}
                placeholder="Source thinker (optional)"
                className="input text-sm w-full"
              />
            </div>
          ))}
          <button
            onClick={addFoundation}
            className="btn-secondary text-sm w-full"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Foundation
          </button>
        </div>
      </CollapsibleSection>

      {/* Key Thinkers */}
      <CollapsibleSection
        title="Key Thinkers"
        icon={<Users className="h-4 w-4 text-gray-500" />}
        action={
          onImproveField && (
            <button
              onClick={() => onImproveField('key_thinkers')}
              disabled={isImproving === 'key_thinkers'}
              className="btn-secondary text-xs py-1 px-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Suggest More
            </button>
          )
        }
      >
        <div className="space-y-4">
          {currentProfile.key_thinkers.map((thinker, index) => (
            <div key={index} className="p-3 border rounded-lg bg-white space-y-2">
              <div className="flex justify-between items-start">
                <input
                  type="text"
                  value={thinker.name}
                  onChange={(e) => updateThinker(index, { name: e.target.value })}
                  placeholder="Thinker name"
                  className="input text-sm font-medium flex-1"
                />
                <button
                  onClick={() => removeThinker(index)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={thinker.contribution}
                onChange={(e) => updateThinker(index, { contribution: e.target.value })}
                placeholder="Their contribution to this approach..."
                className="input text-sm w-full"
                rows={2}
              />
              <div className="text-xs text-gray-500">Works (comma-separated)</div>
              <input
                type="text"
                value={(thinker.works || []).join(', ')}
                onChange={(e) =>
                  updateThinker(index, {
                    works: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Key Work 1, Key Work 2..."
                className="input text-sm w-full"
              />
            </div>
          ))}
          <button onClick={addThinker} className="btn-secondary text-sm w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Thinker
          </button>
        </div>
      </CollapsibleSection>

      {/* Methodology */}
      <CollapsibleSection
        title="Methodology"
        icon={<Compass className="h-4 w-4 text-gray-500" />}
        action={
          onImproveField && (
            <button
              onClick={() => onImproveField('methodology')}
              disabled={isImproving === 'methodology'}
              className="btn-secondary text-xs py-1 px-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Improve
            </button>
          )
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approach</label>
            <textarea
              value={currentProfile.methodology?.approach || ''}
              onChange={(e) => updateMethodology({ approach: e.target.value })}
              placeholder="Plain-language description of the methodology (2-3 sentences)"
              className="input w-full text-sm"
              rows={3}
            />
          </div>
          <StringListEditor
            label="Key Moves"
            items={currentProfile.methodology?.key_moves || []}
            onChange={(key_moves) => updateMethodology({ key_moves })}
            placeholder="Add analytical step..."
          />
          <StringListEditor
            label="Conceptual Tools"
            items={currentProfile.methodology?.conceptual_tools || []}
            onChange={(conceptual_tools) => updateMethodology({ conceptual_tools })}
            placeholder="Add conceptual tool..."
          />
        </div>
      </CollapsibleSection>

      {/* What It Extracts */}
      <CollapsibleSection
        title="What It Extracts"
        icon={<Target className="h-4 w-4 text-gray-500" />}
      >
        <div className="space-y-4">
          <StringListEditor
            label="Primary Outputs"
            items={currentProfile.extracts?.primary_outputs || []}
            onChange={(primary_outputs) => updateExtracts({ primary_outputs })}
            placeholder="Main thing the engine extracts..."
          />
          <StringListEditor
            label="Secondary Outputs"
            items={currentProfile.extracts?.secondary_outputs || []}
            onChange={(secondary_outputs) => updateExtracts({ secondary_outputs })}
            placeholder="Supporting extraction..."
          />
          <StringListEditor
            label="Relationships"
            items={currentProfile.extracts?.relationships || []}
            onChange={(relationships) => updateExtracts({ relationships })}
            placeholder="Type of relationship identified..."
          />
        </div>
      </CollapsibleSection>

      {/* Use Cases */}
      <CollapsibleSection
        title="Use Cases"
        icon={<Lightbulb className="h-4 w-4 text-gray-500" />}
        action={
          onImproveField && (
            <button
              onClick={() => onImproveField('use_cases')}
              disabled={isImproving === 'use_cases'}
              className="btn-secondary text-xs py-1 px-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Suggest More
            </button>
          )
        }
      >
        <div className="space-y-4">
          {currentProfile.use_cases.map((useCase, index) => (
            <div key={index} className="p-3 border rounded-lg bg-white space-y-2">
              <div className="flex justify-between items-start">
                <input
                  type="text"
                  value={useCase.domain}
                  onChange={(e) => updateUseCase(index, { domain: e.target.value })}
                  placeholder="Domain (e.g., Policy Analysis)"
                  className="input text-sm font-medium flex-1"
                />
                <button
                  onClick={() => removeUseCase(index)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={useCase.description}
                onChange={(e) => updateUseCase(index, { description: e.target.value })}
                placeholder="How the engine helps in this domain..."
                className="input text-sm w-full"
                rows={2}
              />
              <input
                type="text"
                value={useCase.example || ''}
                onChange={(e) => updateUseCase(index, { example: e.target.value })}
                placeholder="Concrete example (optional)"
                className="input text-sm w-full"
              />
            </div>
          ))}
          <button onClick={addUseCase} className="btn-secondary text-sm w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Use Case
          </button>
        </div>
      </CollapsibleSection>

      {/* Strengths */}
      <CollapsibleSection
        title="Strengths"
        icon={<Lightbulb className="h-4 w-4 text-green-500" />}
      >
        <StringListEditor
          label=""
          items={currentProfile.strengths}
          onChange={(strengths) => updateProfile({ strengths })}
          placeholder="Add a strength..."
        />
      </CollapsibleSection>

      {/* Limitations */}
      <CollapsibleSection
        title="Limitations"
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
      >
        <StringListEditor
          label=""
          items={currentProfile.limitations}
          onChange={(limitations) => updateProfile({ limitations })}
          placeholder="Add a limitation..."
        />
      </CollapsibleSection>

      {/* Related Engines */}
      <CollapsibleSection
        title="Related Engines"
        icon={<Link2 className="h-4 w-4 text-gray-500" />}
      >
        <div className="space-y-4">
          {currentProfile.related_engines.map((related, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={related.engine_key}
                onChange={(e) => updateRelatedEngine(index, { engine_key: e.target.value })}
                placeholder="engine_key"
                className="input text-sm flex-1"
              />
              <select
                value={related.relationship}
                onChange={(e) =>
                  updateRelatedEngine(index, {
                    relationship: e.target.value as RelatedEngine['relationship'],
                  })
                }
                className="input text-sm"
              >
                <option value="complementary">Complementary</option>
                <option value="alternative">Alternative</option>
                <option value="prerequisite">Prerequisite</option>
                <option value="extends">Extends</option>
              </select>
              <button
                onClick={() => removeRelatedEngine(index)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button onClick={addRelatedEngine} className="btn-secondary text-sm w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Related Engine
          </button>
        </div>
      </CollapsibleSection>

      {/* Preamble */}
      <CollapsibleSection
        title="Preamble"
        icon={<FileText className="h-4 w-4 text-gray-500" />}
        defaultExpanded={false}
      >
        <div>
          <p className="text-xs text-gray-500 mb-2">
            A brief paragraph that can be injected into prompts to provide context about this engine's approach.
          </p>
          <textarea
            value={currentProfile.preamble}
            onChange={(e) => updateProfile({ preamble: e.target.value })}
            placeholder="This engine uses inferentialist methods to map..."
            className="input w-full text-sm"
            rows={4}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
