import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronRight,
  Info,
  Plus,
  Search,
  Repeat,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { TransformationTemplateSummary, TransformationType } from '@/types';
import clsx from 'clsx';

// Color-code by transformation_type
const typeColors: Record<TransformationType, string> = {
  none: 'bg-gray-50 text-gray-600 border-gray-200',
  schema_map: 'bg-blue-50 text-blue-700 border-blue-200',
  llm_extract: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  llm_summarize: 'bg-violet-50 text-violet-700 border-violet-200',
  aggregate: 'bg-amber-50 text-amber-700 border-amber-200',
};

const typeBorderColors: Record<TransformationType, string> = {
  none: 'border-l-gray-400',
  schema_map: 'border-l-blue-500',
  llm_extract: 'border-l-emerald-500',
  llm_summarize: 'border-l-violet-500',
  aggregate: 'border-l-amber-500',
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'none', label: 'None (passthrough)' },
  { value: 'schema_map', label: 'Schema Map' },
  { value: 'llm_extract', label: 'LLM Extract' },
  { value: 'llm_summarize', label: 'LLM Summarize' },
  { value: 'aggregate', label: 'Aggregate' },
];

function TemplateCard({ template }: { template: TransformationTemplateSummary }) {
  const ttype = template.transformation_type as TransformationType;
  return (
    <Link
      href={`/transformations/${template.template_key}`}
      className={clsx(
        'card p-5 hover:shadow-md transition-shadow group border-l-4',
        typeBorderColors[ttype] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900">
              {template.template_name}
            </h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                typeColors[ttype] || typeColors.none
              )}
            >
              {template.transformation_type}
            </span>
          </div>

          <p className="text-xs font-mono text-gray-400 mb-2">
            {template.template_key}
          </p>

          {template.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {template.applicable_renderer_types.map((rt) => (
              <span
                key={rt}
                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {rt}
              </span>
            ))}
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function TransformationsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const {
    data: templates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transformations'],
    queryFn: () => api.transformations.list(),
  });

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (typeFilter && t.transformation_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.template_key.toLowerCase().includes(q) ||
          t.template_name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [templates, typeFilter, searchQuery]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load transformation templates from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transformation Templates</h1>
          <p className="mt-1 text-gray-500">
            {templates?.length ?? 0} reusable transformation recipes
          </p>
        </div>
        <Link href="/transformations/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Link>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-teal-50 border-teal-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800">
            <p className="font-medium">Schema-on-Read Data Transformation</p>
            <p className="mt-1 text-teal-600">
              Templates define how to transform raw analytical output at presentation
              time. Types include field renaming (schema_map), structured extraction
              from prose (llm_extract), summarization (llm_summarize), and
              aggregation (group/count/sort). Templates can be applied to view
              definitions as one-time copies.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-auto min-w-[180px]"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span className="font-medium">Types:</span>
        {Object.entries(typeBorderColors).map(([type, cls]) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className={clsx(
                'inline-block w-2 h-2 rounded-full',
                cls.replace('border-l-', 'bg-')
              )}
            />
            {type}
          </span>
        ))}
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 border-l-4 border-l-gray-200 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <Repeat className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No transformation templates found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map((t) => (
            <TemplateCard key={t.template_key} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}
