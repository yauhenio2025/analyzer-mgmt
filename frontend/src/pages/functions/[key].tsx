import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Code2,
  FileText,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  FunctionDefinition,
  PromptTemplate,
  FunctionImplementation,
} from '@/types';
import clsx from 'clsx';

// ============================================================================
// Tab Types
// ============================================================================

type TabId = 'overview' | 'prompts' | 'implementations';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'prompts', label: 'Prompts', icon: FileText },
  { id: 'implementations', label: 'Implementations', icon: Code2 },
];

const CATEGORY_COLORS: Record<string, string> = {
  coordination: 'bg-purple-100 text-purple-800',
  generation: 'bg-blue-100 text-blue-800',
  analysis: 'bg-green-100 text-green-800',
  synthesis: 'bg-amber-100 text-amber-800',
  tool: 'bg-cyan-100 text-cyan-800',
  infrastructure: 'bg-slate-100 text-slate-800',
};

const TIER_COLORS: Record<string, string> = {
  strategic: 'bg-red-100 text-red-800',
  tactical: 'bg-orange-100 text-orange-800',
  lightweight: 'bg-lime-100 text-lime-800',
};

const TIER_LABELS: Record<string, string> = {
  strategic: 'Opus (Strategic)',
  tactical: 'Sonnet (Tactical)',
  lightweight: 'Haiku (Lightweight)',
};

