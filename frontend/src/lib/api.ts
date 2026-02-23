/**
 * API Client for Analyzer Management Console
 */

import type {
  Engine,
  EngineSummary,
  EngineUpdate,
  EngineVersion,
  EngineProfile,
  EngineProfileResponse,
  CapabilityEngineDefinition,
  Paradigm,
  ParadigmSummary,
  Pipeline,
  PipelineSummary,
  Consumer,
  ConsumerDependency,
  ChangeEvent,
  ChangeSummary,
  MigrationHint,
  StructuredSuggestion,
  SuggestionResponse,
  PromptImprovement,
  SchemaValidation,
  BranchRequest,
  BranchResponse,
  BranchProgressResponse,
  LineageItem,
  StageContext,
  StageContextImprovement,
  ComposedPromptResponse,
  AudienceType,
  Grid,
  GridSummary,
  GridDimensions,
  GridVersion,
  WildcardSuggestion,
  StyleSummary,
  StyleGuide,
  AffinitySet,
  EngineStyleMapping,
  AnalyticalPrimitive,
  PrimitiveSummary,
  EnginePrimitiveMapping,
  AudienceDefinition,
  AudienceSummary,
  AudienceIdentity,
  FunctionSummary,
  FunctionDefinition,
  PromptTemplate,
  FunctionImplementation,
  Workflow,
  WorkflowCategory,
  WorkflowSummary,
  WorkflowPhase,
  WorkflowExtensionAnalysis,
  AddEngineResponse,
  EngineChainSpec,
  TransformationTemplate,
  TransformationTemplateSummary,
  TransformationExecuteRequest,
  TransformationExecuteResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const ANALYZER_V2_URL = process.env.NEXT_PUBLIC_ANALYZER_V2_URL || 'https://analyzer-v2.onrender.com';

// ============================================================================
// HTTP Client
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // Engine Endpoints
  // ============================================================================

  engines = {
    /**
     * List engines from analyzer-v2 (source of truth for definitions).
     * Calls analyzer-v2 directly for the latest engine definitions.
     */
    list: async (params?: {
      category?: string;
      kind?: string;
      paradigm?: string;
      status?: string;
      search?: string;
      app?: string;
      limit?: number;
      offset?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const engines = await response.json() as EngineSummary[];
      return { engines, total: engines.length, limit: params?.limit ?? 200, offset: params?.offset ?? 0 };
    },

    /**
     * Get a single engine from analyzer-v2 (source of truth for definitions).
     */
    get: async (engineKey: string): Promise<Engine> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Map v2 response to Engine type — fill in fields v2 doesn't have
      return {
        ...data,
        id: data.engine_key,
        status: 'active' as const,
      } as Engine;
    },

    getVersions: (engineKey: string) =>
      this.get<{ engine_key: string; current_version: number; versions: EngineVersion[] }>(
        `/engines/${engineKey}/versions`
      ),

    /**
     * Get a composed prompt for an engine from analyzer-v2.
     * Prompts are composed at runtime using templates + stage_context.
     * @param engineKey - The engine key
     * @param promptType - The prompt type (extraction, curation, concretization)
     * @param audience - Target audience for vocabulary calibration
     */
    getPrompt: async (
      engineKey: string,
      promptType: 'extraction' | 'curation' | 'concretization',
      audience: AudienceType = 'analyst'
    ): Promise<ComposedPromptResponse> => {
      const response = await fetch(
        `${ANALYZER_V2_URL}/v1/engines/${engineKey}/${promptType}-prompt?audience=${audience}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Get the stage_context for an engine (for editing/debugging).
     */
    getStageContext: (engineKey: string) =>
      this.get<{ engine_key: string; has_stage_context: boolean; stage_context: StageContext | null }>(
        `/engines/${engineKey}/stage-context`
      ),

    getSchema: (engineKey: string) =>
      this.get<{ engine_key: string; canonical_schema: Record<string, unknown> }>(
        `/engines/${engineKey}/schema`
      ),

    create: (data: EngineUpdate) => this.post<Engine>('/engines', data),

    update: (engineKey: string, data: EngineUpdate) =>
      this.put<Engine>(`/engines/${engineKey}`, data),

    delete: (engineKey: string) =>
      this.delete<{ message: string }>(`/engines/${engineKey}`),

    restore: (engineKey: string, version: number) =>
      this.post<Engine>(`/engines/${engineKey}/restore/${version}`),

    /**
     * Get category counts from analyzer-v2.
     */
    getCategories: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/categories`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ categories: Record<string, number> }>;
    },

    /**
     * Get app tags from analyzer-v2.
     */
    getApps: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/apps`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<string[]>;
    },

    /**
     * Get the profile/about section for an engine from analyzer-v2.
     */
    getProfile: async (engineKey: string): Promise<EngineProfileResponse> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}/profile`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Save or update the profile for an engine via analyzer-v2.
     */
    saveProfile: async (engineKey: string, profile: EngineProfile): Promise<EngineProfileResponse> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Delete the profile for an engine.
     */
    deleteProfile: (engineKey: string) =>
      this.delete<{ status: string; engine_key: string }>(`/engines/${engineKey}/profile`),

    /**
     * Get the capability definition for an engine from analyzer-v2.
     * Returns null if the engine has no capability definition.
     */
    getCapabilityDefinition: async (engineKey: string): Promise<CapabilityEngineDefinition | null> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}/capability-definition`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * List engine keys that have capability definitions (v2 prose-mode).
     */
    listCapabilityKeys: async (): Promise<string[]> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/capability-definitions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as Array<{ engine_key: string }>;
      return data.map(d => d.engine_key);
    },

    /**
     * Get the capability-based prompt for an engine from analyzer-v2.
     */
    getCapabilityPrompt: async (engineKey: string, depth: string = 'standard'): Promise<{ engine_key: string; depth: string; prompt: string } | null> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}/capability-prompt?depth=${depth}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    getCapabilityHistory: async (engineKey: string): Promise<import('@/types').CapabilityHistoryResponse | null> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/engines/${engineKey}/capability-definition/history`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };

  // ============================================================================
  // Paradigm Endpoints
  // ============================================================================

  paradigms = {
    list: (params?: {
      status?: string;
      search?: string;
      parent_key?: string;
      is_root?: boolean;
      generation_status?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ paradigms: ParadigmSummary[]; total: number }>(
        `/paradigms${query ? `?${query}` : ''}`
      );
    },

    get: (paradigmKey: string) => this.get<Paradigm>(`/paradigms/${paradigmKey}`),

    getPrimer: (paradigmKey: string) =>
      this.get<{ paradigm_key: string; primer_text: string }>(
        `/paradigms/${paradigmKey}/primer`
      ),

    getEngines: (paradigmKey: string) =>
      this.get<{ paradigm_key: string; primary_engines: string[]; compatible_engines: string[] }>(
        `/paradigms/${paradigmKey}/engines`
      ),

    getCritiquePatterns: (paradigmKey: string) =>
      this.get<{ paradigm_key: string; critique_patterns: Array<{ pattern: string; diagnostic: string; fix: string }> }>(
        `/paradigms/${paradigmKey}/critique-patterns`
      ),

    getLayer: (paradigmKey: string, layerName: string) =>
      this.get<{ paradigm_key: string; layer_name: string; layer_data: Record<string, unknown> }>(
        `/paradigms/${paradigmKey}/layer/${layerName}`
      ),

    create: (data: Partial<Paradigm>) => this.post<Paradigm>('/paradigms', data),

    update: (paradigmKey: string, data: Partial<Paradigm>) =>
      this.put<Paradigm>(`/paradigms/${paradigmKey}`, data),

    updateLayer: (paradigmKey: string, layerName: string, layerData: Record<string, unknown>) =>
      this.put<{ paradigm_key: string; layer_name: string; layer_data: Record<string, unknown> }>(
        `/paradigms/${paradigmKey}/layer/${layerName}`,
        { layer_data: layerData }
      ),

    delete: (paradigmKey: string) =>
      this.delete<{ message: string }>(`/paradigms/${paradigmKey}`),

    // Branching methods
    createBranch: (parentKey: string, data: BranchRequest) =>
      this.post<BranchResponse>(`/paradigms/${parentKey}/branch`, data),

    getLineage: (paradigmKey: string) =>
      this.get<{ paradigm_key: string; lineage: LineageItem[]; root_paradigm: string | null }>(
        `/paradigms/${paradigmKey}/lineage`
      ),

    getBranches: (paradigmKey: string) =>
      this.get<{ paradigm_key: string; branches: ParadigmSummary[]; total: number }>(
        `/paradigms/${paradigmKey}/branches`
      ),

    generateBranch: (paradigmKey: string) =>
      this.post<{
        paradigm_key: string;
        generated_fields: string[];
        errors: Array<{ field: string; error: string }>;
        generation_status: string;
      }>(`/llm/generate-branch/${paradigmKey}`),

    getBranchProgress: (paradigmKey: string) =>
      this.get<BranchProgressResponse>(`/llm/branch-progress/${paradigmKey}`),
  };

  // ============================================================================
  // Pipeline Endpoints
  // ============================================================================

  pipelines = {
    list: (params?: { category?: string; status?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ pipelines: PipelineSummary[]; total: number }>(
        `/pipelines${query ? `?${query}` : ''}`
      );
    },

    get: (pipelineKey: string) => this.get<Pipeline>(`/pipelines/${pipelineKey}`),

    getStages: (pipelineKey: string) =>
      this.get<{ pipeline_key: string; stages: Array<Record<string, unknown>> }>(
        `/pipelines/${pipelineKey}/stages`
      ),

    create: (data: Partial<Pipeline>) => this.post<Pipeline>('/pipelines', data),

    update: (pipelineKey: string, data: Partial<Pipeline>) =>
      this.put<Pipeline>(`/pipelines/${pipelineKey}`, data),

    delete: (pipelineKey: string) =>
      this.delete<{ message: string }>(`/pipelines/${pipelineKey}`),

    addStage: (pipelineKey: string, stageData: Record<string, unknown>) =>
      this.post<Record<string, unknown>>(`/pipelines/${pipelineKey}/stages`, stageData),

    updateStage: (pipelineKey: string, stageOrder: number, stageData: Record<string, unknown>) =>
      this.put<Record<string, unknown>>(`/pipelines/${pipelineKey}/stages/${stageOrder}`, stageData),

    deleteStage: (pipelineKey: string, stageOrder: number) =>
      this.delete<{ message: string }>(`/pipelines/${pipelineKey}/stages/${stageOrder}`),

    reorderStages: (pipelineKey: string, newOrder: number[]) =>
      this.post<Pipeline>(`/pipelines/${pipelineKey}/reorder`, newOrder),
  };

  // ============================================================================
  // Workflow Endpoints (from analyzer-v2)
  // ============================================================================

  workflows = {
    /**
     * List all workflows from analyzer-v2.
     */
    list: async (params?: { category?: string }): Promise<{ workflows: WorkflowSummary[]; total: number }> => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.set('category', params.category);
      const query = queryParams.toString();
      const response = await fetch(`${ANALYZER_V2_URL}/v1/workflows${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawWorkflows = await response.json() as Array<Record<string, unknown>>;
      const summaries: WorkflowSummary[] = rawWorkflows.map((w) => ({
        workflow_key: w.workflow_key as string,
        workflow_name: w.workflow_name as string,
        description: w.description as string,
        category: w.category as WorkflowCategory,
        version: w.version as number,
        phase_count: (w.phase_count as number) ?? (w.pass_count as number) ?? (w.phases as unknown[] | undefined)?.length ?? (w.passes as unknown[] | undefined)?.length ?? 0,
        source_project: (w.source_project as string) ?? '',
        required_inputs: (w.required_inputs as string[]) ?? [],
      }));
      return { workflows: summaries, total: summaries.length };
    },

    /**
     * Get a single workflow from analyzer-v2 with full phase details.
     * Normalizes legacy 'passes' field to 'phases' for backward compatibility.
     */
    get: async (workflowKey: string): Promise<Workflow> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/workflows/${workflowKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Normalize: accept both 'phases' and legacy 'passes' field names
      if (!data.phases && data.passes) {
        data.phases = data.passes.map((p: Record<string, unknown>) => ({
          ...p,
          phase_number: p.phase_number ?? p.pass_number,
          phase_name: p.phase_name ?? p.pass_name,
          phase_description: p.phase_description ?? p.pass_description,
          depends_on_phases: p.depends_on_phases ?? p.depends_on_passes ?? [],
        }));
      }
      if (data.estimated_passes !== undefined && data.estimated_phases === undefined) {
        data.estimated_phases = data.estimated_passes;
      }
      return data as Workflow;
    },

    /**
     * Get the composed prompt for a specific phase of a workflow.
     */
    getPhasePrompt: async (
      workflowKey: string,
      phaseNumber: number,
      audience: AudienceType = 'analyst'
    ): Promise<ComposedPromptResponse> => {
      const response = await fetch(
        `${ANALYZER_V2_URL}/v1/workflows/${workflowKey}/phase/${phaseNumber}/prompt?audience=${audience}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Get extension points analysis for a workflow.
     */
    getExtensionPoints: async (
      workflowKey: string,
      depth: string = 'standard'
    ): Promise<WorkflowExtensionAnalysis> => {
      const response = await fetch(
        `${ANALYZER_V2_URL}/v1/workflows/${workflowKey}/extension-points?depth=${depth}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Add an engine to a workflow phase.
     */
    addEngineToPhase: async (
      workflowKey: string,
      phaseNumber: number,
      engineKey: string,
      position?: number,
    ): Promise<AddEngineResponse> => {
      const response = await fetch(
        `${ANALYZER_V2_URL}/v1/workflows/${workflowKey}/phases/${phaseNumber}/add-engine`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine_key: engineKey, position: position ?? null }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }
      return response.json();
    },
  };

  // ============================================================================
  // Chains Endpoints (from analyzer-v2)
  // ============================================================================

  chains = {
    /**
     * List all engine chains from analyzer-v2.
     */
    list: async (): Promise<EngineChainSpec[]> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/chains`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    /**
     * Get a single chain by key from analyzer-v2.
     */
    get: async (chainKey: string): Promise<EngineChainSpec> => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/chains/${chainKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };

  // ============================================================================
  // Consumer Endpoints
  // ============================================================================

  consumers = {
    list: (params?: { consumer_type?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ consumers: Consumer[]; total: number }>(
        `/consumers${query ? `?${query}` : ''}`
      );
    },

    get: (consumerId: string) => this.get<Consumer>(`/consumers/${consumerId}`),

    getDependencies: (consumerId: string, constructType?: string) => {
      const query = constructType ? `?construct_type=${constructType}` : '';
      return this.get<{ consumer_id: string; dependencies: ConsumerDependency[]; total: number }>(
        `/consumers/${consumerId}/dependencies${query}`
      );
    },

    getByConstruct: (constructType: string, constructKey: string) =>
      this.get<{
        construct_type: string;
        construct_key: string;
        consumers: Array<{ consumer: Consumer; dependency: ConsumerDependency }>;
        total: number;
      }>(`/consumers/by-construct/${constructType}/${constructKey}`),

    create: (data: {
      name: string;
      consumer_type: string;
      repo_url?: string;
      webhook_url?: string;
      contact_email?: string;
      auto_update?: boolean;
      dependencies?: Array<{
        construct_type: string;
        construct_key: string;
        usage_location?: string;
        usage_type?: string;
      }>;
    }) => this.post<Consumer>('/consumers', data),

    update: (consumerId: string, data: Partial<Consumer>) =>
      this.put<Consumer>(`/consumers/${consumerId}`, data),

    delete: (consumerId: string) =>
      this.delete<{ message: string }>(`/consumers/${consumerId}`),

    addDependency: (consumerId: string, dependency: Partial<ConsumerDependency>) =>
      this.post<ConsumerDependency>(`/consumers/${consumerId}/dependencies`, dependency),

    removeDependency: (consumerId: string, dependencyId: string) =>
      this.delete<{ message: string }>(`/consumers/${consumerId}/dependencies/${dependencyId}`),
  };

  // ============================================================================
  // Change Endpoints
  // ============================================================================

  changes = {
    list: (params?: {
      construct_type?: string;
      construct_key?: string;
      change_type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ changes: ChangeSummary[]; limit: number; offset: number }>(
        `/changes${query ? `?${query}` : ''}`
      );
    },

    get: (changeId: string) => this.get<ChangeEvent>(`/changes/${changeId}`),

    getNotifications: (changeId: string) =>
      this.get<{ change_id: string; notifications: Array<Record<string, unknown>>; total: number }>(
        `/changes/${changeId}/notifications`
      ),

    record: (data: {
      construct_type: string;
      construct_key: string;
      change_type: string;
      old_value?: Record<string, unknown>;
      new_value?: Record<string, unknown>;
      diff?: Record<string, unknown>;
      changed_by?: string;
      change_summary?: string;
    }) => this.post<ChangeEvent>('/changes', data),

    propagate: (changeId: string, notifyOnly = false) =>
      this.post<{
        change_id: string;
        propagation_status: string;
        notifications_sent: number;
        notifications: Array<{ consumer_name: string; webhook_url: string; auto_update: boolean }>;
      }>(`/changes/${changeId}/propagate`, { notify_only: notifyOnly }),

    acknowledge: (changeId: string, consumerId: string, action: string, message?: string) => {
      const query = `action=${action}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
      return this.post<Record<string, unknown>>(
        `/changes/${changeId}/notifications/${consumerId}/acknowledge?${query}`
      );
    },

    getMigrationHints: (changeId: string) =>
      this.get<{
        change_id: string;
        construct_type: string;
        construct_key: string;
        hints: MigrationHint[];
      }>(`/changes/${changeId}/migration-hints`),

    getConstructHistory: (constructType: string, constructKey: string, limit = 20) =>
      this.get<{ construct_type: string; construct_key: string; changes: ChangeSummary[]; total: number }>(
        `/changes/construct/${constructType}/${constructKey}?limit=${limit}`
      ),
  };

  // ============================================================================
  // LLM Endpoints
  // ============================================================================

  llm = {
    paradigmSuggestions: (paradigmKey: string, query: string, layer?: string, field?: string) =>
      this.post<SuggestionResponse>('/llm/paradigm-suggestions', {
        paradigm_key: paradigmKey,
        query,
        layer,
        field,
      }),

    improvePrompt: (
      engineKey: string,
      promptType: string,
      improvementGoal: string,
      currentPrompt?: string
    ) =>
      this.post<PromptImprovement>('/llm/prompt-improve', {
        engine_key: engineKey,
        prompt_type: promptType,
        improvement_goal: improvementGoal,
        current_prompt: currentPrompt,
      }),

    /**
     * Improve a specific field within stage_context using AI.
     * @param engineKey - The engine key
     * @param stage - The stage (extraction, curation, concretization)
     * @param field - The field to improve (e.g., extraction_steps, core_question)
     * @param improvementGoal - What to improve about the field
     * @param currentValue - Current value if not fetching from DB
     */
    improveStageContext: (
      engineKey: string,
      stage: string,
      field: string,
      improvementGoal: string,
      currentValue?: string
    ) =>
      this.post<StageContextImprovement>('/llm/stage-context-improve', {
        engine_key: engineKey,
        stage,
        field,
        improvement_goal: improvementGoal,
        current_value: currentValue,
      }),

    validateSchema: (engineKey: string, proposedSchema: Record<string, unknown>, changeDescription: string) =>
      this.post<SchemaValidation>('/llm/schema-validate', {
        engine_key: engineKey,
        proposed_schema: proposedSchema,
        change_description: changeDescription,
      }),

    compareParadigms: (paradigmA: string, paradigmB: string, focusArea?: string) =>
      this.post<{
        paradigm_a: string;
        paradigm_b: string;
        comparison: string;
        shared_engines: string[];
      }>('/llm/compare-paradigms', {
        paradigm_a: paradigmA,
        paradigm_b: paradigmB,
        focus_area: focusArea,
      }),

    generateCritiquePatterns: (paradigmKey: string) =>
      this.post<{
        paradigm_key: string;
        existing_patterns: Array<{ pattern: string; diagnostic: string; fix: string }>;
        suggested_patterns: string;
      }>(`/llm/generate-critique-patterns?paradigm_key=${paradigmKey}`),

    /**
     * Generate a full profile for an engine using AI.
     */
    generateProfile: (engineKey: string, regenerateFields?: string[]) =>
      this.post<{
        engine_key: string;
        profile: EngineProfile;
        fields_generated: string[];
      }>('/llm/profile-generate', {
        engine_key: engineKey,
        regenerate_fields: regenerateFields,
      }),

    /**
     * Get AI suggestions for improving a specific profile field.
     */
    profileSuggestions: (engineKey: string, field: string, improvementGoal: string) =>
      this.post<{
        engine_key: string;
        field: string;
        suggestions: string[];
        improved_content: Record<string, unknown> | null;
      }>('/llm/profile-suggestions', {
        engine_key: engineKey,
        field,
        improvement_goal: improvementGoal,
      }),

    /**
     * Check if LLM service is available.
     */
    getStatus: () =>
      this.get<{
        available: boolean;
        model: string | null;
        message: string;
      }>('/llm/status'),
  };

  // ============================================================================
  // Grid Endpoints
  // ============================================================================

  grids = {
    list: (params?: { track?: string; status?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ grids: GridSummary[]; total: number }>(
        `/grids${query ? `?${query}` : ''}`
      );
    },

    get: (gridKey: string) => this.get<Grid>(`/grids/${gridKey}`),

    getDimensions: (gridKey: string) =>
      this.get<GridDimensions>(`/grids/${gridKey}/dimensions`),

    getVersions: (gridKey: string) =>
      this.get<{ grid_key: string; current_version: number; versions: GridVersion[] }>(
        `/grids/${gridKey}/versions`
      ),

    create: (data: Partial<Grid>) => this.post<Grid>('/grids', data),

    update: (gridKey: string, data: Partial<Grid> & { change_summary?: string }) =>
      this.put<Grid>(`/grids/${gridKey}`, data),

    delete: (gridKey: string) =>
      this.delete<{ message: string }>(`/grids/${gridKey}`),

    // Wildcards
    listWildcards: (gridKey: string, params?: { status?: string; scope?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      return this.get<{ wildcards: WildcardSuggestion[]; total: number }>(
        `/grids/${gridKey}/wildcards${query ? `?${query}` : ''}`
      );
    },

    promoteWildcard: (gridKey: string, wildcardId: string) =>
      this.post<WildcardSuggestion>(`/grids/${gridKey}/wildcards/${wildcardId}/promote`),

    rejectWildcard: (gridKey: string, wildcardId: string) =>
      this.post<WildcardSuggestion>(`/grids/${gridKey}/wildcards/${wildcardId}/reject`),

    addWildcardToGrid: (gridKey: string, wildcardId: string) =>
      this.post<{ grid: Grid; added_dimension: Record<string, unknown>; wildcard: WildcardSuggestion }>(
        `/grids/${gridKey}/wildcards/${wildcardId}/add-to-grid`
      ),
  };

  // ============================================================================
  // Audience Endpoints
  // ============================================================================

  audiences = {
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AudienceSummary[]>;
    },

    get: async (audienceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/${audienceKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AudienceDefinition>;
    },

    getIdentity: async (audienceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/${audienceKey}/identity`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AudienceIdentity>;
    },

    getGuidance: async (audienceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/${audienceKey}/guidance`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ audience_key: string; guidance: string; vocabulary_guidance: string }>;
    },

    create: async (data: Partial<AudienceDefinition>) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AudienceDefinition>;
    },

    update: async (audienceKey: string, data: Partial<AudienceDefinition>) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/${audienceKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AudienceDefinition>;
    },

    delete: async (audienceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/${audienceKey}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ status: string; audience_key: string }>;
    },

    reload: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/audiences/reload`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ status: string; count: number }>;
    },
  };

  // ============================================================================
  // Functions Endpoints (from analyzer-v2)
  // ============================================================================

  functions = {
    list: async (params?: {
      category?: string;
      tier?: string;
      project?: string;
      track?: string;
      search?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, String(value));
        });
      }
      const query = queryParams.toString();
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<FunctionSummary[]>;
    },

    get: async (functionKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions/${functionKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<FunctionDefinition>;
    },

    getCategories: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions/categories`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ categories: Record<string, number> }>;
    },

    getProjects: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions/projects`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<string[]>;
    },

    getPrompts: async (functionKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions/${functionKey}/prompts`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        function_key: string;
        function_name: string;
        prompt_count: number;
        prompts: PromptTemplate[];
      }>;
    },

    getImplementations: async (functionKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/functions/${functionKey}/implementations`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        function_key: string;
        function_name: string;
        implementation_count: number;
        implementations: FunctionImplementation[];
      }>;
    },
  };

  // ============================================================================
  // Stats Endpoint
  // ============================================================================

  stats = {
    get: () =>
      this.get<{
        engines: { total: number; active: number };
        paradigms: { total: number; active: number };
        pipelines: { total: number; active: number };
        consumers: { total: number; registered: number };
      }>('/stats'),
  };

  // ============================================================================
  // Styles Endpoints (from analyzer-v2)
  // ============================================================================

  styles = {
    /**
     * List all style schools with summaries.
     * Calls analyzer-v2 directly.
     */
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<StyleSummary[]>;
    },

    /**
     * Get full style guide by key.
     */
    get: async (styleKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/schools/${styleKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<StyleGuide>;
    },

    /**
     * Get all engine-style affinity mappings.
     */
    getEngineAffinities: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/affinities/engine`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AffinitySet>;
    },

    /**
     * Get all format-style affinity mappings.
     */
    getFormatAffinities: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/affinities/format`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AffinitySet>;
    },

    /**
     * Get all audience-style affinity mappings.
     */
    getAudienceAffinities: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/affinities/audience`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AffinitySet>;
    },

    /**
     * Get all engines with their style mappings (for UI display).
     */
    getEngineMappings: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/engine-mappings`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<EngineStyleMapping[]>;
    },

    /**
     * Get style mapping for a specific engine.
     */
    getEngineMapping: async (engineKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/engine-mappings/${engineKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<EngineStyleMapping>;
    },

    /**
     * Get registry stats.
     */
    getStats: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/styles/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        styles_loaded: number;
        engine_affinities: number;
        format_affinities: number;
        audience_affinities: number;
      }>;
    },
  };

  // ============================================================================
  // Primitives Endpoints (from analyzer-v2)
  // ============================================================================

  primitives = {
    /**
     * List all analytical primitives.
     */
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<PrimitiveSummary[]>;
    },

    /**
     * Get all primitives with full details.
     */
    getAll: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/all`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AnalyticalPrimitive[]>;
    },

    /**
     * Get a specific primitive.
     */
    get: async (key: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/${key}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AnalyticalPrimitive>;
    },

    /**
     * Get primitives for an engine.
     */
    getForEngine: async (engineKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/for-engine/${engineKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<AnalyticalPrimitive[]>;
    },

    /**
     * Get Gemini guidance for an engine.
     */
    getGuidance: async (engineKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/for-engine/${engineKey}/guidance`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        engine_key: string;
        has_guidance: boolean;
        primitive_count: number;
        primitive_keys: string[];
        gemini_guidance: string | null;
      }>;
    },

    /**
     * Get engine-primitive mappings.
     */
    getEngineMappings: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/engine-mappings`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<EnginePrimitiveMapping[]>;
    },

    /**
     * Get stats.
     */
    getStats: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/primitives/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        primitives_loaded: number;
        engines_with_primitives: number;
        total_associations: number;
      }>;
    },
  };

  // ============================================================================
  // Display Endpoints (from analyzer-v2)
  // ============================================================================

  display = {
    /**
     * Get complete display configuration.
     */
    getConfig: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<DisplayConfig>;
    },

    /**
     * Get display instructions for Gemini.
     */
    getInstructions: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/instructions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<DisplayInstructions>;
    },

    /**
     * Get display instructions as plain text.
     */
    getInstructionsText: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/instructions/text`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ text: string }>;
    },

    /**
     * Get hidden fields configuration.
     */
    getHiddenFields: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/hidden-fields`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        hidden_fields: string[];
        hidden_suffixes: string[];
      }>;
    },

    /**
     * Check if a field should be hidden.
     */
    checkField: async (fieldName: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/check-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_name: fieldName }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        field_name: string;
        should_hide: boolean;
      }>;
    },

    /**
     * Convert numeric value to descriptive label.
     */
    getNumericLabel: async (value: number) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/numeric-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        value: number;
        label: string;
      }>;
    },

    /**
     * List all visual format categories.
     */
    listFormatCategories: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/formats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<CategorySummary[]>;
    },

    /**
     * List all visual formats.
     */
    listAllFormats: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/formats/all`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<FormatSummary[]>;
    },

    /**
     * Get a specific format category.
     */
    getFormatCategory: async (categoryKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/formats/category/${categoryKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<VisualFormatCategory>;
    },

    /**
     * Get a specific format.
     */
    getFormat: async (formatKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/formats/${formatKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<VisualFormat>;
    },

    /**
     * Get the prompt pattern for a format.
     */
    getFormatPrompt: async (formatKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/formats/${formatKey}/prompt`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        format_key: string;
        format_name: string;
        prompt_pattern: string;
        example_prompt: string | null;
        has_example: boolean;
      }>;
    },

    /**
     * List all data type mappings.
     */
    listDataMappings: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/mappings`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<DataTypeMapping[]>;
    },

    /**
     * Get format recommendation for a data type.
     */
    getMappingForDataType: async (dataType: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/mappings/for-data-type?data_type=${encodeURIComponent(dataType)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        data_type: string;
        found: boolean;
        primary_format: string | null;
        secondary_formats: string[];
        avoid: string[];
      }>;
    },

    /**
     * Get quality criteria for visualizations.
     */
    getQualityCriteria: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/quality-criteria`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        must_have: string[];
        should_have: string[];
        avoid: string[];
      }>;
    },

    /**
     * Get display stats.
     */
    getStats: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/display/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{
        hidden_fields_count: number;
        hidden_suffixes_count: number;
        format_categories: number;
        total_formats: number;
        data_mappings: number;
      }>;
    },
  };

  // ============================================================================
  // Rhetoric API
  // ============================================================================

  rhetoric = {
    /**
     * List all rhetoric analyzers with optional filtering.
     */
    list: async (params?: {
      category?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.set('category', params.category);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.search) queryParams.set('search', params.search);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());
      const query = queryParams.toString();
      return this.get<{
        rhetoric: import('@/types').RhetoricSummary[];
        total: number;
        limit: number;
        offset: number;
      }>(`/rhetoric${query ? `?${query}` : ''}`);
    },

    /**
     * Get category counts.
     */
    getCategories: async () => {
      return this.get<{ categories: Record<string, number> }>('/rhetoric/categories');
    },

    /**
     * Get a single rhetoric analyzer by key.
     */
    get: async (rhetricKey: string) => {
      return this.get<import('@/types').Rhetoric>(`/rhetoric/${rhetricKey}`);
    },

    /**
     * Get version history for a rhetoric analyzer.
     */
    getVersions: async (rhetricKey: string) => {
      return this.get<{
        rhetoric_key: string;
        current_version: number;
        versions: import('@/types').RhetoricVersion[];
      }>(`/rhetoric/${rhetricKey}/versions`);
    },

    /**
     * Get rendered prompt with context parameters.
     */
    getPrompt: async (
      rhetricKey: string,
      context?: {
        subject_author?: string;
        critique_author?: string;
        response_author?: string;
        user_author?: string;
        subject_work?: string;
        critique_work?: string;
        response_work?: string;
      }
    ) => {
      const queryParams = new URLSearchParams();
      if (context?.subject_author) queryParams.set('subject_author', context.subject_author);
      if (context?.critique_author) queryParams.set('critique_author', context.critique_author);
      if (context?.response_author) queryParams.set('response_author', context.response_author);
      if (context?.user_author) queryParams.set('user_author', context.user_author);
      if (context?.subject_work) queryParams.set('subject_work', context.subject_work);
      if (context?.critique_work) queryParams.set('critique_work', context.critique_work);
      if (context?.response_work) queryParams.set('response_work', context.response_work);
      const query = queryParams.toString();
      return this.get<{
        rhetoric_key: string;
        name: string;
        category: string;
        rendered_prompt: string;
        context_used: Record<string, string>;
        document_requirements: string[];
        model: string;
        thinking_budget: number;
        max_tokens: number;
      }>(`/rhetoric/${rhetricKey}/prompt${query ? `?${query}` : ''}`);
    },

    /**
     * Update a rhetoric analyzer.
     */
    update: async (rhetricKey: string, data: import('@/types').RhetoricUpdate) => {
      return this.put<import('@/types').Rhetoric>(`/rhetoric/${rhetricKey}`, data);
    },

    /**
     * Create a new rhetoric analyzer.
     */
    create: async (data: import('@/types').RhetoricCreate) => {
      return this.post<import('@/types').Rhetoric>('/rhetoric', data);
    },

    /**
     * Restore a previous version.
     */
    restore: async (rhetricKey: string, version: number) => {
      return this.post<import('@/types').Rhetoric>(`/rhetoric/${rhetricKey}/restore/${version}`, {});
    },
  };

  // ============================================================================
  // Views Endpoints (from analyzer-v2)
  // ============================================================================

  views = {
    list: async (params?: { app?: string; page?: string }) => {
      const qp = new URLSearchParams();
      if (params?.app) qp.set('app', params.app);
      if (params?.page) qp.set('page', params.page);
      const q = qp.toString();
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views${q ? `?${q}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').ViewSummary[]>;
    },

    get: async (viewKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views/${viewKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').ViewDefinition>;
    },

    create: async (data: import('@/types').ViewDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').ViewDefinition>;
    },

    update: async (viewKey: string, data: import('@/types').ViewDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views/${viewKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').ViewDefinition>;
    },

    delete: async (viewKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views/${viewKey}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ deleted: string }>;
    },

    forWorkflow: async (workflowKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views/for-workflow/${workflowKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').ViewSummary[]>;
    },

    reload: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/views/reload`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ reloaded: boolean; count: number }>;
    },
  };

  // ============================================================================
  // Renderers Endpoints (from analyzer-v2)
  // ============================================================================

  renderers = {
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').RendererSummary[]>;
    },

    get: async (rendererKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/${rendererKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').RendererDefinition>;
    },

    create: async (data: import('@/types').RendererDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').RendererDefinition>;
    },

    update: async (rendererKey: string, data: import('@/types').RendererDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/${rendererKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').RendererDefinition>;
    },

    delete: async (rendererKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/${rendererKey}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ deleted: string }>;
    },

    forStance: async (stanceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/for-stance/${stanceKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').RendererSummary[]>;
    },

    forApp: async (app: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/for-app/${app}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').RendererSummary[]>;
    },

    forPrimitive: async (primitiveKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/for-primitive/${primitiveKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').RendererSummary[]>;
    },

    recommend: async (context: import('@/types').RendererRecommendRequest) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/renderers/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').RendererRecommendResponse>;
    },
  };

  // ============================================================================
  // Sub-Renderers Endpoints (from analyzer-v2)
  // ============================================================================

  subRenderers = {
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').SubRendererSummary[]>;
    },

    get: async (key: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers/${key}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').SubRendererDefinition>;
    },

    create: async (data: import('@/types').SubRendererDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').SubRendererDefinition>;
    },

    update: async (key: string, data: import('@/types').SubRendererDefinition) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<import('@/types').SubRendererDefinition>;
    },

    delete: async (key: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers/${key}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ deleted: string }>;
    },

    forParent: async (rendererType: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/sub-renderers/for-parent/${rendererType}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').SubRendererSummary[]>;
    },
  };

  // ============================================================================
  // Transformations Endpoints (from analyzer-v2)
  // ============================================================================

  transformations = {
    list: async (params?: { type?: string; tag?: string }) => {
      const qp = new URLSearchParams();
      if (params?.type) qp.set('type', params.type);
      if (params?.tag) qp.set('tag', params.tag);
      const q = qp.toString();
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations${q ? `?${q}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationTemplateSummary[]>;
    },

    get: async (templateKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/${templateKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationTemplate>;
    },

    create: async (data: TransformationTemplate) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<TransformationTemplate>;
    },

    update: async (templateKey: string, data: TransformationTemplate) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/${templateKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${response.status}`);
      }
      return response.json() as Promise<TransformationTemplate>;
    },

    delete: async (templateKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/${templateKey}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ deleted: string }>;
    },

    forEngine: async (engineKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/for-engine/${engineKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationTemplateSummary[]>;
    },

    forRenderer: async (rendererType: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/for-renderer/${rendererType}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationTemplateSummary[]>;
    },

    forPrimitive: async (primitiveKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/for-primitive/${primitiveKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationTemplateSummary[]>;
    },

    execute: async (request: TransformationExecuteRequest) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<TransformationExecuteResponse>;
    },

    reload: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/transformations/reload`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ reloaded: boolean; count: number }>;
    },
  };

  // ============================================================================
  // Stances Endpoints (from analyzer-v2)
  // ============================================================================

  stances = {
    /**
     * List all analytical stances (summaries).
     * Calls analyzer-v2 directly.
     */
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operations/stances`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').StanceSummaryType[]>;
    },

    /**
     * List all stances with full prose descriptions.
     */
    listFull: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operations/stances/full`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').AnalyticalStanceType[]>;
    },

    /**
     * Get a single stance by key.
     */
    get: async (key: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operations/stances/${key}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').AnalyticalStanceType>;
    },

    /**
     * Get just the stance prose text.
     */
    getText: async (key: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operations/stances/${key}/text`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<string>;
    },

    /**
     * Get stances by typical position (early/middle/late).
     */
    getByPosition: async (position: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operations/stances/position/${position}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').StanceSummaryType[]>;
    },
  };

  // ============================================================================
  // Operationalizations Endpoints (from analyzer-v2)
  // ============================================================================

  operationalizations = {
    list: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').OperationalizationSummary[]>;
    },

    get: async (engineKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').EngineOperationalization>;
    },

    getCoverage: async () => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/coverage`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').CoverageMatrix>;
    },

    getStanceOp: async (engineKey: string, stanceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}/stances/${stanceKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').StanceOperationalization>;
    },

    getDepthSequence: async (engineKey: string, depthKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}/depths/${depthKey}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').DepthSequence>;
    },

    updateStanceOp: async (engineKey: string, stanceKey: string, data: import('@/types').StanceOperationalization) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}/stances/${stanceKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').StanceOperationalization>;
    },

    updateDepthSequence: async (engineKey: string, depthKey: string, data: import('@/types').DepthSequence) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}/depths/${depthKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').DepthSequence>;
    },

    composePreview: async (engineKey: string, depthKey: string, passNumber: number) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}/compose-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth_key: depthKey, pass_number: passNumber }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    generate: async (engineKey: string, stanceKey: string) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/llm/operationalization-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine_key: engineKey, stance_key: stanceKey }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    generateAll: async (engineKey: string, stanceKeys?: string[]) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/llm/operationalization-generate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine_key: engineKey, stance_keys: stanceKeys }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    update: async (engineKey: string, data: import('@/types').EngineOperationalization) => {
      const response = await fetch(`${ANALYZER_V2_URL}/v1/operationalizations/${engineKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<import('@/types').EngineOperationalization>;
    },
  };
}

// Types for Display API
interface DisplayConfig {
  instructions: DisplayInstructions;
  hidden_fields: {
    hidden_fields: string[];
    hidden_suffixes: string[];
  };
  numeric_rules: Array<{ min_value: number; max_value: number; label: string }>;
  acronyms: string[];
}

interface DisplayInstructions {
  branding_rules: string;
  label_formatting: string;
  numeric_display: string;
  field_cleanup: string;
  full_text: string;
}

interface CategorySummary {
  key: string;
  name: string;
  description: string;
  format_count: number;
}

interface FormatSummary {
  key: string;
  name: string;
  data_structure: string;
  use_when: string;
}

interface VisualFormatCategory {
  key: string;
  name: string;
  description: string;
  formats: VisualFormat[];
}

interface VisualFormat {
  key: string;
  name: string;
  data_structure: string;
  use_when: string;
  gemini_prompt_pattern: string;
  example_prompt?: string;
}

interface DataTypeMapping {
  data_type: string;
  primary_format: string;
  secondary_formats: string[];
  avoid: string[];
}

// Export singleton instance
export const api = new ApiClient(API_BASE);
