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

function ViewCard({ view, isChild, childCount, hasChildren }: { view: ViewSummary; isChild?: boolean; childCount?: number; hasChildren?: boolean }) {
  // Child cards: compact row style, no heavy border, no description
  if (isChild) {
    return (
      <Link
        href={`/views/${view.view_key}`}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 transition-all group"
      >
        {/* Small renderer color pip */}
        <span
          className={clsx(
            'flex-shrink-0 w-1.5 h-6 rounded-full',
            (rendererBorderOnly[view.renderer_type] || 'border-l-gray-300').replace('border-l-', 'bg-')
          )}
        />
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-800 truncate flex-shrink-0" style={{ maxWidth: '50%' }}>
            {view.view_name}
          </h3>
          <span className="text-[10px] font-mono text-gray-400 truncate hidden sm:inline">
            {view.view_key}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={clsx(
              'px-1.5 py-0.5 text-[10px] font-medium rounded-full border whitespace-nowrap',
              rendererColors[view.renderer_type] ||
                'bg-gray-50 text-gray-600 border-gray-200'
            )}
          >
            {view.renderer_type}
          </span>
          {view.presentation_stance && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
              {view.presentation_stance}
            </span>
          )}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </Link>
    );
  }

  // Parent / standalone cards: full detail — lighter style matching child aesthetic
  return (
    <Link
      href={`/views/${view.view_key}`}
      className={clsx(
        'block border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group px-4 py-3',
        hasChildren ? 'rounded-t-lg border-b-0' : 'rounded-lg'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Renderer color pip — matches child row style */}
        <span
          className={clsx(
            'flex-shrink-0 w-1.5 rounded-full mt-1',
            (rendererBorderOnly[view.renderer_type] || 'border-l-gray-300').replace('border-l-', 'bg-')
          )}
          style={{ height: 28 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
              {view.view_name}
            </h3>
            <span
              className={clsx(
                'px-1.5 py-0.5 text-[10px] font-medium rounded-full border',
                rendererColors[view.renderer_type] ||
                  'bg-gray-50 text-gray-600 border-gray-200'
              )}
            >
              {view.renderer_type}
            </span>
            {view.presentation_stance && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {view.presentation_stance}
              </span>
            )}
            {childCount !== undefined && childCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {childCount} child{childCount !== 1 ? 'ren' : ''}
              </span>
            )}
          </div>

          <p className="text-[10px] font-mono text-gray-400 mb-1.5">
            {view.view_key}
          </p>

          {view.description && (
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-2">
              {view.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="font-medium">
              {view.target_app}:{view.target_page}
            </span>
            <span>pos: {view.position}</span>
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded border text-[10px]',
                visibilityBadge[view.visibility] || visibilityBadge.if_data_exists
              )}
            >
              {view.visibility}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1.5" />
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

/* ---- Tree-line visual constants ---- */
const TREE_INDENT = 28;            // horizontal indent per nesting level (px)
const TREE_BRANCH_Y = 18;          // vertical position of the horizontal branch line
const TREE_LINE_COLOR = '#a1a1aa';  // zinc-400: clearly visible trunk
const TREE_DOT_COLOR = '#71717a';   // zinc-500: prominent dot
const TREE_LINE_WIDTH = 2;          // 2px trunk and branches

/**
 * A single child row in a clean file-tree layout.
 *
 * Visual structure:
 *   |              <-- vertical trunk (left edge)
 *   |----o  Card   <-- horizontal branch + dot + content
 *   |
 */
function TreeChildRow({
  isLast,
  children,
}: {
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" style={{ paddingLeft: TREE_INDENT }}>
      {/* Vertical trunk:
          - non-last child: full height so it continues to next sibling
          - last child: only down to the branch point */}
      <div
        className="absolute top-0"
        style={{
          left: 0,
          width: TREE_LINE_WIDTH,
          height: isLast ? TREE_BRANCH_Y : '100%',
          backgroundColor: TREE_LINE_COLOR,
          borderRadius: isLast ? '0 0 1px 1px' : 0,
        }}
      />
      {/* Horizontal branch from trunk to the card */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: TREE_BRANCH_Y,
          width: TREE_INDENT - 8,
          height: TREE_LINE_WIDTH,
          backgroundColor: TREE_LINE_COLOR,
        }}
      />
      {/* Endpoint dot */}
      <div
        className="absolute rounded-full"
        style={{
          left: TREE_INDENT - 10,
          top: TREE_BRANCH_Y - 2,
          width: 6,
          height: 6,
          backgroundColor: TREE_DOT_COLOR,
        }}
      />
      {/* Child content -- tight spacing */}
      <div style={{ paddingTop: 2 }}>{children}</div>
    </div>
  );
}

function ViewTreeGroup({ tree, isChild }: { tree: ViewTreeNode; isChild?: boolean }) {
  const hasChildren = tree.children.length > 0;
  return (
    <div>
      {/* Parent card */}
      <ViewCard view={tree.view} isChild={isChild} childCount={tree.children.length} hasChildren={hasChildren} />

      {/* Children with tree lines */}
      {hasChildren && (
        <div
          className="relative rounded-b-lg border border-t-0 border-gray-100 bg-gray-50/30"
          style={{ marginLeft: 0, paddingLeft: 20, paddingBottom: 6, paddingRight: 8, paddingTop: 4 }}
        >
          {/* Vertical stub connecting parent card bottom to first child's trunk */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: TREE_LINE_WIDTH,
              height: TREE_BRANCH_Y,
              backgroundColor: TREE_LINE_COLOR,
            }}
          />
          <div className="flex flex-col gap-1">
            {tree.children.map((child, idx) => (
              <TreeChildRow
                key={child.view.view_key}
                isLast={idx === tree.children.length - 1}
              >
                {child.children.length > 0 ? (
                  <ViewTreeGroup tree={child} isChild />
                ) : (
                  <ViewCard view={child.view} isChild />
                )}
              </TreeChildRow>
            ))}
          </div>
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
