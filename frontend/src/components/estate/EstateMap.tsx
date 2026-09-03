import clsx from 'clsx';
import type { OrganSummary, OrganLayer } from '@/types';
import { LAYER_META, LAYER_ORDER } from '@/lib/families';
import { OrganCard } from './OrganCard';

function groupByLayer(organs: OrganSummary[]): Partial<Record<OrganLayer, OrganSummary[]>> {
  const grouped: Partial<Record<OrganLayer, OrganSummary[]>> = {};
  for (const organ of organs) {
    (grouped[organ.layer] ??= []).push(organ);
  }
  for (const list of Object.values(grouped)) {
    list?.sort((a, b) => a.order - b.order);
  }
  return grouped;
}

/**
 * The estate as horizontal bands: Sources → Search → Reasoning → Composition →
 * Creative → Consumers, with Governance as the base band spanning the width.
 */
export function EstateMap({ organs, compact = true }: { organs: OrganSummary[]; compact?: boolean }) {
  const grouped = groupByLayer(organs);
  const bands = LAYER_ORDER.filter((l) => l !== 'governance' && (grouped[l]?.length ?? 0) > 0);
  const governance = grouped.governance ?? [];

  return (
    <div className="space-y-3">
      {bands.map((layer, idx) => {
        const meta = LAYER_META[layer];
        const list = grouped[layer] ?? [];
        return (
          <div
            key={layer}
            className={clsx(
              'flex flex-col md:flex-row gap-3 md:gap-5 py-3',
              idx > 0 && 'border-t border-gray-200'
            )}
          >
            <div className="md:w-32 flex-shrink-0">
              <div className="mono-label text-gray-500">{meta.label}</div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{meta.blurb}</p>
            </div>
            <div
              className={clsx(
                'flex-1 grid gap-3',
                list.length === 1
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
              )}
            >
              {list.map((organ) => (
                <OrganCard key={organ.organ_key} organ={organ} compact={compact} />
              ))}
            </div>
          </div>
        );
      })}

      {governance.length > 0 && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 flex flex-col md:flex-row gap-3 md:gap-5">
          <div className="md:w-32 flex-shrink-0">
            <div className="mono-label text-ink-600">{LAYER_META.governance.label}</div>
            <p className="text-[11px] text-ink-400 mt-0.5 leading-snug">{LAYER_META.governance.blurb}</p>
          </div>
          <div className="flex-1 grid gap-3 grid-cols-1 md:grid-cols-2">
            {governance.map((organ) => (
              <OrganCard key={organ.organ_key} organ={organ} compact={compact} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EstateMapCaption() {
  return (
    <p className="text-xs text-gray-500">
      <span className="inline-block align-middle h-3 w-5 rounded-sm bg-white border border-gray-300 shadow-sm mr-1.5" />
      Solid = reads its methods from the registry today (native).{' '}
      <span className="inline-block align-middle h-3 w-5 rounded-sm border-2 border-gray-300 ml-2 mr-1.5" />
      Outlined = its doctrines are mirrored here; the organ still holds the source.{' '}
      <span className="inline-block align-middle h-3 w-5 rounded-sm border-2 border-dashed border-gray-300 ml-2 mr-1.5" />
      Dashed = planned.
      <span className="ml-3 pip bg-emerald-500 align-middle" /> reachable
      <span className="ml-2 pip bg-gray-400 align-middle" /> no answer
    </p>
  );
}
