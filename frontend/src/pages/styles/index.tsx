import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, AlertCircle, ChevronRight, Palette, Info } from 'lucide-react';
import { api } from '@/lib/api';
import type { StyleSummary, StyleSchool, EngineStyleMapping } from '@/types';
import clsx from 'clsx';

// Style school badge colors
const STYLE_COLORS: Record<StyleSchool, string> = {
  tufte: 'bg-gray-100 text-gray-800 border-gray-300',
  nyt_cox: 'bg-red-50 text-red-800 border-red-200',
  ft_burn_murdoch: 'bg-orange-50 text-orange-800 border-orange-200',
  lupi_data_humanism: 'bg-pink-50 text-pink-800 border-pink-200',
  stefaner_truth_beauty: 'bg-blue-50 text-blue-800 border-blue-200',
  activist_agitprop: 'bg-red-100 text-red-900 border-red-300',
};

// Style school display names
const STYLE_NAMES: Record<StyleSchool, string> = {
  tufte: 'Tufte',
  nyt_cox: 'NYT/Cox',
  ft_burn_murdoch: 'FT/Burn-Murdoch',
  lupi_data_humanism: 'Lupi/Data Humanism',
  stefaner_truth_beauty: 'Stefaner',
  activist_agitprop: 'Activist',
};

function StyleCard({ style }: { style: StyleSummary }) {
  return (
    <Link
      href={`/styles/${style.key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {style.name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {style.philosophy_summary}
          </p>
          {/* Color Preview */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: style.color_preview.primary }}
                title="Primary"
              />
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: style.color_preview.accent }}
                title="Accent"
              />
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: style.color_preview.background }}
                title="Background"
              />
            </div>
            <span className="text-xs text-gray-400">|</span>
            <div className="flex flex-wrap gap-1">
              {style.best_for_summary.slice(0, 2).map((use, i) => (
                <span key={i} className="text-xs text-gray-400">
                  {use}{i < 1 && ', '}
                </span>
              ))}
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

function EngineStyleCard({ mapping }: { mapping: EngineStyleMapping }) {
  return (
    <div className="card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/engines/${mapping.engine_key}`}
            className="text-sm font-medium text-gray-900 hover:text-primary-600"
          >
            {mapping.engine_name}
          </Link>
          <div className="mt-1 flex flex-wrap gap-1">
            {mapping.style_affinities.map((style) => (
              <span
                key={style}
                className={clsx(
                  'text-xs px-1.5 py-0.5 rounded border',
                  STYLE_COLORS[style]
                )}
              >
                {STYLE_NAMES[style]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {mapping.has_semantic_intent && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700"
              title="Has semantic visual intent"
            >
              Semantic
            </span>
          )}
          {mapping.recommended_visual_patterns.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
              title={`${mapping.recommended_visual_patterns.length} visual patterns`}
            >
              {mapping.recommended_visual_patterns.length} patterns
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StylesPage() {
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StyleSchool | null>(null);
  const [view, setView] = useState<'schools' | 'mappings'>('schools');

  // Fetch style schools
  const { data: styles, isLoading: stylesLoading, error: stylesError } = useQuery({
    queryKey: ['styles'],
    queryFn: () => api.styles.list(),
  });

  // Fetch engine-style mappings
  const { data: mappings, isLoading: mappingsLoading, error: mappingsError } = useQuery({
    queryKey: ['style-mappings'],
    queryFn: () => api.styles.getEngineMappings(),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['style-stats'],
    queryFn: () => api.styles.getStats(),
  });

  const filteredMappings = mappings?.filter((m) => {
    const matchesSearch = !search ||
      m.engine_name.toLowerCase().includes(search.toLowerCase()) ||
      m.engine_key.toLowerCase().includes(search.toLowerCase());
    const matchesStyle = !selectedStyle || m.style_affinities.includes(selectedStyle);
    return matchesSearch && matchesStyle;
  }) || [];

  const isLoading = stylesLoading || mappingsLoading;
  const error = stylesError || mappingsError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load styles from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visual Styles</h1>
          <p className="mt-1 text-gray-500">
            {stats?.styles_loaded ?? 0} dataviz schools, {stats?.engine_affinities ?? 0} engine affinities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('schools')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'schools'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Style Schools
          </button>
          <button
            onClick={() => setView('mappings')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'mappings'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Engine Mappings
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Styles are served from analyzer-v2</p>
            <p className="mt-1 text-blue-600">
              These definitions control how visualizations are styled based on the dataviz school approach.
              Each engine has preferred styles that match its analytical content.
            </p>
          </div>
        </div>
      </div>

      {view === 'schools' && (
        <>
          {/* Style Schools Grid */}
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {styles?.map((style) => (
                <StyleCard key={style.key} style={style} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'mappings' && (
        <>
          {/* Search and Filter */}
          <div className="card p-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search engines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedStyle(null)}
                  className={clsx(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    !selectedStyle
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  All
                </button>
                {Object.entries(STYLE_NAMES).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStyle(key as StyleSchool)}
                    className={clsx(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      selectedStyle === key
                        ? STYLE_COLORS[key as StyleSchool]
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Engine Mappings */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              {filteredMappings.length} engines
              {selectedStyle && ` with ${STYLE_NAMES[selectedStyle]} affinity`}
            </p>
            {mappingsLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="card p-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMappings.map((mapping) => (
                  <EngineStyleCard key={mapping.engine_key} mapping={mapping} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
