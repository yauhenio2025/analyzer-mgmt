import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  History,
  AlertCircle,
  FileText,
  Target,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Rhetoric, RhetoricUpdate, RhetoricCategory } from '@/types';
import clsx from 'clsx';

// Dynamic import for Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type TabId = 'overview' | 'prompt' | 'preview' | 'schema' | 'history';

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

const CATEGORY_COLORS: Record<RhetoricCategory, string> = {
  rhetoric: 'bg-blue-100 text-blue-800',
  vulnerability: 'bg-amber-100 text-amber-800',
};

function RequirementBadge({ requirement }: { requirement: string }) {
  const colors: Record<string, string> = {
    Subject: 'bg-purple-100 text-purple-700',
    Critique: 'bg-green-100 text-green-700',
    Response: 'bg-orange-100 text-orange-700',
    'Counter-Response': 'bg-red-100 text-red-700',
  };
  return (
    <span className={clsx('badge text-xs', colors[requirement] || 'badge-gray')}>
      {requirement}
    </span>
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

export default function RhetoricDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [localRhetoric, setLocalRhetoric] = useState<Partial<Rhetoric> | null>(null);
  const [previewContext, setPreviewContext] = useState({
    subject_author: 'Benanav',
    critique_author: 'Morozov',
    response_author: 'Benanav',
    user_author: 'User',
  });

  const { data: rhetoric, isLoading, error } = useQuery({
    queryKey: ['rhetoric', key],
    queryFn: () => api.rhetoric.get(key as string),
    enabled: !!key,
  });

  // Initialize local state when rhetoric data loads
  useEffect(() => {
    if (rhetoric && !localRhetoric) {
      setLocalRhetoric(rhetoric);
    }
  }, [rhetoric, localRhetoric]);

  // Query for rendered prompt preview
  const { data: promptPreview } = useQuery({
    queryKey: ['rhetoric', key, 'prompt', previewContext],
    queryFn: () => api.rhetoric.getPrompt(key as string, previewContext),
    enabled: !!key && activeTab === 'preview',
  });

  const { data: versions } = useQuery({
    queryKey: ['rhetoric', key, 'versions'],
    queryFn: () => api.rhetoric.getVersions(key as string),
    enabled: !!key && activeTab === 'history',
  });

  const updateMutation = useMutation({
    mutationFn: (data: RhetoricUpdate) => api.rhetoric.update(key as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhetoric', key] });
      setHasChanges(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (version: number) => api.rhetoric.restore(key as string, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhetoric', key] });
      queryClient.invalidateQueries({ queryKey: ['rhetoric', key, 'versions'] });
      setLocalRhetoric(null); // Force reload of local state
    },
  });

  const handlePromptChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setLocalRhetoric((prev) => ({ ...prev, prompt_template: value }));
      setHasChanges(true);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (localRhetoric?.prompt_template) {
      updateMutation.mutate({
        prompt_template: localRhetoric.prompt_template,
        change_summary: 'Updated prompt template via management console',
      });
    }
  }, [localRhetoric, updateMutation]);

  const handleRestore = useCallback((version: number) => {
    if (confirm(`Restore to version ${version}? This will create a new version.`)) {
      restoreMutation.mutate(version);
    }
  }, [restoreMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !rhetoric) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Rhetoric analyzer not found
      </div>
    );
  }

  const displayRhetoric = localRhetoric || rhetoric;

  // Compute document requirements
  const documentRequirements: string[] = [];
  if (rhetoric.requires_subject) documentRequirements.push('Subject');
  if (rhetoric.requires_critique) documentRequirements.push('Critique');
  if (rhetoric.requires_response) documentRequirements.push('Response');
  if (rhetoric.requires_counter_response) documentRequirements.push('Counter-Response');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/rhetoric"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{rhetoric.name}</h1>
            <p className="mt-1 text-gray-500">{rhetoric.rhetoric_key}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={clsx('badge', CATEGORY_COLORS[rhetoric.category])}>
                {rhetoric.category === 'rhetoric' ? 'Round 1: Rhetoric' : 'Round 2: Vulnerability'}
              </span>
              <span className="badge badge-gray">v{rhetoric.version}</span>
              {rhetoric.category === 'rhetoric' ? (
                <FileText className="h-4 w-4 text-blue-500" />
              ) : (
                <Target className="h-4 w-4 text-amber-500" />
              )}
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
        <p className="text-gray-700">{rhetoric.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Requires:</span>
          {documentRequirements.map((req) => (
            <RequirementBadge key={req} requirement={req} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <Tab
            id="overview"
            label="Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <Tab
            id="prompt"
            label="Prompt Template"
            active={activeTab === 'prompt'}
            onClick={() => setActiveTab('prompt')}
          />
          <Tab
            id="preview"
            label="Preview"
            active={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
          />
          <Tab
            id="schema"
            label="Output Schema"
            active={activeTab === 'schema'}
            onClick={() => setActiveTab('schema')}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-3">Model Settings</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Model</dt>
                <dd className="text-sm font-medium text-gray-900">{rhetoric.model}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Thinking Budget</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {(rhetoric.thinking_budget / 1000).toFixed(0)}k tokens
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Max Tokens</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {(rhetoric.max_tokens / 1000).toFixed(0)}k tokens
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-3">Document Requirements</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'w-3 h-3 rounded-full',
                  rhetoric.requires_subject ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-sm text-gray-700">Subject document</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'w-3 h-3 rounded-full',
                  rhetoric.requires_critique ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-sm text-gray-700">Critique document</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'w-3 h-3 rounded-full',
                  rhetoric.requires_response ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-sm text-gray-700">Response document</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'w-3 h-3 rounded-full',
                  rhetoric.requires_counter_response ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-sm text-gray-700">Counter-response document</span>
              </div>
            </div>
          </div>

          <div className="card p-4 md:col-span-2">
            <h3 className="font-medium text-gray-900 mb-3">Metadata</h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Version</dt>
                <dd className="text-sm font-medium text-gray-900">{rhetoric.version}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">{rhetoric.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {rhetoric.created_at ? new Date(rhetoric.created_at).toLocaleDateString() : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Updated</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {rhetoric.updated_at ? new Date(rhetoric.updated_at).toLocaleDateString() : '-'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Prompt Template Tab */}
      {activeTab === 'prompt' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Prompt Template</h3>
              <p className="text-sm text-gray-500">
                Edit the prompt template. Use placeholders: {'{SUBJECT_AUTHOR}'}, {'{CRITIQUE_AUTHOR}'}, {'{RESPONSE_AUTHOR}'}, {'{USER_AUTHOR}'}
              </p>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="h-[600px]">
              <MonacoEditor
                height="100%"
                language="markdown"
                value={displayRhetoric.prompt_template || ''}
                onChange={handlePromptChange}
                options={{
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
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Rendered Prompt Preview</h3>
              <p className="text-sm text-gray-500">
                Preview the prompt with author placeholders filled in
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Eye className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Read-only</span>
            </div>
          </div>

          {/* Context inputs */}
          <div className="card p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Author Context</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject Author</label>
                <input
                  type="text"
                  value={previewContext.subject_author}
                  onChange={(e) => setPreviewContext((prev) => ({ ...prev, subject_author: e.target.value }))}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Critique Author</label>
                <input
                  type="text"
                  value={previewContext.critique_author}
                  onChange={(e) => setPreviewContext((prev) => ({ ...prev, critique_author: e.target.value }))}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Response Author</label>
                <input
                  type="text"
                  value={previewContext.response_author}
                  onChange={(e) => setPreviewContext((prev) => ({ ...prev, response_author: e.target.value }))}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">User Author</label>
                <input
                  type="text"
                  value={previewContext.user_author}
                  onChange={(e) => setPreviewContext((prev) => ({ ...prev, user_author: e.target.value }))}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="h-[500px]">
              <MonacoEditor
                height="100%"
                language="markdown"
                value={promptPreview?.rendered_prompt || 'Loading...'}
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

      {/* Schema Tab */}
      {activeTab === 'schema' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Output Schema</h3>
            <p className="text-sm text-gray-500">
              JSON schema defining the expected output structure
            </p>
          </div>
          <SchemaViewer schema={rhetoric.output_schema || {}} />
        </div>
      )}

      {/* History Tab */}
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
                    {version.version !== rhetoric.version && (
                      <button
                        onClick={() => handleRestore(version.version)}
                        disabled={restoreMutation.isPending}
                        className="btn-secondary text-xs py-1"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
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
