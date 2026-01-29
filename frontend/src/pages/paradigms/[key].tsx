import { useState, useCallback, useEffect } from 'react';
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
  GitBranch,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Paradigm, StructuredSuggestion, SuggestionResponse } from '@/types';
import SuggestionPanel from '@/components/SuggestionPanel';
import BranchParadigmModal from '@/components/paradigms/BranchParadigmModal';
import BranchGenerationProgress from '@/components/paradigms/BranchGenerationProgress';
import ParadigmLineage from '@/components/paradigms/ParadigmLineage';
import clsx from 'clsx';

// Helper to format field items with entity names bolded
function FormatFieldItem({ text }: { text: string }) {
  // Match patterns like "Entity Name - definition" or "Entity Name: definition"
  const dashMatch = text.match(/^([^-–—:]+)\s*[-–—:]\s*(.+)$/s);

  if (dashMatch) {
    const [, entity, definition] = dashMatch;
    return (
      <>
        <span className="font-semibold text-slate-900">{entity.trim()}</span>
        <span className="text-slate-400 mx-1">-</span>
        <span className="text-slate-600">{definition.trim()}</span>
      </>
    );
  }

  // No pattern detected, return as-is
  return <>{text}</>;
}

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
  fields: { key: string; label: string }[];
}

const LAYERS: LayerConfig[] = [
  {
    name: 'foundational',
    title: 'Foundational',
    fields: [
      { key: 'assumptions', label: 'Core Assumptions' },
      { key: 'core_tensions', label: 'Core Tensions' },
      { key: 'scope_conditions', label: 'Scope Conditions' },
    ],
  },
  {
    name: 'structural',
    title: 'Structural',
    fields: [
      { key: 'primary_entities', label: 'Primary Entities' },
      { key: 'relations', label: 'Relations' },
      { key: 'levels_of_analysis', label: 'Levels of Analysis' },
    ],
  },
  {
    name: 'dynamic',
    title: 'Dynamic',
    fields: [
      { key: 'change_mechanisms', label: 'Change Mechanisms' },
      { key: 'temporal_patterns', label: 'Temporal Patterns' },
      { key: 'transformation_processes', label: 'Transformation Processes' },
    ],
  },
  {
    name: 'explanatory',
    title: 'Explanatory',
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
    <div className={clsx('layer-section', `layer-${config.name}`)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="layer-header w-full"
      >
        <span className="layer-title">{config.title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 opacity-70" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-70" />
        )}
      </button>

      {expanded && (
        <div className="layer-content space-y-6">
          {config.fields.map((field) => {
            const fieldSuggestions = getSuggestionsForField(field.key);
            const isLoading = isLoadingThisField(field.key);

            return (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-3">
                  <label className="field-label">{field.label}</label>
                  <button
                    onClick={() => onAskAI(field.key, field.label)}
                    disabled={isLoading}
                    className={clsx(
                      "suggest-btn",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Suggest with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Suggestions Panel */}
                {fieldSuggestions && fieldSuggestions.response.suggestions.length > 0 && (
                  <div className="mb-4">
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
                      className="field-item group"
                    >
                      <span className="flex-1 leading-relaxed">
                        <FormatFieldItem text={item} />
                      </span>
                      <button
                        onClick={() => handleRemoveItem(field.key, index)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="input flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddItem(field.key)}
                        className="btn-primary py-2 px-3"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingField(null);
                          setNewItem('');
                        }}
                        className="btn-secondary py-2 px-3"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingField(field.key)}
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add item</span>
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
  const [showBranchModal, setShowBranchModal] = useState(false);

  const { data: paradigm, isLoading, error } = useQuery({
    queryKey: ['paradigms', key],
    queryFn: () => api.paradigms.get(key as string),
    enabled: !!key,
  });

  useEffect(() => {
    if (paradigm && !localParadigm) {
      setLocalParadigm(paradigm);
    }
  }, [paradigm, localParadigm]);

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
        const layer = { ...(prev[layerName] as unknown as unknown as Record<string, string[]>) };
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
      const layer = { ...(localParadigm[layerName] as unknown as Record<string, string[]>) };
      const currentItems = layer[fieldKey] || [];
      const contentToAdd = editedContent || suggestion.content;
      layer[fieldKey] = [...currentItems, contentToAdd];

      setLocalParadigm((prev) => prev ? { ...prev, [layerName]: layer } : prev);
      setHasChanges(true);

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
    const layer = { ...(localParadigm[layerName] as unknown as Record<string, string[]>) };
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

  const handleBranchCreated = useCallback((branchKey: string) => {
    router.push(`/paradigms/${branchKey}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !paradigm) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="font-medium">Paradigm not found</span>
      </div>
    );
  }

  const displayParadigm = localParadigm || paradigm;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/paradigms"
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {paradigm.paradigm_name}
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm leading-relaxed max-w-2xl">
              {paradigm.guiding_thinkers}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-gray">v{paradigm.version}</span>
              {paradigm.active_traits.map((trait) => (
                <span key={trait} className="badge bg-slate-800 text-white">
                  {trait.replace('_trait', '')}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm font-medium text-amber-600">Unsaved changes</span>
          )}
          <button
            onClick={() => setShowBranchModal(true)}
            className="btn-secondary"
            title="Create a derivative paradigm"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Create Branch
          </button>
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
      <div className="card p-6">
        <p className="text-slate-600 leading-relaxed">{paradigm.description}</p>
      </div>

      {/* Generation Progress */}
      {paradigm.generation_status === 'generating' && (
        <BranchGenerationProgress
          paradigmKey={paradigm.paradigm_key}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['paradigms', key] });
          }}
        />
      )}

      {/* Lineage Section */}
      <ParadigmLineage paradigmKey={paradigm.paradigm_key} />

      {/* 4-Layer Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {LAYERS.map((config) => (
          <LayerEditor
            key={config.name}
            config={config}
            data={displayParadigm[config.name] as unknown as Record<string, string[]>}
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
        <h3 className="text-base font-bold text-slate-900 mb-5">Traits</h3>
        <div className="space-y-4">
          {paradigm.trait_definitions.map((trait) => (
            <div key={trait.trait_name} className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900">{trait.trait_name}</h4>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{trait.trait_description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
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
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">Critique Patterns</h3>
          <button
            onClick={() => api.llm.generateCritiquePatterns(key as string)}
            className="btn-secondary text-sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </button>
        </div>
        <div className="space-y-4">
          {paradigm.critique_patterns.map((pattern, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4">
              <p className="font-semibold text-slate-900">{pattern.pattern}</p>
              <p className="text-sm text-slate-600 mt-2">
                <span className="font-semibold text-slate-700">Diagnostic:</span> {pattern.diagnostic}
              </p>
              <p className="text-sm text-slate-600 mt-1.5">
                <span className="font-semibold text-slate-700">Fix:</span> {pattern.fix}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Associated Engines */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-5">Associated Engines</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="section-header">Primary Engines</h4>
            <div className="flex flex-wrap gap-2">
              {paradigm.primary_engines.map((engine) => (
                <Link
                  key={engine}
                  href={`/engines/${engine}`}
                  className="badge badge-primary hover:bg-slate-200 transition-colors"
                >
                  {engine}
                </Link>
              ))}
              {paradigm.primary_engines.length === 0 && (
                <span className="text-sm text-slate-400">None assigned</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="section-header">Compatible Engines</h4>
            <div className="flex flex-wrap gap-2">
              {paradigm.compatible_engines.map((engine) => (
                <Link
                  key={engine}
                  href={`/engines/${engine}`}
                  className="badge badge-gray hover:bg-slate-200 transition-colors"
                >
                  {engine}
                </Link>
              ))}
              {paradigm.compatible_engines.length === 0 && (
                <span className="text-sm text-slate-400">None assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Modal */}
      <BranchParadigmModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        parentParadigm={paradigm}
        onBranchCreated={handleBranchCreated}
      />
    </div>
  );
}
