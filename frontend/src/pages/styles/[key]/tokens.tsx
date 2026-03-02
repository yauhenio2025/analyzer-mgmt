import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Code,
  ChevronDown,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DesignTokenSet, SemanticTriple, CategoricalItem } from '@/types';
import clsx from 'clsx';

// ── Helpers ──────────────────────────────────────────────

function isColorValue(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value.startsWith('rgba') ||
    value.startsWith('hsla')
  );
}

function formatTokenName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCssVar(tier: string, key: string): string {
  return `--dt-${key.replace(/_/g, '-')}`;
}

// ── Copy Button ──────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        'p-1 rounded hover:bg-gray-100 transition-colors',
        className
      )}
      title={`Copy: ${text}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400" />
      )}
    </button>
  );
}

// ── Color Swatch ─────────────────────────────────────────

function ColorSwatch({ color, size = 'md' }: { color: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  return (
    <div
      className={clsx(dim, 'rounded border border-gray-200 shadow-sm flex-shrink-0')}
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

// ── Collapsible Section ──────────────────────────────────

function TokenSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </button>
      {open && <div className="border-t px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Flat Token Row ───────────────────────────────────────

function FlatTokenRow({
  tokenKey,
  value,
  tier,
}: {
  tokenKey: string;
  value: string;
  tier: string;
}) {
  const cssVar = formatCssVar(tier, tokenKey);

  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded group">
      {isColorValue(value) && <ColorSwatch color={value} size="sm" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700">
          {formatTokenName(tokenKey)}
        </div>
        <div className="text-xs text-gray-400 font-mono truncate">{cssVar}</div>
      </div>
      <div className="text-xs font-mono text-gray-500 truncate max-w-[200px]">
        {value}
      </div>
      <CopyButton
        text={cssVar}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

// ── Semantic Triple Row ──────────────────────────────────

function SemanticRow({
  tokenKey,
  triple,
}: {
  tokenKey: string;
  triple: SemanticTriple;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded group">
      <div className="flex gap-1">
        <ColorSwatch color={triple.bg} size="sm" />
        <ColorSwatch color={triple.text} size="sm" />
        <ColorSwatch color={triple.border} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700">
          {formatTokenName(tokenKey)}
        </div>
        <div className="text-xs text-gray-400 font-mono">
          --dt-{tokenKey.replace(/_/g, '-')}-*
        </div>
      </div>
      <div className="flex gap-2 text-xs font-mono text-gray-400">
        <span title="bg">{triple.bg}</span>
        <span title="text">{triple.text}</span>
      </div>
      <CopyButton
        text={`--dt-${tokenKey.replace(/_/g, '-')}-bg`}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

// ── Categorical Item Row ─────────────────────────────────

function CategoricalRow({
  tokenKey,
  item,
}: {
  tokenKey: string;
  item: CategoricalItem;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded group">
      <div
        className="px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0"
        style={{
          backgroundColor: item.bg,
          color: item.text,
          borderColor: item.border,
        }}
      >
        {item.label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 font-mono truncate">
          --dt-{tokenKey.replace(/_/g, '-')}-*
        </div>
      </div>
      <CopyButton
        text={`--dt-${tokenKey.replace(/_/g, '-')}-bg`}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

// ── Series Palette ───────────────────────────────────────

function SeriesPalette({ colors }: { colors: string[] }) {
  return (
    <div className="py-2 px-2">
      <div className="text-xs font-medium text-gray-700 mb-2">Series Palette</div>
      <div className="flex gap-1.5">
        {colors.map((color, i) => (
          <div key={i} className="group relative">
            <div
              className="w-8 h-8 rounded border border-gray-200 shadow-sm cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={`${i}: ${color}`}
            />
            <CopyButton
              text={color}
              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white rounded-full shadow-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Group categorical by prefix ──────────────────────────

function groupByPrefix(
  entries: [string, CategoricalItem][]
): Record<string, [string, CategoricalItem][]> {
  const groups: Record<string, [string, CategoricalItem][]> = {};
  for (const [key, item] of entries) {
    const prefix = key.split('_')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push([key, item]);
  }
  return groups;
}

// ── Main Page ────────────────────────────────────────────

export default function TokenBrowserPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [showCss, setShowCss] = useState(false);

  const {
    data: tokens,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['style-tokens', key],
    queryFn: () => api.styles.getTokens(key as string),
    enabled: !!key,
  });

  const { data: cssText } = useQuery({
    queryKey: ['style-tokens-css', key],
    queryFn: () => api.styles.getTokensCss(key as string),
    enabled: !!key && showCss,
  });

  const handleRegenerate = async () => {
    if (!key || regenerating) return;
    setRegenerating(true);
    try {
      await api.styles.regenerateTokens(key as string);
      queryClient.invalidateQueries({ queryKey: ['style-tokens', key] });
      queryClient.invalidateQueries({ queryKey: ['style-tokens-css', key] });
    } catch (err) {
      console.error('Regeneration failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-36 mb-2" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !tokens) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load tokens for: {key}</p>
        <p className="text-sm text-gray-500 mt-1">
          The token API may not be deployed yet.
        </p>
        <Link
          href={`/styles/${key}`}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Style Guide
        </Link>
      </div>
    );
  }

  const primitiveEntries = Object.entries(tokens.primitives).filter(
    ([k]) => k !== 'series_palette'
  ) as [string, string][];
  const seriesPalette = (tokens.primitives as Record<string, unknown>)
    .series_palette as string[] | undefined;
  const surfaceEntries = Object.entries(tokens.surfaces);
  const scaleEntries = Object.entries(tokens.scales);
  const semanticEntries = Object.entries(tokens.semantic) as [
    string,
    SemanticTriple,
  ][];
  const categoricalEntries = Object.entries(tokens.categorical) as [
    string,
    CategoricalItem,
  ][];
  const componentEntries = Object.entries(tokens.components);
  const categoricalGroups = groupByPrefix(categoricalEntries);

  const totalTokens =
    primitiveEntries.length +
    (seriesPalette?.length || 0) +
    surfaceEntries.length +
    scaleEntries.length +
    semanticEntries.length * 3 +
    categoricalEntries.length * 4 +
    componentEntries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/styles/${key}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {tokens.school_name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Palette className="h-6 w-6 text-gray-400" />
              Design Tokens
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {tokens.school_name} &middot; {totalTokens} tokens &middot; v
              {tokens.version}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCss(!showCss)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
                showCss
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <Code className="h-3.5 w-3.5" />
              CSS
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={clsx('h-3.5 w-3.5', regenerating && 'animate-spin')}
              />
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS Output */}
      {showCss && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              CSS Custom Properties
            </h3>
            <CopyButton text={cssText || ''} />
          </div>
          <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto max-h-96 overflow-y-auto font-mono">
            {cssText || 'Loading...'}
          </pre>
        </div>
      )}

      {/* Primitives */}
      <TokenSection
        title="Primitives"
        count={primitiveEntries.length + (seriesPalette?.length || 0)}
        defaultOpen
      >
        <div className="divide-y divide-gray-100">
          {primitiveEntries.map(([k, v]) => (
            <FlatTokenRow key={k} tokenKey={k} value={String(v)} tier="primitives" />
          ))}
        </div>
        {seriesPalette && <SeriesPalette colors={seriesPalette} />}
      </TokenSection>

      {/* Surfaces */}
      <TokenSection title="Surfaces" count={surfaceEntries.length} defaultOpen>
        <div className="divide-y divide-gray-100">
          {surfaceEntries.map(([k, v]) => (
            <FlatTokenRow key={k} tokenKey={k} value={v} tier="surfaces" />
          ))}
        </div>
      </TokenSection>

      {/* Scales */}
      <TokenSection title="Scales" count={scaleEntries.length}>
        <div className="divide-y divide-gray-100">
          {scaleEntries.map(([k, v]) => (
            <FlatTokenRow key={k} tokenKey={k} value={v} tier="scales" />
          ))}
        </div>
      </TokenSection>

      {/* Semantic */}
      <TokenSection title="Semantic" count={semanticEntries.length} defaultOpen>
        <div className="divide-y divide-gray-100">
          {semanticEntries.map(([k, triple]) => (
            <SemanticRow key={k} tokenKey={k} triple={triple} />
          ))}
        </div>
      </TokenSection>

      {/* Categorical (grouped by prefix) */}
      <TokenSection
        title="Categorical"
        count={categoricalEntries.length}
        defaultOpen
      >
        {Object.entries(categoricalGroups).map(([prefix, items]) => (
          <div key={prefix} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-3">
              {formatTokenName(prefix)} ({items.length})
            </div>
            <div className="divide-y divide-gray-100">
              {items.map(([k, item]) => (
                <CategoricalRow key={k} tokenKey={k} item={item} />
              ))}
            </div>
          </div>
        ))}
      </TokenSection>

      {/* Components */}
      <TokenSection title="Components" count={componentEntries.length}>
        <div className="divide-y divide-gray-100">
          {componentEntries.map(([k, v]) => (
            <FlatTokenRow key={k} tokenKey={k} value={v} tier="components" />
          ))}
        </div>
      </TokenSection>

      {/* Metadata */}
      <div className="text-xs text-gray-400 text-center py-4">
        Generated: {new Date(tokens.generated_at).toLocaleString()} &middot;
        School: {tokens.school_key}
      </div>
    </div>
  );
}
