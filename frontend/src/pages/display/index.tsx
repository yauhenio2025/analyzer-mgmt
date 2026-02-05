import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search,
  AlertCircle,
  ChevronRight,
  Info,
  Eye,
  EyeOff,
  Hash,
  FileText,
  Copy,
  Check,
  LayoutGrid,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

type TabType = 'instructions' | 'hidden' | 'formats' | 'mappings' | 'quality';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

function FormatCard({ category }: { category: { key: string; name: string; description: string; format_count: number } }) {
  return (
    <Link
      href={`/display/formats/${category.key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{category.description}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <LayoutGrid className="h-3 w-3" />
            {category.format_count} formats
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function DisplayPage() {
  const [tab, setTab] = useState<TabType>('instructions');
  const [searchFormat, setSearchFormat] = useState('');

  // Fetch display stats
  const { data: stats } = useQuery({
    queryKey: ['display-stats'],
    queryFn: () => api.display.getStats(),
  });

  // Fetch instructions
  const { data: instructions, isLoading: instructionsLoading } = useQuery({
    queryKey: ['display-instructions'],
    queryFn: () => api.display.getInstructions(),
    enabled: tab === 'instructions',
  });

  // Fetch hidden fields
  const { data: hiddenFields, isLoading: hiddenLoading } = useQuery({
    queryKey: ['display-hidden-fields'],
    queryFn: () => api.display.getHiddenFields(),
    enabled: tab === 'hidden',
  });

  // Fetch format categories
  const { data: categories, isLoading: formatsLoading } = useQuery({
    queryKey: ['display-format-categories'],
    queryFn: () => api.display.listFormatCategories(),
    enabled: tab === 'formats',
  });

  // Fetch data mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['display-mappings'],
    queryFn: () => api.display.listDataMappings(),
    enabled: tab === 'mappings',
  });

  // Fetch quality criteria
  const { data: quality, isLoading: qualityLoading } = useQuery({
    queryKey: ['display-quality'],
    queryFn: () => api.display.getQualityCriteria(),
    enabled: tab === 'quality',
  });

  const filteredCategories = categories?.filter(
    (c) =>
      !searchFormat ||
      c.name.toLowerCase().includes(searchFormat.toLowerCase()) ||
      c.key.toLowerCase().includes(searchFormat.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Display Configuration</h1>
          <p className="mt-1 text-gray-500">
            {stats?.hidden_fields_count ?? 0} hidden fields, {stats?.total_formats ?? 0} visual formats, {stats?.data_mappings ?? 0} data mappings
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-amber-50 border-amber-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Gemini Formatting Rules</p>
            <p className="mt-1 text-amber-600">
              Critical instructions for how Gemini should format visualizations -
              label formatting, numeric score hiding, branding prohibitions, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'instructions' as TabType, label: 'Instructions', icon: FileText },
            { key: 'hidden' as TabType, label: 'Hidden Fields', icon: EyeOff },
            { key: 'formats' as TabType, label: 'Visual Formats', icon: LayoutGrid },
            { key: 'mappings' as TabType, label: 'Data Mappings', icon: Hash },
            { key: 'quality' as TabType, label: 'Quality Criteria', icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                tab === key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'instructions' && (
        <div className="space-y-4">
          {instructionsLoading ? (
            <div className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-100 rounded w-full" />
                ))}
              </div>
            </div>
          ) : instructions ? (
            <>
              {/* Branding Rules */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Branding Rules (CRITICAL)
                  </h3>
                  <CopyButton text={instructions.branding_rules} label="Copy" />
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{instructions.branding_rules}</p>
              </div>

              {/* Label Formatting */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Label Formatting</h3>
                  <CopyButton text={instructions.label_formatting} label="Copy" />
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{instructions.label_formatting}</p>
              </div>

              {/* Numeric Display */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Numeric Display (CRITICAL)
                  </h3>
                  <CopyButton text={instructions.numeric_display} label="Copy" />
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{instructions.numeric_display}</p>
              </div>

              {/* Field Cleanup */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Field Cleanup</h3>
                  <CopyButton text={instructions.field_cleanup} label="Copy" />
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{instructions.field_cleanup}</p>
              </div>

              {/* Full Text */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Full Instructions (for Gemini)</h3>
                  <CopyButton text={instructions.full_text} label="Copy all" />
                </div>
                <div className="bg-gray-50 rounded p-3 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                    {instructions.full_text}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'hidden' && (
        <div className="space-y-4">
          {hiddenLoading ? (
            <div className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="flex flex-wrap gap-2">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-100 rounded w-24" />
                ))}
              </div>
            </div>
          ) : hiddenFields ? (
            <>
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Hidden Field Names</h3>
                <p className="text-xs text-gray-500 mb-3">
                  These field names should never appear on visualizations. They contain internal processing values.
                </p>
                <div className="flex flex-wrap gap-2">
                  {hiddenFields.hidden_fields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded font-mono"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Hidden Suffixes</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Any field ending with these suffixes should be hidden.
                </p>
                <div className="flex flex-wrap gap-2">
                  {hiddenFields.hidden_suffixes.map((suffix) => (
                    <span
                      key={suffix}
                      className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded font-mono"
                    >
                      *{suffix}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'formats' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search format categories..."
                value={searchFormat}
                onChange={(e) => setSearchFormat(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {formatsLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {filteredCategories?.map((category) => (
                <FormatCard key={category.key} category={category} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'mappings' && (
        <div className="space-y-4">
          {mappingsLoading ? (
            <div className="card animate-pulse">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="p-4 border-b">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="card divide-y">
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 grid grid-cols-4 gap-4">
                <span>Data Type</span>
                <span>Primary Format</span>
                <span>Secondary</span>
                <span>Avoid</span>
              </div>
              {mappings?.map((mapping) => (
                <div key={mapping.data_type} className="px-4 py-3 grid grid-cols-4 gap-4 items-center">
                  <span className="text-xs font-mono text-gray-900">{mapping.data_type}</span>
                  <span className="text-sm text-primary-600 font-medium">{mapping.primary_format.replace(/_/g, ' ')}</span>
                  <div className="flex flex-wrap gap-1">
                    {mapping.secondary_formats.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mapping.avoid.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 text-xs bg-red-50 text-red-600 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'quality' && (
        <div className="space-y-4">
          {qualityLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="space-y-2">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-3 bg-gray-100 rounded w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : quality ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Must Have
                </h3>
                <ul className="space-y-2">
                  {quality.must_have.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Should Have
                </h3>
                <ul className="space-y-2">
                  {quality.should_have.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Avoid
                </h3>
                <ul className="space-y-2">
                  {quality.avoid.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
