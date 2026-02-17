import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
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

/** Split prose text into paragraphs, collapsing line-wrap newlines */
function formatProse(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0);
}

const SERIF = "'Source Serif 4', Georgia, serif";

function DimensionCard({ dimension, index }: { dimension: CapabilityEngineDefinition['analytical_dimensions'][number]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left py-4 flex items-start gap-4 hover:bg-stone-50/50 transition-colors px-3 -mx-3 rounded-lg"
      >
        <span
          className="flex-shrink-0 w-8 text-right text-2xl leading-none mt-0.5 text-stone-300 font-light"
          style={{ fontFamily: SERIF }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-stone-800">{humanize(dimension.key)}</p>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed line-clamp-2">{dimension.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1.5">
          <span className="text-[11px] text-stone-400">{dimension.probing_questions.length}q</span>
          <ChevronDown className={clsx(
            'h-4 w-4 text-stone-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {expanded && (
        <div className="ml-12 pb-6 space-y-5">
          {/* Full description */}
          <div className="text-sm text-stone-600 leading-[1.8] max-w-2xl" style={{ fontFamily: SERIF }}>
            {formatProse(dimension.description).map((p, i) => (
              <p key={i} className={i > 0 ? 'mt-3' : ''}>{p}</p>
            ))}
          </div>

          {/* Probing Questions */}
          {dimension.probing_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.15em] mb-3">Probing Questions</p>
              <ol className="space-y-2">
                {dimension.probing_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-stone-600">
                    <span className="text-[11px] text-stone-300 mt-0.5 flex-shrink-0 w-4 text-right font-mono">{i + 1}</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Depth Guidance */}
          {Object.keys(dimension.depth_guidance).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.15em] mb-3">By Depth</p>
              <div className="grid grid-cols-3 gap-px bg-stone-200 rounded-lg overflow-hidden">
                {['surface', 'standard', 'deep']
                  .filter(level => dimension.depth_guidance[level])
                  .map((level, i) => (
                    <div key={level} className={clsx(
                      'p-3.5',
                      i === 0 && 'bg-amber-50/50',
                      i === 1 && 'bg-amber-50',
                      i === 2 && 'bg-amber-100/70',
                    )}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">{level}</p>
                      <p className="text-xs text-stone-600 leading-relaxed">{dimension.depth_guidance[level]}</p>
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

      {/* ═══ Capability Definition Tab — Editorial Layout ═══ */}
      {activeTab === 'capability' && capabilityDef && (
        <>
          <Head>
            <link
              href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400&display=swap"
              rel="stylesheet"
            />
          </Head>

          <div className="-mt-2 space-y-10">

            {/* ── Hero: Problematique + Lineage ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
              {/* Problematique — main column */}
              <div className="lg:col-span-8 p-8 lg:p-10 bg-[#faf9f6]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-700/60">Problematique</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
                </div>

                <div style={{ fontFamily: SERIF }} className="space-y-5">
                  {formatProse(capabilityDef.problematique).map((paragraph, i) => (
                    <p
                      key={i}
                      className={clsx(
                        'leading-[1.9] text-stone-700',
                        i === 0 ? 'text-[17px]' : 'text-[15.5px]',
                      )}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {capabilityDef.researcher_question && (
                  <p
                    className="mt-10 pt-5 border-t border-stone-200/80 text-[15px] italic text-stone-500"
                    style={{ fontFamily: SERIF }}
                  >
                    {capabilityDef.researcher_question}
                  </p>
                )}
              </div>

              {/* Intellectual Lineage — dark sidebar */}
              <div className="lg:col-span-4 bg-stone-800 text-stone-300 p-8 lg:p-8 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500 mb-8">
                  Intellectual Lineage
                </p>

                {/* Primary thinker */}
                <p
                  className="text-[26px] font-light text-white tracking-wide leading-tight"
                  style={{ fontFamily: SERIF }}
                >
                  {humanize(capabilityDef.intellectual_lineage.primary)}
                </p>

                {/* Secondary */}
                {capabilityDef.intellectual_lineage.secondary.length > 0 && (
                  <p className="text-sm text-stone-400 mt-2">
                    with {capabilityDef.intellectual_lineage.secondary.map(s => humanize(s)).join(', ')}
                  </p>
                )}

                {/* Traditions */}
                <div className="mt-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">Traditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {capabilityDef.intellectual_lineage.traditions.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded text-xs bg-stone-700/80 text-stone-300 border border-stone-600/50">
                        {humanize(t)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Concepts — flowing text */}
                <div className="mt-8 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">Key Concepts</p>
                  <p className="text-[13px] text-stone-400 leading-relaxed">
                    {capabilityDef.intellectual_lineage.key_concepts
                      .map(c => c.replace(/_/g, ' '))
                      .join('  ·  ')}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Depth Levels ──────────────────────────────────── */}
            {capabilityDef.depth_levels.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">Analysis Depth</span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>
                <div className="grid grid-cols-3 gap-px bg-stone-200 rounded-xl overflow-hidden shadow-sm">
                  {capabilityDef.depth_levels.map((dl, i) => (
                    <div key={dl.key} className={clsx(
                      'p-6',
                      i === 0 && 'bg-amber-50/40',
                      i === 1 && 'bg-amber-50/80',
                      i === 2 && 'bg-amber-100/70',
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-stone-800 capitalize">{dl.key}</span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {dl.typical_passes} pass{dl.typical_passes !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed">{dl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Analytical Dimensions ─────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">
                    Analytical Dimensions
                  </span>
                  <div className="h-px w-16 bg-stone-200" />
                </div>
                <span className="text-[11px] text-stone-400">
                  {capabilityDef.analytical_dimensions.length} dimensions
                </span>
              </div>
              <div className="divide-y divide-stone-100">
                {capabilityDef.analytical_dimensions.map((dim, i) => (
                  <DimensionCard key={dim.key} dimension={dim} index={i} />
                ))}
              </div>
            </div>

            {/* ── Capabilities + Composability ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Capabilities */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">
                    Capabilities
                  </span>
                  <div className="h-px flex-1 bg-stone-200" />
                  <span className="text-[11px] text-stone-400">{capabilityDef.capabilities.length}</span>
                </div>
                <div className="space-y-5">
                  {capabilityDef.capabilities.map((cap) => (
                    <div key={cap.key}>
                      <p className="text-sm font-medium text-stone-800">{humanize(cap.key)}</p>
                      <p className="text-sm text-stone-500 mt-1 leading-relaxed">{cap.description}</p>
                      {(cap.produces_dimensions.length > 0 || cap.requires_dimensions.length > 0) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                          {cap.requires_dimensions.length > 0 && (
                            <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-300 inline-block flex-shrink-0" />
                              needs {cap.requires_dimensions.map(d => humanize(d)).join(', ')}
                            </span>
                          )}
                          {cap.produces_dimensions.length > 0 && (
                            <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
                              produces {cap.produces_dimensions.map(d => humanize(d)).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Composability */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">
                    Composability
                  </span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>
                <div className="space-y-8">
                  {/* Receives from */}
                  {Object.entries(capabilityDef.composability.consumes_from).length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                        <span className="w-5 h-px bg-amber-400" />
                        Receives context from
                      </p>
                      <div className="space-y-3 ml-7">
                        {Object.entries(capabilityDef.composability.consumes_from).map(([dim, desc]) => (
                          <div key={dim}>
                            <p className="text-sm font-medium text-stone-700">{humanize(dim)}</p>
                            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{desc as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shares with */}
                  {Object.entries(capabilityDef.composability.shares_with).length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                        <span className="w-5 h-px bg-emerald-400" />
                        Shares findings with
                      </p>
                      <div className="space-y-3 ml-7">
                        {Object.entries(capabilityDef.composability.shares_with).map(([eng, desc]) => (
                          <div key={eng}>
                            <p className="text-sm font-medium text-stone-700">{humanize(eng)}</p>
                            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{desc as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synergy */}
                  {capabilityDef.composability.synergy_engines.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                        <span className="w-5 h-px bg-stone-400" />
                        Best combined with
                      </p>
                      <div className="flex flex-wrap gap-2 ml-7">
                        {capabilityDef.composability.synergy_engines.map(e => (
                          <Link
                            key={e}
                            href={`/engines/${e}`}
                            className="text-[12px] px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-800 hover:text-white transition-all duration-200 border border-stone-200 hover:border-stone-800"
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

            {/* ── Prompt Preview (collapsed) ────────────────────── */}
            <details className="rounded-xl border border-stone-200 overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-stone-400" />
                  <span className="text-sm font-medium text-stone-600">Preview Composed Prompt</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-500">Depth:</label>
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
              <div className="h-[400px] border-t border-stone-200">
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
        </>
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
