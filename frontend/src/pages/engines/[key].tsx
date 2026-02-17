import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
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
  Settings2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Engine, EngineUpdate, StageContext, AudienceType, EngineProfile, CapabilityEngineDefinition, ThinkerReference, TraditionEntry, KeyConceptEntry } from '@/types';
import clsx from 'clsx';
import { StageContextEditor } from '@/components/StageContextEditor';
import { EngineProfileEditor } from '@/components/EngineProfileEditor';

// Dynamic import for Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Legacy tabs for engines without capability definitions
// Capability tabs for engines with capability definitions (the 11 genealogy engines)
type TabId =
  | 'about' | 'context' | 'preview' | 'schema' | 'consumers' | 'history'  // legacy
  | 'lineage' | 'depth' | 'dimensions' | 'capabilities' | 'composability'; // capability

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

/** Convert snake_case to Title Case */
function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Prose block: either a plain paragraph or a definition-list term */
type ProseBlock =
  | { type: 'text'; content: string }
  | { type: 'term'; name: string; definition: string };

/**
 * Split prose into structured blocks.
 * Detects ALL-CAPS TERM: definition patterns (like taxonomy lists)
 * and formats them as separate definition entries.
 */
function formatProse(text: string): ProseBlock[] {
  const result: ProseBlock[] = [];
  const rawParagraphs = text.split(/\n\n+/);

  for (const rawPara of rawParagraphs) {
    const joined = rawPara.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!joined) continue;

    // Detect definition-list paragraphs: 3+ ALL-CAPS TERM: patterns
    const termRegex = /([A-Z]{2,}(?:\s+[A-Z]{2,})*):\s*/g;
    const terms: { index: number; name: string; end: number }[] = [];
    let m;
    while ((m = termRegex.exec(joined)) !== null) {
      if (m[1].length >= 8) {
        terms.push({ index: m.index, name: m[1], end: m.index + m[0].length });
      }
    }

    if (terms.length >= 3) {
      // This paragraph contains a taxonomy/definition list
      const before = joined.substring(0, terms[0].index).trim();
      if (before) result.push({ type: 'text', content: before });

      for (let i = 0; i < terms.length; i++) {
        const defEnd = i + 1 < terms.length ? terms[i + 1].index : joined.length;
        const definition = joined.substring(terms[i].end, defEnd).trim();
        result.push({ type: 'term', name: terms[i].name, definition });
      }
    } else {
      result.push({ type: 'text', content: joined });
    }
  }

  return result;
}

const SERIF = "'Source Serif 4', Georgia, serif";

