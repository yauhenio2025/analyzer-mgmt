import Link from 'next/link';
import { ExternalLink, Code2, GitBranch, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { OrganSummary } from '@/types';
import {
  familyChipClass,
  familyLabel,
  formatCount,
  humanizeKey,
  organStatusPill,
  syncMeta,
} from '@/lib/families';
import { probeUrl, useReachable, type Reachability } from './useReachable';

/** Card surface by sync mode: native = solid, mirrored = outlined, planned = dashed. */
export function organSurfaceClass(sync: string): string {
  switch (sync) {
    case 'native':
      return 'bg-white border border-gray-200 shadow-sm';
    case 'planned':
      return 'bg-transparent border-2 border-dashed border-gray-300';
    default:
      return 'bg-transparent border-2 border-gray-300';
  }
}

function ReachDot({ state }: { state: Reachability }) {
  if (state === 'none') return null;
  const title =
    state === 'reachable' ? 'reachable' : state === 'checking' ? 'checking…' : 'no answer';
  return (
    <span
      title={title}
      aria-label={title}
      className={clsx(
        'pip',
        state === 'reachable' && 'bg-emerald-500',
        state === 'checking' && 'bg-gray-300 animate-pulse',
        state === 'no-answer' && 'bg-gray-400'
      )}
    />
  );
}

function LinkButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:border-primary-300 hover:text-primary-700"
    >
      <Icon className="h-3 w-3" />
      {label}
    </a>
  );
}

export function OrganCard({ organ, compact = false }: { organ: OrganSummary; compact?: boolean }) {
  const reach = useReachable(probeUrl(organ.urls));
  const status = organStatusPill(organ.status);
  const sync = syncMeta(organ.sync);
  const openUrl = organ.urls?.ui || organ.urls?.api;
  const apiUrl = organ.urls?.api && organ.urls.api !== openUrl ? organ.urls.api : undefined;
  const counts = Object.entries(organ.counts ?? {}).slice(0, 3);

  return (
    <div className={clsx('rounded-lg p-4 flex flex-col gap-2 min-w-0', organSurfaceClass(organ.sync))}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/organs/${organ.organ_key}`}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-primary-700"
          >
            {organ.organ_name}
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500" />
          </Link>
          <p className={clsx('text-xs text-gray-500 mt-0.5', compact ? 'line-clamp-2' : '')}>{organ.tagline}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ReachDot state={reach} />
          <span className={clsx('badge text-[10px] py-0', status.pill)}>{status.label}</span>
        </div>
      </div>

      {organ.families.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {organ.families.map((f) => (
            <span key={f} className={clsx('rounded border px-1.5 py-0 text-[10px] font-medium', familyChipClass(f))}>
              {familyLabel(f)}
            </span>
          ))}
        </div>
      )}

      {counts.length > 0 && (
        <p className="text-[11px] text-gray-500">
          {counts.map(([k, v], i) => (
            <span key={k}>
              {i > 0 && <span className="text-gray-300"> · </span>}
              <span className="font-semibold text-gray-700">{formatCount(v)}</span> {humanizeKey(k)}
            </span>
          ))}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1">
          {openUrl && <LinkButton href={openUrl} label="Open" icon={ExternalLink} />}
          {apiUrl && <LinkButton href={apiUrl} label="API" icon={Code2} />}
          {organ.urls?.repo && <LinkButton href={organ.urls.repo} label="Repo" icon={GitBranch} />}
        </div>
        <span
          className="text-[10px] uppercase tracking-wider text-gray-400 whitespace-nowrap"
          title={sync.blurb}
        >
          {sync.label}
        </span>
      </div>
    </div>
  );
}
