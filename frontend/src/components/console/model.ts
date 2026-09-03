/**
 * Console tree model — merges the static plan structure (pipeline-visualization
 * or plan phases) with the live event ledger and the executor's own progress
 * record into one tree: phases → chains → engines → passes → calls.
 *
 * Every node carries a status, rolled-up tokens/cost/duration and the events
 * that touched it, so the tree, the detail panel and the timeline all read
 * from the same structure.
 */
import type {
  ExecutorJobSummary,
  JobResultsResponse,
  PhaseResultSummary,
  PipelineVisualization,
  PlanDetail,
  RunEvent,
} from '@/types';
import { humanize } from './format';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type NodeKind = 'phase' | 'chain' | 'engine' | 'pass' | 'call';

export interface NodeStats {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  /** input + output, or the executor's reported total when the ledger is absent. */
  tokens: number;
  cost_usd: number | null;
  duration_ms: number;
}

export interface NodeMeta {
  rationale?: string;
  depth?: string;
  modelHint?: string | null;
  dependsOn?: number[];
  perWork?: boolean;
  skip?: boolean;
  documentScope?: string;
  blendMode?: string | null;
  category?: string;
  capabilities?: string[];
  focusDimensions?: string[];
  order?: number;
  stance?: string | null;
  stanceName?: string;
  cognitiveMode?: string;
  description?: string;
  inputSummary?: string;
  outputSummary?: string;
  stanceProse?: string;
  consumesFrom?: number[];
  model?: string | null;
  promptHash?: string | null;
  promptExcerpt?: string | null;
  outputExcerpt?: string | null;
  inputChars?: number | null;
  outputChars?: number | null;
  payload?: unknown;
  error?: string | null;
  outputPreview?: string;
  reportedTokens?: number;
  reportedDuration?: number;
}

export interface ConsoleNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  label: string;
  sublabel?: string;
  phase: number;
  chain?: string | null;
  engine?: string | null;
  passName?: string | null;
  passNumber?: number | null;
  workKey?: string | null;
  status: NodeStatus;
  explicitStatus: boolean;
  stats: NodeStats;
  children: ConsoleNode[];
  events: RunEvent[];
  meta: NodeMeta;
  started?: string | null;
  finished?: string | null;
}

export interface ConsoleTree {
  phases: ConsoleNode[];
  totals: NodeStats;
  index: Map<string, ConsoleNode>;
  /** seq → node id, for timeline → tree navigation */
  eventNodeId: Map<number, string>;
  rootEvents: RunEvent[];
  hasEvents: boolean;
  hasCallEvents: boolean;
}

export const emptyStats = (): NodeStats => ({
  calls: 0,
  input_tokens: 0,
  output_tokens: 0,
  tokens: 0,
  cost_usd: null,
  duration_ms: 0,
});

function normalizeStatus(value: unknown): NodeStatus | null {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase();
  if (['completed', 'complete', 'done', 'success', 'succeeded'].includes(v)) return 'completed';
  if (['running', 'in_progress', 'in-progress', 'active', 'started'].includes(v)) return 'running';
  if (['failed', 'error', 'errored', 'cancelled', 'canceled'].includes(v)) return 'failed';
  if (['skipped', 'skip'].includes(v)) return 'skipped';
  if (['pending', 'queued', 'waiting'].includes(v)) return 'pending';
  return null;
}

