import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, Cpu, Palette, Eye, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalyticalPrimitive } from '@/types';
import { useState } from 'react';
import clsx from 'clsx';

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

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

export default function PrimitiveDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: primitive, isLoading, error } = useQuery({
    queryKey: ['primitive', key],
    queryFn: () => api.primitives.get(key as string),
    enabled: !!key,
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

  if (error || !primitive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load primitive: {key}</p>
        <Link href="/primitives" className="mt-4 text-primary-600 hover:underline">
          Back to Primitives
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/primitives"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Primitives
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{primitive.name}</h1>
        <p className="mt-2 text-gray-600 max-w-3xl">{primitive.description}</p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Visual Guidance */}
        <Section title="Visual Hint" icon={Eye}>
          <p className="text-sm text-gray-600">{primitive.visual_hint}</p>
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs font-medium text-gray-500 mb-2">Visual Forms</div>
            <div className="flex flex-wrap gap-1">
              {primitive.visual_forms.map((form) => (
                <span
                  key={form}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                >
                  {form.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* Style Guidance */}
        <Section title="Style Hint" icon={Palette}>
          <p className="text-sm text-gray-600">{primitive.style_hint}</p>
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs font-medium text-gray-500 mb-2">Style Leanings</div>
            <div className="flex flex-wrap gap-1">
              {primitive.style_leanings.map((style) => (
                <Link
                  key={style}
                  href={`/styles/${style}`}
                  className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                >
                  {style.replace(/_/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        </Section>

        {/* Associated Engines */}
        <Section title="Associated Engines" icon={Cpu}>
          <div className="space-y-1">
            {primitive.associated_engines.map((engine) => (
              <Link
                key={engine}
                href={`/engines/${engine}`}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                {engine.replace(/_/g, ' ')}
              </Link>
            ))}
          </div>
        </Section>

        {/* Gemini Guidance */}
        <Section title="Gemini Guidance" icon={MessageSquare}>
          <div className="flex justify-end mb-2">
            <CopyButton text={primitive.gemini_guidance} label="Copy guidance" />
          </div>
          <div className="bg-gray-50 rounded p-3">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {primitive.gemini_guidance}
            </pre>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            This text is passed to Gemini to help it understand what visual approaches work for this analytical pattern.
          </p>
        </Section>
      </div>
    </div>
  );
}
