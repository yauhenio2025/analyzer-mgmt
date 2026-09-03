import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { PhaseOutputRecord } from '@/types';
import type { EventsFeedStatus } from '@/lib/events';
import type { ConsoleNode, ConsoleTree } from './model';
import { latestCall, narrationFor, pathOf } from './model';
import { elapsedMs, fmtCost, fmtDateTime, fmtDuration, fmtInt, fmtTokens, humanize, phaseLabel } from './format';
import { StatChip, StatusTag } from './widgets';

interface Props {
  tree: ConsoleTree;
  node: ConsoleNode | null;
  executive: boolean;
  phaseOutputs: PhaseOutputRecord[] | null;
  phaseOutputsLoading: boolean;
  eventsStatus: EventsFeedStatus;
  onSelect: (id: string) => void;
}

const kindWord: Record<ConsoleNode['kind'], string> = {
  phase: 'Step',
  chain: 'Chain',
  engine: 'Engine',
  pass: 'Pass',
  call: 'Call',
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('space-y-2', className)}>
      <div className="mono-label">{title}</div>
      {children}
    </section>
  );
}

function Prose({ text, serif = false, max = 2400 }: { text: string; serif?: boolean; max?: number }) {
  const [open, setOpen] = useState(false);
  const truncated = text.length > max && !open;
  const shown = truncated ? `${text.slice(0, max)}…` : text;
  return (
    <div>
      <div
        className={clsx(
          'whitespace-pre-wrap break-words',
          serif ? 'font-display text-[15px] leading-relaxed text-ink-100' : 'excerpt text-ink-200'
        )}
      >
        {shown}
      </div>
      {text.length > max && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-100"
        >
          {open ? 'Show less' : `Show all (${fmtInt(text.length)} chars)`}
        </button>
      )}
    </div>
  );
}

function pickOutputs(node: ConsoleNode, outputs: PhaseOutputRecord[] | null): PhaseOutputRecord[] {
  if (!outputs || outputs.length === 0) return [];
  let list = outputs;
  if (node.engine) list = list.filter((o) => o.engine_key === node.engine);
  if (node.passNumber != null) list = list.filter((o) => Number(o.pass_number) === node.passNumber);
  if (node.workKey) list = list.filter((o) => (o.work_key || '') === node.workKey);
  if (node.kind === 'phase' && list.length > 1) {
    const final = list.filter((o) => /final|synthesis|summary/i.test(o.role || ''));
    if (final.length) return final.slice(-1);
    return list.slice(-1);
  }
  return list;
}

