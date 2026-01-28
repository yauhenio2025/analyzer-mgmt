import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Paradigm, StructuredSuggestion, SuggestionResponse } from '@/types';
import SuggestionPanel from '@/components/SuggestionPanel';
import clsx from 'clsx';

interface SuggestionState {
  layerName: LayerName;
  fieldKey: string;
  fieldLabel: string;
  response: SuggestionResponse;
}

type LayerName = 'foundational' | 'structural' | 'dynamic' | 'explanatory';

interface LayerConfig {
  name: LayerName;
  title: string;
  color: string;
  fields: { key: string; label: string }[];
}

const LAYERS: LayerConfig[] = [
  {
    name: 'foundational',
    title: 'Foundational',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    fields: [
      { key: 'assumptions', label: 'Core Assumptions' },
      { key: 'core_tensions', label: 'Core Tensions' },
      { key: 'scope_conditions', label: 'Scope Conditions' },
    ],
  },
  {
    name: 'structural',
    title: 'Structural',
    color: 'bg-purple-100 border-purple-300 text-purple-800',
    fields: [
      { key: 'primary_entities', label: 'Primary Entities' },
      { key: 'relations', label: 'Relations' },
      { key: 'levels_of_analysis', label: 'Levels of Analysis' },
    ],
  },
  {
    name: 'dynamic',
    title: 'Dynamic',
    color: 'bg-green-100 border-green-300 text-green-800',
    fields: [
      { key: 'change_mechanisms', label: 'Change Mechanisms' },
      { key: 'temporal_patterns', label: 'Temporal Patterns' },
      { key: 'transformation_processes', label: 'Transformation Processes' },
    ],
  },
  {
    name: 'explanatory',
    title: 'Explanatory',
    color: 'bg-amber-100 border-amber-300 text-amber-800',
    fields: [
      { key: 'key_concepts', label: 'Key Concepts' },
      { key: 'analytical_methods', label: 'Analytical Methods' },
      { key: 'problem_diagnosis', label: 'Problem Diagnosis' },
      { key: 'ideal_state', label: 'Ideal State' },
    ],
  },
];

interface LayerEditorProps {
  config: LayerConfig;
  data: Record<string, string[]>;
  onChange: (fieldKey: string, items: string[]) => void;
  onAskAI: (fieldKey: string, fieldLabel: string) => void;
  loadingField: string | null;
  suggestions: SuggestionState | null;
  onAcceptSuggestion: (suggestion: StructuredSuggestion, editedContent?: string) => void;
  onDismissSuggestion: (suggestion: StructuredSuggestion) => void;
  onDismissAllSuggestions: () => void;
  onAcceptAllSuggestions: () => void;
}

