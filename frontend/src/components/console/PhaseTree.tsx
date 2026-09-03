/**
 * PhaseTree — phases → chains → engines → passes → calls with live pips.
 * Lifted from the-critic's PipelineVisualization, re-expressed over the
 * ConsoleNode model so it can show tokens/cost/duration per node.
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ConsoleNode, ConsoleTree } from './model';
import { ancestorsOf } from './model';
import { fmtCost, fmtDuration, fmtTokens, phaseLabel } from './format';
import { StatusPip } from './widgets';

interface Props {
  tree: ConsoleTree;
  selectedId: string | null;
  onSelect: (id: string) => void;
  executive: boolean;
}

const kindTag: Record<ConsoleNode['kind'], string> = {
  phase: 'step',
  chain: 'chain',
  engine: 'engine',
  pass: 'pass',
  call: 'call',
};

export function PhaseTree({ tree, selectedId, onSelect, executive }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [touched, setTouched] = useState<Set<string>>(() => new Set());

  // Auto-expand: running phases and the path to the selection (unless the user collapsed it).
  const autoOpen = useMemo(() => {
    const open = new Set<string>();
    const walk = (node: ConsoleNode) => {
      if (node.status === 'running' && node.kind !== 'call') open.add(node.id);
      if (node.kind === 'phase' && node.status !== 'pending' && node.status !== 'skipped') open.add(node.id);
      node.children.forEach(walk);
    };
    tree.phases.forEach(walk);
    ancestorsOf(tree, selectedId).forEach((id) => open.add(id));
    return open;
  }, [tree, selectedId]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      autoOpen.forEach((id) => {
        if (!touched.has(id)) next.add(id);
      });
      return next;
    });
  }, [autoOpen, touched]);

  const toggle = (id: string) => {
    setTouched((prev) => new Set(prev).add(id));
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {tree.phases.map((phase) => (
        <TreeRow
          key={phase.id}
          node={phase}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
          executive={executive}
        />
      ))}
      {tree.phases.length === 0 && (
        <div className="font-mono text-xs text-ink-400 px-2 py-4">No phases known for this run yet.</div>
      )}
    </div>
  );
}

interface RowProps {
  node: ConsoleNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  executive: boolean;
}

function TreeRow({ node, depth, expanded, toggle, selectedId, onSelect, executive }: RowProps) {
  if (executive && node.kind === 'call') return null;
  const children = executive ? node.children.filter((c) => c.kind !== 'call') : node.children;
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isPhase = node.kind === 'phase';

  const title =
    node.kind === 'phase'
      ? node.label
      : node.kind === 'call'
        ? node.workKey
          ? node.workKey
          : node.label
        : node.label;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(node.id);
        }}
        className={clsx(
          'group flex items-center gap-2 rounded-sm pr-2 cursor-pointer transition-colors',
          isPhase ? 'py-1.5' : 'py-1',
          isSelected ? 'bg-ink-700/80 ring-1 ring-gold-500/70' : 'hover:bg-ink-800'
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggle(node.id);
          }}
          className={clsx(
            'h-4 w-4 flex items-center justify-center text-ink-500 flex-shrink-0',
            !hasChildren && 'invisible'
          )}
        >
          <ChevronRight className={clsx('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
        </button>
        <StatusPip status={node.status} />
        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          {isPhase && (
            <span className="font-mono text-[11px] text-gold-500 tabular-nums flex-shrink-0">
              {phaseLabel(node.phase)}
            </span>
          )}
          {!isPhase && !executive && (
            <span className="mono-label flex-shrink-0 text-[9px]">{kindTag[node.kind]}</span>
          )}
          <span
            className={clsx(
              'truncate',
              isPhase ? 'font-display text-[15px] text-paper' : 'text-[13px]',
              !isPhase && (node.status === 'pending' ? 'text-ink-300' : 'text-ink-100'),
              node.status === 'running' && 'text-gold-300'
            )}
            title={title}
          >
            {title}
          </span>
          {node.sublabel && !executive && (
            <span className="truncate font-mono text-[10px] text-ink-400 flex-shrink-0 max-w-[140px]">
              {node.sublabel}
            </span>
          )}
          {executive && node.kind === 'pass' && node.sublabel && (
            <span className="truncate text-[11px] text-ink-400 flex-shrink-0">{node.sublabel}</span>
          )}
        </div>
        <NodeStatsInline node={node} executive={executive} />
      </div>
      {hasChildren && isOpen && (
        <div className={clsx(isPhase && 'border-l border-ink-700 ml-4')}>
          {children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedId={selectedId}
              onSelect={onSelect}
              executive={executive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeStatsInline({ node, executive }: { node: ConsoleNode; executive: boolean }) {
  const { stats } = node;
  const hasAny = stats.calls > 0 || stats.tokens > 0 || stats.duration_ms > 0;
  if (!hasAny) return null;
  return (
    <div className="hidden xl:flex items-center gap-3 font-mono text-[10px] text-ink-400 tabular-nums flex-shrink-0">
      {!executive && stats.tokens > 0 && <span title="tokens">{fmtTokens(stats.tokens)}</span>}
      {stats.cost_usd != null && <span title="cost" className="text-gold-300">{fmtCost(stats.cost_usd)}</span>}
      {stats.duration_ms > 0 && <span title="duration">{fmtDuration(stats.duration_ms)}</span>}
    </div>
  );
}