export function NodeDetail({ tree, node, executive, phaseOutputs, phaseOutputsLoading, eventsStatus, onSelect }: Props) {
  const call = useMemo(() => (node ? (node.kind === 'call' ? node : latestCall(node)) : null), [node]);
  const narration = useMemo(() => (node ? narrationFor(tree, node) : []), [tree, node]);
  const outputs = useMemo(() => (node ? pickOutputs(node, phaseOutputs) : []), [node, phaseOutputs]);
  const path = useMemo(() => pathOf(tree, node?.id ?? null), [tree, node]);

  if (!node) {
    return (
      <div className="console-panel p-6 font-mono text-xs text-ink-400">
        Select a step, engine or pass on the left to see what went in and what came out.
      </div>
    );
  }

  const elapsed = node.started ? elapsedMs(node.started, node.finished) : null;
  const durationShown = node.stats.duration_ms > 0 ? node.stats.duration_ms : elapsed;
  const promptText = call?.meta.promptExcerpt ?? null;
  const outputText =
    call?.meta.outputExcerpt ??
    (outputs.length > 0 ? outputs.map((o) => o.content).join('\n\n— — —\n\n') : null) ??
    node.meta.outputPreview ??
    null;
  const outputFromLedger = Boolean(call?.meta.outputExcerpt);

  const ledgerNote =
    eventsStatus === 'unavailable'
      ? 'The events ledger is not deployed on this backend; prompts are not recorded.'
      : eventsStatus === 'error'
        ? 'The events ledger could not be reached.'
        : 'No prompt has been recorded for this node yet.';

  return (
    <div className="console-panel p-5 space-y-6">
      {/* Path + title */}
      <div>
        <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
          {path.map((p, i) => (
            <span key={p.id} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-ink-600">›</span>}
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={clsx('hover:text-gold-300', p.id === node.id ? 'text-gold-300' : undefined)}
              >
                {p.kind === 'phase' ? `Step ${phaseLabel(p.phase)}` : `${kindWord[p.kind]} · ${p.label}`}
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl text-paper leading-tight">
            {node.kind === 'call'
              ? [path.find((p) => p.kind === 'pass')?.label, node.workKey].filter(Boolean).join(' · ') || node.label
              : node.label}
          </h2>
          <StatusTag status={node.status} />
        </div>
        {!executive && (node.sublabel || node.kind === 'call') && (
          <div className="mt-1 font-mono text-[11px] text-ink-400">
            {node.kind === 'call' ? [node.label.toLowerCase(), node.sublabel].filter(Boolean).join(' · ') : node.sublabel}
          </div>
        )}
        {(node.started || node.finished) && (
          <div className="mt-1 font-mono text-[11px] text-ink-400 tabular-nums">
            {node.started && <span>started {fmtDateTime(node.started)}</span>}
            {node.finished && <span> · finished {fmtDateTime(node.finished)}</span>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-y border-ink-700 py-3">
        <StatChip label="Calls" value={node.stats.calls || '—'} />
        {executive || node.stats.calls === 0 ? (
          <StatChip label="Tokens" value={fmtTokens(node.stats.tokens)} hint="input + output" />
        ) : (
          <>
            <StatChip label="Tokens in" value={fmtTokens(node.stats.input_tokens)} />
            <StatChip label="Tokens out" value={fmtTokens(node.stats.output_tokens)} />
          </>
        )}
        <StatChip label="Cost" value={<span className="text-gold-300">{fmtCost(node.stats.cost_usd)}</span>} />
        <StatChip label="Duration" value={fmtDuration(durationShown)} />
        {!executive && (call?.meta.model || node.meta.modelHint) && (
          <StatChip label="Model" value={<span className="text-[12px]">{call?.meta.model || node.meta.modelHint}</span>} />
        )}
        {!executive && node.meta.depth && <StatChip label="Depth" value={node.meta.depth} />}
      </div>

      {/* Narration (executive) */}
      {executive && narration.length > 0 && (
        <Section title="In plain words">
          <div className="space-y-2">
            {narration.map((n) => (
              <p key={n.seq} className="font-display text-[16px] leading-relaxed text-ink-100 italic">
                {n.detail}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* Why / what */}
      {(node.meta.rationale || node.meta.description || node.meta.inputSummary) && (
        <Section title={node.kind === 'phase' ? 'Why this step' : 'What this does'}>
          {node.meta.rationale && (
            <p className={clsx(executive ? 'font-display text-[15px] leading-relaxed text-ink-100' : 'text-sm text-ink-200 leading-relaxed')}>
              {node.meta.rationale}
            </p>
          )}
          {node.meta.description && <p className="text-sm text-ink-200 leading-relaxed">{node.meta.description}</p>}
          {!executive && node.meta.inputSummary && (
            <p className="text-xs text-ink-400 leading-relaxed">Input: {node.meta.inputSummary}</p>
          )}
          {!executive && node.meta.outputSummary && (
            <p className="text-xs text-ink-400 leading-relaxed">Output: {node.meta.outputSummary}</p>
          )}
        </Section>
      )}

      {/* Stance / cognitive mode */}
      {node.kind === 'pass' && (node.meta.stanceName || node.meta.cognitiveMode) && (
        <Section title="Reading stance">
          <div className="flex flex-wrap items-center gap-2">
            {node.meta.stanceName && (
              <span className="rounded-sm border border-gold-600 px-2 py-0.5 font-mono text-[11px] text-gold-300">
                {node.meta.stanceName}
              </span>
            )}
            {node.meta.cognitiveMode && <span className="text-sm text-ink-300">{node.meta.cognitiveMode}</span>}
          </div>
          {!executive && node.meta.stanceProse && (
            <p className="text-xs text-ink-400 leading-relaxed whitespace-pre-wrap">{node.meta.stanceProse}</p>
          )}
        </Section>
      )}

      {/* Dependencies */}
      {node.kind === 'phase' && (node.meta.dependsOn?.length ?? 0) > 0 && (
        <Section title="Reads the output of">
          <div className="flex flex-wrap gap-2">
            {node.meta.dependsOn!.map((dep) => {
              const depNode = tree.index.get(`phase:${Number(dep)}`);
              return (
                <button
                  key={dep}
                  type="button"
                  onClick={() => depNode && onSelect(depNode.id)}
                  className="rounded-sm border border-ink-600 px-2 py-1 text-xs text-ink-200 hover:border-gold-500 hover:text-paper"
                >
                  <span className="font-mono text-gold-500 mr-1.5">{phaseLabel(Number(dep))}</span>
                  {depNode?.label ?? `Step ${dep}`}
                </button>
              );
            })}
          </div>
        </Section>
      )}
      {node.kind === 'pass' && (node.meta.consumesFrom?.length ?? 0) > 0 && (
        <div className="font-mono text-[11px] text-ink-400">
          reads the output of pass {node.meta.consumesFrom!.join(' + ')}
        </div>
      )}

      {/* Prompt | Output */}
      {executive ? (
        <Section title="What came out">
          {outputText ? (
            <Prose text={outputText} serif max={1800} />
          ) : phaseOutputsLoading ? (
            <div className="font-mono text-xs text-ink-400">Loading output…</div>
          ) : (
            <div className="font-mono text-xs text-ink-400">
              {node.status === 'pending' ? 'Not started yet.' : node.status === 'running' ? 'In progress — output arrives when the step finishes.' : 'No output recorded.'}
            </div>
          )}
        </Section>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Section title={call && call.id !== node.id ? `Prompt · latest call (${call.workKey || `#${call.events[0]?.seq ?? ''}`})` : 'Prompt (excerpt)'}>
            <div className="rounded-sm border border-ink-700 bg-ink-900 p-3 min-h-[160px]">
              {promptText ? (
                <Prose text={promptText} />
              ) : (
                <div className="font-mono text-xs text-ink-500">{ledgerNote}</div>
              )}
            </div>
            {call && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-ink-500 tabular-nums">
                {call.meta.promptHash && <span>hash {call.meta.promptHash}</span>}
                {call.meta.inputChars != null && <span>{fmtInt(call.meta.inputChars)} chars in</span>}
                {call.meta.model && <span>{call.meta.model}</span>}
              </div>
            )}
          </Section>
          <Section title={outputFromLedger ? 'Output (excerpt)' : outputs.length > 0 ? 'Output (stored prose)' : 'Output'}>
            <div className="rounded-sm border border-ink-700 bg-ink-900 p-3 min-h-[160px]">
              {outputText ? (
                <Prose text={outputText} />
              ) : phaseOutputsLoading ? (
                <div className="font-mono text-xs text-ink-500">Loading stored outputs…</div>
              ) : (
                <div className="font-mono text-xs text-ink-500">
                  {node.status === 'running' ? 'Call in progress.' : 'No output recorded for this node.'}
                </div>
              )}
            </div>
            {call && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-ink-500 tabular-nums">
                {call.meta.outputChars != null && <span>{fmtInt(call.meta.outputChars)} chars out</span>}
                {call.stats.calls > 0 && (
                  <span>
                    {fmtInt(call.stats.input_tokens)} → {fmtInt(call.stats.output_tokens)} tokens
                  </span>
                )}
                {call.stats.cost_usd != null && <span className="text-gold-300">{fmtCost(call.stats.cost_usd)}</span>}
                {call.meta.error && <span className="text-red-400">{call.meta.error}</span>}
              </div>
            )}
            {!outputFromLedger && outputs.length > 0 && (
              <div className="font-mono text-[10px] text-ink-500">
                {outputs.length} stored output{outputs.length === 1 ? '' : 's'}
                {outputs[0].model_used ? ` · ${outputs[0].model_used}` : ''}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Payload (developer) */}
      {!executive && call?.meta.payload != null && (
        <details className="group">
          <summary className="mono-label cursor-pointer hover:text-gold-300">payload_json</summary>
          <pre className="mt-2 excerpt text-ink-300 rounded-sm border border-ink-700 bg-ink-900 p-3 max-h-64 overflow-auto">
            {typeof call.meta.payload === 'string' ? call.meta.payload : JSON.stringify(call.meta.payload, null, 2)}
          </pre>
        </details>
      )}

      {/* Children */}
      {node.children.length > 0 && (
        <Section title={node.kind === 'phase' ? (executive ? 'Readers in this step' : 'Contains') : node.kind === 'pass' ? 'Calls' : 'Contains'}>
          <ul className="divide-y divide-ink-800 rounded-sm border border-ink-700">
            {node.children
              .filter((c) => !(executive && c.kind === 'call'))
              .map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(child.id)}
                    className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-left hover:bg-ink-700/60"
                  >
                    <StatusTag status={child.status} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink-100">
                        {child.kind === 'call' && child.workKey ? child.workKey : child.label}
                      </span>
                      {child.sublabel && !executive && (
                        <span className="block truncate font-mono text-[10px] text-ink-400">{child.sublabel}</span>
                      )}
                      {executive && child.kind === 'engine' && child.meta.category && (
                        <span className="block truncate text-[11px] text-ink-400">{humanize(child.meta.category)}</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-ink-400 tabular-nums whitespace-nowrap">
                      {!executive && child.stats.tokens > 0 && <span className="mr-3">{fmtTokens(child.stats.tokens)}</span>}
                      {child.stats.cost_usd != null && <span className="mr-3 text-gold-300">{fmtCost(child.stats.cost_usd)}</span>}
                      {child.stats.duration_ms > 0 && <span>{fmtDuration(child.stats.duration_ms)}</span>}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