function lookupPhase<T>(record: Record<string, T> | undefined | null, n: number): T | undefined {
  if (!record) return undefined;
  const candidates = [String(n), n.toFixed(1), n.toFixed(2), String(Math.round(n))];
  for (const key of candidates) {
    if (key in record) return record[key];
  }
  const numericMatch = Object.keys(record).find((k) => Number(k) === n);
  return numericMatch ? record[numericMatch] : undefined;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function samePass(node: ConsoleNode, ev: RunEvent): boolean {
  const name = ev.pass_name ? String(ev.pass_name) : '';
  if (name) {
    const target = slug(name);
    if (node.passName && slug(node.passName) === target) return true;
    if (slug(node.label) === target) return true;
    if (node.passNumber != null) {
      const num = String(node.passNumber);
      if (name === num || target === `pass-${num}` || target === `pass${num}` || target === `p${num}`) return true;
    }
  }
  return false;
}

function callKey(ev: RunEvent): string {
  return `${ev.phase ?? ''}|${ev.engine ?? ''}|${ev.pass_name ?? ''}|${ev.work_key ?? ''}`;
}

function addStats(target: NodeStats, source: NodeStats) {
  target.calls += source.calls;
  target.input_tokens += source.input_tokens;
  target.output_tokens += source.output_tokens;
  target.tokens += source.tokens;
  target.duration_ms += source.duration_ms;
  if (source.cost_usd != null) target.cost_usd = (target.cost_usd ?? 0) + source.cost_usd;
}

export interface BuildInput {
  viz: PipelineVisualization | null | undefined;
  plan: PlanDetail | null | undefined;
  job: ExecutorJobSummary | null | undefined;
  results: JobResultsResponse | null | undefined;
  events: RunEvent[];
}

export function buildConsoleTree({ viz, plan, job, results, events }: BuildInput): ConsoleTree {
  const index = new Map<string, ConsoleNode>();
  const eventNodeId = new Map<number, string>();
  const rootEvents: RunEvent[] = [];
  const phaseMap = new Map<number, ConsoleNode>();

  const mk = (partial: Partial<ConsoleNode> & Pick<ConsoleNode, 'id' | 'kind' | 'label' | 'phase'>): ConsoleNode => {
    const node: ConsoleNode = {
      parentId: null,
      status: 'pending',
      explicitStatus: false,
      stats: emptyStats(),
      children: [],
      events: [],
      meta: {},
      ...partial,
    };
    index.set(node.id, node);
    return node;
  };
  const attach = (parent: ConsoleNode, child: ConsoleNode) => {
    child.parentId = parent.id;
    parent.children.push(child);
    return child;
  };

  // ── 1. Phase skeleton ───────────────────────────────────────
  const vizPhases = viz?.phases ?? [];
  const planPhases = plan?.phases ?? [];
  const phaseNumbers = new Set<number>();
  vizPhases.forEach((p) => phaseNumbers.add(Number(p.phase_number)));
  planPhases.forEach((p) => phaseNumbers.add(Number(p.phase_number)));
  Object.keys(results?.phase_results ?? {}).forEach((k) => phaseNumbers.add(Number(k)));
  Object.keys(job?.progress?.phase_statuses ?? {}).forEach((k) => phaseNumbers.add(Number(k)));
  events.forEach((e) => {
    if (e.phase !== null && e.phase !== undefined && e.phase !== '') phaseNumbers.add(Number(e.phase));
  });

  const sortedPhases = Array.from(phaseNumbers)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  const ensurePhase = (n: number): ConsoleNode => {
    const existing = phaseMap.get(n);
    if (existing) return existing;
    const vp = vizPhases.find((p) => Number(p.phase_number) === n);
    const pp = planPhases.find((p) => Number(p.phase_number) === n);
    const rr = lookupPhase<PhaseResultSummary>(results?.phase_results, n);
    const node = mk({
      id: `phase:${n}`,
      kind: 'phase',
      phase: n,
      label: vp?.phase_name ?? pp?.phase_name ?? rr?.phase_name ?? `Phase ${n}`,
      meta: {
        rationale: vp?.rationale ?? pp?.rationale,
        depth: vp?.depth ?? pp?.depth,
        modelHint: vp?.model_hint ?? pp?.model_hint ?? null,
        dependsOn: vp?.depends_on ?? pp?.depends_on ?? [],
        perWork: vp?.per_work ?? pp?.iteration_mode === 'per_work',
        skip: vp?.skip ?? pp?.skip ?? false,
        documentScope: vp?.document_scope,
        outputPreview: rr?.final_output_preview,
        reportedTokens: rr?.total_tokens,
        reportedDuration: rr?.duration_ms,
        error: rr?.error ?? null,
      },
    });
    phaseMap.set(n, node);

    if (vp) {
      const ex = vp.execution;
      let parent = node;
      if (ex.type === 'chain' && ex.chain_key) {
        parent = attach(
          node,
          mk({
            id: `chain:${n}:${ex.chain_key}`,
            kind: 'chain',
            phase: n,
            chain: ex.chain_key,
            label: ex.chain_name || humanize(ex.chain_key),
            sublabel: ex.blend_mode ? `${ex.blend_mode} chain` : 'chain',
            meta: { blendMode: ex.blend_mode ?? null },
          })
        );
      }
      ex.engines.forEach((e, i) => {
        const eng = attach(
          parent,
          mk({
            id: `engine:${n}:${e.engine_key}`,
            kind: 'engine',
            phase: n,
            chain: parent.chain ?? null,
            engine: e.engine_key,
            label: e.engine_name || humanize(e.engine_key),
            sublabel: e.category,
            meta: {
              depth: e.depth,
              category: e.category,
              capabilities: e.capabilities,
              focusDimensions: e.focus_dimensions ?? undefined,
              order: i + 1,
              rationale: e.override_rationale ?? undefined,
            },
          })
        );
        e.passes.forEach((p) => {
          attach(
            eng,
            mk({
              id: `pass:${n}:${e.engine_key}:${p.pass_number}`,
              kind: 'pass',
              phase: n,
              chain: parent.chain ?? null,
              engine: e.engine_key,
              passName: p.label,
              passNumber: p.pass_number,
              label: p.label || `Pass ${p.pass_number}`,
              sublabel: p.stance_name,
              meta: {
                stance: p.stance_key,
                stanceName: p.stance_name,
                cognitiveMode: p.cognitive_mode,
                description: p.description,
                inputSummary: p.input_summary,
                outputSummary: p.output_summary,
                stanceProse: p.stance_prose,
                consumesFrom: p.consumes_from,
                focusDimensions: p.focus_dimensions,
                order: p.pass_number,
              },
            })
          );
        });
      });
    } else if (pp) {
      let parent = node;
      if (pp.chain_key) {
        parent = attach(
          node,
          mk({
            id: `chain:${n}:${pp.chain_key}`,
            kind: 'chain',
            phase: n,
            chain: pp.chain_key,
            label: humanize(pp.chain_key),
            sublabel: 'chain',
          })
        );
      }
      if (pp.engine_key) {
        attach(
          parent,
          mk({
            id: `engine:${n}:${pp.engine_key}`,
            kind: 'engine',
            phase: n,
            chain: parent.chain ?? null,
            engine: pp.engine_key,
            label: humanize(pp.engine_key),
            meta: { depth: pp.depth },
          })
        );
      }
    }
    return node;
  };
  sortedPhases.forEach(ensurePhase);

  const findChain = (phaseNode: ConsoleNode, chainKey: string | null | undefined): ConsoleNode | null => {
    if (chainKey) {
      const hit = phaseNode.children.find((c) => c.kind === 'chain' && c.chain === chainKey);
      if (hit) return hit;
    }
    return phaseNode.children.find((c) => c.kind === 'chain') ?? null;
  };

  const ensureChain = (phaseNode: ConsoleNode, chainKey: string): ConsoleNode => {
    const existing = phaseNode.children.find((c) => c.kind === 'chain' && c.chain === chainKey);
    if (existing) return existing;
    return attach(
      phaseNode,
      mk({
        id: `chain:${phaseNode.phase}:${chainKey}`,
        kind: 'chain',
        phase: phaseNode.phase,
        chain: chainKey,
        label: humanize(chainKey),
        sublabel: 'chain',
      })
    );
  };

  const ensureEngine = (phaseNode: ConsoleNode, ev: RunEvent): ConsoleNode => {
    const engineKey = ev.engine || 'engine';
    const existing = index.get(`engine:${phaseNode.phase}:${engineKey}`);
    if (existing) return existing;
    const parent = ev.chain ? ensureChain(phaseNode, ev.chain) : findChain(phaseNode, null) ?? phaseNode;
    return attach(
      parent,
      mk({
        id: `engine:${phaseNode.phase}:${engineKey}`,
        kind: 'engine',
        phase: phaseNode.phase,
        chain: parent.chain ?? null,
        engine: engineKey,
        label: humanize(engineKey),
        sublabel: engineKey.startsWith('function:') ? 'function' : undefined,
      })
    );
  };

  const ensurePass = (engineNode: ConsoleNode, ev: RunEvent): ConsoleNode => {
    const passes = engineNode.children.filter((c) => c.kind === 'pass');
    let hit = passes.find((p) => samePass(p, ev));
    if (!hit && ev.stance) {
      const byStance = passes.filter((p) => p.meta.stance === ev.stance);
      hit =
        byStance.find((p) => !p.children.some((c) => (c.workKey ?? '') === (ev.work_key ?? ''))) ??
        byStance[0];
    }
    if (!hit && !ev.pass_name && passes.length > 0) {
      // No naming information: take the first pass without a call for this work.
      hit = passes.find((p) => !p.children.some((c) => (c.workKey ?? '') === (ev.work_key ?? ''))) ?? passes[0];
    }
    if (hit) return hit;
    const name = ev.pass_name ? String(ev.pass_name) : 'call';
    const id = `pass:${engineNode.phase}:${engineNode.engine}:${slug(name) || 'call'}`;
    const existing = index.get(id);
    if (existing) return existing;
    return attach(
      engineNode,
      mk({
        id,
        kind: 'pass',
        phase: engineNode.phase,
        chain: engineNode.chain ?? null,
        engine: engineNode.engine ?? null,
        passName: ev.pass_name ?? null,
        label: ev.pass_name ? humanize(String(ev.pass_name)) : 'Call',
        sublabel: ev.stance ? humanize(ev.stance) : undefined,
        meta: { stance: ev.stance ?? null, order: passes.length + 1 },
      })
    );
  };

  // ── 2. Fold events into the tree ────────────────────────────
  const openCalls = new Map<string, ConsoleNode>();
  let hasCallEvents = false;

  const setExplicit = (node: ConsoleNode, status: NodeStatus) => {
    node.status = status;
    node.explicitStatus = true;
  };

  const scopeNode = (ev: RunEvent, phaseNode: ConsoleNode | null): ConsoleNode | null => {
    if (!phaseNode) return null;
    if (ev.engine) {
      const eng = index.get(`engine:${phaseNode.phase}:${ev.engine}`);
      if (eng) {
        if (ev.pass_name || ev.stance) {
          const pass = eng.children.find((p) => p.kind === 'pass' && samePass(p, ev));
          if (pass) return pass;
        }
        return eng;
      }
    }
    if (ev.chain) {
      const chain = phaseNode.children.find((c) => c.kind === 'chain' && c.chain === ev.chain);
      if (chain) return chain;
    }
    return phaseNode;
  };

  for (const ev of events) {
    const phaseNumber =
      ev.phase === null || ev.phase === undefined || ev.phase === '' ? null : Number(ev.phase);
    const phaseNode = phaseNumber !== null && !Number.isNaN(phaseNumber) ? ensurePhase(phaseNumber) : null;

    switch (ev.kind) {
      case 'phase_started': {
        if (!phaseNode) break;
        phaseNode.events.push(ev);
        phaseNode.started = phaseNode.started ?? ev.ts;
        setExplicit(phaseNode, 'running');
        eventNodeId.set(ev.seq, phaseNode.id);
        break;
      }
      case 'phase_finished': {
        if (!phaseNode) break;
        phaseNode.events.push(ev);
        phaseNode.finished = ev.ts;
        setExplicit(phaseNode, 'completed');
        if (ev.duration_ms) phaseNode.meta.reportedDuration = ev.duration_ms;
        eventNodeId.set(ev.seq, phaseNode.id);
        break;
      }
      case 'chain_started':
      case 'chain_finished': {
        if (!phaseNode) break;
        const chain = ev.chain ? ensureChain(phaseNode, ev.chain) : findChain(phaseNode, null);
        const target = chain ?? phaseNode;
        target.events.push(ev);
        if (ev.kind === 'chain_started') {
          target.started = target.started ?? ev.ts;
          setExplicit(target, 'running');
        } else {
          target.finished = ev.ts;
          setExplicit(target, 'completed');
        }
        eventNodeId.set(ev.seq, target.id);
        break;
      }
      case 'call_started': {
        if (!phaseNode) break;
        hasCallEvents = true;
        const pass = ensurePass(ensureEngine(phaseNode, ev), ev);
        const call = attach(
          pass,
          mk({
            id: `call:${ev.seq}`,
            kind: 'call',
            phase: phaseNode.phase,
            chain: pass.chain ?? null,
            engine: pass.engine ?? null,
            passName: pass.passName ?? null,
            passNumber: pass.passNumber ?? null,
            workKey: ev.work_key ?? null,
            label: ev.work_key ? String(ev.work_key) : `Call #${ev.seq}`,
            sublabel: ev.model ?? undefined,
            started: ev.ts,
            meta: {
              model: ev.model ?? null,
              promptHash: ev.prompt_hash ?? null,
              promptExcerpt: ev.prompt_excerpt ?? null,
              inputChars: ev.input_chars ?? null,
              payload: ev.payload_json ?? undefined,
              order: pass.children.length + 1,
            },
          })
        );
        call.events.push(ev);
        setExplicit(call, 'running');
        openCalls.set(callKey(ev), call);
        eventNodeId.set(ev.seq, call.id);
        break;
      }
      case 'call_finished':
      case 'call_failed': {
        if (!phaseNode) break;
        hasCallEvents = true;
        const key = callKey(ev);
        let call = openCalls.get(key);
        if (!call) {
          const pass = ensurePass(ensureEngine(phaseNode, ev), ev);
          call = attach(
            pass,
            mk({
              id: `call:${ev.seq}`,
              kind: 'call',
              phase: phaseNode.phase,
              chain: pass.chain ?? null,
              engine: pass.engine ?? null,
              passName: pass.passName ?? null,
              passNumber: pass.passNumber ?? null,
              workKey: ev.work_key ?? null,
              label: ev.work_key ? String(ev.work_key) : `Call #${ev.seq}`,
              meta: { order: pass.children.length + 1 },
            })
          );
        }
        openCalls.delete(key);
        call.events.push(ev);
        call.finished = ev.ts;
        call.sublabel = ev.model ?? call.sublabel;
        call.meta.model = ev.model ?? call.meta.model ?? null;
        call.meta.promptHash = ev.prompt_hash ?? call.meta.promptHash ?? null;
        call.meta.promptExcerpt = ev.prompt_excerpt ?? call.meta.promptExcerpt ?? null;
        call.meta.outputExcerpt = ev.output_excerpt ?? null;
        call.meta.inputChars = ev.input_chars ?? call.meta.inputChars ?? null;
        call.meta.outputChars = ev.output_chars ?? null;
        if (ev.payload_json) call.meta.payload = ev.payload_json;
        if (ev.kind === 'call_failed') call.meta.error = ev.detail ?? 'call failed';
        const inTok = ev.input_tokens ?? 0;
        const outTok = ev.output_tokens ?? 0;
        call.stats = {
          calls: 1,
          input_tokens: inTok,
          output_tokens: outTok,
          tokens: inTok + outTok,
          cost_usd: ev.cost_usd ?? null,
          duration_ms: ev.duration_ms ?? 0,
        };
        setExplicit(call, ev.kind === 'call_failed' ? 'failed' : 'completed');
        eventNodeId.set(ev.seq, call.id);
        break;
      }
      case 'narration':
      case 'note':
      case 'artifact': {
        const target = scopeNode(ev, phaseNode);
        if (target) {
          target.events.push(ev);
          eventNodeId.set(ev.seq, target.id);
        } else {
          rootEvents.push(ev);
        }
        break;
      }
      case 'job_failed': {
        rootEvents.push(ev);
        // Mark whichever phase is still running as failed.
        if (phaseNode) setExplicit(phaseNode, 'failed');
        break;
      }
      default: {
        if (phaseNode && (ev.engine || ev.chain)) {
          const target = scopeNode(ev, phaseNode);
          if (target) {
            target.events.push(ev);
            eventNodeId.set(ev.seq, target.id);
            break;
          }
        }
        rootEvents.push(ev);
      }
    }
  }

  // ── 3. Statuses & roll-ups ──────────────────────────────────
  const jobRunning = job?.status === 'running' || job?.status === 'pending';
  const detail = job?.progress?.detail ?? '';
  const activeEngine = detail.match(/Engine:?\s+([A-Za-z0-9_:-]+)/i)?.[1] ?? null;
  const activePass = detail.match(/pass\s+(\d+)/i)?.[1] ? Number(detail.match(/pass\s+(\d+)/i)![1]) : null;

  const jobTerminal = job?.status === 'completed' || job?.status === 'failed' || job?.status === 'cancelled';

  const phaseStatusFromRecords = (n: number, node: ConsoleNode): NodeStatus => {
    if (node.explicitStatus) return node.status;
    if (node.meta.skip) return 'skipped';
    const fromJob = normalizeStatus(lookupPhase(job?.progress?.phase_statuses, n));
    const fromResults = normalizeStatus(lookupPhase<PhaseResultSummary>(results?.phase_results, n)?.status);
    if (jobTerminal) {
      // The executor's progress record can be stale after completion (last phase left 'running');
      // the phase_results record is authoritative once the job has ended.
      if (fromResults) return fromResults;
      if (fromJob === 'running') return job?.status === 'completed' ? 'completed' : 'failed';
      if (fromJob) return fromJob;
      return job?.status === 'completed' ? 'completed' : 'pending';
    }
    if (fromJob) return fromJob;
    if (fromResults) return fromResults;
    if (jobRunning && job?.progress?.current_phase != null) {
      if (Number(job.progress.current_phase) === n) return 'running';
      if (Number(job.progress.current_phase) > n) return 'completed';
    }
    return 'pending';
  };

  const deriveFromChildren = (node: ConsoleNode, phaseStatus: NodeStatus): NodeStatus => {
    if (node.explicitStatus) return node.status;
    const kids = node.children;
    if (kids.length === 0) {
      if (phaseStatus === 'completed') return 'completed';
      if (phaseStatus === 'failed') return hasCallEvents ? 'pending' : 'failed';
      if (phaseStatus === 'running' && !hasCallEvents) {
        // No ledger: use the executor's detail string to light up the active engine/pass.
        if (node.kind === 'engine' && activeEngine && node.engine === activeEngine) return 'running';
        if (node.kind === 'pass' && activeEngine && node.engine === activeEngine) {
          if (activePass == null) return 'pending';
          if (node.passNumber === activePass) return 'running';
          if (node.passNumber != null && node.passNumber < activePass) return 'completed';
        }
      }
      return 'pending';
    }
    const statuses = kids.map((k) => k.status);
    if (statuses.some((s) => s === 'failed')) return 'failed';
    if (statuses.some((s) => s === 'running')) return 'running';
    if (statuses.every((s) => s === 'completed' || s === 'skipped')) return 'completed';
    if (statuses.some((s) => s === 'completed')) return phaseStatus === 'completed' ? 'completed' : 'running';
    return phaseStatus === 'completed' ? 'completed' : 'pending';
  };

  const finalize = (node: ConsoleNode, phaseStatus: NodeStatus) => {
    node.children.forEach((child) => finalize(child, phaseStatus));
    if (node.kind !== 'call' && node.kind !== 'phase') {
      node.status = deriveFromChildren(node, phaseStatus);
    }
    if (node.kind !== 'call') {
      const agg = emptyStats();
      node.children.forEach((child) => addStats(agg, child.stats));
      node.stats = agg;
    }
  };

  const totals = emptyStats();
  const phases = sortedPhases.map((n) => {
    const node = phaseMap.get(n)!;
    const status = phaseStatusFromRecords(n, node);
    node.status = status;
    // Order engines that were created from events before finalizing.
    finalize(node, status);
    if (node.stats.calls === 0 && node.meta.reportedTokens) {
      node.stats.tokens = node.meta.reportedTokens;
    }
    if (node.stats.duration_ms === 0 && node.meta.reportedDuration) {
      node.stats.duration_ms = node.meta.reportedDuration;
    }
    // A phase that finished (or is running) with an engine that is still 'pending' by
    // derivation but has passes with calls should read as the derived status; nothing to do.
    addStats(totals, node.stats);
    return node;
  });

  // Fallback totals from the executor when there is no ledger.
  if (totals.calls === 0 && job) {
    totals.calls = job.total_llm_calls ?? 0;
    totals.input_tokens = job.total_input_tokens ?? 0;
    totals.output_tokens = job.total_output_tokens ?? 0;
    totals.tokens = totals.input_tokens + totals.output_tokens;
  }

  return {
    phases,
    totals,
    index,
    eventNodeId,
    rootEvents,
    hasEvents: events.length > 0,
    hasCallEvents,
  };
}

/** Deepest running node, else the last completed phase, else the first phase. */
export function defaultSelection(tree: ConsoleTree): string | null {
  const running: ConsoleNode[] = [];
  const walk = (node: ConsoleNode) => {
    if (node.status === 'running') running.push(node);
    node.children.forEach(walk);
  };
  tree.phases.forEach(walk);
  if (running.length > 0) {
    const order: NodeKind[] = ['call', 'pass', 'engine', 'chain', 'phase'];
    for (const kind of order) {
      const hit = running.find((n) => n.kind === kind);
      if (hit) return hit.id;
    }
  }
  const completed = [...tree.phases].reverse().find((p) => p.status === 'completed');
  return completed?.id ?? tree.phases[0]?.id ?? null;
}

export function ancestorsOf(tree: ConsoleTree, id: string | null): string[] {
  const out: string[] = [];
  let cur = id ? tree.index.get(id) : undefined;
  while (cur && cur.parentId) {
    out.push(cur.parentId);
    cur = tree.index.get(cur.parentId);
  }
  return out;
}

export function pathOf(tree: ConsoleTree, id: string | null): ConsoleNode[] {
  const chain: ConsoleNode[] = [];
  let cur = id ? tree.index.get(id) : undefined;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? tree.index.get(cur.parentId) : undefined;
  }
  return chain;
}

