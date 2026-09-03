import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Layers,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { EngineSummary, EngineCategory } from '@/types';
import { FAMILY_META, familyChipClass, familyLabel } from '@/lib/families';
import clsx from 'clsx';

// ─── Category metadata ───────────────────────────────────────────────

type CategoryMeta = {
  key: EngineCategory;
  label: string;
  description: string;
  colors: { bg: string; text: string; border: string; accent: string };
};

const CATEGORY_META: CategoryMeta[] = [
  // Analytical Foundations
  {
    key: 'argument',
    label: 'Argument',
    description: 'Logical structure, reasoning chains, and argumentative architecture',
    colors: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-500' },
  },
  {
    key: 'epistemology',
    label: 'Epistemology',
    description: 'Knowledge claims, certainty markers, and epistemic frameworks',
    colors: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500' },
  },
  {
    key: 'methodology',
    label: 'Methodology',
    description: 'Research methods, measurement validity, and analytical rigor',
    colors: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
  },
  {
    key: 'systems',
    label: 'Systems',
    description: 'Feedback loops, emergent properties, and systemic dynamics',
    colors: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', accent: 'bg-green-500' },
  },
  // Subject Domains
  {
    key: 'concepts',
    label: 'Concepts',
    description: 'Concept boundaries, mutations, relationships, and semantic networks',
    colors: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', accent: 'bg-yellow-500' },
  },
  {
    key: 'evidence',
    label: 'Evidence',
    description: 'Provenance, data quality, and evidentiary assessment',
    colors: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
  },
  {
    key: 'temporal',
    label: 'Temporal',
    description: 'Timeline analysis, historical change, and chronological patterns',
    colors: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-500' },
  },
  // Actor & Structure
  {
    key: 'power',
    label: 'Power',
    description: 'Power dynamics, influence structures, and authority relations',
    colors: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
  },
  {
    key: 'institutional',
    label: 'Institutional',
    description: 'Organizational behavior, bureaucratic patterns, and governance',
    colors: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
  },
  {
    key: 'market',
    label: 'Market',
    description: 'Competitive landscapes, market positioning, and economic analysis',
    colors: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
  },
  // Discourse Analysis
  {
    key: 'rhetoric',
    label: 'Rhetoric',
    description: 'Persuasive strategies, framing techniques, and discourse patterns',
    colors: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
  },
  {
    key: 'scholarly',
    label: 'Scholarly',
    description: 'Academic discourse, citation networks, and research landscape',
    colors: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', accent: 'bg-slate-500' },
  },
  // Critical & Synthesis
  {
    key: 'vulnerability',
    label: 'Vulnerability',
    description: 'Counter-arguments, exposed flanks, and self-critical analysis',
    colors: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' },
  },
  {
    key: 'outline',
    label: 'Outline',
    description: 'Essay construction, talking points, and synthesis operations',
    colors: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-500' },
  },
  // Estate methods — mirrored from other organs (2026-09-04)
  {
    key: 'storytelling',
    label: 'Storytelling',
    description: 'Spine, telling dials, narrative approaches, and script-first writing',
    colors: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
  },
  {
    key: 'editing',
    label: 'Editing',
    description: 'Pacing, sharpening, harmonizing, and the red pen over a draft',
    colors: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
  },
  {
    key: 'restructuring',
    label: 'Restructuring',
    description: 'Long-form re-imagining: architecture, rivals, and rebuilds in another form',
    colors: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-600' },
  },
  {
    key: 'imagination',
    label: 'Imagination',
    description: 'Rival framings, counterfactuals, and what the material could become',
    colors: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-500' },
  },
  {
    key: 'search',
    label: 'Search',
    description: 'Budgeted retrieval loops, lanes, effectors, and citation vetting',
    colors: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-600' },
  },
  {
    key: 'planning',
    label: 'Planning',
    description: 'Storyboards and approach selection before anything is rendered',
    colors: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', accent: 'bg-lime-500' },
  },
  {
    key: 'visual',
    label: 'Visual',
    description: 'Prompt benches, text layers, and per-clip visual doctrine',
    colors: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-500' },
  },
  {
    key: 'audio',
    label: 'Audio',
    description: 'Casting, music briefs, scratch voice-over, and the sound check',
    colors: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-600' },
  },
  {
    key: 'composition',
    label: 'Composition',
    description: 'Figures, plates, layouts, and the assembly of exhibits',
    colors: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
  },
  {
    key: 'quality',
    label: 'Quality',
    description: 'Dailies, screening, grounding review, verdicts, and retrospectives',
    colors: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
  },
  {
    key: 'governance',
    label: 'Governance',
    description: 'Activity models, method selection, budgets, and the estate contract',
    colors: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300', accent: 'bg-stone-500' },
  },
];

