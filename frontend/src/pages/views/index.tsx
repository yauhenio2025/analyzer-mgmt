import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Search,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ViewSummary } from '@/types';
import clsx from 'clsx';

// Color-code by renderer_type
const rendererColors: Record<string, string> = {
  tab: 'border-l-blue-500 bg-blue-50 text-blue-700',
  card_grid: 'border-l-emerald-500 bg-emerald-50 text-emerald-700',
  timeline: 'border-l-amber-500 bg-amber-50 text-amber-700',
  prose: 'border-l-violet-500 bg-violet-50 text-violet-700',
  matrix: 'border-l-rose-500 bg-rose-50 text-rose-700',
  accordion: 'border-l-teal-500 bg-teal-50 text-teal-700',
  card: 'border-l-orange-500 bg-orange-50 text-orange-700',
  stat_summary: 'border-l-cyan-500 bg-cyan-50 text-cyan-700',
  table: 'border-l-indigo-500 bg-indigo-50 text-indigo-700',
  raw_json: 'border-l-gray-500 bg-gray-50 text-gray-600',
};

const rendererBorderOnly: Record<string, string> = {
  tab: 'border-l-blue-500',
  card_grid: 'border-l-emerald-500',
  timeline: 'border-l-amber-500',
  prose: 'border-l-violet-500',
  matrix: 'border-l-rose-500',
  accordion: 'border-l-teal-500',
  card: 'border-l-orange-500',
  stat_summary: 'border-l-cyan-500',
  table: 'border-l-indigo-500',
  raw_json: 'border-l-gray-500',
};

const visibilityBadge: Record<string, string> = {
  always: 'bg-green-50 text-green-700 border-green-200',
  if_data_exists: 'bg-gray-50 text-gray-600 border-gray-200',
  on_demand: 'bg-amber-50 text-amber-700 border-amber-200',
};

