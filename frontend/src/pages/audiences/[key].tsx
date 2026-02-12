import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AudienceDefinition } from '@/types';
import clsx from 'clsx';

// ============================================================================
// Tab Types & Component
// ============================================================================

type TabId =
  | 'profile'
  | 'affinities'
  | 'visual'
  | 'textual'
  | 'curation'
  | 'strategist'
  | 'patterns'
  | 'vocabulary';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'affinities', label: 'Engine Affinities' },
  { id: 'visual', label: 'Visual Style' },
  { id: 'textual', label: 'Textual Style' },
  { id: 'curation', label: 'Curation' },
  { id: 'strategist', label: 'Strategist' },
  { id: 'patterns', label: 'Pattern Discovery' },
  { id: 'vocabulary', label: 'Vocabulary' },
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input min-h-[80px]"
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ListEditor({
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

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
          >
            <span className="flex-1 text-sm text-gray-700">{item}</span>
            <button
              onClick={() => handleRemove(index)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input flex-1"
            placeholder={placeholder || 'Add item...'}
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
    </div>
  );
}

function WeightsEditor({
  label,
  weights,
  onChange,
}: {
  label: string;
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}) {
  const [newKey, setNewKey] = useState('');

  const handleWeightChange = (key: string, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleRemove = (key: string) => {
    const updated = { ...weights };
    delete updated[key];
    onChange(updated);
  };

  const handleAdd = () => {
    const trimmed = newKey.trim();
    if (trimmed && !(trimmed in weights)) {
      onChange({ ...weights, [trimmed]: 1.0 });
      setNewKey('');
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {Object.entries(weights)
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                {key}
              </span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={value}
                onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-500 min-w-[40px] text-right">
                {value.toFixed(1)}
              </span>
              <button
                onClick={() => handleRemove(key)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="input flex-1"
            placeholder="Add category..."
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim()}
            className="btn-secondary py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

function ProfileTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateIdentity = (field: string, value: unknown) => {
    onChange({
      ...audience,
      identity: { ...audience.identity, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Identity</h3>
        <ListEditor
          label="Core Questions"
          items={audience.identity.core_questions}
          onChange={(items) => updateIdentity('core_questions', items)}
          placeholder="Add a core question..."
        />
        <ListEditor
          label="Priorities"
          items={audience.identity.priorities}
          onChange={(items) => updateIdentity('priorities', items)}
          placeholder="Add a priority..."
        />
        <ListEditor
          label="Deprioritize"
          items={audience.identity.deprioritize}
          onChange={(items) => updateIdentity('deprioritize', items)}
          placeholder="Add item to deprioritize..."
        />
        <TextField
          label="Detail Level"
          value={audience.identity.detail_level}
          onChange={(value) => updateIdentity('detail_level', value)}
        />
      </div>
    </div>
  );
}

function AffinitiesTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateAffinities = (field: string, value: unknown) => {
    onChange({
      ...audience,
      engine_affinities: { ...audience.engine_affinities, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Engine Affinities</h3>
        <ListEditor
          label="Preferred Categories"
          items={audience.engine_affinities.preferred_categories}
          onChange={(items) => updateAffinities('preferred_categories', items)}
          placeholder="Add preferred category..."
        />
        <ListEditor
          label="High Affinity Engines"
          items={audience.engine_affinities.high_affinity_engines}
          onChange={(items) => updateAffinities('high_affinity_engines', items)}
          placeholder="Add high-affinity engine key..."
        />
        <ListEditor
          label="Low Affinity Engines"
          items={audience.engine_affinities.low_affinity_engines}
          onChange={(items) => updateAffinities('low_affinity_engines', items)}
          placeholder="Add low-affinity engine key..."
        />
      </div>
      <div className="card p-6">
        <WeightsEditor
          label="Category Weights"
          weights={audience.engine_affinities.category_weights}
          onChange={(weights) => updateAffinities('category_weights', weights)}
        />
      </div>
    </div>
  );
}

function VisualStyleTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateVisual = (field: string, value: unknown) => {
    onChange({
      ...audience,
      visual_style: { ...audience.visual_style, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Visual Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Style Preference"
            value={audience.visual_style.style_preference}
            onChange={(v) => updateVisual('style_preference', v)}
          />
          <TextField
            label="Aesthetic"
            value={audience.visual_style.aesthetic}
            onChange={(v) => updateVisual('aesthetic', v)}
          />
          <TextField
            label="Color Palette"
            value={audience.visual_style.color_palette}
            onChange={(v) => updateVisual('color_palette', v)}
          />
          <TextField
            label="Typography"
            value={audience.visual_style.typography}
            onChange={(v) => updateVisual('typography', v)}
          />
          <TextField
            label="Layout"
            value={audience.visual_style.layout}
            onChange={(v) => updateVisual('layout', v)}
          />
          <TextField
            label="Information Density"
            value={audience.visual_style.information_density}
            onChange={(v) => updateVisual('information_density', v)}
          />
        </div>
        <TextField
          label="Visual Elements"
          value={audience.visual_style.visual_elements}
          onChange={(v) => updateVisual('visual_elements', v)}
          multiline
        />
        <TextField
          label="Emotional Tone"
          value={audience.visual_style.emotional_tone}
          onChange={(v) => updateVisual('emotional_tone', v)}
        />
        <TextField
          label="Key Principle"
          value={audience.visual_style.key_principle}
          onChange={(v) => updateVisual('key_principle', v)}
          multiline
        />
        <ListEditor
          label="Style Affinities"
          items={audience.visual_style.style_affinities}
          onChange={(items) => updateVisual('style_affinities', items)}
          placeholder="Add style affinity..."
        />
      </div>
    </div>
  );
}

function TextualStyleTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateTextual = (field: string, value: string) => {
    onChange({
      ...audience,
      textual_style: { ...audience.textual_style, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Textual Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Voice"
            value={audience.textual_style.voice}
            onChange={(v) => updateTextual('voice', v)}
          />
          <TextField
            label="Structure"
            value={audience.textual_style.structure}
            onChange={(v) => updateTextual('structure', v)}
          />
          <TextField
            label="Sentence Style"
            value={audience.textual_style.sentence_style}
            onChange={(v) => updateTextual('sentence_style', v)}
          />
          <TextField
            label="Opening Style"
            value={audience.textual_style.opening_style}
            onChange={(v) => updateTextual('opening_style', v)}
          />
          <TextField
            label="Word Count Guidance"
            value={audience.textual_style.word_count_guidance}
            onChange={(v) => updateTextual('word_count_guidance', v)}
          />
        </div>
        <TextField
          label="Evidence Handling"
          value={audience.textual_style.evidence_handling}
          onChange={(v) => updateTextual('evidence_handling', v)}
          multiline
        />
        <TextField
          label="What to Emphasize"
          value={audience.textual_style.what_to_emphasize}
          onChange={(v) => updateTextual('what_to_emphasize', v)}
          multiline
        />
        <TextField
          label="What to Avoid"
          value={audience.textual_style.what_to_avoid}
          onChange={(v) => updateTextual('what_to_avoid', v)}
          multiline
        />
        <TextField
          label="Key Principle"
          value={audience.textual_style.key_principle}
          onChange={(v) => updateTextual('key_principle', v)}
          multiline
        />
      </div>
    </div>
  );
}

function CurationTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateCuration = (field: string, value: string) => {
    onChange({
      ...audience,
      curation: { ...audience.curation, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Curation Guidance</h3>
        <TextField
          label="Curation Emphasis"
          value={audience.curation.curation_emphasis}
          onChange={(v) => updateCuration('curation_emphasis', v)}
          multiline
        />
        <TextField
          label="Fidelity Constraint"
          value={audience.curation.fidelity_constraint}
          onChange={(v) => updateCuration('fidelity_constraint', v)}
          multiline
        />
      </div>
    </div>
  );
}

function StrategistTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updateStrategist = (field: string, value: unknown) => {
    onChange({
      ...audience,
      strategist: { ...audience.strategist, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Strategist Guidance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Number of Visualizations"
            value={audience.strategist.num_visualizations}
            onChange={(v) => updateStrategist('num_visualizations', v)}
          />
          <TextField
            label="Visualization Complexity"
            value={audience.strategist.visualization_complexity}
            onChange={(v) => updateStrategist('visualization_complexity', v)}
          />
        </div>
        <ListEditor
          label="Table Purposes"
          items={audience.strategist.table_purposes}
          onChange={(items) => updateStrategist('table_purposes', items)}
          placeholder="Add table purpose..."
        />
        <TextField
          label="Table Differentiation"
          value={audience.strategist.table_differentiation}
          onChange={(v) => updateStrategist('table_differentiation', v)}
          multiline
        />
        <TextField
          label="Narrative Focus"
          value={audience.strategist.narrative_focus}
          onChange={(v) => updateStrategist('narrative_focus', v)}
          multiline
        />
        <TextField
          label="What Matters Most"
          value={audience.strategist.what_matters_most}
          onChange={(v) => updateStrategist('what_matters_most', v)}
          multiline
        />
        <TextField
          label="What to Avoid in Strategy"
          value={audience.strategist.what_to_avoid_in_strategy}
          onChange={(v) => updateStrategist('what_to_avoid_in_strategy', v)}
          multiline
        />
      </div>
    </div>
  );
}

function PatternDiscoveryTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const updatePatterns = (field: string, value: unknown) => {
    onChange({
      ...audience,
      pattern_discovery: { ...audience.pattern_discovery, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Pattern Discovery</h3>
        <ListEditor
          label="Pattern Types Priority"
          items={audience.pattern_discovery.pattern_types_priority}
          onChange={(items) => updatePatterns('pattern_types_priority', items)}
          placeholder="Add pattern type..."
        />
        <TextField
          label="Meta-Insight Focus"
          value={audience.pattern_discovery.meta_insight_focus}
          onChange={(v) => updatePatterns('meta_insight_focus', v)}
          multiline
        />
        <TextField
          label="What Counts as Significant"
          value={audience.pattern_discovery.what_counts_as_significant}
          onChange={(v) => updatePatterns('what_counts_as_significant', v)}
          multiline
        />
        <TextField
          label="Surprise Definition"
          value={audience.pattern_discovery.surprise_definition}
          onChange={(v) => updatePatterns('surprise_definition', v)}
          multiline
        />
      </div>
    </div>
  );
}

function VocabularyTab({
  audience,
  onChange,
}: {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}) {
  const [vocabSearch, setVocabSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 50;

  const translations = audience.vocabulary.translations;
  const translationEntries = useMemo(
    () =>
      Object.entries(translations).sort(([a], [b]) =>
        a.localeCompare(b)
      ),
    [translations]
  );

  const filteredEntries = useMemo(() => {
    if (!vocabSearch) return translationEntries;
    const lower = vocabSearch.toLowerCase();
    return translationEntries.filter(
      ([key, value]) =>
        key.toLowerCase().includes(lower) || value.toLowerCase().includes(lower)
    );
  }, [translationEntries, vocabSearch]);

  const displayedEntries = showAll
    ? filteredEntries
    : filteredEntries.slice(0, PAGE_SIZE);

  const updateVocabulary = (field: string, value: unknown) => {
    onChange({
      ...audience,
      vocabulary: { ...audience.vocabulary, [field]: value },
    });
  };

  const handleTranslationChange = (key: string, newValue: string) => {
    const updated = { ...translations, [key]: newValue };
    updateVocabulary('translations', updated);
  };

  const handleTranslationRemove = (key: string) => {
    const updated = { ...translations };
    delete updated[key];
    updateVocabulary('translations', updated);
  };

  const [newTermKey, setNewTermKey] = useState('');
  const [newTermValue, setNewTermValue] = useState('');

  const handleAddTranslation = () => {
    if (newTermKey.trim() && newTermValue.trim()) {
      const updated = { ...translations, [newTermKey.trim()]: newTermValue.trim() };
      updateVocabulary('translations', updated);
      setNewTermKey('');
      setNewTermValue('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Vocabulary Guidance</h3>
        <TextField
          label="Guidance Intro"
          value={audience.vocabulary.guidance_intro}
          onChange={(v) => updateVocabulary('guidance_intro', v)}
          multiline
        />
        <TextField
          label="Guidance Outro"
          value={audience.vocabulary.guidance_outro}
          onChange={(v) => updateVocabulary('guidance_outro', v)}
          multiline
        />
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Translations ({translationEntries.length} terms)
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search translations..."
            value={vocabSearch}
            onChange={(e) => setVocabSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Add new translation */}
        <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Standard Term</label>
            <input
              type="text"
              value={newTermKey}
              onChange={(e) => setNewTermKey(e.target.value)}
              className="input mt-1"
              placeholder="e.g. analysis"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Translation</label>
            <input
              type="text"
              value={newTermValue}
              onChange={(e) => setNewTermValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTranslation();
                }
              }}
              className="input mt-1"
              placeholder="e.g. investigation"
            />
          </div>
          <button
            onClick={handleAddTranslation}
            disabled={!newTermKey.trim() || !newTermValue.trim()}
            className="btn-secondary py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Translation table */}
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Standard Term
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Translation
                </th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedEntries.map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {key}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleTranslationChange(key, e.target.value)}
                      className="text-sm text-gray-700 bg-transparent border-0 border-b border-transparent focus:border-primary-500 focus:ring-0 w-full px-0 py-0.5"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleTranslationRemove(key)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show more / pagination info */}
        {filteredEntries.length > PAGE_SIZE && !showAll && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Show all {filteredEntries.length} entries (showing {PAGE_SIZE})
            </button>
          </div>
        )}
        {showAll && filteredEntries.length > PAGE_SIZE && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Show first {PAGE_SIZE} only
            </button>
          </div>
        )}
        {vocabSearch && filteredEntries.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            No translations matching &ldquo;{vocabSearch}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AudienceDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [localAudience, setLocalAudience] = useState<AudienceDefinition | null>(null);

  const { data: audience, isLoading, error } = useQuery({
    queryKey: ['audiences', key],
    queryFn: () => api.audiences.get(key as string),
    enabled: !!key,
  });

  // Initialize local state when audience data loads
  useEffect(() => {
    if (audience && !localAudience) {
      setLocalAudience(audience);
    }
  }, [audience, localAudience]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AudienceDefinition>) =>
      api.audiences.update(key as string, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['audiences', key] });
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      setLocalAudience(updated);
      setHasChanges(false);
    },
  });

  const handleChange = useCallback((updated: AudienceDefinition) => {
    setLocalAudience(updated);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (localAudience) {
      updateMutation.mutate(localAudience);
    }
  }, [localAudience, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !audience) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Audience not found
      </div>
    );
  }

  const displayAudience = localAudience || audience;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/audiences"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {audience.audience_name}
            </h1>
            <p className="mt-1 text-gray-500">{audience.audience_key}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge badge-primary capitalize">
                {audience.identity.detail_level}
              </span>
              <span className="badge badge-gray capitalize">
                {audience.visual_style.style_preference}
              </span>
              <span className="badge badge-gray">v{audience.version}</span>
              <span className="badge badge-success capitalize">{audience.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 mr-2">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="card p-4">
        <p className="text-gray-700">{audience.description}</p>
      </div>

      {/* Save success/error messages */}
      {updateMutation.isSuccess && !hasChanges && (
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
      {activeTab === 'profile' && (
        <ProfileTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'affinities' && (
        <AffinitiesTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'visual' && (
        <VisualStyleTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'textual' && (
        <TextualStyleTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'curation' && (
        <CurationTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'strategist' && (
        <StrategistTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'patterns' && (
        <PatternDiscoveryTab audience={displayAudience} onChange={handleChange} />
      )}
      {activeTab === 'vocabulary' && (
        <VocabularyTab audience={displayAudience} onChange={handleChange} />
      )}
    </div>
  );
}
