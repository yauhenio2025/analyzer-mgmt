import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  History,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Grid, GridDimension, WildcardSuggestion } from '@/types';
import clsx from 'clsx';

const TRACK_COLORS: Record<string, string> = {
  ideas: 'bg-purple-100 text-purple-800',
  process: 'bg-blue-100 text-blue-800',
};

const STATUS_COLORS: Record<string, string> = {
  suggested: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  promoted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function DimensionList({
  title,
  dimensions,
  onChange,
}: {
  title: string;
  dimensions: GridDimension[];
  onChange: (dims: GridDimension[]) => void;
}) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onChange([...dimensions, { name: newName.trim(), description: '', added_version: 0 }]);
    setNewName('');
  };

  const handleRemove = (index: number) => {
    onChange(dimensions.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, description: string) => {
    const updated = [...dimensions];
    updated[index] = { ...updated[index], description };
    onChange(updated);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title} ({dimensions.length})</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {dimensions.map((dim, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-white rounded border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{i}</span>
                <span className="text-sm font-medium text-gray-900">{dim.name}</span>
                {dim.added_version > 1 && (
                  <span className="text-xs text-gray-400">v{dim.added_version}</span>
                )}
              </div>
              <input
                type="text"
                value={dim.description}
                onChange={(e) => handleDescriptionChange(i, e.target.value)}
                placeholder="Description..."
                className="mt-1 w-full text-xs text-gray-500 border-0 border-b border-transparent hover:border-gray-200 focus:border-primary-300 focus:ring-0 p-0 pl-7"
              />
            </div>
            <button
              onClick={() => handleRemove(i)}
              className="text-gray-300 hover:text-red-500 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={`Add ${title.toLowerCase().slice(0, -1)}...`}
          className="flex-1 text-sm border rounded px-2 py-1"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="text-sm px-2 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function WildcardsTable({ gridKey }: { gridKey: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wildcards', gridKey],
    queryFn: () => api.grids.listWildcards(gridKey),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) => api.grids.promoteWildcard(gridKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wildcards', gridKey] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.grids.rejectWildcard(gridKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wildcards', gridKey] });
    },
  });

  const addToGridMutation = useMutation({
    mutationFn: (id: string) => api.grids.addWildcardToGrid(gridKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wildcards', gridKey] });
      queryClient.invalidateQueries({ queryKey: ['grid', gridKey] });
    },
  });

  if (isLoading) return <div className="text-sm text-gray-400">Loading wildcards...</div>;
  if (!data || data.wildcards.length === 0) {
    return <div className="text-sm text-gray-400">No wildcard suggestions yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500">
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Scope</th>
            <th className="py-2 pr-3">Source</th>
            <th className="py-2 pr-3">Confidence</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.wildcards.map((w: WildcardSuggestion) => (
            <tr key={w.id} className="border-b">
              <td className="py-2 pr-3 font-medium">{w.name}</td>
              <td className="py-2 pr-3 capitalize">{w.dimension_type}</td>
              <td className="py-2 pr-3">
                <span className={clsx(
                  'badge text-xs',
                  w.scope === 'universal' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                )}>
                  {w.scope.replace('_', ' ')}
                </span>
              </td>
              <td className="py-2 pr-3 text-gray-500">{w.source_project || '-'}</td>
              <td className="py-2 pr-3">{(w.confidence * 100).toFixed(0)}%</td>
              <td className="py-2 pr-3">
                <span className={clsx('badge text-xs', STATUS_COLORS[w.status])}>
                  {w.status}
                </span>
              </td>
              <td className="py-2">
                <div className="flex gap-1">
                  {(w.status === 'suggested') && (
                    <button
                      onClick={() => promoteMutation.mutate(w.id)}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Move to review"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                    </button>
                  )}
                  {(w.status === 'review') && (
                    <button
                      onClick={() => addToGridMutation.mutate(w.id)}
                      className="p-1 text-green-500 hover:text-green-700"
                      title="Add to grid"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  {(w.status === 'suggested' || w.status === 'review') && (
                    <button
                      onClick={() => rejectMutation.mutate(w.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GridDetailPage() {
  const router = useRouter();
  const gridKey = router.query.key as string;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'dimensions' | 'wildcards' | 'versions'>('dimensions');
  const [editedConditions, setEditedConditions] = useState<GridDimension[] | null>(null);
  const [editedAxes, setEditedAxes] = useState<GridDimension[] | null>(null);
  const [changeSummary, setChangeSummary] = useState('');

  const { data: grid, isLoading, error } = useQuery({
    queryKey: ['grid', gridKey],
    queryFn: () => api.grids.get(gridKey),
    enabled: !!gridKey,
    onSuccess: (data: Grid) => {
      if (editedConditions === null) setEditedConditions(data.conditions);
      if (editedAxes === null) setEditedAxes(data.axes);
    },
  });

  const { data: versionsData } = useQuery({
    queryKey: ['grid-versions', gridKey],
    queryFn: () => api.grids.getVersions(gridKey),
    enabled: !!gridKey && tab === 'versions',
  });

  const updateMutation = useMutation({
    mutationFn: (data: { conditions: GridDimension[]; axes: GridDimension[]; change_summary: string }) =>
      api.grids.update(gridKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grid', gridKey] });
      queryClient.invalidateQueries({ queryKey: ['grid-versions', gridKey] });
      setChangeSummary('');
    },
  });

  const handleSave = () => {
    if (!editedConditions || !editedAxes) return;
    updateMutation.mutate({
      conditions: editedConditions,
      axes: editedAxes,
      change_summary: changeSummary || 'Updated via UI',
    });
  };

  const hasChanges =
    grid &&
    editedConditions &&
    editedAxes &&
    (JSON.stringify(editedConditions) !== JSON.stringify(grid.conditions) ||
      JSON.stringify(editedAxes) !== JSON.stringify(grid.axes));

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-500">Error loading grid</div>;
  if (!grid) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/grids" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Grids
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{grid.grid_name}</h1>
          <span className={clsx('badge', TRACK_COLORS[grid.track])}>{grid.track}</span>
          <span className="text-sm text-gray-400">v{grid.version}</span>
        </div>
        {grid.description && (
          <p className="mt-1 text-sm text-gray-500">{grid.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b mb-4">
        <nav className="flex gap-4">
          {(['dimensions', 'wildcards', 'versions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'pb-2 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Dimensions Tab */}
      {tab === 'dimensions' && editedConditions && editedAxes && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4">
              <DimensionList
                title="Conditions (Rows)"
                dimensions={editedConditions}
                onChange={setEditedConditions}
              />
            </div>
            <div className="card p-4">
              <DimensionList
                title="Axes (Columns)"
                dimensions={editedAxes}
                onChange={setEditedAxes}
              />
            </div>
          </div>

          {hasChanges && (
            <div className="mt-4 card p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Change summary</label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe your changes..."
                    className="mt-1 w-full text-sm border rounded px-3 py-1.5"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save (v{grid.version + 1})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wildcards Tab */}
      {tab === 'wildcards' && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wildcard Suggestions</h2>
          <WildcardsTable gridKey={gridKey} />
        </div>
      )}

      {/* Versions Tab */}
      {tab === 'versions' && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
          {versionsData ? (
            <div className="space-y-3">
              {versionsData.versions.map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-3 border rounded">
                  <History className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Version {v.version}</div>
                    <div className="text-xs text-gray-500">{v.change_summary}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {v.created_at ? new Date(v.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">Loading...</div>
          )}
        </div>
      )}
    </div>
  );
}