function LayerEditor({
  config,
  data,
  onChange,
  onAskAI,
  loadingField,
  suggestions,
  onAcceptSuggestion,
  onDismissSuggestion,
  onDismissAllSuggestions,
  onAcceptAllSuggestions,
}: LayerEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = (fieldKey: string) => {
    if (newItem.trim()) {
      const currentItems = data[fieldKey] || [];
      onChange(fieldKey, [...currentItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (fieldKey: string, index: number) => {
    const currentItems = data[fieldKey] || [];
    onChange(fieldKey, currentItems.filter((_, i) => i !== index));
  };

  const isLoadingThisField = (fieldKey: string) => loadingField === `${config.name}.${fieldKey}`;
  const getSuggestionsForField = (fieldKey: string) =>
    suggestions?.layerName === config.name && suggestions?.fieldKey === fieldKey ? suggestions : null;

  return (
    <div className={clsx('border-2 rounded-lg overflow-hidden', config.color.split(' ')[1])}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={clsx('w-full px-4 py-3 flex items-center justify-between', config.color)}
      >
        <span className="font-semibold">{config.title}</span>
        {expanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          {config.fields.map((field) => {
            const fieldSuggestions = getSuggestionsForField(field.key);
            const isLoading = isLoadingThisField(field.key);

            return (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <button
                    onClick={() => onAskAI(field.key, field.label)}
                    disabled={isLoading}
                    className={clsx(
                      "text-xs flex items-center",
                      isLoading
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-primary-600 hover:text-primary-700"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Getting suggestions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Suggest with AI
                      </>
                    )}
                  </button>
                </div>

                {/* AI Suggestions Panel - New structured format */}
                {fieldSuggestions && fieldSuggestions.response.suggestions.length > 0 && (
                  <div className="mb-3">
                    <SuggestionPanel
                      response={fieldSuggestions.response}
                      fieldLabel={fieldSuggestions.fieldLabel}
                      onAccept={onAcceptSuggestion}
                      onDismiss={onDismissSuggestion}
                      onDismissAll={onDismissAllSuggestions}
                      onAcceptAll={onAcceptAllSuggestions}
                      onClose={onDismissAllSuggestions}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {(data[field.key] || []).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => handleRemoveItem(field.key, index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {editingField === field.key ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem(field.key)}
                        placeholder={`Add ${field.label.toLowerCase()}...`}
                        className="input flex-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddItem(field.key)}
                        className="btn-primary py-1 px-2"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingField(null);
                          setNewItem('');
                        }}
                        className="btn-secondary py-1 px-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingField(field.key)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ParadigmDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();

  const [hasChanges, setHasChanges] = useState(false);
  const [localParadigm, setLocalParadigm] = useState<Partial<Paradigm> | null>(null);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [currentSuggestions, setCurrentSuggestions] = useState<SuggestionState | null>(null);

  const { data: paradigm, isLoading, error } = useQuery({
    queryKey: ['paradigms', key],
    queryFn: () => api.paradigms.get(key as string),
    enabled: !!key,
    onSuccess: (data) => {
      if (!localParadigm) {
        setLocalParadigm(data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Paradigm>) => api.paradigms.update(key as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paradigms', key] });
      setHasChanges(false);
    },
  });

  const handleLayerChange = useCallback(
    (layerName: LayerName, fieldKey: string, items: string[]) => {
      setLocalParadigm((prev) => {
        if (!prev) return prev;
        const layer = { ...(prev[layerName] as Record<string, string[]>) };
        layer[fieldKey] = items;
        return { ...prev, [layerName]: layer };
      });
      setHasChanges(true);
    },
    []
  );

  const handleAskAI = useCallback(
    async (layerName: LayerName, fieldKey: string, fieldLabel: string) => {
      const loadingKey = `${layerName}.${fieldKey}`;
      setLoadingField(loadingKey);
      setCurrentSuggestions(null);

      try {
        const result = await api.llm.paradigmSuggestions(
          key as string,
          `Suggest additions for ${fieldLabel} in the ${layerName} layer`,
          layerName,
          fieldKey
        );

        // Initialize status for each suggestion
        const suggestionsWithStatus = result.suggestions.map((s) => ({
          ...s,
          status: 'pending' as const,
        }));

        setCurrentSuggestions({
          layerName,
          fieldKey,
          fieldLabel,
          response: {
            ...result,
            suggestions: suggestionsWithStatus,
          },
        });
      } catch (error) {
        console.error('Failed to get AI suggestion:', error);
        // Show error in the panel
        setCurrentSuggestions({
          layerName,
          fieldKey,
          fieldLabel,
          response: {
            paradigm_key: key as string,
            query: '',
            layer: layerName,
            field: fieldKey,
            suggestions: [{
              id: 'error',
              title: 'Error',
              content: error instanceof Error ? error.message : 'Failed to get suggestions',
              rationale: 'An error occurred while fetching suggestions.',
              connections: [],
              confidence: 0,
              status: 'pending' as const,
            }],
            analysis_summary: 'An error occurred.',
          },
        });
      } finally {
        setLoadingField(null);
      }
    },
    [key]
  );

  const handleAcceptSuggestion = useCallback(
    (suggestion: StructuredSuggestion, editedContent?: string) => {
      if (!currentSuggestions || !localParadigm) return;

      const { layerName, fieldKey } = currentSuggestions;
      const layer = { ...(localParadigm[layerName] as Record<string, string[]>) };
      const currentItems = layer[fieldKey] || [];
      const contentToAdd = editedContent || suggestion.content;
      layer[fieldKey] = [...currentItems, contentToAdd];

      setLocalParadigm((prev) => prev ? { ...prev, [layerName]: layer } : prev);
      setHasChanges(true);

      // Mark suggestion as accepted and remove from list
      setCurrentSuggestions((prev) => {
        if (!prev) return null;
        const remaining = prev.response.suggestions.filter((s) => s.id !== suggestion.id);
        if (remaining.length === 0) return null;
        return {
          ...prev,
          response: { ...prev.response, suggestions: remaining },
        };
      });
    },
    [currentSuggestions, localParadigm]
  );

  const handleDismissSuggestion = useCallback(
    (suggestion: StructuredSuggestion) => {
      setCurrentSuggestions((prev) => {
        if (!prev) return null;
        const remaining = prev.response.suggestions.filter((s) => s.id !== suggestion.id);
        if (remaining.length === 0) return null;
        return {
          ...prev,
          response: { ...prev.response, suggestions: remaining },
        };
      });
    },
    []
  );

  const handleDismissAllSuggestions = useCallback(() => {
    setCurrentSuggestions(null);
  }, []);

  const handleAcceptAllSuggestions = useCallback(() => {
    if (!currentSuggestions || !localParadigm) return;

    const { layerName, fieldKey, response } = currentSuggestions;
    const layer = { ...(localParadigm[layerName] as Record<string, string[]>) };
    const currentItems = layer[fieldKey] || [];
    const newItems = response.suggestions.map((s) => s.content);
    layer[fieldKey] = [...currentItems, ...newItems];

    setLocalParadigm((prev) => prev ? { ...prev, [layerName]: layer } : prev);
    setHasChanges(true);
    setCurrentSuggestions(null);
  }, [currentSuggestions, localParadigm]);

  const handleSave = useCallback(() => {
    if (localParadigm) {
      updateMutation.mutate({
        foundational: localParadigm.foundational,
        structural: localParadigm.structural,
        dynamic: localParadigm.dynamic,
        explanatory: localParadigm.explanatory,
      });
    }
  }, [localParadigm, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !paradigm) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Paradigm not found
      </div>
    );
  }

  const displayParadigm = localParadigm || paradigm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/paradigms"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{paradigm.paradigm_name}</h1>
            <p className="mt-1 text-gray-500">{paradigm.guiding_thinkers}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge badge-gray">v{paradigm.version}</span>
              {paradigm.active_traits.map((trait) => (
                <span key={trait} className="badge badge-success">
                  {trait.replace('_trait', '')}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 mr-2">Unsaved changes</span>
          )}
          <button
            onClick={() => handleAskAI('foundational', 'assumptions', 'Core Assumptions')}
            className="btn-secondary"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI
          </button>
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
        <p className="text-gray-700">{paradigm.description}</p>
      </div>

      {/* 4-Layer Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {LAYERS.map((config) => (
          <LayerEditor
            key={config.name}
            config={config}
            data={displayParadigm[config.name] as Record<string, string[]>}
            onChange={(fieldKey, items) => handleLayerChange(config.name, fieldKey, items)}
            onAskAI={(fieldKey, fieldLabel) => handleAskAI(config.name, fieldKey, fieldLabel)}
            loadingField={loadingField}
            suggestions={currentSuggestions}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onDismissAllSuggestions={handleDismissAllSuggestions}
            onAcceptAllSuggestions={handleAcceptAllSuggestions}
          />
        ))}
      </div>

      {/* Traits Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traits</h3>
        <div className="space-y-4">
          {paradigm.trait_definitions.map((trait) => (
            <div key={trait.trait_name} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{trait.trait_name}</h4>
              <p className="text-sm text-gray-600 mt-1">{trait.trait_description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {trait.trait_items.map((item, i) => (
                  <span key={i} className="badge badge-gray text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critique Patterns */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Critique Patterns</h3>
          <button
            onClick={() => api.llm.generateCritiquePatterns(key as string)}
            className="btn-secondary text-sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </button>
        </div>
        <div className="space-y-3">
          {paradigm.critique_patterns.map((pattern, index) => (
            <div key={index} className="border rounded-lg p-4">
              <p className="font-medium text-gray-900">{pattern.pattern}</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Diagnostic:</span> {pattern.diagnostic}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Fix:</span> {pattern.fix}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Associated Engines */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Associated Engines</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Engines</h4>
            <div className="flex flex-wrap gap-2">
              {paradigm.primary_engines.map((engine) => (
                <Link
                  key={engine}
                  href={`/engines/${engine}`}
                  className="badge badge-primary hover:bg-primary-200"
                >
                  {engine}
                </Link>
              ))}
              {paradigm.primary_engines.length === 0 && (
                <span className="text-sm text-gray-500">None assigned</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Compatible Engines</h4>
            <div className="flex flex-wrap gap-2">
              {paradigm.compatible_engines.map((engine) => (
                <Link
                  key={engine}
                  href={`/engines/${engine}`}
                  className="badge badge-gray hover:bg-gray-200"
                >
                  {engine}
                </Link>
              ))}
              {paradigm.compatible_engines.length === 0 && (
                <span className="text-sm text-gray-500">None assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