/** Latest call node (by seq) in a subtree, preferring finished ones. */
export function latestCall(node: ConsoleNode): ConsoleNode | null {
  let best: ConsoleNode | null = null;
  const walk = (n: ConsoleNode) => {
    if (n.kind === 'call') {
      if (!best) best = n;
      else {
        const bestFinished = best.status !== 'running';
        const nFinished = n.status !== 'running';
        const bestSeq = best.events[0]?.seq ?? 0;
        const nSeq = n.events[0]?.seq ?? 0;
        if ((nFinished && !bestFinished) || (nFinished === bestFinished && nSeq > bestSeq)) best = n;
      }
    }
    n.children.forEach(walk);
  };
  walk(node);
  return best;
}

/** Narration lines that apply to a node: its own, else the nearest ancestor's. */
export function narrationFor(tree: ConsoleTree, node: ConsoleNode | null): RunEvent[] {
  let cur: ConsoleNode | undefined | null = node;
  while (cur) {
    const lines = cur.events.filter((e) => e.kind === 'narration');
    if (lines.length > 0) return lines;
    cur = cur.parentId ? tree.index.get(cur.parentId) : null;
  }
  return [];
}

export function countByStatus(tree: ConsoleTree): Record<NodeStatus, number> {
  const out: Record<NodeStatus, number> = { pending: 0, running: 0, completed: 0, failed: 0, skipped: 0 };
  tree.phases.forEach((p) => {
    out[p.status] += 1;
  });
  return out;
}
