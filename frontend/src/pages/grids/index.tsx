import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { api } from '@/lib/api';
import type { GridSummary } from '@/types';
import clsx from 'clsx';

const TRACK_COLORS: Record<string, string> = {
  ideas: 'bg-purple-100 text-purple-800',
  process: 'bg-blue-100 text-blue-800',
};

function GridCard({ grid }: { grid: GridSummary }) {
  return (
    <Link
      href={`/grids/${grid.grid_key}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {grid.grid_name}
            </h3>
            <span className={clsx('badge text-xs', TRACK_COLORS[grid.track] || 'bg-gray-100 text-gray-800')}>
              {grid.track}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span>v{grid.version}</span>
            <span>•</span>
            <span>{grid.condition_count} conditions × {grid.axis_count} axes</span>
            <span>•</span>
            <span className="capitalize">{grid.status}</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function GridsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['grids'],
    queryFn: () => api.grids.list(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Grids</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage dimension grids for decision support tracks
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Loading grids...</div>
      )}

      {error && (
        <div className="text-center py-12 text-red-500">
          Failed to load grids: {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.grids.map((grid) => (
            <GridCard key={grid.grid_key} grid={grid} />
          ))}
          {data.grids.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No grids found. Run the seed script to create initial grids.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

