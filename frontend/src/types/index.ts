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
  | 'scholarly'
  | 'vulnerability'
  | 'outline';

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
// Engine Profile Types (About Section)
// ============================================================================

export interface TheoreticalFoundation {
  name: string;
  description: string;
  source_thinker?: string;
}

export interface KeyThinker {
  name: string;
  contribution: string;
  works?: string[];
}

export interface Methodology {
  approach: string;
  key_moves: string[];
  conceptual_tools: string[];
}

export interface EngineExtracts {
  primary_outputs: string[];
  secondary_outputs: string[];
  relationships: string[];
}

export interface UseCase {
  domain: string;
  description: string;
  example?: string;
}

export interface RelatedEngine {
  engine_key: string;
  relationship: 'complementary' | 'alternative' | 'prerequisite' | 'extends';
}

export interface EngineProfile {
  theoretical_foundations: TheoreticalFoundation[];
  key_thinkers: KeyThinker[];
  methodology?: Methodology;
  extracts?: EngineExtracts;
  use_cases: UseCase[];
  strengths: string[];
  limitations: string[];
  related_engines: RelatedEngine[];
  preamble: string;
}

export interface EngineProfileResponse {
  engine_key: string;
  engine_name: string;
  has_profile: boolean;
  profile: EngineProfile | null;
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
  function?: string;
  status: EngineStatus;
  engine_profile?: EngineProfile;
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
  has_stage_context?: boolean;  // Indicates if engine uses stage_context
  has_profile?: boolean;        // Indicates if engine has rich profile/about section
  apps?: string[];              // Apps that use this engine (e.g., 'critic')
  function?: string;              // Primary function/role (e.g., 'genealogy')
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
// Workflow Types (from analyzer-v2)
// ============================================================================

export type WorkflowCategory =
  | 'synthesis'
  | 'influence'
  | 'outline'
  | 'analysis'
  | 'genealogy'
  | 'decision_support';

export interface WorkflowPhase {
  phase_number: number;
  phase_name: string;
  phase_description: string;
  engine_key: string | null;
  function_key: string | null;
  chain_key: string | null;
  context_parameters: Record<string, string> | null;
  prompt_template: string | null;
  requires_external_docs: boolean;
  caches_result: boolean;
  depends_on_phases: number[];
  output_schema: Record<string, unknown> | null;
}

/** @deprecated Use WorkflowPhase instead */
export type WorkflowPass = WorkflowPhase;

export interface Workflow {
  workflow_key: string;
  workflow_name: string;
  description: string;
  category: WorkflowCategory;
  version: number;
  phases: WorkflowPhase[];
  required_inputs: string[];
  optional_inputs: string[];
  output_description: string;
  final_output_schema: Record<string, unknown> | null;
  estimated_phases: number;
  source_project: string;
}

export interface WorkflowSummary {
  workflow_key: string;
  workflow_name: string;
  description: string;
  category: WorkflowCategory;
  version: number;
  phase_count: number;
  source_project: string;
  required_inputs: string[];
}

// ============================================================================
// Extension Points Types (from analyzer-v2)
// ============================================================================

export interface DimensionCoverage {
  dimension_key: string;
  dimension_description: string;
  covered_by: string[];
  gap_engines: string[];
  coverage_ratio: number;
}

export interface CapabilityGap {
  capability_key: string;
  capability_description: string;
  available_in: string[];
  relevance_score: number;
}

export interface CandidateEngine {
  engine_key: string;
  engine_name: string;
  category: string;
  kind: string;
  synergy_score: number;
  dimension_production_score: number;
  dimension_novelty_score: number;
  category_affinity_score: number;
  capability_gap_score: number;
  composite_score: number;
  recommendation_tier: 'strong' | 'moderate' | 'exploratory';
  rationale: string[];
  synergy_with: string[];
  dimensions_added: string[];
  capabilities_added: string[];
  potential_issues: string[];
  has_full_composability: boolean;
}

export interface PhaseExtensionPoint {
  phase_number: number;
  phase_name: string;
  current_engines: string[];
  current_chain_key: string | null;
  dimension_coverage: DimensionCoverage[];
  capability_gaps: CapabilityGap[];
  candidate_engines: CandidateEngine[];
  extension_potential: 'high' | 'moderate' | 'low';
  summary: string;
}

export interface WorkflowExtensionAnalysis {
  workflow_key: string;
  workflow_name: string;
  depth: string;
  analysis_timestamp: string;
  phase_extensions: PhaseExtensionPoint[];
  total_candidate_engines: number;
  strong_recommendations: number;
  underserved_dimensions: string[];
  workflow_summary: string;
}

export interface AddEngineResponse {
  status: string;
  workflow_key: string;
  phase_number: number;
  engine_key: string;
  chain_key: string;
  chain_engine_keys: string[];
  created_new_chain: boolean;
  chain_description: string;
  phase_description: string;
  git_committed: boolean;
  commit_sha: string | null;
  cascaded_workflows: string[];
}

// ============================================================================
// Engine Chain Types (from analyzer-v2)
// ============================================================================

export type ChainBlendMode = 'sequential' | 'parallel' | 'merge' | 'llm_selection';

export interface EngineChainSpec {
  chain_key: string;
  chain_name: string;
  description: string;
  version: number;
  engine_keys: string[];
  blend_mode: ChainBlendMode;
  selection_criteria: string | null;
  max_engines: number;
  merge_strategy: string | null;
  pass_context: boolean;
  category: string | null;
  context_parameter_schema: Record<string, unknown> | null;
  recommended_for: string[];
}

export interface ChainSummary {
  chain_key: string;
  chain_name: string;
  description: string;
  blend_mode: ChainBlendMode;
  engine_count: number;
  category: string | null;
  has_context_parameters: boolean;
}

export interface ChainViewInfo {
  view_key: string;
  view_name: string;
  description: string;
  target_app: string;
  target_page: string;
  renderer_type: string;
  presentation_stance: string | null;
  position: number;
  parent_view_key: string | null;
  sections_count: number;
  has_sub_renderers: boolean;
  config_hints: string[];
  source_chain_key: string | null;
  source_engine_key: string | null;
  source_scope: string;
  source_type: string;
  sub_renderers_used: string[];
  children: ChainViewInfo[];
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
// Grid Types
// ============================================================================

export interface GridDimension {
  name: string;
  description: string;
  added_version: number;
}

export interface Grid {
  id: string;
  grid_key: string;
  grid_name: string;
  description: string;
  about: string;
  track: 'ideas' | 'process';
  conditions: GridDimension[];
  axes: GridDimension[];
  version: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface GridSummary {
  grid_key: string;
  grid_name: string;
  track: 'ideas' | 'process';
  condition_count: number;
  axis_count: number;
  version: number;
  status: string;
}

export interface GridDimensions {
  grid_key: string;
  version: number;
  conditions: string[];
  axes: string[];
  dimension_hash: string;
}

export interface GridVersion {
  id: string;
  grid_id: string;
  version: number;
  full_snapshot: Grid;
  change_summary?: string;
  created_at?: string;
}

export type WildcardStatus = 'suggested' | 'review' | 'promoted' | 'rejected';
export type WildcardScope = 'universal' | 'project_specific';

export interface WildcardSuggestion {
  id: string;
  grid_id: string;
  dimension_type: 'condition' | 'axis';
  name: string;
  description: string;
  rationale: string;
  confidence: number;
  scope: WildcardScope;
  source_project?: string;
  source_session_id?: string;
  evidence_questions?: number[];
  status: WildcardStatus;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Style Types (from analyzer-v2)
// ============================================================================

export type StyleSchool =
  | 'tufte'
  | 'nyt_cox'
  | 'ft_burn_murdoch'
  | 'lupi_data_humanism'
  | 'stefaner_truth_beauty'
  | 'activist_agitprop';

export interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  background: string;
  text: string;
  accent_alt?: string;
  highlight?: string;
  muted?: string;
  positive?: string;
  negative?: string;
  series_palette?: string[];
}

export interface Typography {
  primary_font: string;
  title_font: string;
  caption_font: string;
  number_font: string;
  title_size: string;
  label_size: string;
  annotation_size: string;
  line_height: string;
  title_weight: string;
}

export interface StyleGuide {
  key: StyleSchool;
  name: string;
  philosophy: string;
  color_palette: ColorPalette;
  typography: Typography;
  layout_principles: string[];
  annotation_style: string;
  gemini_modifiers: string;
  best_for: string[];
  avoid_for: string[];
  practitioners?: string[];
  references?: string[];
}

export interface StyleSummary {
  key: StyleSchool;
  name: string;
  philosophy_summary: string;
  color_preview: {
    primary: string;
    accent: string;
    background: string;
  };
  best_for_summary: string[];
}

export interface AffinitySet {
  category: string;
  affinities: Record<string, StyleSchool[]>;
  default: StyleSchool[];
}

export interface EngineStyleMapping {
  engine_key: string;
  engine_name: string;
  style_affinities: StyleSchool[];
  has_semantic_intent: boolean;
  recommended_visual_patterns: string[];
}

// ============================================================================
// Design Token Types (from analyzer-v2 token generation)
// ============================================================================

export interface SemanticTriple {
  bg: string;
  text: string;
  border: string;
}

export interface CategoricalItem {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export interface DesignTokenSet {
  school_key: string;
  school_name: string;
  generated_at: string;
  version: string;
  primitives: Record<string, unknown>;
  surfaces: Record<string, string>;
  scales: Record<string, string>;
  semantic: Record<string, SemanticTriple>;
  categorical: Record<string, CategoricalItem>;
  components: Record<string, string>;
}

// ============================================================================
// Primitive Types (from analyzer-v2)
// ============================================================================

export interface AnalyticalPrimitive {
  key: string;
  name: string;
  description: string;
  visual_hint: string;
  visual_forms: string[];
  style_hint: string;
  style_leanings: string[];
  gemini_guidance: string;
  associated_engines: string[];
}

export interface PrimitiveSummary {
  key: string;
  name: string;
  description: string;
  engine_count: number;
  visual_forms_preview: string[];
}

export interface EnginePrimitiveMapping {
  engine_key: string;
  engine_name: string;
  primitives: string[];
  has_primitive: boolean;
}

// ============================================================================
// Rhetoric Types
// ============================================================================

export type RhetoricCategory = 'rhetoric' | 'vulnerability';
export type RhetoricStatus = 'active' | 'draft' | 'deprecated' | 'archived';

export interface Rhetoric {
  id: string;
  rhetoric_key: string;
  name: string;
  description: string;
  version: number;
  category: RhetoricCategory;
  prompt_template: string;
  output_schema: Record<string, unknown> | null;
  requires_subject: boolean;
  requires_critique: boolean;
  requires_response: boolean;
  requires_counter_response: boolean;
  model: string;
  thinking_budget: number;
  max_tokens: number;
  status: RhetoricStatus;
  created_at?: string;
  updated_at?: string;
}

export interface RhetoricSummary {
  rhetoric_key: string;
  name: string;
  description: string;
  version: number;
  category: RhetoricCategory;
  status: RhetoricStatus;
  document_requirements: string[];
  model: string;
  thinking_budget: number;
}

export interface RhetoricVersion {
  id: string;
  rhetoric_id: string;
  version: number;
  full_snapshot: Rhetoric;
  change_summary?: string;
  changed_by?: string;
  created_at?: string;
}

export interface RhetoricUpdate {
  name?: string;
  description?: string;
  category?: RhetoricCategory;
  prompt_template?: string;
  output_schema?: Record<string, unknown> | null;
  requires_subject?: boolean;
  requires_critique?: boolean;
  requires_response?: boolean;
  requires_counter_response?: boolean;
  model?: string;
  thinking_budget?: number;
  max_tokens?: number;
  status?: RhetoricStatus;
  change_summary?: string;
}

export interface RhetoricCreate {
  rhetoric_key: string;
  name: string;
  description: string;
  category: RhetoricCategory;
  prompt_template: string;
  output_schema?: Record<string, unknown> | null;
  requires_subject?: boolean;
  requires_critique?: boolean;
  requires_response?: boolean;
  requires_counter_response?: boolean;
  model?: string;
  thinking_budget?: number;
  max_tokens?: number;
}

// ============================================================================
// Function Types (from analyzer-v2)
// ============================================================================

export type FunctionCategory =
  | 'coordination'
  | 'generation'
  | 'analysis'
  | 'synthesis'
  | 'tool'
  | 'infrastructure';

export type FunctionTier = 'strategic' | 'tactical' | 'lightweight';

export type InvocationPattern =
  | 'every_question'
  | 'periodic'
  | 'on_demand'
  | 'once_per_session'
  | 'per_vector';

export interface PromptTemplate {
  role: string;
  template_text: string;
  variables: string[];
  notes: string;
}

export interface ModelConfigSpec {
  model: string;
  max_tokens: number;
  thinking_budget: number | null;
  streaming: boolean;
  temperature: number | null;
}

export interface IOContract {
  input_description: string;
  output_description: string;
  input_schema: Record<string, unknown> | null;
  output_schema: Record<string, unknown> | null;
}

export interface FunctionImplementation {
  project: string;
  file_path: string;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  repo_url: string | null;
  is_primary: boolean;
  description: string;
}

export interface FunctionDefinition {
  function_key: string;
  function_name: string;
  description: string;
  version: number;
  category: FunctionCategory;
  tier: FunctionTier;
  invocation_pattern: InvocationPattern;
  model_config_spec: ModelConfigSpec;
  prompt_templates: PromptTemplate[];
  io_contract: IOContract;
  implementations: FunctionImplementation[];
  source_projects: string[];
  depends_on_functions: string[];
  feeds_into_functions: string[];
  track: string | null;
  tags: string[];
  notes: string;
}

export interface FunctionSummary {
  function_key: string;
  function_name: string;
  description: string;
  category: FunctionCategory;
  tier: FunctionTier;
  invocation_pattern: InvocationPattern;
  source_projects: string[];
  implementation_count: number;
  track: string | null;
  tags: string[];
}

// ============================================================================
// Analytical Stance Types (from analyzer-v2)
// ============================================================================

export interface AnalyticalStanceType {
  key: string;
  name: string;
  stance: string;
  cognitive_mode: string;
  typical_position: string;
  pairs_well_with: string[];
}

export interface StanceSummaryType {
  key: string;
  name: string;
  cognitive_mode: string;
  typical_position: string;
}

// ============================================================================
// Operationalization Types (bridge between stances and engines)
// ============================================================================

export interface StanceOperationalization {
  stance_key: string;
  label: string;
  description: string;
  focus_dimensions: string[];
  focus_capabilities: string[];
}

export interface DepthPassEntry {
  pass_number: number;
  stance_key: string;
  consumes_from: number[];
}

export interface DepthSequence {
  depth_key: string;
  passes: DepthPassEntry[];
}

export interface EngineOperationalization {
  engine_key: string;
  engine_name: string;
  stance_operationalizations: StanceOperationalization[];
  depth_sequences: DepthSequence[];
}

export interface OperationalizationSummary {
  engine_key: string;
  engine_name: string;
  stance_count: number;
  depth_count: number;
  stance_keys: string[];
  depth_keys: string[];
}

export interface CoverageEntry {
  engine_key: string;
  engine_name: string;
  has_operationalization: boolean;
  stance_keys: string[];
}

export interface CoverageMatrix {
  all_stance_keys: string[];
  engines: CoverageEntry[];
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

// ============================================================================
// Audience Types
// ============================================================================

export interface AudienceIdentity {
  core_questions: string[];
  priorities: string[];
  deprioritize: string[];
  detail_level: string;
}

export interface EngineAffinities {
  preferred_categories: string[];
  high_affinity_engines: string[];
  low_affinity_engines: string[];
  category_weights: Record<string, number>;
}

export interface VisualStyleConfig {
  style_preference: string;
  aesthetic: string;
  color_palette: string;
  typography: string;
  layout: string;
  visual_elements: string;
  information_density: string;
  emotional_tone: string;
  key_principle: string;
  style_affinities: string[];
}

export interface TextualStyleConfig {
  voice: string;
  structure: string;
  evidence_handling: string;
  sentence_style: string;
  what_to_emphasize: string;
  what_to_avoid: string;
  word_count_guidance: string;
  opening_style: string;
  key_principle: string;
}

export interface CurationGuidanceConfig {
  curation_emphasis: string;
  fidelity_constraint: string;
}

export interface StrategistGuidanceConfig {
  num_visualizations: string;
  visualization_complexity: string;
  table_purposes: string[];
  table_differentiation: string;
  narrative_focus: string;
  what_matters_most: string;
  what_to_avoid_in_strategy: string;
}

export interface PatternDiscoveryConfig {
  pattern_types_priority: string[];
  meta_insight_focus: string;
  what_counts_as_significant: string;
  surprise_definition: string;
}

export interface VocabularyConfig {
  translations: Record<string, string>;
  guidance_intro: string;
  guidance_outro: string;
}

export interface AudienceDefinition {
  audience_key: string;
  audience_name: string;
  description: string;
  version: number;
  status: string;
  identity: AudienceIdentity;
  engine_affinities: EngineAffinities;
  visual_style: VisualStyleConfig;
  textual_style: TextualStyleConfig;
  curation: CurationGuidanceConfig;
  strategist: StrategistGuidanceConfig;
  pattern_discovery: PatternDiscoveryConfig;
  vocabulary: VocabularyConfig;
}

export interface AudienceSummary {
  audience_key: string;
  audience_name: string;
  description: string;
  detail_level: string;
  style_preference: string;
  engine_affinity_count: number;
  vocabulary_term_count: number;
  status: string;
}

// ============================================================================
// Capability Engine Definition Types (v2 prose-mode engine definitions)
// ============================================================================

export interface AnalyticalDimension {
  key: string;
  description: string;
  probing_questions: string[];
  depth_guidance: Record<string, string>;  // surface/standard/deep → guidance text
}

export interface CapabilityGrounding {
  thinker: string;
  concept: string;
  method: string;
}

export interface EngineCapabilityItem {
  key: string;
  description: string;
  extended_description?: string;
  intellectual_grounding?: CapabilityGrounding;
  indicators?: string[];
  depth_scaling?: Record<string, string>;  // surface/standard/deep → scaling description
  requires_dimensions: string[];
  produces_dimensions: string[];
}

export interface ComposabilitySpec {
  shares_with: Record<string, string>;
  consumes_from: Record<string, string>;
  synergy_engines: string[];
}

export interface PassDefinition {
  pass_number: number;
  label: string;
  stance: string;
  focus_dimensions: string[];
  focus_capabilities: string[];
  consumes_from: number[];
  description: string;
}

export interface DepthLevel {
  key: string;
  description: string;
  typical_passes: number;
  suitable_for: string;
  passes: PassDefinition[];
}

export interface ThinkerReference {
  name: string;
  description: string;
}

export interface TraditionEntry {
  name: string;
  description: string;
}

export interface KeyConceptEntry {
  name: string;
  definition: string;
}

export interface IntellectualLineage {
  primary: ThinkerReference | string;
  secondary: (ThinkerReference | string)[];
  traditions: (TraditionEntry | string)[];
  key_concepts: (KeyConceptEntry | string)[];
}

export interface CapabilityEngineDefinition {
  engine_key: string;
  engine_name: string;
  version: number;
  category: EngineCategory;
  kind: EngineKind;
  problematique: string;
  researcher_question: string;
  intellectual_lineage: IntellectualLineage;
  analytical_dimensions: AnalyticalDimension[];
  capabilities: EngineCapabilityItem[];
  composability: ComposabilitySpec;
  depth_levels: DepthLevel[];
  legacy_engine_key: string | null;
  apps: string[];
  paradigm_keys: string[];
}

// ============================================================================
// Capability History Types (from analyzer-v2)
// ============================================================================

export type HistoryChangeAction = 'added' | 'removed' | 'modified';

export interface CapabilityFieldChange {
  section: string;
  field: string;
  action: HistoryChangeAction;
  old_value: string | null;
  new_value: string | null;
}

export interface CapabilityHistoryEntry {
  timestamp: string;
  version: number;
  definition_hash: string;
  changes: CapabilityFieldChange[];
  summary: string;
  is_baseline: boolean;
}

export interface CapabilityHistoryResponse {
  engine_key: string;
  entry_count: number;
  entries: CapabilityHistoryEntry[];
}

// ============================================================================
// View Definition Types (from analyzer-v2)
// ============================================================================

export interface DataSourceRef {
  workflow_key?: string | null;
  phase_number?: number | null;
  engine_key?: string | null;
  chain_key?: string | null;
  result_path: string;
  scope: 'aggregated' | 'per_item';
}

export interface TransformationSpec {
  type: 'none' | 'schema_map' | 'llm_extract' | 'llm_summarize' | 'aggregate';
  field_mapping?: Record<string, string> | null;
  llm_extraction_schema?: Record<string, unknown> | null;
  llm_prompt_template?: string | null;
  stance_key?: string | null;
}

export interface ViewDefinition {
  view_key: string;
  view_name: string;
  description: string;
  version: number;
  target_app: string;
  target_page: string;
  target_section: string;
  renderer_type: string;
  renderer_config: Record<string, unknown>;
  data_source: DataSourceRef;
  secondary_sources: DataSourceRef[];
  transformation: TransformationSpec;
  presentation_stance: string | null;
  position: number;
  parent_view_key: string | null;
  tab_count_field: string | null;
  visibility: 'always' | 'if_data_exists' | 'on_demand';
  audience_overrides: Record<string, Record<string, unknown>>;
  status: string;
  tags: string[];
  source_project: string | null;
}

export interface ViewSummary {
  view_key: string;
  view_name: string;
  description: string;
  target_app: string;
  target_page: string;
  renderer_type: string;
  presentation_stance: string | null;
  position: number;
  parent_view_key: string | null;
  visibility: string;
  status: string;
  // Structural hints from renderer_config
  sections_count: number;
  has_sub_renderers: boolean;
  config_hints: string[];
}

// ============================================================================
// Renderer Types (from analyzer-v2)
// ============================================================================

export interface RendererDefinition {
  renderer_key: string;
  renderer_name: string;
  description: string;
  category: string;
  ideal_data_shapes: string[];
  input_data_schema?: Record<string, unknown> | null;
  primitive_affinities: string[];
  variants: Record<string, Record<string, unknown>>;
  stance_affinities: Record<string, number>;
  available_section_renderers: string[];
  config_schema: Record<string, unknown>;
  supported_apps: string[];
  status: string;
  tags: string[];
}

export interface RendererSummary {
  renderer_key: string;
  renderer_name: string;
  description: string;
  category: string;
  stance_affinities: Record<string, number>;
  supported_apps: string[];
  status: string;
}

// -- Renderer Recommendation Types --

export interface RendererRecommendRequest {
  view_key?: string;
  view_name?: string;
  description?: string;
  presentation_stance?: string | null;
  renderer_type?: string;
  renderer_config?: Record<string, unknown>;
  data_source?: Record<string, unknown>;
  has_children?: boolean;
  child_count?: number;
  parent_view_key?: string | null;
  target_app?: string;
  include_config_migration?: boolean;
  migrate_from?: string;
}

export interface RendererRecommendation {
  renderer_key: string;
  renderer_name: string;
  category: string;
  score: number;
  rank: number;
  reasoning: string;
  stance_fit: string;
  data_shape_fit: string;
  config_suggestions?: Record<string, unknown> | null;
  warnings: string[];
}

export interface ConfigMigrationHint {
  from_renderer: string;
  to_renderer: string;
  fields_to_add: string[];
  fields_to_remove: string[];
  fields_to_transform: Record<string, string>;
  explanation: string;
}

export interface RendererRecommendResponse {
  recommendations: RendererRecommendation[];
  best_match: string;
  config_migration?: ConfigMigrationHint | null;
  analysis_summary: string;
}

// ============================================================================
// Transformation Template Types (from analyzer-v2)
// ============================================================================

export type TransformationType = 'none' | 'schema_map' | 'llm_extract' | 'llm_summarize' | 'aggregate';

export interface AggregateConfig {
  group_by?: string | null;
  count_field?: string | null;
  sum_fields: string[];
  sort_by?: string | null;
  sort_order: string;
  limit?: number | null;
}

export interface TransformationTemplate {
  template_key: string;
  template_name: string;
  description: string;
  version: number;
  transformation_type: TransformationType;
  field_mapping?: Record<string, string> | null;
  llm_extraction_schema?: Record<string, unknown> | null;
  llm_prompt_template?: string | null;
  stance_key?: string | null;
  aggregate_config?: AggregateConfig | null;
  applicable_renderer_types: string[];
  applicable_engines: string[];
  primitive_affinities: string[];
  renderer_config_presets?: Record<string, Record<string, unknown>> | null;
  tags: string[];
  status: string;
  model: string;
  model_fallback: string;
  max_tokens: number;
  source?: string | null;
}

export interface TransformationTemplateSummary {
  template_key: string;
  template_name: string;
  description: string;
  transformation_type: TransformationType;
  applicable_renderer_types: string[];
  tags: string[];
  status: string;
}

// -- Sub-Renderer Types --

export interface SubRendererDefinition {
  sub_renderer_key: string;
  sub_renderer_name: string;
  description: string;
  category: string;
  ideal_data_shapes: string[];
  config_schema: Record<string, unknown>;
  stance_affinities: Record<string, number>;
  parent_renderer_types: string[];
  status: string;
  tags: string[];
}

export interface SubRendererSummary {
  sub_renderer_key: string;
  sub_renderer_name: string;
  description: string;
  category: string;
  ideal_data_shapes: string[];
  stance_affinities: Record<string, number>;
  parent_renderer_types: string[];
  status: string;
}

export interface TransformationExecuteRequest {
  data: unknown;
  template_key?: string;
  transformation_type?: TransformationType;
  field_mapping?: Record<string, string>;
  llm_extraction_schema?: Record<string, unknown>;
  llm_prompt_template?: string;
  stance_key?: string;
  aggregate_config?: AggregateConfig;
  cache_key?: string;
}

export interface TransformationExecuteResponse {
  success: boolean;
  data: unknown;
  error?: string | null;
  transformation_type: string;
  model_used?: string | null;
  token_count?: number | null;
  cached: boolean;
  execution_time_ms: number;
}

// ============================================================================
// Decision Trace Types (from adaptive planner)
// ============================================================================

export interface SamplingInsight {
  work_title: string;
  role: string;
  key_observations: string[];
  implications: string[];
  affinity_rationale: string;
}

export interface ObjectiveAlignmentEntry {
  goal: string;
  serving_engines: string[];
  serving_chains: string[];
  coverage_assessment: string;
}

export interface PhaseDecision {
  phase_number: number;
  phase_name: string;
  chain_or_engine: string;
  selection_rationale: string;
  depth_rationale: string;
  iteration_mode_rationale: string;
  alternatives_considered: string[];
  dependency_rationale: string;
}

export interface PerWorkDecision {
  phase_number: number;
  work_title: string;
  chain_key: string;
  rationale: string;
}

export interface CatalogCoverageEntry {
  engine_key: string;
  status: string;
  reason: string;
  used_in_phases: number[];
}

export interface PlannerDecisionTrace {
  sampling_insights: SamplingInsight[];
  objective_alignment: ObjectiveAlignmentEntry[];
  phase_decisions: PhaseDecision[];
  per_work_decisions: PerWorkDecision[];
  catalog_coverage: CatalogCoverageEntry[];
  overall_strategy_rationale: string;
}

export interface PlanSummary {
  plan_id: string;
  thinker_name: string;
  target_work_title: string;
  workflow_key: string;
  status: string;
  objective_key: string | null;
  phase_count: number;
  estimated_total_cost_usd: number;
  estimated_depth_profile: string;
  created_at: string;
}

export interface PlanDetail {
  plan_id: string;
  created_at: string;
  workflow_key: string;
  thinker_name: string;
  target_work: { title: string; author?: string; year?: number; description: string };
  prior_works: { title: string; author?: string; year?: number; description: string; relationship_hint: string }[];
  research_question: string | null;
  strategy_summary: string;
  phases: PlanPhaseSpec[];
  recommended_views: { view_key: string; priority: string; rationale: string }[];
  estimated_llm_calls: number;
  estimated_depth_profile: string;
  status: string;
  model_used: string;
  generation_tokens: number;
  objective_key: string | null;
  estimated_total_cost_usd: number;
  decision_trace: PlannerDecisionTrace | null;
}

export interface PlanPhaseSpec {
  phase_number: number;
  phase_name: string;
  skip: boolean;
  depth: string;
  chain_key: string | null;
  engine_key: string | null;
  iteration_mode: string | null;
  per_work_chain_map: Record<string, string> | null;
  depends_on: number[] | null;
  model_hint: string | null;
  requires_full_documents: boolean;
  estimated_tokens: number;
  estimated_cost_usd: number;
  rationale: string;
}
