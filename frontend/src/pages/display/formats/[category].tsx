import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, Code, FileText, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { useState } from 'react';

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

interface VisualFormat {
  key: string;
  name: string;
  data_structure: string;
  use_when: string;
  gemini_prompt_pattern: string;
  example_prompt?: string;
}

function FormatCard({ format }: { format: VisualFormat }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{format.name}</h3>
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-mono bg-gray-100 px-1 rounded">{format.key}</span>
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Data Structure */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
          <Code className="h-3 w-3" />
          Data Structure
        </div>
        <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded block">
          {format.data_structure}
        </code>
      </div>

      {/* Use When */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
          <Lightbulb className="h-3 w-3" />
          Use When
        </div>
        <p className="text-sm text-gray-600">{format.use_when}</p>
      </div>

      {/* Prompt Pattern */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <FileText className="h-3 w-3" />
            Gemini Prompt Pattern
          </div>
          <CopyButton text={format.gemini_prompt_pattern} label="Copy" />
        </div>
        <div className="bg-gray-50 rounded p-2">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {format.gemini_prompt_pattern}
          </pre>
        </div>
      </div>

      {/* Example Prompt (if expanded) */}
      {expanded && format.example_prompt && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <FileText className="h-3 w-3" />
              Full Example Prompt
            </div>
            <CopyButton text={format.example_prompt} label="Copy" />
          </div>
          <div className="bg-green-50 rounded p-2">
            <pre className="text-xs text-green-700 whitespace-pre-wrap font-mono">
              {format.example_prompt}
            </pre>
          </div>
        </div>
      )}

      {!expanded && format.example_prompt && (
        <p className="text-xs text-green-600 italic">
          Has full example prompt - click Expand to view
        </p>
      )}
    </div>
  );
}

export default function FormatCategoryPage() {
  const router = useRouter();
  const { category } = router.query;

  const { data: categoryData, isLoading, error } = useQuery({
    queryKey: ['display-format-category', category],
    queryFn: () => api.display.getFormatCategory(category as string),
    enabled: !!category,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !categoryData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load format category: {category}</p>
        <Link href="/display" className="mt-4 text-primary-600 hover:underline">
          Back to Display
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/display"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Display
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{categoryData.name}</h1>
        <p className="mt-2 text-gray-600 max-w-3xl">{categoryData.description}</p>
        <p className="mt-1 text-sm text-gray-500">
          {categoryData.formats.length} visual formats in this category
        </p>
      </div>

      {/* Formats Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {categoryData.formats.map((format) => (
          <FormatCard key={format.key} format={format} />
        ))}
      </div>
    </div>
  );
}