/** Stance → visual config mapping */
const STANCE_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  discovery:      { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-400',     border: 'border-sky-200' },
  inference:      { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-400',  border: 'border-violet-200' },
  confrontation:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-400',    border: 'border-rose-200' },
  architecture:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   border: 'border-amber-200' },
  integration:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400', border: 'border-emerald-200' },
  reflection:     { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200' },
  dialectical:    { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-400',    border: 'border-teal-200' },
};
const DEFAULT_STANCE_STYLE = { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400', border: 'border-stone-200' };

function getStanceStyle(stance: string) {
  return STANCE_STYLES[stance] || DEFAULT_STANCE_STYLE;
}

/** Info about which pass targets a dimension at a given depth */
interface PassHit {
  passNumber: number;
  stance: string;
  label: string;
}

/** Pre-computed map: dimensionKey → { surface: PassHit[], standard: PassHit[], deep: PassHit[] } */
type DimensionPassMap = Record<string, Record<string, PassHit[]>>;

function buildDimensionPassMap(depthLevels: CapabilityEngineDefinition['depth_levels']): DimensionPassMap {
  const map: DimensionPassMap = {};
  for (const dl of depthLevels) {
    if (!dl.passes) continue;
    for (const pass of dl.passes) {
      for (const dimKey of (pass.focus_dimensions || [])) {
        if (!map[dimKey]) map[dimKey] = {};
        if (!map[dimKey][dl.key]) map[dimKey][dl.key] = [];
        map[dimKey][dl.key].push({
          passNumber: pass.pass_number,
          stance: pass.stance,
          label: pass.label || `Pass ${pass.pass_number}`,
        });
      }
    }
  }
  return map;
}

/** Pre-computed map: capabilityKey → { surface: PassHit[], standard: PassHit[], deep: PassHit[] } */
type CapabilityPassMap = Record<string, Record<string, PassHit[]>>;

function buildCapabilityPassMap(depthLevels: CapabilityEngineDefinition['depth_levels']): CapabilityPassMap {
  const map: CapabilityPassMap = {};
  for (const dl of depthLevels) {
    if (!dl.passes) continue;
    for (const pass of dl.passes) {
      for (const capKey of (pass.focus_capabilities || [])) {
        if (!map[capKey]) map[capKey] = {};
        if (!map[capKey][dl.key]) map[capKey][dl.key] = [];
        map[capKey][dl.key].push({
          passNumber: pass.pass_number,
          stance: pass.stance,
          label: pass.label || `Pass ${pass.pass_number}`,
        });
      }
    }
  }
  return map;
}

/** Enriched capability card with expandable detail */
function CapabilityCard({ cap, passMap, index }: {
  cap: import('@/types').EngineCapabilityItem;
  passMap: Record<string, PassHit[]>;  // depth → PassHit[]
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasRichContent = !!(cap.extended_description || cap.intellectual_grounding || cap.indicators?.length);

  // Collect all stances that exercise this capability
  const allHits = Object.values(passMap).flat();
  const uniqueStances = [...new Set(allHits.map(h => h.stance))];

  return (
    <div className="group">
      {/* ── Collapsed header ── */}
      <button
        onClick={() => hasRichContent && setExpanded(!expanded)}
        className={clsx(
          'w-full text-left',
          hasRichContent && 'cursor-pointer',
          !hasRichContent && 'cursor-default',
        )}
      >
        <div className="flex items-start gap-3">
          {/* Number badge */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-400 text-[10px] font-semibold flex items-center justify-center mt-0.5">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-800">{humanize(cap.key)}</span>

              {/* Grounding badge (collapsed) */}
              {cap.intellectual_grounding && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                  {cap.intellectual_grounding.thinker}
                </span>
              )}

              {/* Stance dots (collapsed) */}
              {uniqueStances.length > 0 && (
                <span className="flex items-center gap-0.5 ml-auto">
                  {uniqueStances.map(stance => {
                    const s = getStanceStyle(stance);
                    return (
                      <span key={stance} className={clsx('w-2 h-2 rounded-full', s.dot)} title={stance} />
                    );
                  })}
                </span>
              )}

              {/* Expand indicator */}
              {hasRichContent && (
                <ChevronDown className={clsx(
                  'w-3.5 h-3.5 text-stone-300 transition-transform flex-shrink-0',
                  expanded && 'rotate-180'
                )} />
              )}
            </div>

            <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">{cap.description}</p>

            {/* Dimension flow */}
            {(cap.produces_dimensions.length > 0 || cap.requires_dimensions.length > 0) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {cap.requires_dimensions.length > 0 && (
                  <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-300 inline-block flex-shrink-0" />
                    needs {cap.requires_dimensions.map(d => humanize(d)).join(', ')}
                  </span>
                )}
                {cap.produces_dimensions.length > 0 && (
                  <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
                    produces {cap.produces_dimensions.map(d => humanize(d)).join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && hasRichContent && (
        <div className="ml-9 mt-4 space-y-4 pb-2">
          {/* Extended description */}
          {cap.extended_description && (
            <div className="text-[13px] text-stone-600 leading-[1.7] space-y-3">
              {cap.extended_description.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {/* Intellectual grounding */}
          {cap.intellectual_grounding && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400">Grounded in</span>
                <span className="text-sm font-medium text-indigo-700">{humanize(cap.intellectual_grounding.thinker)}</span>
                <span className="text-[11px] text-indigo-500">/ {cap.intellectual_grounding.concept}</span>
              </div>
              <p className="text-[12px] text-indigo-600/80 leading-relaxed">{cap.intellectual_grounding.method}</p>
            </div>
          )}

          {/* Indicators */}
          {cap.indicators && cap.indicators.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 block mb-2">
                Textual Indicators
              </span>
              <ul className="space-y-1.5">
                {cap.indicators.map((ind, i) => (
                  <li key={i} className="text-[12px] text-stone-500 leading-relaxed flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-stone-300 flex-shrink-0 mt-1.5" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Depth scaling */}
          {cap.depth_scaling && Object.keys(cap.depth_scaling).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 block mb-2">
                Depth Scaling
              </span>
              <div className="grid grid-cols-3 gap-3">
                {['surface', 'standard', 'deep'].filter(d => cap.depth_scaling?.[d]).map(depth => (
                  <div key={depth} className="bg-stone-50 rounded-md px-3 py-2">
                    <span className={clsx(
                      'text-[10px] font-semibold uppercase tracking-wide block mb-1',
                      depth === 'surface' && 'text-sky-500',
                      depth === 'standard' && 'text-amber-500',
                      depth === 'deep' && 'text-rose-500',
                    )}>{depth}</span>
                    <p className="text-[11px] text-stone-500 leading-relaxed">{cap.depth_scaling![depth]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pass coverage (Level 1 cross-reference) */}
          {Object.keys(passMap).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 block mb-2">
                Exercised In
              </span>
              <div className="flex flex-wrap gap-2">
                {['surface', 'standard', 'deep'].map(depth => {
                  const hits = passMap[depth] || [];
                  if (!hits.length) return null;
                  return hits.map(h => {
                    const s = getStanceStyle(h.stance);
                    return (
                      <span key={`${depth}-${h.passNumber}`} className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px]', s.bg, s.text)}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
                        <span className="font-medium">P{h.passNumber}</span>
                        <span className="opacity-60">{h.stance}</span>
                        <span className="text-[9px] opacity-40 ml-1">{depth[0].toUpperCase()}</span>
                      </span>
                    );
                  });
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-stone-100 mt-4" />
    </div>
  );
}

/** Dimension × Pass pipeline matrix: shows which passes target which dimensions */
function DimensionPassMatrix({ depthLevels, dimensions, selectedDepth, onDepthChange }: {
  depthLevels: CapabilityEngineDefinition['depth_levels'];
  dimensions: CapabilityEngineDefinition['analytical_dimensions'];
  selectedDepth: string;
  onDepthChange: (d: string) => void;
}) {
  const dl = depthLevels.find(d => d.key === selectedDepth);
  if (!dl?.passes?.length) return null;

  const passes = [...dl.passes].sort((a, b) => a.pass_number - b.pass_number);

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
          Pipeline View
        </span>
        <div className="flex items-center gap-1">
          {depthLevels.map(d => (
            <button
              key={d.key}
              onClick={() => onDepthChange(d.key)}
              className={clsx(
                'text-[10px] font-medium px-2.5 py-1 rounded-full transition-all',
                d.key === selectedDepth
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              )}
            >
              {d.key}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 w-52 min-w-[13rem]">
                Dimension
              </th>
              {passes.map(pass => {
                const s = getStanceStyle(pass.stance);
                return (
                  <th key={pass.pass_number} className="px-3 py-2.5 text-center min-w-[5.5rem]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono text-stone-300">P{pass.pass_number}</span>
                      <span className={clsx('text-[9px] font-semibold px-2 py-0.5 rounded-full', s.bg, s.text)}>
                        {pass.stance}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-center min-w-[3rem]">
                <span className="text-[10px] text-stone-300">=</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dim, di) => {
              const focusedPasses = passes.filter(p =>
                (p.focus_dimensions || []).includes(dim.key)
              );
              const coverageRatio = passes.length > 0 ? focusedPasses.length / passes.length : 0;
              return (
                <tr key={dim.key} className={clsx(
                  'border-b border-stone-50',
                  di % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'
                )}>
                  <td className="px-4 py-2 text-[12px] text-stone-700 font-medium">
                    {humanize(dim.key)}
                  </td>
                  {passes.map(pass => {
                    const hit = (pass.focus_dimensions || []).includes(dim.key);
                    const s = getStanceStyle(pass.stance);
                    return (
                      <td key={pass.pass_number} className="px-3 py-2 text-center">
                        {hit ? (
                          <span className={clsx('inline-block w-3 h-3 rounded-full', s.dot)} title={`${pass.stance} examines ${humanize(dim.key)}`} />
                        ) : (
                          <span className="inline-block w-3 h-3 rounded-full bg-stone-100" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className={clsx(
                      'text-[10px] font-mono',
                      coverageRatio >= 0.6 ? 'text-emerald-600' : coverageRatio >= 0.3 ? 'text-amber-600' : 'text-stone-300'
                    )}>
                      {focusedPasses.length}/{passes.length}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-stone-50/50 border-t border-stone-100 flex items-center gap-4 flex-wrap">
        <span className="text-[9px] text-stone-400 uppercase tracking-wider">Stances:</span>
        {passes.map(p => p.stance).filter((v, i, a) => a.indexOf(v) === i).map(stance => {
          const s = getStanceStyle(stance);
          return (
            <span key={stance} className="flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', s.dot)} />
              <span className="text-[10px] text-stone-500">{stance}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[10px] text-stone-400 italic">
          {passes.length} pass{passes.length !== 1 ? 'es' : ''} at {selectedDepth} depth
        </span>
      </div>
    </div>
  );
}

function DimensionCard({ dimension, index, passMap }: {
  dimension: CapabilityEngineDefinition['analytical_dimensions'][number];
  index: number;
  passMap: DimensionPassMap;
}) {
  const [expanded, setExpanded] = useState(false);
  const dimPasses = passMap[dimension.key] || {};
  const depths = ['surface', 'standard', 'deep'];
  // Count total unique stances that ever touch this dimension
  const allStances = new Set<string>();
  for (const d of depths) {
    for (const hit of (dimPasses[d] || [])) allStances.add(hit.stance);
  }

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left py-4 flex items-start gap-4 hover:bg-stone-50/50 transition-colors px-3 -mx-3 rounded-lg"
      >
        <span
          className="flex-shrink-0 w-8 text-right text-2xl leading-none mt-0.5 text-stone-300 font-light"
          style={{ fontFamily: SERIF }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-stone-800">{humanize(dimension.key)}</p>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed line-clamp-2">{dimension.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}</p>
          {/* Compact pass indicators in header */}
          {allStances.size > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {depths.map(depth => {
                const hits = dimPasses[depth] || [];
                if (hits.length === 0) return null;
                return (
                  <div key={depth} className="flex items-center gap-0.5">
                    <span className="text-[9px] text-stone-300 uppercase mr-0.5">{depth[0]}</span>
                    {hits.map(h => {
                      const s = getStanceStyle(h.stance);
                      return (
                        <span
                          key={h.passNumber}
                          className={clsx('w-2 h-2 rounded-full', s.dot)}
                          title={`${depth}: P${h.passNumber} ${h.stance}`}
                        />
                      );
                    })}
                    <span className="w-px h-3 bg-stone-200 mx-1 last:hidden" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1.5">
          <span className="text-[11px] text-stone-400">{dimension.probing_questions.length}q</span>
          <ChevronDown className={clsx(
            'h-4 w-4 text-stone-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {expanded && (
        <div className="ml-12 pb-6 space-y-5">
          {/* Full description */}
          <div className="text-sm text-stone-600 leading-[1.8] max-w-2xl" style={{ fontFamily: SERIF }}>
            {formatProse(dimension.description).map((block, i) => (
              <p key={i} className={i > 0 ? 'mt-3' : ''}>{block.type === 'term' ? `${block.name}: ${block.definition}` : block.content}</p>
            ))}
          </div>

          {/* Probing Questions */}
          {dimension.probing_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.15em] mb-3">Probing Questions</p>
              <ol className="space-y-2">
                {dimension.probing_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-stone-600">
                    <span className="text-[11px] text-stone-300 mt-0.5 flex-shrink-0 w-4 text-right font-mono">{i + 1}</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Depth Guidance + Pass Coverage */}
          {Object.keys(dimension.depth_guidance).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.15em] mb-3">By Depth</p>
              <div className="grid grid-cols-3 gap-px bg-stone-200 rounded-lg overflow-hidden">
                {['surface', 'standard', 'deep']
                  .filter(level => dimension.depth_guidance[level])
                  .map((level, i) => {
                    const hits = dimPasses[level] || [];
                    return (
                      <div key={level} className={clsx(
                        'p-3.5',
                        i === 0 && 'bg-amber-50/50',
                        i === 1 && 'bg-amber-50',
                        i === 2 && 'bg-amber-100/70',
                      )}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{level}</p>
                          {hits.length > 0 && (
                            <div className="flex items-center gap-1">
                              {hits.map(h => {
                                const s = getStanceStyle(h.stance);
                                return (
                                  <span
                                    key={h.passNumber}
                                    className={clsx('text-[8px] font-bold px-1.5 py-0.5 rounded-full border', s.bg, s.text, s.border)}
                                    title={h.label}
                                  >
                                    P{h.passNumber}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">{dimension.depth_guidance[level]}</p>
                        {hits.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-stone-200/50">
                            {hits.map(h => {
                              const s = getStanceStyle(h.stance);
                              return (
                                <p key={h.passNumber} className="text-[10px] text-stone-400 flex items-center gap-1.5">
                                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                                  <span className={clsx('font-medium', s.text)}>{h.stance}</span>
                                  <span className="text-stone-300">examines this</span>
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Section labels for capability history */
const SECTION_LABELS: Record<string, string> = {
  top_level: 'Definition',
  intellectual_lineage: 'Intellectual Lineage',
  analytical_dimensions: 'Analytical Dimensions',
  capabilities: 'Capabilities',
  composability: 'Composability',
  depth_levels: 'Depth Levels',
};

/** Color coding for history change actions */
const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  added:    { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Added' },
  removed:  { bg: 'bg-rose-50',   text: 'text-rose-600',   label: 'Removed' },
  modified: { bg: 'bg-amber-50',  text: 'text-amber-600',  label: 'Modified' },
};

function HistoryEntryCard({ entry, isLatest }: {
  entry: import('@/types').CapabilityHistoryEntry;
  isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.timestamp);
  const hasChanges = entry.changes.length > 0;

  // Group changes by section
  const bySection: Record<string, import('@/types').CapabilityFieldChange[]> = {};
  for (const change of entry.changes) {
    if (!bySection[change.section]) bySection[change.section] = [];
    bySection[change.section].push(change);
  }

  return (
    <div className={clsx(
      'rounded-lg border overflow-hidden',
      isLatest ? 'border-stone-300 shadow-sm' : 'border-stone-200',
    )}>
      <button
        onClick={() => hasChanges && setExpanded(!expanded)}
        className={clsx(
          'w-full text-left px-5 py-3 flex items-center justify-between',
          hasChanges ? 'cursor-pointer hover:bg-stone-50/50' : 'cursor-default',
          entry.is_baseline ? 'bg-stone-50' : 'bg-white',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={clsx(
            'text-xs font-mono px-2 py-0.5 rounded flex-shrink-0',
            isLatest ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500',
          )}>
            v{entry.version}
          </span>
          <p className="text-sm text-stone-700 truncate">{entry.summary}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {entry.is_baseline && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium">
              Baseline
            </span>
          )}
          <span className="text-[11px] text-stone-400 whitespace-nowrap">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {hasChanges && (
            <ChevronDown className={clsx(
              'w-4 h-4 text-stone-300 transition-transform',
              expanded && 'rotate-180',
            )} />
          )}
        </div>
      </button>

      {expanded && hasChanges && (
        <div className="px-5 py-4 border-t border-stone-100 space-y-4">
          {Object.entries(bySection).map(([section, changes]) => (
            <div key={section}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2">
                {SECTION_LABELS[section] || humanize(section)}
              </p>
              <div className="space-y-1.5">
                {changes.map((change, i) => {
                  const style = ACTION_STYLES[change.action] || ACTION_STYLES.modified;
                  return (
                    <div key={i} className={clsx('flex items-start gap-2 px-3 py-2 rounded text-[12px]', style.bg)}>
                      <span className={clsx('font-medium flex-shrink-0', style.text)}>
                        {style.label}
                      </span>
                      <span className="text-stone-600 font-medium">{humanize(change.field)}</span>
                      {change.old_value && change.action === 'modified' && (
                        <span className="text-stone-400 truncate max-w-[200px]" title={change.old_value}>
                          was: {change.old_value}
                        </span>
                      )}
                      {change.new_value && change.action !== 'removed' && (
                        <span className="text-stone-500 truncate max-w-[300px]" title={change.new_value}>
                          {change.action === 'added' ? change.new_value : `now: ${change.new_value}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
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

  // Query for capability definition (v2 prose-mode definition)
  const { data: capabilityDef } = useQuery({
    queryKey: ['engines', key, 'capability-definition'],
    queryFn: () => api.engines.getCapabilityDefinition(key as string),
    enabled: !!key,
  });

  const [matrixDepth, setMatrixDepth] = useState<string>('deep');

  // Query for capability definition history (lazy — only when History tab active)
  const { data: capabilityHistory } = useQuery({
    queryKey: ['engines', key, 'capability-history'],
    queryFn: () => api.engines.getCapabilityHistory(key as string),
    enabled: !!key && activeTab === 'history' && !!capabilityDef,
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
    queryFn: async () => {
      try {
        return await api.consumers.getByConstruct('engine', key as string);
      } catch {
        // Engine may only exist in analyzer-v2, not in mgmt DB
        return { construct_type: 'engine', construct_key: key as string, consumers: [], total: 0 };
      }
    },
    enabled: !!key && activeTab === 'consumers',
  });

  const { data: versions } = useQuery({
    queryKey: ['engines', key, 'versions'],
    queryFn: async () => {
      try {
        return await api.engines.getVersions(key as string);
      } catch {
        // Engine may only exist in analyzer-v2, not in mgmt DB
        return { engine_key: key as string, current_version: 0, versions: [] };
      }
    },
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
          {capabilityDef ? (
            <>
              {/* ── Capability engine tabs ── */}
              <Tab id="about" label="About" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
              <Tab id="lineage" label="Lineage" active={activeTab === 'lineage'} onClick={() => setActiveTab('lineage')} />
              <Tab id="depth" label="Depth" active={activeTab === 'depth'} onClick={() => setActiveTab('depth')} />
              <Tab id="dimensions" label="Dimensions" active={activeTab === 'dimensions'} onClick={() => setActiveTab('dimensions')} />
              <Tab id="capabilities" label="Capabilities" active={activeTab === 'capabilities'} onClick={() => setActiveTab('capabilities')} />
              <Tab id="composability" label="Composability" active={activeTab === 'composability'} onClick={() => setActiveTab('composability')} />
              <Tab id="history" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </>
          ) : (
            <>
              {/* ── Legacy engine tabs ── */}
              <Tab id="about" label="About" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
              {displayEngine.stage_context && (
                <>
                  <Tab id="context" label="Stage Context" active={activeTab === 'context'} onClick={() => setActiveTab('context')} />
                  <Tab id="preview" label="Prompt Preview" active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} />
                </>
              )}
              <Tab id="schema" label="Schema" active={activeTab === 'schema'} onClick={() => setActiveTab('schema')} />
              <Tab id="consumers" label={`Consumers (${consumers?.total ?? 0})`} active={activeTab === 'consumers'} onClick={() => setActiveTab('consumers')} />
              <Tab id="history" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}

      {/* About Tab (legacy engines only — capability engines use the block below) */}
      {activeTab === 'about' && !capabilityDef && (
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

      {/* ═══ Capability Engine: About Tab (Problematique only) ═══ */}
      {activeTab === 'about' && capabilityDef && (
        <>
          <Head>
            <link
              href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400&display=swap"
              rel="stylesheet"
            />
          </Head>

          <div className="-mt-2">
            <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm p-8 lg:p-10 bg-[#faf9f6]">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-700/60">Problematique</span>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
              </div>

              <div style={{ fontFamily: SERIF }} className="space-y-5 max-w-3xl mx-auto">
                {formatProse(capabilityDef.problematique).map((block, i) => {
                  if (block.type === 'term') {
                    return (
                      <div key={i} className="pl-5 border-l-2 border-amber-300/40 py-0.5">
                        <p className="text-[12px] font-semibold text-amber-800/70 tracking-[0.06em] mb-1"
                           style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {block.name}
                        </p>
                        <p className="text-[14.5px] leading-[1.8] text-stone-600">
                          {block.definition}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <p
                      key={i}
                      className={clsx(
                        'leading-[1.9] text-stone-700',
                        i === 0 ? 'text-[17px]' : 'text-[15.5px]',
                      )}
                    >
                      {block.content}
                    </p>
                  );
                })}
              </div>

              {capabilityDef.researcher_question && (
                <p
                  className="mt-10 pt-5 border-t border-stone-200/80 text-[15px] italic text-stone-500 max-w-3xl mx-auto"
                  style={{ fontFamily: SERIF }}
                >
                  {capabilityDef.researcher_question}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ Capability Engine: Lineage Tab ═══ */}
      {activeTab === 'lineage' && capabilityDef && (() => {
        const lin = capabilityDef.intellectual_lineage;
        // Normalize to handle both flat strings and rich objects
        const primaryName = typeof lin.primary === 'string' ? lin.primary : lin.primary.name;
        const primaryDesc = typeof lin.primary === 'string' ? '' : lin.primary.description;
        const secondaryItems = lin.secondary.map(s =>
          typeof s === 'string' ? { name: s, description: '' } : s
        ) as ThinkerReference[];
        const traditionItems = lin.traditions.map(t =>
          typeof t === 'string' ? { name: t, description: '' } : t
        ) as TraditionEntry[];
        const conceptItems = lin.key_concepts.map(c =>
          typeof c === 'string' ? { name: c, definition: '' } : c
        ) as KeyConceptEntry[];

        return (
        <>
          <Head>
            <link
              href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400&display=swap"
              rel="stylesheet"
            />
          </Head>

          <div className="-mt-2 space-y-10">
            {/* Primary thinker — hero */}
            <div className="bg-stone-800 rounded-xl px-10 py-12 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500 mb-4">
                Primary Intellectual Influence
              </p>
              <p
                className="text-4xl font-light text-white tracking-wide"
                style={{ fontFamily: SERIF }}
              >
                {humanize(primaryName)}
              </p>
              {primaryDesc && (
                <p
                  className="text-stone-300 mt-5 max-w-2xl mx-auto text-[15px] leading-relaxed"
                  style={{ fontFamily: SERIF }}
                >
                  {primaryDesc}
                </p>
              )}
              {secondaryItems.length > 0 && (
                <p className="text-xs text-stone-500 mt-5 tracking-wide">
                  with {secondaryItems.map(s => humanize(s.name)).join(', ')}
                </p>
              )}
            </div>

            {/* Secondary thinkers — rich cards */}
            {secondaryItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-5">
                  Secondary Influences
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secondaryItems.map(s => (
                    <div key={s.name} className="bg-white border border-stone-200 rounded-lg px-5 py-4 border-l-[3px] border-l-stone-400">
                      <p className="text-sm font-semibold text-stone-800 mb-1">{humanize(s.name)}</p>
                      {s.description && (
                        <p className="text-[13px] text-stone-500 leading-relaxed">{s.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traditions — description cards */}
            {traditionItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-5">
                  Traditions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {traditionItems.map(t => (
                    <div key={t.name} className="bg-stone-50 border border-stone-200 rounded-lg px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 mb-2">
                        {humanize(t.name)}
                      </p>
                      {t.description && (
                        <p
                          className="text-[13px] text-stone-600 leading-relaxed"
                          style={{ fontFamily: SERIF }}
                        >
                          {t.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key concepts — glossary */}
            {conceptItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-5">
                  Key Concepts
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conceptItems.map(c => (
                    <div key={c.name} className="bg-white border border-stone-200 rounded-lg px-5 py-4 border-l-[3px] border-l-amber-600/40">
                      <p
                        className="text-[15px] font-semibold text-stone-800 mb-1"
                        style={{ fontFamily: SERIF }}
                      >
                        {humanize(c.name)}
                      </p>
                      {c.definition && (
                        <p className="text-[13px] text-stone-500 leading-relaxed">{c.definition}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
        );
      })()}

      {/* ═══ Capability Engine: Depth Tab ═══ */}
      {activeTab === 'depth' && capabilityDef && capabilityDef.depth_levels.length > 0 && (
        <div className="-mt-2">
          <div className="space-y-4">
            {capabilityDef.depth_levels.map((dl, i) => (
              <div key={dl.key} className={clsx(
                'rounded-xl overflow-hidden shadow-sm border',
                i === 0 && 'bg-amber-50/30 border-amber-200/60',
                i === 1 && 'bg-amber-50/60 border-amber-200/80',
                i === 2 && 'bg-amber-100/50 border-amber-300/70',
              )}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-stone-800 capitalize">{dl.key}</span>
                    {dl.suitable_for && (
                      <span className="text-[11px] text-stone-400 italic">{dl.suitable_for}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {dl.typical_passes} pass{dl.typical_passes !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="px-6 pb-4">
                  <p className="text-sm text-stone-600 leading-relaxed">{dl.description}</p>
                </div>

                {dl.passes && dl.passes.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2">
                      {dl.passes.map((pass, pi) => (
                        <div key={pass.pass_number} className="flex items-center gap-1.5">
                          {(() => { const s = getStanceStyle(pass.stance); return (
                          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.bg, s.text)}>
                            {pass.stance}
                          </span>
                          ); })()}
                          {pi < dl.passes.length - 1 && (
                            <span className="text-stone-300 text-[10px]">→</span>
                          )}
                        </div>
                      ))}
                      <Link
                        href={`/operationalizations/${capabilityDef.engine_key}`}
                        className="ml-auto text-[10px] text-stone-400 hover:text-stone-600 transition-colors underline decoration-dotted"
                      >
                        Edit in Operationalizations
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Capability Engine: Dimensions Tab ═══ */}
      {activeTab === 'dimensions' && capabilityDef && (() => {
        const passMap = buildDimensionPassMap(capabilityDef.depth_levels);
        return (
          <div className="-mt-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">
                  Analytical Dimensions
                </span>
                <div className="h-px w-16 bg-stone-200" />
              </div>
              <span className="text-[11px] text-stone-400">
                {capabilityDef.analytical_dimensions.length} dimensions
              </span>
            </div>

            {capabilityDef.depth_levels.some(d => d.passes && d.passes.length > 0) && (
              <DimensionPassMatrix
                depthLevels={capabilityDef.depth_levels}
                dimensions={capabilityDef.analytical_dimensions}
                selectedDepth={matrixDepth}
                onDepthChange={setMatrixDepth}
              />
            )}

            <div className="divide-y divide-stone-100">
              {capabilityDef.analytical_dimensions.map((dim, i) => (
                <DimensionCard key={dim.key} dimension={dim} index={i} passMap={passMap} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══ Capability Engine: Capabilities Tab ═══ */}
      {activeTab === 'capabilities' && capabilityDef && (() => {
        const capPassMap = buildCapabilityPassMap(capabilityDef.depth_levels);
        return (
          <div className="-mt-2">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">
                Capabilities
              </span>
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] text-stone-400">{capabilityDef.capabilities.length}</span>
            </div>
            <div className="space-y-1">
              {capabilityDef.capabilities.map((cap, i) => (
                <CapabilityCard
                  key={cap.key}
                  cap={cap}
                  passMap={capPassMap[cap.key] || {}}
                  index={i}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══ Capability Engine: Composability Tab ═══ */}
      {activeTab === 'composability' && capabilityDef && (
        <div className="-mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Receives from */}
            {Object.entries(capabilityDef.composability.consumes_from).length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-amber-400" />
                  Receives context from
                </p>
                <div className="space-y-3 ml-7">
                  {Object.entries(capabilityDef.composability.consumes_from).map(([dim, desc]) => (
                    <div key={dim}>
                      <p className="text-sm font-medium text-stone-700">{humanize(dim)}</p>
                      <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{desc as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shares with */}
            {Object.entries(capabilityDef.composability.shares_with).length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-emerald-400" />
                  Shares findings with
                </p>
                <div className="space-y-3 ml-7">
                  {Object.entries(capabilityDef.composability.shares_with).map(([eng, desc]) => (
                    <div key={eng}>
                      <p className="text-sm font-medium text-stone-700">{humanize(eng)}</p>
                      <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{desc as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synergy */}
            {capabilityDef.composability.synergy_engines.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-stone-500 mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-stone-400" />
                  Best combined with
                </p>
                <div className="flex flex-wrap gap-2 ml-7">
                  {capabilityDef.composability.synergy_engines.map(e => (
                    <Link
                      key={e}
                      href={`/engines/${e}`}
                      className="text-[12px] px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-800 hover:text-white transition-all duration-200 border border-stone-200 hover:border-stone-800"
                    >
                      {humanize(e)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Capability Engine: History Tab ═══ */}
      {activeTab === 'history' && capabilityDef && (
        <div className="-mt-2">
          {capabilityHistory && capabilityHistory.entries.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-stone-400 tracking-wide">
                {capabilityHistory.entry_count} recorded {capabilityHistory.entry_count === 1 ? 'entry' : 'entries'}
              </p>
              {capabilityHistory.entries.map((entry, idx) => (
                <HistoryEntryCard key={entry.version} entry={entry} isLatest={idx === 0} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <History className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-400">No history recorded yet</p>
              <p className="text-xs text-stone-300 mt-1">Changes will be detected automatically on next server restart</p>
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

      {activeTab === 'history' && !capabilityDef && (
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
