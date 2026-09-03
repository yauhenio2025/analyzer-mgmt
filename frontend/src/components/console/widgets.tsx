import clsx from 'clsx';
import type { NodeStatus } from './model';
import { fmtCost, fmtDuration, fmtTokens } from './format';

export function StatusPip({ status, className }: { status: NodeStatus; className?: string }) {
  return <span className={clsx('pip', `pip-${status}`, className)} title={status} />;
}

export const statusWord: Record<NodeStatus, string> = {
  pending: 'waiting',
  running: 'in progress',
  completed: 'done',
  failed: 'failed',
  skipped: 'skipped',
};

export function StatusTag({ status, dark = true }: { status: NodeStatus; dark?: boolean }) {
  const tone: Record<NodeStatus, string> = {
    pending: dark ? 'text-ink-300 border-ink-600' : 'text-ink-500 border-ink-200',
    running: 'text-gold-300 border-gold-600',
    completed: 'text-emerald-400 border-emerald-800',
    failed: 'text-red-400 border-red-800',
    skipped: dark ? 'text-ink-400 border-ink-700' : 'text-ink-400 border-ink-200',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
        tone[status]
      )}
    >
      <StatusPip status={status} />
      {statusWord[status]}
    </span>
  );
}

export function StatChip({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={clsx('min-w-[88px]', className)} title={hint}>
      <div className="mono-label">{label}</div>
      <div className="font-mono text-sm text-ink-100 tabular-nums">{value}</div>
    </div>
  );
}

export function KindChip({ kind }: { kind: string }) {
  const tone =
    kind === 'job_started' || kind === 'job_finished'
      ? 'bg-gold-500 text-ink-900'
      : kind === 'job_failed' || kind === 'call_failed'
        ? 'bg-red-700 text-paper'
        : kind === 'phase_started' || kind === 'phase_finished'
          ? 'bg-emerald-800 text-emerald-100'
          : kind === 'chain_started' || kind === 'chain_finished'
            ? 'bg-violet-900 text-violet-200'
            : kind === 'call_finished'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : kind === 'call_started'
                ? 'bg-ink-700 text-ink-200'
                : kind === 'narration'
                  ? 'bg-gold-100 text-gold-700'
                  : kind === 'artifact'
                    ? 'bg-sky-900 text-sky-200'
                    : 'bg-ink-700 text-ink-300';
  return (
    <span className={clsx('inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wide', tone)}>
      {kind.replace(/_/g, ' ')}
    </span>
  );
}

export interface CostMeterProps {
  spent: number | null;
  estimated: number | null;
  tokensIn: number;
  tokensOut: number;
  calls: number;
  elapsedMs: number | null;
  live: boolean;
  executive: boolean;
}

export function CostMeter({ spent, estimated, tokensIn, tokensOut, calls, elapsedMs, live, executive }: CostMeterProps) {
  const pct =
    spent != null && estimated && estimated > 0 ? Math.min(100, Math.round((spent / estimated) * 100)) : null;
  return (
    <div className="console-panel px-4 py-3 min-w-[260px]">
      <div className="flex items-baseline justify-between gap-3">
        <div className="mono-label">Spend</div>
        {live && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-300">
            <span className="pip pip-running" /> live
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl text-paper tabular-nums">{fmtCost(spent)}</span>
        {estimated != null && estimated > 0 && (
          <span className="font-mono text-[11px] text-ink-400">of ~{fmtCost(estimated)} planned</span>
        )}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-ink-700 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', pct != null ? 'bg-gold-500' : 'bg-ink-600')}
          style={{ width: `${pct ?? (spent ? 100 : 0)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-300 tabular-nums">
        <span>{calls} {calls === 1 ? 'call' : 'calls'}</span>
        {!executive && (
          <>
            <span>{fmtTokens(tokensIn)} in</span>
            <span>{fmtTokens(tokensOut)} out</span>
          </>
        )}
        {executive && <span>{fmtTokens(tokensIn + tokensOut)} tokens</span>}
        {elapsedMs != null && elapsedMs > 0 && <span>{fmtDuration(elapsedMs)}</span>}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
        checked ? 'border-gold-500 bg-gold-500 text-ink-900' : 'border-ink-600 text-ink-300 hover:text-paper'
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', checked ? 'bg-ink-900' : 'bg-ink-500')} />
      {label}
    </button>
  );
}
