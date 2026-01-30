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
import type { Engine, EngineUpdate, StageContext, AudienceType, EngineProfile } from '@/types';
import clsx from 'clsx';
import { StageContextEditor } from '@/components/StageContextEditor';
import { EngineProfileEditor } from '@/components/EngineProfileEditor';

// Dynamic import for Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type TabId = 'about' | 'context' | 'preview' | 'schema' | 'consumers' | 'history';

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
    queryFn: () => api.consumers.getByConstruct('engine', key as string),
    enabled: !!key && activeTab === 'consumers',
  });

  const { data: versions } = useQuery({
    queryKey: ['engines', key, 'versions'],
    queryFn: () => api.engines.getVersions(key as string),
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