// ============================================================================
// Copy Button
// ============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ func }: { func: FunctionDefinition }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{func.description}</p>
        {func.notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">{func.notes}</p>
          </div>
        )}
      </div>

      {/* Model Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Model</span>
            <p className="text-sm font-mono text-gray-900 mt-1">{func.model_config_spec.model}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Max Tokens</span>
            <p className="text-sm font-mono text-gray-900 mt-1">{func.model_config_spec.max_tokens.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Thinking Budget</span>
            <p className="text-sm font-mono text-gray-900 mt-1">
              {func.model_config_spec.thinking_budget
                ? func.model_config_spec.thinking_budget.toLocaleString()
                : 'None'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Streaming</span>
            <p className="text-sm text-gray-900 mt-1">
              {func.model_config_spec.streaming ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* I/O Contract */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">I/O Contract</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Input</span>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {func.io_contract.input_description || 'No description'}
            </p>
            {func.io_contract.input_schema && (
              <details className="mt-2">
                <summary className="text-xs text-primary-600 cursor-pointer hover:text-primary-700">
                  View input schema
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {JSON.stringify(func.io_contract.input_schema, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Output</span>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {func.io_contract.output_description || 'No description'}
            </p>
            {func.io_contract.output_schema && (
              <details className="mt-2">
                <summary className="text-xs text-primary-600 cursor-pointer hover:text-primary-700">
                  View output schema
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {JSON.stringify(func.io_contract.output_schema, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* DAG Relationships */}
      {(func.depends_on_functions.length > 0 || func.feeds_into_functions.length > 0) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Function Dependencies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {func.depends_on_functions.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Depends On (upstream)</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {func.depends_on_functions.map((key) => (
                    <Link
                      key={key}
                      href={`/functions/${key}`}
                      className="badge bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                    >
                      {key}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {func.feeds_into_functions.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Feeds Into (downstream)</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {func.feeds_into_functions.map((key) => (
                    <Link
                      key={key}
                      href={`/functions/${key}`}
                      className="badge bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                    >
                      {key}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {func.tags.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {func.tags.map((tag) => (
              <span key={tag} className="badge bg-gray-100 text-gray-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Prompts Tab
// ============================================================================

function PromptsTab({ func }: { func: FunctionDefinition }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    func.prompt_templates.length > 0 ? 0 : null
  );

  if (func.prompt_templates.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No prompt templates defined</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {func.prompt_templates.map((prompt, index) => (
        <div key={index} className="card overflow-hidden">
          <button
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'badge text-xs font-mono',
                  prompt.role === 'system'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                )}
              >
                {prompt.role}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {prompt.notes || `${prompt.role} prompt`}
              </span>
              {prompt.variables.length > 0 && (
                <span className="text-xs text-gray-400">
                  {prompt.variables.length} variable{prompt.variables.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <span className="text-gray-400 text-sm">
              {expandedIndex === index ? 'Collapse' : 'Expand'}
            </span>
          </button>

          {expandedIndex === index && (
            <div className="border-t">
              {/* Variables */}
              {prompt.variables.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-b">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Variables: </span>
                  {prompt.variables.map((v) => (
                    <span key={v} className="inline-block ml-1 badge bg-yellow-100 text-yellow-800 text-xs font-mono">
                      {'{' + v + '}'}
                    </span>
                  ))}
                </div>
              )}

              {/* Prompt text */}
              <div className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={prompt.template_text} />
                </div>
                <pre className="px-6 py-4 text-sm whitespace-pre-wrap font-mono bg-gray-50 text-gray-900 overflow-x-auto max-h-[600px] overflow-y-auto border-t">
                  {prompt.template_text}
                </pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Implementations Tab (the "zoom in" feature)
// ============================================================================

function ImplementationsTab({ func }: { func: FunctionDefinition }) {
  if (func.implementations.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Code2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No implementation locations registered</p>
      </div>
    );
  }

  // Group by project
  const byProject = func.implementations.reduce<Record<string, FunctionImplementation[]>>(
    (acc, impl) => {
      if (!acc[impl.project]) acc[impl.project] = [];
      acc[impl.project].push(impl);
      return acc;
    },
    {}
  );

  const buildGitHubUrl = (impl: FunctionImplementation) => {
    if (!impl.repo_url) return null;
    let url = `${impl.repo_url}/blob/main/${impl.file_path}`;
    if (impl.line_start) {
      url += `#L${impl.line_start}`;
      if (impl.line_end) url += `-L${impl.line_end}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      {Object.entries(byProject).map(([project, impls]) => (
        <div key={project} className="card overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b">
            <h3 className="text-sm font-semibold text-gray-900">{project}</h3>
          </div>
          <div className="divide-y">
            {impls.map((impl, i) => {
              const githubUrl = buildGitHubUrl(impl);
              return (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono text-gray-900">
                          {impl.file_path}
                        </code>
                        {impl.is_primary && (
                          <span className="badge bg-green-100 text-green-800 text-xs">
                            Primary
                          </span>
                        )}
                      </div>
                      {impl.symbol && (
                        <p className="mt-1 text-sm font-mono text-primary-600">
                          {impl.symbol}
                          {impl.line_start && (
                            <span className="text-gray-400">
                              {' '}(L{impl.line_start}
                              {impl.line_end ? `-${impl.line_end}` : ''})
                            </span>
                          )}
                        </p>
                      )}
                      {impl.description && (
                        <p className="mt-1 text-sm text-gray-500">{impl.description}</p>
                      )}
                    </div>
                    {githubUrl && (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                      >
                        View Source
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FunctionDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: func, isLoading, error } = useQuery({
    queryKey: ['function', key],
    queryFn: () => api.functions.get(key as string),
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2" />
        </div>
      </div>
    );
  }

  if (error || !func) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Function not found: {key}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/functions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Functions
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{func.function_name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <code className="text-sm text-gray-500 font-mono">{func.function_key}</code>
              <span className="text-gray-300">|</span>
              <span
                className={clsx(
                  'badge text-xs',
                  CATEGORY_COLORS[func.category] || 'bg-gray-100 text-gray-800'
                )}
              >
                {func.category}
              </span>
              <span
                className={clsx(
                  'badge text-xs',
                  TIER_COLORS[func.tier] || 'bg-gray-100 text-gray-800'
                )}
              >
                {TIER_LABELS[func.tier] || func.tier}
              </span>
              <span className="badge bg-gray-100 text-gray-800 text-xs">
                {func.invocation_pattern.replace(/_/g, ' ')}
              </span>
              {func.track && (
                <span className="badge bg-indigo-100 text-indigo-800 text-xs">
                  {func.track} track
                </span>
              )}
              {func.source_projects.map((proj) => (
                <span key={proj} className="badge bg-emerald-100 text-emerald-800 text-xs">
                  {proj}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'prompts' && func.prompt_templates.length > 0 && (
                  <span className="badge bg-gray-100 text-gray-600 text-xs ml-1">
                    {func.prompt_templates.length}
                  </span>
                )}
                {tab.id === 'implementations' && func.implementations.length > 0 && (
                  <span className="badge bg-gray-100 text-gray-600 text-xs ml-1">
                    {func.implementations.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab func={func} />}
      {activeTab === 'prompts' && <PromptsTab func={func} />}
      {activeTab === 'implementations' && <ImplementationsTab func={func} />}
    </div>
  );
}
