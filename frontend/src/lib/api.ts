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
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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
    list: (params?: {
      category?: string;
      kind?: string;
      paradigm?: string;
      status?: string;
      search?: string;
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
      return this.get<{ engines: EngineSummary[]; total: number; limit: number; offset: number }>(
        `/engines${query ? `?${query}` : ''}`
      );
    },

    get: (engineKey: string) => this.get<Engine>(`/engines/${engineKey}`),

    getVersions: (engineKey: string) =>
      this.get<{ engine_key: string; current_version: number; versions: EngineVersion[] }>(
        `/engines/${engineKey}/versions`
      ),

    /**
     * Get a composed prompt for an engine.
     * If engine has stage_context, prompt is composed at runtime using templates.
     * @param engineKey - The engine key
     * @param promptType - The prompt type (extraction, curation, concretization)
     * @param audience - Target audience for vocabulary calibration
     */
    getPrompt: (
      engineKey: string,
      promptType: 'extraction' | 'curation' | 'concretization',
      audience: AudienceType = 'analyst'
    ) =>
      this.get<ComposedPromptResponse>(
        `/engines/${engineKey}/${promptType}-prompt?audience=${audience}`
      ),

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

    getCategories: () =>
      this.get<{ categories: Record<string, number> }>('/engines/categories'),

    /**
     * Get the profile/about section for an engine.
     */
    getProfile: (engineKey: string) =>
      this.get<EngineProfileResponse>(`/engines/${engineKey}/profile`),

    /**
     * Save or update the profile for an engine.
     */
    saveProfile: (engineKey: string, profile: EngineProfile) =>
      this.put<EngineProfileResponse>(`/engines/${engineKey}/profile`, profile),

    /**
     * Delete the profile for an engine.
     */
    deleteProfile: (engineKey: string) =>
      this.delete<{ status: string; engine_key: string }>(`/engines/${engineKey}/profile`),
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
}

// Export singleton instance
export const api = new ApiClient(API_BASE);
