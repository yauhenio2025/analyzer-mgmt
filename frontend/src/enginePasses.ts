import type {
  CapabilityEngineDefinition,
  EngineOperationalization,
  PassDefinition,
} from '@/types';

export interface PassHit {
  passNumber: number;
  stance: string;
  label: string;
}

export type PassesByDepth = Record<string, PassDefinition[]>;
export type DimensionPassMap = Record<string, Record<string, PassHit[]>>;
export type CapabilityPassMap = Record<string, Record<string, PassHit[]>>;

function buildWholeEngineFallback(capabilityDef: CapabilityEngineDefinition): PassDefinition {
  return {
    pass_number: 1,
    label: 'Whole-Engine Prompt',
    stance: 'integration',
    focus_dimensions: capabilityDef.analytical_dimensions.map((dimension) => dimension.key),
    focus_capabilities: capabilityDef.capabilities.map((capability) => capability.key),
    consumes_from: [],
    description:
      'This depth currently runs as a single whole-engine prompt because no inline pass definitions or operationalization sequence are defined.',
  };
}

export function buildPassesByDepth(
  capabilityDef: CapabilityEngineDefinition | null | undefined,
  operationalization: EngineOperationalization | null | undefined
): PassesByDepth {
  if (!capabilityDef) return {};

  const opByStance = new Map(
    (operationalization?.stance_operationalizations ?? []).map((op) => [op.stance_key, op] as const)
  );
  const sequenceByDepth = new Map(
    (operationalization?.depth_sequences ?? []).map((sequence) => [sequence.depth_key, sequence] as const)
  );

  return Object.fromEntries(
    capabilityDef.depth_levels.map((depthLevel) => {
      if (depthLevel.passes && depthLevel.passes.length > 0) {
        return [depthLevel.key, depthLevel.passes];
      }

      const sequence = sequenceByDepth.get(depthLevel.key);
      if (sequence?.passes?.length) {
        return [
          depthLevel.key,
          sequence.passes.map((entry) => {
            const stanceOp = opByStance.get(entry.stance_key);
            return {
              pass_number: entry.pass_number,
              label: stanceOp?.label || `Pass ${entry.pass_number}`,
              stance: entry.stance_key,
              focus_dimensions: stanceOp?.focus_dimensions ?? [],
              focus_capabilities: stanceOp?.focus_capabilities ?? [],
              consumes_from: entry.consumes_from ?? [],
              description: stanceOp?.description ?? '',
            };
          }),
        ];
      }

      return [depthLevel.key, [buildWholeEngineFallback(capabilityDef)]];
    })
  );
}

export function buildDimensionPassMap(passesByDepth: PassesByDepth): DimensionPassMap {
  const map: DimensionPassMap = {};
  for (const [depthKey, passes] of Object.entries(passesByDepth)) {
    for (const pass of passes) {
      for (const dimKey of pass.focus_dimensions || []) {
        if (!map[dimKey]) map[dimKey] = {};
        if (!map[dimKey][depthKey]) map[dimKey][depthKey] = [];
        map[dimKey][depthKey].push({
          passNumber: pass.pass_number,
          stance: pass.stance,
          label: pass.label || `Pass ${pass.pass_number}`,
        });
      }
    }
  }
  return map;
}

export function buildCapabilityPassMap(passesByDepth: PassesByDepth): CapabilityPassMap {
  const map: CapabilityPassMap = {};
  for (const [depthKey, passes] of Object.entries(passesByDepth)) {
    for (const pass of passes) {
      for (const capKey of pass.focus_capabilities || []) {
        if (!map[capKey]) map[capKey] = {};
        if (!map[capKey][depthKey]) map[capKey][depthKey] = [];
        map[capKey][depthKey].push({
          passNumber: pass.pass_number,
          stance: pass.stance,
          label: pass.label || `Pass ${pass.pass_number}`,
        });
      }
    }
  }
  return map;
}