function ViewCard({ view, isChild, childCount }: { view: ViewSummary; isChild?: boolean; childCount?: number }) {
  return (
    <Link
      href={`/views/${view.view_key}`}
      className={clsx(
        'card hover:shadow-md transition-shadow group border-l-4',
        isChild ? 'p-4' : 'p-5',
        rendererBorderOnly[view.renderer_type] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={clsx(
              'font-semibold text-gray-900',
              isChild ? 'text-sm' : 'text-base'
            )}>
              {view.view_name}
            </h3>
            <span
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                rendererColors[view.renderer_type] ||
                  'bg-gray-50 text-gray-600 border-gray-200'
              )}
            >
              {view.renderer_type}
            </span>
            {view.presentation_stance && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {view.presentation_stance}
              </span>
            )}
            {childCount !== undefined && childCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {childCount} child{childCount !== 1 ? 'ren' : ''}
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-gray-400 mb-2">
            {view.view_key}
          </p>

          {view.description && (
            <p className={clsx(
              'text-gray-600 line-clamp-2 leading-relaxed mb-3',
              isChild ? 'text-xs' : 'text-sm'
            )}>
              {view.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-medium">
              {view.target_app}:{view.target_page}
            </span>
            <span>pos: {view.position}</span>
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded border',
                visibilityBadge[view.visibility] || visibilityBadge.if_data_exists
              )}
            >
              {view.visibility}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

/** Recursive tree node: a view with nested children (which may themselves have children) */
interface ViewTreeNode {
  view: ViewSummary;
  children: ViewTreeNode[];
}

/** Build a recursive tree from flat views. Handles multi-level nesting (grandchildren, etc.) */
function buildViewTree(views: ViewSummary[]): { trees: ViewTreeNode[]; standalone: ViewSummary[] } {
  const byKey = new Map(views.map((v) => [v.view_key, v]));
  // Index: parent_key -> list of child views
  const childrenOf = new Map<string, ViewSummary[]>();
  for (const v of views) {
    if (v.parent_view_key) {
      const siblings = childrenOf.get(v.parent_view_key) || [];
      siblings.push(v);
      childrenOf.set(v.parent_view_key, siblings);
    }
  }

  // Recursively build tree nodes
  function buildNode(v: ViewSummary): ViewTreeNode {
    const directChildren = (childrenOf.get(v.view_key) || [])
      .sort((a, b) => a.position - b.position);
    return {
      view: v,
      children: directChildren.map((c) => buildNode(c)),
    };
  }

  // Top-level roots: views that have NO parent (or whose parent isn't in this group)
  const roots = views.filter((v) => !v.parent_view_key || !byKey.has(v.parent_view_key));

  const trees: ViewTreeNode[] = [];
  const standalone: ViewSummary[] = [];

  for (const v of roots) {
    const node = buildNode(v);
    if (node.children.length > 0) {
      trees.push(node);
    } else {
      standalone.push(v);
    }
  }

  trees.sort((a, b) => a.view.position - b.view.position);
  standalone.sort((a, b) => a.position - b.position);

  return { trees, standalone };
}

function ViewTreeGroup({ tree, isChild }: { tree: ViewTreeNode; isChild?: boolean }) {
  return (
    <div className="space-y-0">
      {/* Parent card — badge shows direct children count */}
      <ViewCard view={tree.view} isChild={isChild} childCount={tree.children.length} />
      {/* Children — indented with connector */}
      {tree.children.length > 0 && (
        <div className="ml-6 border-l-2 border-indigo-200 pl-4 py-2 space-y-2">
          {tree.children.map((child) =>
            child.children.length > 0 ? (
              <ViewTreeGroup key={child.view.view_key} tree={child} isChild />
            ) : (
              <ViewCard key={child.view.view_key} view={child.view} isChild />
            )
          )}
        </div>
      )}
    </div>
  );
}

interface GroupState {
  [key: string]: boolean;
}

export default function ViewsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<string>('');
  const [pageFilter, setPageFilter] = useState<string>('');
  const [structureFilter, setStructureFilter] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<GroupState>({});

  const {
    data: views,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['views'],
    queryFn: () => api.views.list(),
  });

  // Compute unique apps and pages for filter dropdowns
  const { uniqueApps, uniquePages } = useMemo(() => {
    if (!views) return { uniqueApps: [], uniquePages: [] };
    const apps = [...new Set(views.map((v) => v.target_app))].sort();
    const pages = [
      ...new Set(
        views
          .filter((v) => !appFilter || v.target_app === appFilter)
          .map((v) => v.target_page)
      ),
    ].sort();
    return { uniqueApps: apps, uniquePages: pages };
  }, [views, appFilter]);

  // Filter views
  const filteredViews = useMemo(() => {
    if (!views) return [];
    // Pre-compute parent keys for structure filter
    const parentKeys = new Set(views.filter((v) => v.parent_view_key).map((v) => v.parent_view_key!));
    return views.filter((v) => {
      if (appFilter && v.target_app !== appFilter) return false;
      if (pageFilter && v.target_page !== pageFilter) return false;
      if (structureFilter === 'top_level' && v.parent_view_key) return false;
      if (structureFilter === 'parents' && !parentKeys.has(v.view_key)) return false;
      if (structureFilter === 'children' && !v.parent_view_key) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          v.view_key.toLowerCase().includes(q) ||
          v.view_name.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.renderer_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [views, appFilter, pageFilter, structureFilter, searchQuery]);

  // Group by target_app:target_page
  const grouped = useMemo(() => {
    const groups: Record<string, ViewSummary[]> = {};
    for (const v of filteredViews) {
      const key = `${v.target_app}:${v.target_page}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    // Sort views within each group by position
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.position - b.position);
    }
    return groups;
  }, [filteredViews]);

  const groupKeys = Object.keys(grouped).sort();

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load views from analyzer-v2
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Definitions</h1>
          <p className="mt-1 text-gray-500">
            {views?.length ?? 0} declarative view specifications
          </p>
        </div>
        <Link href="/views/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create View
        </Link>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-indigo-50 border-indigo-200">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-medium">Declarative UI Rendering Specifications</p>
            <p className="mt-1 text-indigo-600">
              Views map analytical output to consumer app components. Each view
              declares what data, which renderer, and where it appears &mdash;
              consumer apps interpret these definitions and dispatch to their
              own component registries.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search views..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={appFilter}
          onChange={(e) => {
            setAppFilter(e.target.value);
            setPageFilter('');
          }}
          className="input w-auto min-w-[160px]"
        >
          <option value="">All apps</option>
          {uniqueApps.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          <option value="">All pages</option>
          {uniquePages.map((page) => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
        <select
          value={structureFilter}
          onChange={(e) => setStructureFilter(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          <option value="">All views</option>
          <option value="top_level">Top-level only</option>
          <option value="parents">Parents only</option>
          <option value="children">Children only</option>
        </select>
      </div>

      {/* Renderer Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span className="font-medium">Renderers:</span>
        {Object.entries(rendererBorderOnly).map(([type, cls]) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className={clsx('inline-block w-2 h-2 rounded-full', cls.replace('border-l-', 'bg-'))}
            />
            {type}
          </span>
        ))}
      </div>

      {/* Views Grouped */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <div className="card p-5 border-l-4 border-l-gray-200 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="card p-5 border-l-4 border-l-gray-200 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-28 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <Eye className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No views found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupKeys.map((groupKey) => {
            const isCollapsed = collapsedGroups[groupKey];
            const groupViews = grouped[groupKey];
            return (
              <div key={groupKey} className="card overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {groupKey}
                    </span>
                    <span className="text-xs text-gray-400">
                      {groupViews.length} view{groupViews.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {!isCollapsed && (() => {
                  const { trees, standalone } = buildViewTree(groupViews);
                  return (
                    <div className="p-4 space-y-4">
                      {/* Tree views — parent + indented children */}
                      {trees.map((tree) => (
                        <ViewTreeGroup key={tree.view.view_key} tree={tree} />
                      ))}
                      {/* Standalone views — no parent, no children */}
                      {standalone.length > 0 && (
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                          {standalone.map((view) => (
                            <ViewCard key={view.view_key} view={view} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
