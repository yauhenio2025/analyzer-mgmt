/**
 * TypeScript types for Analyzer Management Console
 */

// ============================================================================
// Engine Types
// ============================================================================

export type EngineKind = 'primitive' | 'relational' | 'synthesis' | 'extraction' | 'comparison';

export type EngineCategory =
  | 'argument'
  | 'epistemology'
  | 'methodology'
  | 'systems'
  | 'concepts'
  | 'evidence'
  | 'temporal'
  | 'power'
  | 'institutional'
  | 'market'
  | 'rhetoric'
  | 'scholarly';

export type EngineStatus = 'active' | 'deprecated' | 'draft' | 'archived';

// ============================================================================
// Stage Context Types (for prompt composition)
// ============================================================================

export type AudienceType = 'researcher' | 'analyst' | 'executive' | 'activist';

export interface AudienceVocabulary {
  researcher: Record<string, string>;
  analyst: Record<string, string>;
  executive: Record<string, string>;
  activist: Record<string, string>;
}

export interface ExtractionContext {
  analysis_type: string;
  analysis_type_plural: string;
  core_question: string;
  extraction_steps: string[];
  key_fields: Record<string, string>;
  id_field: string;
  key_relationships: string[];
  special_instructions?: string;
}

export interface CurationContext {
  item_type: string;
  item_type_plural: string;
  consolidation_rules: string[];
  cross_doc_patterns: string[];
  synthesis_outputs: string[];
  special_instructions?: string;
}

export interface ConcretizationContext {
  id_examples: Array<{ from: string; to: string }>;
  naming_guidance: string;
  recommended_table_types: string[];
  recommended_visual_patterns: string[];
}

export interface StageContext {
  framework_key?: string;
  additional_frameworks: string[];
  extraction: ExtractionContext;
  curation: CurationContext;
  concretization: ConcretizationContext;
  audience_vocabulary: AudienceVocabulary;
  skip_concretization: boolean;
}

export interface ComposedPrompts {
  extraction?: string;
  curation?: string;
  concretization?: string;
}

// ============================================================================
// Engine Types
// ============================================================================

export interface Engine {
  id: string;
  engine_key: string;
  engine_name: string;
  description: string;
  version: number;
  category: EngineCategory;
  kind: EngineKind;
  reasoning_domain?: string;
  researcher_question?: string;
  // NEW: Stage context for prompt composition
  stage_context?: StageContext;
  // Legacy prompts (for backwards compatibility - may be null if using stage_context)
  extraction_prompt?: string;
  curation_prompt?: string;
  concretization_prompt?: string;
  canonical_schema: Record<string, unknown>;
  extraction_focus: string[];
  primary_output_modes: string[];
  paradigm_keys: string[];
  status: EngineStatus;
  created_at?: string;
  updated_at?: string;
}

export interface EngineSummary {
  engine_key: string;
  engine_name: string;
  description: string;
  version: number;
  category: EngineCategory;
  kind: EngineKind;
  paradigm_keys: string[];
  status: EngineStatus;
  has_stage_context?: boolean;  // NEW: Indicates if engine uses stage_context
}

export interface EngineVersion {
  id: string;
  engine_id: string;
  version: number;
  full_snapshot: Engine;
  change_summary?: string;
  changed_by?: string;
  created_at?: string;
}

// Update payload type (includes change_summary for versioning)
export type EngineUpdate = Partial<Engine> & {
  change_summary?: string;
};

// ============================================================================
// Paradigm Types
// ============================================================================

export interface FoundationalLayer {
  assumptions: string[];
  core_tensions: string[];
  scope_conditions: string[];
}

export interface StructuralLayer {
  primary_entities: string[];
  relations: string[];
  levels_of_analysis: string[];
}

export interface DynamicLayer {
  change_mechanisms: string[];
  temporal_patterns: string[];
  transformation_processes: string[];
}

export interface ExplanatoryLayer {
  key_concepts: string[];
  analytical_methods: string[];
  problem_diagnosis: string[];
  ideal_state: string[];
}

export interface TraitDefinition {
  trait_name: string;
  trait_description: string;
  trait_items: string[];
}

export interface CritiquePattern {
  pattern: string;
  diagnostic: string;
  fix: string;
}

export interface BranchMetadata {
  synthesis_prompt: string;
  additional_thinkers?: string;
  generated_at?: string;
  generation_model?: string;
  generated_fields?: string[];
  generation_errors?: Array<{ field: string; error: string }>;
}

export type GenerationStatus = 'complete' | 'generating' | 'failed';

