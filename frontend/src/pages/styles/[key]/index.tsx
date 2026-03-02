import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, Check, Palette } from 'lucide-react';
import { api } from '@/lib/api';
import type { StyleGuide, StyleSchool } from '@/types';
import { useState } from 'react';
import clsx from 'clsx';

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copyColor = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copyColor}
      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors group"
      title={`Click to copy: ${color}`}
    >
      <div
        className="w-8 h-8 rounded border border-gray-200 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <div className="text-left">
        <div className="text-xs font-medium text-gray-700 capitalize">{label}</div>
        <div className="text-xs text-gray-400 font-mono">{color}</div>
      </div>
      {copied ? (
        <Check className="h-3 w-3 text-green-500 opacity-0 group-hover:opacity-100" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
      )}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function StyleDetailPage() {
  const router = useRouter();
  const { key } = router.query;

  const { data: style, isLoading, error } = useQuery({
    queryKey: ['style', key],
    queryFn: () => api.styles.get(key as string),
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

  if (error || !style) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load style: {key}</p>
        <Link href="/styles" className="mt-4 text-primary-600 hover:underline">
          Back to Styles
        </Link>
      </div>
    );
  }

  const palette = style.color_palette;
  const typography = style.typography;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/styles"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Styles
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{style.name}</h1>
          <Link
            href={`/styles/${key}/tokens`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Palette className="h-3.5 w-3.5" />
            Design Tokens
          </Link>
        </div>
        <p className="mt-2 text-gray-600 max-w-3xl">{style.philosophy}</p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="grid grid-cols-2 gap-1">
            <ColorSwatch color={palette.primary} label="Primary" />
            <ColorSwatch color={palette.secondary} label="Secondary" />
            <ColorSwatch color={palette.tertiary} label="Tertiary" />
            <ColorSwatch color={palette.accent} label="Accent" />
            <ColorSwatch color={palette.background} label="Background" />
            <ColorSwatch color={palette.text} label="Text" />
            {palette.highlight && <ColorSwatch color={palette.highlight} label="Highlight" />}
            {palette.muted && <ColorSwatch color={palette.muted} label="Muted" />}
            {palette.accent_alt && <ColorSwatch color={palette.accent_alt} label="Accent Alt" />}
            {palette.positive && <ColorSwatch color={palette.positive} label="Positive" />}
            {palette.negative && <ColorSwatch color={palette.negative} label="Negative" />}
          </div>
          {palette.series_palette && palette.series_palette.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs font-medium text-gray-500 mb-2">Series Palette</div>
              <div className="flex gap-1">
                {palette.series_palette.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-gray-200"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Primary: </span>
              <span className="font-mono text-gray-700">{typography.primary_font}</span>
            </div>
            <div>
              <span className="text-gray-500">Title: </span>
              <span className="font-mono text-gray-700">{typography.title_font}</span>
            </div>
            <div>
              <span className="text-gray-500">Caption: </span>
              <span className="font-mono text-gray-700">{typography.caption_font}</span>
            </div>
            <div>
              <span className="text-gray-500">Numbers: </span>
              <span className="font-mono text-gray-700">{typography.number_font}</span>
            </div>
            <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Title Size: </span>
                <span className="text-gray-600">{typography.title_size}</span>
              </div>
              <div>
                <span className="text-gray-400">Label Size: </span>
                <span className="text-gray-600">{typography.label_size}</span>
              </div>
              <div>
                <span className="text-gray-400">Annotation: </span>
                <span className="text-gray-600">{typography.annotation_size}</span>
              </div>
              <div>
                <span className="text-gray-400">Line Height: </span>
                <span className="text-gray-600">{typography.line_height}</span>
              </div>
              <div>
                <span className="text-gray-400">Title Weight: </span>
                <span className="text-gray-600">{typography.title_weight}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Layout Principles */}
        <Section title="Layout Principles">
          <ul className="space-y-1.5 text-sm text-gray-600">
            {style.layout_principles.map((principle, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400">{i + 1}.</span>
                {principle}
              </li>
            ))}
          </ul>
        </Section>

        {/* Annotation Style */}
        <Section title="Annotation Style">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{style.annotation_style}</p>
        </Section>

        {/* Best For / Avoid */}
        <Section title="Best For">
          <div className="flex flex-wrap gap-1">
            {style.best_for.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded"
              >
                {item}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Avoid For">
          <div className="flex flex-wrap gap-1">
            {style.avoid_for.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded"
              >
                {item}
              </span>
            ))}
          </div>
        </Section>

        {/* Practitioners & References */}
        {(style.practitioners?.length || style.references?.length) && (
          <Section title="Practitioners & References">
            {style.practitioners && style.practitioners.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Practitioners</div>
                <div className="flex flex-wrap gap-1">
                  {style.practitioners.map((p, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {style.references && style.references.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">References</div>
                <ul className="text-xs text-gray-600 space-y-1">
                  {style.references.map((r, i) => (
                    <li key={i}>- {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Gemini Modifiers */}
        <div className="lg:col-span-2">
          <Section title="Gemini Prompt Modifiers">
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {style.gemini_modifiers}
            </pre>
          </Section>
        </div>
      </div>
    </div>
  );
}
