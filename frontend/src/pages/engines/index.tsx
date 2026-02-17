import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Layers,
  ChevronsUpDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { EngineSummary, EngineCategory } from '@/types';
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
};

const META_GROUPS: { label: string; categories: EngineCategory[] }[] = [
  { label: 'Analytical Foundations', categories: ['argument', 'epistemology', 'methodology', 'systems'] },
  { label: 'Subject Domains', categories: ['concepts', 'evidence', 'temporal'] },
  { label: 'Actor & Structure', categories: ['power', 'institutional', 'market'] },
  { label: 'Discourse Analysis', categories: ['rhetoric', 'scholarly'] },
  { label: 'Critical & Synthesis', categories: ['vulnerability', 'outline'] },
];

// ─── Engine row within a category ────────────────────────────────────

function EngineRow({ engine }: { engine: EngineSummary }) {
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
}: {
  meta: CategoryMeta;
  engines: EngineSummary[];
  isOpen: boolean;
  onToggle: () => void;
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
              <EngineRow key={engine.engine_key} engine={engine} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Search results (flat list when searching) ──────────────────────

function SearchResults({ engines }: { engines: EngineSummary[] }) {
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
                <span className={clsx('badge text-xs', CATEGORY_COLOR_BADGES[engine.category])}>
                  {engine.category}
                </span>
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
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [capabilityOnly, setCapabilityOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: engineData, isLoading, error } = useQuery({
    queryKey: ['engines', { search, app: selectedApp }],
    queryFn: () =>
      api.engines.list({
        search: search || undefined,
        app: selectedApp || undefined,
        limit: 500,
      }),
  });

  const { data: appsData } = useQuery({
    queryKey: ['engines', 'apps'],
    queryFn: () => api.engines.getApps(),
  });

  const { data: capabilityKeys } = useQuery({
    queryKey: ['engines', 'capability-keys'],
    queryFn: () => api.engines.listCapabilityKeys(),
  });

  const capKeySet = useMemo(() => new Set(capabilityKeys ?? []), [capabilityKeys]);

  const allEnginesRaw = engineData?.engines ?? [];
  const capMatchCount = useMemo(
    () => allEnginesRaw.filter(e => capKeySet.has(e.engine_key)).length,
    [allEnginesRaw, capKeySet]
  );
  const allEngines = capabilityOnly
    ? allEnginesRaw.filter(e => capKeySet.has(e.engine_key))
    : allEnginesRaw;
  const apps = appsData ?? [];

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
            {allEngines.length} analytical engines across {Object.keys(enginesByCategory).length} categories
            {selectedApp && <span className="text-primary-600 font-medium"> in {selectedApp}</span>}
          </p>
        </div>
        <Link href="/engines/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Engine
        </Link>
      </div>

      {/* Search + App filter bar */}
      <div className="card p-4 space-y-3">
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
          <SearchResults engines={allEngines} />
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