export interface Paradigm {
  id: string;
  paradigm_key: string;
  paradigm_name: string;
  version: string;
  description: string;
  guiding_thinkers: string;
  foundational: FoundationalLayer;
  structural: StructuralLayer;
  dynamic: DynamicLayer;
  explanatory: ExplanatoryLayer;
  active_traits: string[];
  trait_definitions: TraitDefinition[];
  critique_patterns: CritiquePattern[];
  historical_context?: string;
  related_paradigms: string[];
  primary_engines: string[];
  compatible_engines: string[];
  status: string;
  // Branching fields
  parent_paradigm_key?: string;
  branch_metadata?: BranchMetadata;
  branch_depth: number;
  generation_status: GenerationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ParadigmSummary {
  paradigm_key: string;
  paradigm_name: string;
  version: string;
  description: string;
  guiding_thinkers: string;
  active_traits: string[];
  status: string;
  engine_count: number;
  // Branching fields
  parent_paradigm_key?: string;
  branch_depth: number;
  generation_status: GenerationStatus;
}

export interface LineageItem {
  paradigm_key: string;
  paradigm_name: string;
  branch_depth: number;
}

export interface BranchRequest {
  name: string;
  synthesis_prompt: string;
  additional_thinkers?: string;
}

export interface BranchResponse {
  paradigm_key: string;
  generation_status: string;
  message: string;
}

export interface BranchProgressResponse {
  paradigm_key: string;
  generation_status: GenerationStatus;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  current_layer: string | null;
  field_status: Array<{
    field: string;
    layer: string;
    status: 'complete' | 'pending';
  }>;
  branch_metadata?: BranchMetadata;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export type BlendMode = 'sequential' | 'parallel' | 'merge' | 'llm_selection';

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  stage_order: number;
  stage_name: string;
  engine_key?: string;
  sub_pipeline_id?: string;
  blend_mode?: BlendMode;
  sub_pass_engine_keys: string[];
  pass_context: boolean;
  config: Record<string, unknown>;
}

export interface Pipeline {
  id: string;
  pipeline_key: string;
  pipeline_name: string;
  description: string;
  stage_definitions: PipelineStage[];
  blend_mode: BlendMode;
  category?: string;
  status: string;
  stages: PipelineStage[];
  created_at?: string;
  updated_at?: string;
}

export interface PipelineSummary {
  pipeline_key: string;
  pipeline_name: string;
  description: string;
  blend_mode: BlendMode;
  category?: string;
  stage_count: number;
  status: string;
}

// ============================================================================
// Consumer Types
// ============================================================================

export type ConsumerType = 'service' | 'cli' | 'library';
export type UsageType = 'direct' | 'indirect' | 'optional';

export interface ConsumerDependency {
  id: string;
  consumer_id: string;
  construct_type: 'engine' | 'paradigm' | 'pipeline';
  construct_key: string;
  usage_location?: string;
  usage_type: UsageType;
  discovered_at?: string;
  last_verified?: string;
  is_active: boolean;
}

export interface Consumer {
  id: string;
  name: string;
  consumer_type: ConsumerType;
  repo_url?: string;
  webhook_url?: string;
  contact_email?: string;
  auto_update: boolean;
  dependency_count: number;
  dependencies?: ConsumerDependency[];
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Change Types
// ============================================================================

export type ChangeType = 'create' | 'update' | 'delete';
export type PropagationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type ActionTaken = 'updated' | 'ignored' | 'rollback_requested' | 'pending';

export interface ChangeNotification {
  id: string;
  change_event_id: string;
  consumer_id: string;
  notified_at?: string;
  acknowledged_at?: string;
  action_taken: ActionTaken;
  response_message?: string;
}

export interface ChangeEvent {
  id: string;
  construct_type: 'engine' | 'paradigm' | 'pipeline';
  construct_key: string;
  change_type: ChangeType;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  changed_by?: string;
  change_summary?: string;
  propagation_status: PropagationStatus;
  affected_consumers: string[];
  changed_at?: string;
  notification_count: number;
}

export interface ChangeSummary {
  id: string;
  construct_type: string;
  construct_key: string;
  change_type: ChangeType;
  changed_by?: string;
  change_summary?: string;
  propagation_status: PropagationStatus;
  changed_at?: string;
}

export interface MigrationHint {
  engine_key: string;
  change: string;
  migration_type: 'additive' | 'breaking' | 'compatible' | 'rename' | 'removal';
  consumer_action: 'none_required' | 'recommended' | 'required';
  notes: string;
  migration_script?: string;
}

// ============================================================================
// LLM Types
// ============================================================================

/**
 * A single structured suggestion from the LLM.
 * Each suggestion is a discrete, actionable item that can be edited before acceptance.
 */
export interface StructuredSuggestion {
  id: string;
  title: string;
  content: string;           // The actual text to add
  rationale: string;         // Why this is suggested
  connections?: string[];    // Related fields
  confidence: number;
  status: 'pending' | 'accepted' | 'dismissed' | 'edited';
  editedContent?: string;    // If user modifies before accepting
}

/**
 * Response from the paradigm suggestions endpoint.
 * Contains structured, parseable suggestions instead of raw markdown.
 */
export interface SuggestionResponse {
  paradigm_key: string;
  query: string;
  layer: string | null;
  field: string | null;
  suggestions: StructuredSuggestion[];
  analysis_summary: string;
}

/**
 * @deprecated Use StructuredSuggestion instead
 */
export interface ParadigmSuggestion {
  type: string;
  content: string;
  confidence: number;
}

export interface PromptImprovement {
  engine_key: string;
  prompt_type: string;
  original_prompt: string;
  improved_prompt: string;
  changes_made: string[];
  explanation: string;
}

export interface StageContextImprovement {
  engine_key: string;
  stage: string;
  field: string;
  original_value: string;
  improved_value: string;
  suggestions: string[];
  explanation: string;
}

export interface ComposedPromptResponse {
  engine_key: string;
  prompt_type: string;
  prompt: string;
  audience?: AudienceType;
  framework_used?: string;
  composed: boolean;
  skipped?: boolean;
  error?: string;
}

export interface SchemaValidation {
  engine_key: string;
  is_valid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    field: string;
    message: string;
  }>;
  impact_analysis: {
    breaking_changes: string[];
    additive_changes: string[];
    modified_fields: string[];
  };
  suggestions: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}
