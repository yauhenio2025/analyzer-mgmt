import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  History,
  Users,
  Sparkles,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Engine, EngineUpdate, StageContext, AudienceType, EngineProfile, CapabilityEngineDefinition } from '@/types';
import clsx from 'clsx';
import { StageContextEditor } from '@/components/StageContextEditor';
import { EngineProfileEditor } from '@/components/EngineProfileEditor';

// Dynamic import for Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type TabId = 'about' | 'capability' | 'context' | 'preview' | 'schema' | 'consumers' | 'history';

interface TabProps {
  id: TabId;
  label: string;
  active: boolean;
  onClick: () => void;
}

function Tab({ id, label, active, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
    </button>
  );
}

function SchemaViewer({ schema }: { schema: Record<string, unknown> }) {
  return (
    <div className="h-[600px] border rounded-lg overflow-hidden">
      <MonacoEditor
        height="100%"
        language="json"
        value={JSON.stringify(schema, null, 2)}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          folding: true,
        }}
        theme="vs-light"
      />
    </div>
  );
}

/** Convert snake_case to Title Case */
function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function DimensionCard({ dimension, index }: { dimension: CapabilityEngineDefinition['analytical_dimensions'][number]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const depthOrder = ['surface', 'standard', 'deep'];
  const depthColors: Record<string, string> = {
    surface: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    standard: 'bg-blue-50 text-blue-700 border-blue-200',
    deep: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{humanize(dimension.key)}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{dimension.description}</p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 mr-1">
          {dimension.probing_questions.length} questions
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-700 leading-relaxed">{dimension.description}</p>

          {dimension.probing_questions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Probing Questions</p>
              <div className="space-y-1.5">
                {dimension.probing_questions.map((q, i) => (
                  <p key={i} className="text-sm text-gray-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-gray-300">
                    {q}
                  </p>
                ))}
              </div>
            </div>
          )}

          {Object.keys(dimension.depth_guidance).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Depth Guidance</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {depthOrder
                  .filter(level => dimension.depth_guidance[level])
                  .map((level) => (
                    <div key={level} className={`rounded-md border p-2.5 ${depthColors[level] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1">{level}</p>
                      <p className="text-xs leading-relaxed opacity-90">{dimension.depth_guidance[level]}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EngineDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [hasChanges, setHasChanges] = useState(false);
  const [localEngine, setLocalEngine] = useState<Partial<Engine> | null>(null);
  const [localProfile, setLocalProfile] = useState<EngineProfile | null>(null);
  const [previewAudience, setPreviewAudience] = useState<AudienceType>('analyst');

  const { data: engine, isLoading, error } = useQuery({
    queryKey: ['engines', key],
    queryFn: () => api.engines.get(key as string),
    enabled: !!key,
  });

  // Query for profile
  const { data: profileData } = useQuery({
    queryKey: ['engines', key, 'profile'],
    queryFn: () => api.engines.getProfile(key as string),
    enabled: !!key,
  });

  // Query for capability definition (v2 prose-mode definition)
  const { data: capabilityDef } = useQuery({
    queryKey: ['engines', key, 'capability-definition'],
    queryFn: () => api.engines.getCapabilityDefinition(key as string),
    enabled: !!key,
  });

  // Query for capability prompt (only when viewing capability tab)
  const [capabilityDepth, setCapabilityDepth] = useState<string>('standard');
  const { data: capabilityPrompt } = useQuery({
    queryKey: ['engines', key, 'capability-prompt', capabilityDepth],
    queryFn: () => api.engines.getCapabilityPrompt(key as string, capabilityDepth),
    enabled: !!key && activeTab === 'capability' && !!capabilityDef,
  });

  // Initialize local state when engine data loads
  useEffect(() => {
    if (engine && !localEngine) {
      setLocalEngine(engine);
    }
  }, [engine, localEngine]);

  // Initialize profile when profile data loads
  useEffect(() => {
    if (profileData?.has_profile && profileData.profile && !localProfile) {
      setLocalProfile(profileData.profile);
    }
  }, [profileData, localProfile]);

  // Query for composed prompts (preview tab)
  const { data: extractionPreview } = useQuery({
    queryKey: ['engines', key, 'extraction-prompt', previewAudience],
    queryFn: () => api.engines.getPrompt(key as string, 'extraction', previewAudience),
    enabled: !!key && activeTab === 'preview' && !!engine?.stage_context,
  });

  const { data: curationPreview } = useQuery({
    queryKey: ['engines', key, 'curation-prompt', previewAudience],
    queryFn: () => api.engines.getPrompt(key as string, 'curation', previewAudience),
    enabled: !!key && activeTab === 'preview' && !!engine?.stage_context,
  });

  const { data: consumers } = useQuery({
    queryKey: ['consumers', 'by-construct', 'engine', key],
    queryFn: async () => {
      try {
        return await api.consumers.getByConstruct('engine', key as string);
      } catch {
        // Engine may only exist in analyzer-v2, not in mgmt DB
        return { construct_type: 'engine', construct_key: key as string, consumers: [], total: 0 };
      }
    },
    enabled: !!key && activeTab === 'consumers',
  });

  const { data: versions } = useQuery({
    queryKey: ['engines', key, 'versions'],
    queryFn: async () => {
      try {
        return await api.engines.getVersions(key as string);
      } catch {
        // Engine may only exist in analyzer-v2, not in mgmt DB
        return { engine_key: key as string, current_version: 0, versions: [] };
      }
    },
    enabled: !!key && activeTab === 'history',
  });

  const updateMutation = useMutation({
    mutationFn: (data: EngineUpdate) => api.engines.update(key as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', key] });
      setHasChanges(false);
    },
  });

  const generateProfileMutation = useMutation({
    mutationFn: () => api.llm.generateProfile(key as string),
    onSuccess: (data) => {
      setLocalProfile(data.profile);
      setHasChanges(true);
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: (profile: EngineProfile) => api.engines.saveProfile(key as string, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', key, 'profile'] });
      setHasChanges(false);
    },
  });

  const [improvingField, setImprovingField] = useState<string | null>(null);

  const handleStageContextChange = useCallback(
    (stageContext: StageContext) => {
      setLocalEngine((prev) => ({ ...prev, stage_context: stageContext }));
      setHasChanges(true);
    },
    []
  );

  const handleProfileChange = useCallback(
    (profile: EngineProfile) => {
      setLocalProfile(profile);
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    // Save profile if on about tab and profile exists
    if (activeTab === 'about' && localProfile) {
      saveProfileMutation.mutate(localProfile);
      return;
    }

    if (localEngine?.stage_context) {
      updateMutation.mutate({
        stage_context: localEngine.stage_context,
        change_summary: 'Updated stage context via management console',
      });
    }
  }, [activeTab, localProfile, localEngine, updateMutation, saveProfileMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !engine) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Engine not found
      </div>
    );
  }

  const displayEngine = localEngine || engine;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/engines"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{engine.engine_name}</h1>
            <p className="mt-1 text-gray-500">{engine.engine_key}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge badge-primary capitalize">{engine.category}</span>
              <span className="badge badge-gray capitalize">{engine.kind}</span>
              <span className="badge badge-gray">v{engine.version}</span>
              {engine.paradigm_keys.map((pk) => (
                <span key={pk} className="badge badge-success">
                  {pk}
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
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending || saveProfileMutation.isPending}
            className="btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending || saveProfileMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="card p-4">
        <p className="text-gray-700">{engine.description}</p>
        {engine.researcher_question && (
          <p className="mt-2 text-sm text-gray-500 italic">
            Researcher question: {engine.researcher_question}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {/* About tab - always shown first */}
          <Tab
            id="about"
            label="About"
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
          />
          {/* Show Capability tab if engine has a capability definition */}
          {capabilityDef && (
            <Tab
              id="capability"
              label="Capability"
              active={activeTab === 'capability'}
              onClick={() => setActiveTab('capability')}
            />
          )}
          {/* Show Stage Context tab if engine has stage_context */}
          {displayEngine.stage_context && (
            <>
              <Tab
                id="context"
                label="Stage Context"
                active={activeTab === 'context'}
                onClick={() => setActiveTab('context')}
              />
              <Tab
                id="preview"
                label="Prompt Preview"
                active={activeTab === 'preview'}
                onClick={() => setActiveTab('preview')}
              />
            </>
          )}
          <Tab
            id="schema"
            label="Schema"
            active={activeTab === 'schema'}
            onClick={() => setActiveTab('schema')}
          />
          <Tab
            id="consumers"
            label={`Consumers (${consumers?.total ?? 0})`}
            active={activeTab === 'consumers'}
            onClick={() => setActiveTab('consumers')}
          />
          <Tab
            id="history"
            label="History"
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
        </div>
      </div>

      {/* Tab Content */}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Engine Profile</h3>
              <p className="text-sm text-gray-500">
                Theoretical foundations, methodology, use cases, and more
              </p>
            </div>
            {!localProfile && (
              <button
                onClick={() => generateProfileMutation.mutate()}
                disabled={generateProfileMutation.isPending}
                className="btn-primary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generateProfileMutation.isPending ? 'Generating...' : 'Generate Profile with AI'}
              </button>
            )}
          </div>

          {localProfile ? (
            <EngineProfileEditor
              profile={localProfile}
              onChange={handleProfileChange}
            />
          ) : (
            <div className="card p-8 text-center">
              <div className="max-w-md mx-auto">
                <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Yet</h3>
                <p className="text-gray-500 mb-4">
                  Generate a rich profile for this engine using AI. The profile will include
                  theoretical foundations, key thinkers, methodology, use cases, and more.
                </p>
                <button
                  onClick={() => generateProfileMutation.mutate()}
                  disabled={generateProfileMutation.isPending}
                  className="btn-primary"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generateProfileMutation.isPending ? 'Generating...' : 'Generate Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capability Definition Tab (v2 prose-mode engines) */}
      {activeTab === 'capability' && capabilityDef && (
        <div className="space-y-6">
          {/* Hero: Problematique + Lineage side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Problematique — 2/3 width */}
            <div className="lg:col-span-2 card p-6">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">Problematique</p>
              <p className="text-gray-700 leading-relaxed text-[15px]">
                {capabilityDef.problematique.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}
              </p>
            </div>

            {/* Intellectual Lineage — 1/3 width */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">Intellectual Lineage</p>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {humanize(capabilityDef.intellectual_lineage.primary)}
                  </p>
                  {capabilityDef.intellectual_lineage.secondary.length > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      + {capabilityDef.intellectual_lineage.secondary.map(s => humanize(s)).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilityDef.intellectual_lineage.traditions.map((t) => (
                    <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                      {humanize(t)}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilityDef.intellectual_lineage.key_concepts.map((c) => (
                    <span key={c} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Depth Levels — compact horizontal bar */}
          {capabilityDef.depth_levels.length > 0 && (
            <div className="card px-6 py-4">
              <div className="flex items-center gap-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Depth</p>
                <div className="flex gap-3 flex-1">
                  {capabilityDef.depth_levels.map((dl) => {
                    const colors: Record<string, string> = {
                      surface: 'border-emerald-200 bg-emerald-50',
                      standard: 'border-blue-200 bg-blue-50',
                      deep: 'border-purple-200 bg-purple-50',
                    };
                    return (
                      <div key={dl.key} className={`flex-1 rounded-lg border p-3 ${colors[dl.key] || 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900 capitalize">{dl.key}</span>
                          <span className="text-xs text-gray-500">{dl.typical_passes} pass{dl.typical_passes !== 1 ? 'es' : ''}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">{dl.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Analytical Dimensions — compact list */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                Analytical Dimensions
              </p>
              <span className="text-xs text-gray-400">{capabilityDef.analytical_dimensions.length} dimensions — click to expand</span>
            </div>
            <div className="space-y-2">
              {capabilityDef.analytical_dimensions.map((dim, i) => (
                <DimensionCard key={dim.key} dimension={dim} index={i} />
              ))}
            </div>
          </div>

          {/* Capabilities + Composability side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Capabilities */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-4">
                Capabilities ({capabilityDef.capabilities.length})
              </p>
              <div className="space-y-2.5">
                {capabilityDef.capabilities.map((cap) => (
                  <div key={cap.key} className="flex items-start gap-3 group">
                    <div className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{humanize(cap.key)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cap.description}</p>
                      {(cap.requires_dimensions.length > 0 || cap.produces_dimensions.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {cap.requires_dimensions.length > 0 && (
                            <>
                              <span className="text-[10px] text-gray-400 uppercase">needs</span>
                              {cap.requires_dimensions.map(d => (
                                <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  {humanize(d)}
                                </span>
                              ))}
                            </>
                          )}
                          {cap.produces_dimensions.length > 0 && (
                            <>
                              <span className="text-[10px] text-gray-400 uppercase ml-1">{cap.requires_dimensions.length > 0 ? '→' : 'produces'}</span>
                              {cap.produces_dimensions.map(d => (
                                <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {humanize(d)}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Composability */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-4">Composability</p>
              <div className="space-y-5">
                {/* Consumes From */}
                {Object.entries(capabilityDef.composability.consumes_from).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-px bg-amber-400" />
                      Receives from other engines
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(capabilityDef.composability.consumes_from).map(([dim, desc]) => (
                        <div key={dim} className="text-sm pl-4">
                          <span className="font-medium text-gray-800">{humanize(dim)}</span>
                          <span className="text-gray-400 mx-1">—</span>
                          <span className="text-gray-500 text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shares With */}
                {Object.entries(capabilityDef.composability.shares_with).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-px bg-emerald-400" />
                      Shares with other engines
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(capabilityDef.composability.shares_with).map(([eng, desc]) => (
                        <div key={eng} className="text-sm pl-4">
                          <span className="font-medium text-gray-800">{humanize(eng)}</span>
                          <span className="text-gray-400 mx-1">—</span>
                          <span className="text-gray-500 text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synergy Engines */}
                {capabilityDef.composability.synergy_engines.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-px bg-primary-400" />
                      Best combined with
                    </p>
                    <div className="flex flex-wrap gap-1.5 pl-4">
                      {capabilityDef.composability.synergy_engines.map((e) => (
                        <Link
                          key={e}
                          href={`/engines/${e}`}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
                        >
                          {humanize(e)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Capability Prompt Preview — collapsible */}
          <details className="card overflow-hidden">
            <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Preview Composed Prompt</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Depth:</label>
                <select
                  value={capabilityDepth}
                  onChange={(e) => { e.stopPropagation(); setCapabilityDepth(e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="input py-0.5 px-2 text-xs"
                >
                  <option value="surface">Surface</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                </select>
              </div>
            </summary>
            <div className="h-[400px] border-t">
              <MonacoEditor
                height="100%"
                language="markdown"
                value={capabilityPrompt?.prompt || 'Loading prompt...'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                theme="vs-light"
              />
            </div>
          </details>
        </div>
      )}

      {/* Stage Context Editor (for engines with stage_context) */}
      {activeTab === 'context' && displayEngine.stage_context && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Stage Context</h3>
              <p className="text-sm text-gray-500">
                Configure engine-specific context for prompt composition
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Settings2 className="h-4 w-4" />
              Prompts are composed at runtime using templates
            </div>
          </div>
          <StageContextEditor
            stageContext={displayEngine.stage_context}
            onChange={handleStageContextChange}
            onImproveField={async (stage, field) => {
              setImprovingField(`${stage}.${field}`);
              try {
                // Call the improve endpoint
                const result = await api.llm.improveStageContext(
                  key as string,
                  stage,
                  field,
                  'Improve clarity and effectiveness'
                );
                // Parse the improved value and update
                console.log('Improvement result:', result);
                // For now, just log - the user can manually update
              } catch (error) {
                console.error('Failed to improve field:', error);
              } finally {
                setImprovingField(null);
              }
            }}
            isImproving={improvingField}
          />
        </div>
      )}

      {/* Prompt Preview (for engines with stage_context) */}
      {activeTab === 'preview' && displayEngine.stage_context && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Composed Prompt Preview</h3>
              <p className="text-sm text-gray-500">
                Preview the prompts as they will be composed from templates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Audience:</label>
              <select
                value={previewAudience}
                onChange={(e) => setPreviewAudience(e.target.value as AudienceType)}
                className="input py-1 text-sm"
              >
                <option value="researcher">Researcher</option>
                <option value="analyst">Analyst</option>
                <option value="executive">Executive</option>
                <option value="activist">Activist</option>
              </select>
            </div>
          </div>

          {/* Extraction Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Extraction Prompt</span>
              {extractionPreview?.framework_used && (
                <span className="badge badge-primary text-xs">
                  Framework: {extractionPreview.framework_used}
                </span>
              )}
            </div>
            <div className="h-96">
              <MonacoEditor
                height="100%"
                language="markdown"
                value={extractionPreview?.prompt || 'Loading...'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                theme="vs-light"
              />
            </div>
          </div>

          {/* Curation Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Curation Prompt</span>
              {curationPreview?.framework_used && (
                <span className="badge badge-primary text-xs">
                  Framework: {curationPreview.framework_used}
                </span>
              )}
            </div>
            <div className="h-96">
              <MonacoEditor
                height="100%"
                language="markdown"
                value={curationPreview?.prompt || 'Loading...'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                theme="vs-light"
              />
            </div>
          </div>
        </div>
      )}


      {activeTab === 'schema' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Canonical Schema</h3>
            <button className="btn-secondary text-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Validate with AI
            </button>
          </div>
          <SchemaViewer schema={engine.canonical_schema} />
        </div>
      )}

      {activeTab === 'consumers' && (
        <div className="card">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-gray-900">
              Services using this engine
            </h3>
          </div>
          {consumers?.consumers && consumers.consumers.length > 0 ? (
            <div className="divide-y">
              {consumers.consumers.map(({ consumer, dependency }) => (
                <div key={dependency.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{consumer.name}</p>
                    <p className="text-sm text-gray-500">
                      {dependency.usage_location || 'Location not specified'}
                    </p>
                  </div>
                  <span className="badge badge-gray capitalize">{dependency.usage_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              No consumers registered for this engine
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-gray-900">Version History</h3>
          </div>
          {versions?.versions && versions.versions.length > 0 ? (
            <div className="divide-y">
              {versions.versions.map((version) => (
                <div key={version.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Version {version.version}</p>
                    <p className="text-sm text-gray-500">{version.change_summary}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {version.created_at
                        ? new Date(version.created_at).toLocaleDateString()
                        : ''}
                    </span>
                    {version.version !== engine.version && (
                      <button className="btn-secondary text-xs py-1">
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              No version history available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
