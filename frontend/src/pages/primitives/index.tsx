import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, AlertCircle, ChevronRight, Info, Shapes, Cpu } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalyticalPrimitive, EnginePrimitiveMapping } from '@/types';
import clsx from 'clsx';

function PrimitiveCard({ primitive }: { primitive: AnalyticalPrimitive }) {
  return (
    <Link
      href={`/primitives/${primitive.key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{primitive.name}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{primitive.description}</p>

          {/* Visual forms preview */}
          <div className="mt-2 flex flex-wrap gap-1">
            {primitive.visual_forms.slice(0, 3).map((form) => (
              <span
                key={form}
                className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {form.replace(/_/g, ' ')}
              </span>
            ))}
            {primitive.visual_forms.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                +{primitive.visual_forms.length - 3} more
              </span>
            )}
          </div>

          {/* Engine count */}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Cpu className="h-3 w-3" />
            {primitive.associated_engines.length} engines
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

function EngineMappingRow({ mapping }: { mapping: EnginePrimitiveMapping }) {
  if (!mapping.has_primitive) return null;

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
      <Link
        href={`/engines/${mapping.engine_key}`}
        className="text-sm font-medium text-gray-900 hover:text-primary-600"
      >
        {mapping.engine_name}
      </Link>
      <div className="flex gap-1">
        {mapping.primitives.map((p) => (
          <Link
            key={p}
            href={`/primitives/${p}`}
            className="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
          >
            {p.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PrimitivesPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'primitives' | 'engines'>('primitives');

  // Fetch all primitives with full details
  const { data: primitives, isLoading: primitivesLoading, error: primitivesError } = useQuery({
    queryKey: ['primitives-all'],
    queryFn: () => api.primitives.getAll(),
  });

  // Fetch engine mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['primitive-mappings'],
    queryFn: () => api.primitives.getEngineMappings(),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['primitive-stats'],
    queryFn: () => api.primitives.getStats(),
  });

  const filteredPrimitives = primitives?.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.key.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredMappings = mappings?.filter((m) =>
    m.has_primitive && (!search ||
      m.engine_name.toLowerCase().includes(search.toLowerCase()) ||
      m.engine_key.toLowerCase().includes(search.toLowerCase()) ||
      m.primitives.some(p => p.includes(search.toLowerCase())))
  ) || [];

  const isLoading = primitivesLoading || mappingsLoading;

  if (primitivesError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load primitives from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytical Primitives</h1>
          <p className="mt-1 text-gray-500">
            {stats?.primitives_loaded ?? 0} primitives, {stats?.engines_with_primitives ?? 0} engine associations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('primitives')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'primitives'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Shapes className="h-4 w-4 inline mr-1" />
            Primitives
          </button>
          <button
            onClick={() => setView('engines')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'engines'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Cpu className="h-4 w-4 inline mr-1" />
            Engine Map
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-purple-50 border-purple-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-medium">Trading Zone: Engines ↔ Visuals</p>
            <p className="mt-1 text-purple-600">
              Primitives are intermediate concepts that bridge analytical meaning to visual form.
              They provide soft guidance to Gemini about what visual approaches tend to work.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={view === 'primitives' ? 'Search primitives...' : 'Search engines...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {view === 'primitives' && (
        <>
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
              {filteredPrimitives.map((primitive) => (
                <PrimitiveCard key={primitive.key} primitive={primitive} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'engines' && (
        <div className="card divide-y">
          <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 flex justify-between">
            <span>Engine</span>
            <span>Primitives</span>
          </div>
          {filteredMappings.map((mapping) => (
            <EngineMappingRow key={mapping.engine_key} mapping={mapping} />
          ))}
          {filteredMappings.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">
              No engines with primitive associations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