const CATEGORY_COLOR_BADGES: Record<EngineCategory, string> = {
  argument: 'bg-red-100 text-red-800',
  epistemology: 'bg-purple-100 text-purple-800',
  methodology: 'bg-blue-100 text-blue-800',
  systems: 'bg-green-100 text-green-800',
  concepts: 'bg-yellow-100 text-yellow-800',
  evidence: 'bg-orange-100 text-orange-800',
  temporal: 'bg-cyan-100 text-cyan-800',
  power: 'bg-rose-100 text-rose-800',
  institutional: 'bg-indigo-100 text-indigo-800',
  market: 'bg-emerald-100 text-emerald-800',
  rhetoric: 'bg-pink-100 text-pink-800',
  scholarly: 'bg-slate-100 text-slate-800',
  vulnerability: 'bg-amber-100 text-amber-800',
  outline: 'bg-teal-100 text-teal-800',
  // Estate categories (methods mirrored from other organs)
  storytelling: 'bg-pink-100 text-pink-800',
  editing: 'bg-orange-100 text-orange-800',
  restructuring: 'bg-teal-100 text-teal-800',
  search: 'bg-cyan-100 text-cyan-800',
  visual: 'bg-violet-100 text-violet-800',
  audio: 'bg-fuchsia-100 text-fuchsia-800',
  planning: 'bg-lime-100 text-lime-800',
  quality: 'bg-emerald-100 text-emerald-800',
  composition: 'bg-indigo-100 text-indigo-800',
  imagination: 'bg-fuchsia-100 text-fuchsia-800',
  governance: 'bg-stone-200 text-stone-800',
};

const META_GROUPS: { label: string; categories: EngineCategory[] }[] = [
  { label: 'Analytical Foundations', categories: ['argument', 'epistemology', 'methodology', 'systems'] },
  { label: 'Subject Domains', categories: ['concepts', 'evidence', 'temporal'] },
  { label: 'Actor & Structure', categories: ['power', 'institutional', 'market'] },
  { label: 'Discourse Analysis', categories: ['rhetoric', 'scholarly'] },
  { label: 'Critical & Synthesis', categories: ['vulnerability', 'outline'] },
  // Methods mirrored from other organs of the estate
  { label: 'Storytelling & Editing', categories: ['storytelling', 'editing', 'restructuring', 'imagination'] },
  { label: 'Search, Rendering & Governance', categories: ['search', 'planning', 'visual', 'audio', 'composition', 'quality', 'governance'] },
];

type OrganNames = Map<string, string>;

/** "Wirecut · mirrored" — shown when an engine's home is another organ. */
function OrganBadge({ engine, organNames }: { engine: EngineSummary; organNames: OrganNames }) {
  if (!engine.home_organ || engine.home_organ === 'the-analyst') return null;
  return (
    <span
      className="badge text-[10px] py-0 bg-white text-gray-600 border border-gray-300 whitespace-nowrap"
      title={`Home organ: ${engine.home_organ}${engine.sync ? ` (${engine.sync})` : ''}`}
    >
      {organNames.get(engine.home_organ) ?? engine.home_organ}
      {engine.sync && <span className="text-gray-400"> · {engine.sync}</span>}
    </span>
  );
}

// ─── Engine row within a category ────────────────────────────────────

