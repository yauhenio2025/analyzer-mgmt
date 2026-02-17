import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalyticalStanceType } from '@/types';
import { useState } from 'react';
import clsx from 'clsx';

const positionColors: Record<string, string> = {
  early: 'bg-sky-50 text-sky-700 border-sky-200',
  middle: 'bg-amber-50 text-amber-700 border-amber-200',
  late: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  any: 'bg-gray-50 text-gray-600 border-gray-200',
};

const stanceAccentColors: Record<string, string> = {
  discovery: 'border-sky-400',
  inference: 'border-violet-400',
  confrontation: 'border-rose-400',
  architecture: 'border-amber-400',
  integration: 'border-emerald-400',
  reflection: 'border-slate-400',
};

const stanceBgColors: Record<string, string> = {
  discovery: 'bg-sky-50',
  inference: 'bg-violet-50',
  confrontation: 'bg-rose-50',
  architecture: 'bg-amber-50',
  integration: 'bg-emerald-50',
  reflection: 'bg-slate-50',
};

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function StanceDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: stance, isLoading, error } = useQuery({
    queryKey: ['stance', key],
    queryFn: () => api.stances.get(key as string),
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !stance) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load stance: {key}</p>
        <Link href="/stances" className="mt-4 text-primary-600 hover:underline">
          Back to Stances
        </Link>
      </div>
    );
  }

  const paragraphs = stance.stance.split('\n\n').map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/stances"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Stances
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{stance.name}</h1>
          <span
            className={clsx(
              'px-2.5 py-0.5 text-xs font-medium rounded-full border',
              positionColors[stance.typical_position] || positionColors.any
            )}
          >
            {stance.typical_position}
          </span>
        </div>

        <p className="text-base text-gray-500 italic">{stance.cognitive_mode}</p>
      </div>

      {/* Stance Prose */}
      <div
        className={clsx(
          'card p-6 border-l-4',
          stanceAccentColors[stance.key] || 'border-gray-300'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Stance Prose</h3>
          <CopyButton text={stance.stance} label="Copy prose" />
        </div>
        <div
          className={clsx(
            'rounded-lg p-5',
            stanceBgColors[stance.key] || 'bg-gray-50'
          )}
        >
          <div className="space-y-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          This prose is injected into the prompt to set the LLM&apos;s analytical mode for a given pass.
        </p>
      </div>

      {/* Metadata Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Pairs Well With */}
        <Section title="Pairs Well With">
          {stance.pairs_well_with.length > 0 ? (
            <div className="space-y-2">
              {stance.pairs_well_with.map((pairKey) => (
                <Link
                  key={pairKey}
                  href={`/stances/${pairKey}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors group"
                >
                  <Link2 className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary-500" />
                  <span className="capitalize">{pairKey}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No specific pairings noted</p>
          )}
        </Section>

        {/* Quick Reference */}
        <Section title="Quick Reference">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">Key</dt>
              <dd className="mt-0.5 text-sm font-mono text-gray-700">{stance.key}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Cognitive Mode</dt>
              <dd className="mt-0.5 text-sm text-gray-700">{stance.cognitive_mode}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Typical Position</dt>
              <dd className="mt-0.5">
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full border',
                    positionColors[stance.typical_position] || positionColors.any
                  )}
                >
                  {stance.typical_position}
                </span>
              </dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
