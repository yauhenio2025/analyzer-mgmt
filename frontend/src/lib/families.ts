/**
 * Method families, organ layers and provenance vocab shared by the estate pages
 * (Map, Organs, Processes) and the Engines index.
 */
import type { EngineFamily, EngineSyncMode, OrganLayer, OrganStatus } from '@/types';

export interface FamilyMeta {
  key: EngineFamily;
  label: string;
  /** Tailwind classes for a small chip. */
  chip: string;
}

export const FAMILY_META: FamilyMeta[] = [
  { key: 'analytical', label: 'Analytical', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'storytelling', label: 'Storytelling', chip: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'editing', label: 'Editing', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'restructuring', label: 'Restructuring', chip: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'search', label: 'Search', chip: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'rendering', label: 'Rendering', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'composition', label: 'Composition', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'quality', label: 'Quality', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'imagination', label: 'Imagination', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { key: 'governance', label: 'Governance', chip: 'bg-stone-100 text-stone-700 border-stone-300' },
];

export const FAMILY_BY_KEY: Record<string, FamilyMeta> = Object.fromEntries(
  FAMILY_META.map((f) => [f.key, f])
);

export function familyLabel(key: string): string {
  return FAMILY_BY_KEY[key]?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function familyChipClass(key: string): string {
  return FAMILY_BY_KEY[key]?.chip ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

/** Band order on the Map: Sources → Search → Reasoning → Composition → Creative → Consumers; Governance is the base. */
export const LAYER_ORDER: OrganLayer[] = [
  'sources',
  'search',
  'reasoning',
  'composition',
  'creative',
  'consumers',
  'governance',
];

export const LAYER_META: Record<OrganLayer, { label: string; blurb: string }> = {
  sources: { label: 'Sources', blurb: 'Where the material comes from' },
  search: { label: 'Search', blurb: 'Finding and vetting what to read' },
  reasoning: { label: 'Reasoning', blurb: 'Meaning-making: engines, chains, dossiers' },
  composition: { label: 'Composition', blurb: 'Figures, plates, layouts' },
  creative: { label: 'Creative', blurb: 'Film and long-form telling' },
  consumers: { label: 'Consumers', blurb: 'Where readers meet the output' },
  governance: { label: 'Governance', blurb: 'The registry and the estate contract' },
};

export const ORGAN_STATUS_META: Record<OrganStatus, { label: string; pill: string }> = {
  live: { label: 'live', pill: 'bg-green-100 text-green-800' },
  partial: { label: 'partial', pill: 'bg-amber-100 text-amber-800' },
  frozen: { label: 'frozen', pill: 'bg-gray-100 text-gray-700' },
  local: { label: 'local', pill: 'bg-slate-200 text-slate-700' },
  planned: { label: 'planned', pill: 'border border-dashed border-gray-400 text-gray-600 bg-transparent' },
  suspended: { label: 'suspended', pill: 'bg-red-100 text-red-800' },
};

export function organStatusPill(status: string): { label: string; pill: string } {
  return ORGAN_STATUS_META[status as OrganStatus] ?? { label: status, pill: 'bg-gray-100 text-gray-700' };
}

export const SYNC_META: Record<EngineSyncMode, { label: string; blurb: string; pill: string }> = {
  native: {
    label: 'native',
    blurb: 'reads its methods from the registry at runtime',
    pill: 'bg-primary-100 text-primary-800',
  },
  mirrored: {
    label: 'mirrored',
    blurb: 'the registry mirrors its doctrines; the source is still in its repo',
    pill: 'bg-white text-gray-700 border border-gray-300',
  },
  planned: {
    label: 'planned',
    blurb: 'declared, not yet running',
    pill: 'bg-transparent text-gray-500 border border-dashed border-gray-400',
  },
};

export function syncMeta(sync: string) {
  return SYNC_META[sync as EngineSyncMode] ?? { label: sync, blurb: '', pill: 'bg-gray-100 text-gray-700' };
}

/** "narrative_approaches" → "narrative approaches" */
export function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ');
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