function EngineRow({ engine, organNames }: { engine: EngineSummary; organNames: OrganNames }) {
  return (
    <Link
      href={`/engines/${engine.engine_key}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {engine.engine_name}
          </span>
          <OrganBadge engine={engine} organNames={organNames} />
          <span className="text-xs text-gray-400 capitalize hidden sm:inline">{engine.kind}</span>
          {engine.paradigm_keys.length > 0 && (
            <span className="text-xs text-gray-400 hidden md:inline">
              {engine.paradigm_keys.join(', ')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{engine.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Category accordion section ──────────────────────────────────────

function CategorySection({
  meta,
  engines,
  isOpen,
  onToggle,
  organNames,
}: {
  meta: CategoryMeta;
  engines: EngineSummary[];
  isOpen: boolean;
  onToggle: () => void;
  organNames: OrganNames;
}) {
  if (engines.length === 0) return null;

  return (
    <div className={clsx('rounded-lg border overflow-hidden transition-colors', meta.colors.border, isOpen && meta.colors.bg)}>
      <button
        onClick={onToggle}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          isOpen ? meta.colors.bg : 'bg-white hover:bg-gray-50'
        )}
      >
        <div className={clsx('w-1 h-8 rounded-full flex-shrink-0', meta.colors.accent)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('text-base font-semibold', isOpen ? meta.colors.text : 'text-gray-900')}>
              {meta.label}
            </span>
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isOpen ? `${meta.colors.text} bg-white/60` : 'text-gray-500 bg-gray-100'
            )}>
              {engines.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
        </div>
        {isOpen ? (
          <ChevronDown className={clsx('h-5 w-5 flex-shrink-0', meta.colors.text)} />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="bg-white border-t border-gray-100">
          {engines
            .sort((a, b) => a.engine_name.localeCompare(b.engine_name))
            .map((engine) => (
              <EngineRow key={engine.engine_key} engine={engine} organNames={organNames} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Search results (flat list when searching) ──────────────────────

function SearchResults({ engines, organNames }: { engines: EngineSummary[]; organNames: OrganNames }) {
  return (
    <div className="card overflow-hidden divide-y divide-gray-100">
      {engines
        .sort((a, b) => a.engine_name.localeCompare(b.engine_name))
        .map((engine) => (
          <Link
            key={engine.engine_key}
            href={`/engines/${engine.engine_key}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {engine.engine_name}
                </span>
                <span className={clsx('badge text-xs', CATEGORY_COLOR_BADGES[engine.category] ?? 'badge-gray')}>
                  {engine.category}
                </span>
                <OrganBadge engine={engine} organNames={organNames} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{engine.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────

export default function EnginesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [capabilityOnly, setCapabilityOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Deep links from the estate pages: /engines?family=storytelling, /engines?organ=wirecut
  useEffect(() => {
    if (!router.isReady) return;
    setSelectedFamily(typeof router.query.family === 'string' ? router.query.family : null);
    setSelectedOrgan(typeof router.query.organ === 'string' ? router.query.organ : null);
  }, [router.isReady, router.query.family, router.query.organ]);

  const { data: engineData, isLoading, error } = useQuery({
    queryKey: ['engines', { search, app: selectedApp, function: selectedFunction }],
    queryFn: () =>
      api.engines.list({
        search: search || undefined,
        app: selectedApp || undefined,
        function: selectedFunction || undefined,
        limit: 500,
      }),
  });

  const { data: appsData } = useQuery({
    queryKey: ['engines', 'apps'],
    queryFn: () => api.engines.getApps(),
  });

  const { data: functionsData } = useQuery({
    queryKey: ['engines', 'functions'],
    queryFn: () => api.engines.getFunctions(),
  });

  const { data: capabilityKeys } = useQuery({
    queryKey: ['engines', 'capability-keys'],
    queryFn: () => api.engines.listCapabilityKeys(),
  });

  const { data: organsData } = useQuery({
    queryKey: ['organs'],
    queryFn: () => api.organs.list(),
  });
  const organNames = useMemo<OrganNames>(
    () => new Map((organsData ?? []).map((o) => [o.organ_key, o.organ_name])),
    [organsData]
  );

  const capKeySet = useMemo(() => new Set(capabilityKeys ?? []), [capabilityKeys]);

  const allEnginesRaw = engineData?.engines ?? [];
  const capMatchCount = useMemo(
    () => allEnginesRaw.filter(e => capKeySet.has(e.engine_key)).length,
    [allEnginesRaw, capKeySet]
  );
  const baseEngines = capabilityOnly
    ? allEnginesRaw.filter(e => capKeySet.has(e.engine_key))
    : allEnginesRaw;
  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of baseEngines) {
      const f = e.family ?? 'analytical';
      counts[f] = (counts[f] ?? 0) + 1;
    }
    return counts;
  }, [baseEngines]);
  const allEngines = baseEngines.filter(
    (e) =>
      (!selectedFamily || (e.family ?? 'analytical') === selectedFamily) &&
      (!selectedOrgan || e.home_organ === selectedOrgan)
  );
  const apps = appsData ?? [];
  const functions = functionsData ?? [];

  // Group engines by category
  const enginesByCategory = useMemo(() => {
    const grouped: Record<string, EngineSummary[]> = {};
    for (const engine of allEngines) {
      if (!grouped[engine.category]) grouped[engine.category] = [];
      grouped[engine.category].push(engine);
    }
    return grouped;
  }, [allEngines]);

  // Determine if we're in search mode (show flat results instead of accordion)
  const isSearching = search.length > 0;

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(CATEGORY_META.map((c) => c.key)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const allExpanded = CATEGORY_META.every(
    (c) => expandedCategories.has(c.key) || !(enginesByCategory[c.key]?.length)
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load engines
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engines</h1>
          <p className="mt-1 text-gray-500">
            {allEngines.length} {selectedFamily ? familyLabel(selectedFamily).toLowerCase() : ''} engines across{' '}
            {Object.keys(enginesByCategory).length} categories
            {selectedApp && <span className="text-primary-600 font-medium"> in {selectedApp}</span>}
            {selectedOrgan && (
              <span className="text-primary-600 font-medium"> hosted by {organNames.get(selectedOrgan) ?? selectedOrgan}</span>
            )}
          </p>
        </div>
        <Link href="/engines/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Engine
        </Link>
      </div>

      {/* Search + App filter bar */}
      <div className="card p-4 space-y-3">
        {/* Family strip */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Family</span>
          <button
            onClick={() => setSelectedFamily(null)}
            className={clsx(
              'badge cursor-pointer text-xs',
              selectedFamily === null ? 'badge-primary' : 'badge-gray hover:bg-gray-200'
            )}
          >
            All <span className="ml-1 opacity-60">{baseEngines.length}</span>
          </button>
          {FAMILY_META.map((f) => {
            const n = familyCounts[f.key] ?? 0;
            const active = selectedFamily === f.key;
            return (
              <button
                key={f.key}
                disabled={n === 0}
                onClick={() => setSelectedFamily(active ? null : f.key)}
                className={clsx(
                  'badge text-xs border',
                  active
                    ? clsx(familyChipClass(f.key), 'ring-1 ring-gray-400 ring-offset-1')
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  n === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                {f.label} <span className="ml-1 opacity-60">{n}</span>
              </button>
            );
          })}
          {selectedOrgan && (
            <button
              onClick={() => setSelectedOrgan(null)}
              className="badge text-xs bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
              title="Clear organ filter"
            >
              organ: {organNames.get(selectedOrgan) ?? selectedOrgan}
              <X className="h-3 w-3 ml-1" />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search engines by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          {!isSearching && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="btn-secondary text-sm"
              title={allExpanded ? 'Collapse all categories' : 'Expand all categories'}
            >
              <ChevronsUpDown className="h-4 w-4 mr-1.5" />
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>

        {/* App filter + Capability toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {apps.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              <button
                onClick={() => setSelectedApp(null)}
                className={clsx(
                  'badge cursor-pointer text-xs',
                  selectedApp === null ? 'badge-primary' : 'badge-gray hover:bg-gray-200'
                )}
              >
                All Apps
              </button>
              {apps.map((app) => (
                <button
                  key={app}
                  onClick={() => setSelectedApp(selectedApp === app ? null : app)}
                  className={clsx(
                    'badge cursor-pointer capitalize text-xs',
                    selectedApp === app
                      ? 'bg-violet-100 text-violet-800'
                      : 'badge-gray hover:bg-gray-200'
                  )}
                >
                  {app}
                </button>
              ))}
            </div>
          )}

          {functions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Function:</span>
              <button
                onClick={() => setSelectedFunction(null)}
                className={clsx(
                  'badge cursor-pointer text-xs',
                  selectedFunction === null ? 'badge-primary' : 'badge-gray hover:bg-gray-200'
                )}
              >
                All
              </button>
              {functions.map((fn) => (
                <button
                  key={fn}
                  onClick={() => setSelectedFunction(selectedFunction === fn ? null : fn)}
                  className={clsx(
                    'badge cursor-pointer capitalize text-xs',
                    selectedFunction === fn
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'badge-gray hover:bg-gray-200'
                  )}
                >
                  {fn}
                </button>
              ))}
            </div>
          )}

          {/* Capability filter toggle */}
          {capMatchCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={capabilityOnly}
                onChange={(e) => setCapabilityOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
              />
              <span className={clsx(
                'text-xs font-medium',
                capabilityOnly ? 'text-primary-700' : 'text-gray-500'
              )}>
                Capability-enabled only
              </span>
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                capabilityOnly ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              )}>
                {capMatchCount}
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search mode: flat results */}
      {!isLoading && isSearching && allEngines.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {allEngines.length} result{allEngines.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
          <SearchResults engines={allEngines} organNames={organNames} />
        </div>
      )}

      {/* Browse mode: category accordion */}
      {!isLoading && !isSearching && (
        <div className="space-y-2">
          {META_GROUPS.map((group) => {
            const groupCategories = CATEGORY_META.filter((c) =>
              group.categories.includes(c.key)
            );
            const groupEngineCount = groupCategories.reduce(
              (sum, c) => sum + (enginesByCategory[c.key]?.length ?? 0),
              0
            );
            if (groupEngineCount === 0) return null;

            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{groupEngineCount}</span>
                </div>
                <div className="space-y-2">
                  {groupCategories.map((meta) => {
                    const engines = enginesByCategory[meta.key] ?? [];
                    return (
                      <CategorySection
                        key={meta.key}
                        meta={meta}
                        engines={engines}
                        isOpen={expandedCategories.has(meta.key)}
                        onToggle={() => toggleCategory(meta.key)}
                        organNames={organNames}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allEngines.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No engines found</p>
          {(selectedFamily || selectedOrgan) && (
            <button
              onClick={() => { setSelectedFamily(null); setSelectedOrgan(null); }}
              className="mt-2 mr-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear family / organ filter
            </button>
          )}
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
