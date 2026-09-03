import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import type { RunEvent } from '@/types';
import type { ConsoleTree } from './model';
import { fmtCost, fmtTime, fmtTokens, fmtDuration, humanize, phaseLabel } from './format';
import { KindChip } from './widgets';

interface Props {
  events: RunEvent[];
  tree: ConsoleTree;
  executive: boolean;
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  live: boolean;
}

const EXECUTIVE_KINDS = new Set([
  'job_started',
  'job_finished',
  'job_failed',
  'phase_started',
  'phase_finished',
  'narration',
  'artifact',
  'call_failed',
]);

function describe(ev: RunEvent, tree: ConsoleTree, executive: boolean): string {
  const phaseName =
    ev.phase !== null && ev.phase !== undefined && ev.phase !== ''
      ? tree.index.get(`phase:${Number(ev.phase)}`)?.label ?? `Phase ${ev.phase}`
      : null;
  const engineName = ev.engine
    ? tree.index.get(`engine:${Number(ev.phase)}:${ev.engine}`)?.label ?? humanize(ev.engine)
    : null;
  switch (ev.kind) {
    case 'narration':
    case 'note':
      return ev.detail ?? '';
    case 'phase_started':
      return phaseName ? `Step ${phaseLabel(Number(ev.phase))} begins — ${phaseName}` : ev.detail ?? '';
    case 'phase_finished':
      return phaseName ? `Step ${phaseLabel(Number(ev.phase))} done — ${phaseName}` : ev.detail ?? '';
    case 'chain_started':
      return `Chain ${humanize(ev.chain)} starts${engineName ? ` with ${engineName}` : ''}`;
    case 'chain_finished':
      return `Chain ${humanize(ev.chain)} finished`;
    case 'call_started':
      return [engineName, ev.pass_name ? `· ${ev.pass_name}` : null, ev.work_key ? `· ${ev.work_key}` : null]
        .filter(Boolean)
        .join(' ');
    case 'call_finished':
    case 'call_failed':
      return [
        engineName,
        ev.pass_name ? `· ${ev.pass_name}` : null,
        ev.work_key ? `· ${ev.work_key}` : null,
        ev.kind === 'call_failed' && ev.detail ? `— ${ev.detail}` : null,
      ]
        .filter(Boolean)
        .join(' ');
    case 'artifact':
      return ev.detail ?? 'Artifact stored';
    case 'job_started':
      return executive ? 'Run started' : ev.detail ?? 'Run started';
    case 'job_finished':
      return 'Run finished';
    case 'job_failed':
      return `Run failed${ev.detail ? ` — ${ev.detail}` : ''}`;
    default:
      return ev.detail ?? ev.kind;
  }
}

export function Timeline({ events, tree, executive, selectedId, onSelectNode, live }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => {
    const filtered = executive ? events.filter((e) => EXECUTIVE_KINDS.has(e.kind)) : events;
    return filtered.slice(-600);
  }, [events, executive]);

  useEffect(() => {
    if (!live) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length, live]);

  if (visible.length === 0) {
    return (
      <div className="px-4 py-6 font-mono text-xs text-ink-400">
        No events recorded for this run. The timeline fills in as the events ledger streams.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-[360px] overflow-y-auto scrollbar-thin">
      <ol className="divide-y divide-ink-800">
        {visible.map((ev) => {
          const nodeId = tree.eventNodeId.get(ev.seq) ?? null;
          const isSelected = nodeId !== null && nodeId === selectedId;
          const isNarration = ev.kind === 'narration';
          const clickable = nodeId !== null;
          return (
            <li
              key={ev.seq}
              onClick={() => nodeId && onSelectNode(nodeId)}
              className={clsx(
                'grid grid-cols-[76px_120px_1fr_auto] items-start gap-3 px-4 py-1.5 text-[12px]',
                clickable && 'cursor-pointer hover:bg-ink-800',
                isSelected && 'bg-ink-800 ring-1 ring-inset ring-gold-500/50'
              )}
            >
              <span className="font-mono text-[11px] text-ink-500 tabular-nums pt-0.5">{fmtTime(ev.ts)}</span>
              <span className="pt-0.5">
                <KindChip kind={ev.kind} />
              </span>
              <span
                className={clsx(
                  'min-w-0 break-words',
                  isNarration ? 'font-display text-[14px] leading-snug text-ink-100 italic' : 'text-ink-200'
                )}
              >
                {describe(ev, tree, executive)}
                {!executive && ev.model && ev.kind !== 'narration' && (
                  <span className="ml-2 font-mono text-[10px] text-ink-500">{ev.model}</span>
                )}
              </span>
              <span className="font-mono text-[10px] text-ink-400 tabular-nums whitespace-nowrap pt-0.5">
                {ev.kind === 'call_finished' && (
                  <>
                    {!executive && (
                      <span className="mr-2">
                        {fmtTokens(ev.input_tokens)}→{fmtTokens(ev.output_tokens)}
                      </span>
                    )}
                    {ev.cost_usd != null && <span className="text-gold-300 mr-2">{fmtCost(ev.cost_usd)}</span>}
                    {ev.duration_ms ? <span>{fmtDuration(ev.duration_ms)}</span> : null}
                  </>
                )}
                {ev.kind === 'phase_finished' && ev.duration_ms ? <span>{fmtDuration(ev.duration_ms)}</span> : null}
                {!executive && ev.seq != null && <span className="ml-2 text-ink-600">#{ev.seq}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
