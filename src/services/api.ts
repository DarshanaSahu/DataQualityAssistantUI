import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
});

// Types for API responses
export interface DatabaseConnectionResponse {
  status: string;
  message: string;
  database_url: string;
  tables: string[];
}

export interface DatabaseConnectionError {
  detail: string;
}

export interface TableSchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  character_maximum_length: number | null;
}

export interface ForeignKey {
  column_name: string;
  references_table: string;
  references_column: string;
}

export interface TableSchema {
  table_name: string;
  columns: TableSchemaColumn[];
  primary_keys: string[];
  foreign_keys: ForeignKey[];
}

export interface RuleExpectation {
  expectation_type: string;
  kwargs: Record<string, any>;
}

export interface Rule {
  id: number;
  name: string;
  description: string;
  table_name: string;
  rule_config: RuleExpectation | RuleExpectation[];
  is_active: boolean;
  is_draft?: boolean;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
  columns?: string[];
  versions?: any[];
}

export interface RuleCheckResult {
  is_outdated: boolean;
  confidence: number;
  suggestion: string;
}

export interface RuleExecutionResult {
  table_name: string;
  execution_time: string;
  total_duration: number;
  total_rules: number;
  successful_rules: number;
  failed_rules: number;
  success_rate: number;
  results: {
    rule_id: number;
    rule_name: string;
    success: boolean;
    statistics?: {
      evaluated_expectations: number;
      successful_expectations: number;
      unsuccessful_expectations: number;
      total_rows?: number;
    };
    results?: {
      expectation_type: string;
      success: boolean;
      result: {
        unexpected_values?: string[];
        element_count?: number;
        unexpected_count?: number;
        unexpected_percent?: number;
      };
      sample_rows?: Record<string, any>[];
      kwargs?: {
        column?: string;
        [key: string]: any;
      };
    }[];
    error?: string;
    execution_time: number;
  }[];
}

export interface GenerateRuleFromDescriptionRequest {
  table_name: string;
  rule_description: string;
  rule_name?: string;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  rule_config?: RuleExpectation | RuleExpectation[];
  finalize_draft?: boolean;
}

// New interfaces for suggested rules
export interface SuggestedRule {
  rule_type: string;
  column: string | null;
  columns: string[] | null;
  description: string;
  rule_config: string;
  confidence: number;
}

export interface RuleUpdateSuggestion {
  rule_id: number;
  current_config: string;
  suggested_config: string | Record<string, any>;
  reason: string;
  confidence: number;
}

export interface SuggestRulesResponse {
  table_name: string;
  new_rule_suggestions: SuggestedRule[];
  rule_update_suggestions: RuleUpdateSuggestion[];
  error: string | null;
}

export interface ApplySuggestedRulesRequest {
  table_name: string;
  new_rule_ids: number[];
  update_rule_ids: number[];
}

export interface ApplySuggestedRulesResponse {
  created_rules: Rule[];
  updated_rules: Rule[];
  errors: string[];
}

export interface ColumnStatistics {
  min_value?: number;
  max_value?: number;
  avg_value?: number;
  min_length?: number;
  max_length?: number;
  avg_length?: number;
  non_null_count: number;
  null_count: number;
}

export interface ComprehensiveTableAnalysisRequest {
  table_name: string;
  apply_suggestions: boolean;
}

export interface ComprehensiveTableAnalysisResponse {
  table_name: string;
  column_analysis: {
    columns: TableSchemaColumn[];
    sample_data: Record<string, any>[];
  };
  data_statistics: {
    row_count: number;
    column_stats: Record<string, ColumnStatistics>;
  };
  rule_suggestions: {
    new_rule_suggestions: SuggestedRule[];
    rule_update_suggestions: RuleUpdateSuggestion[];
  };
  existing_rules: Rule[];
  applied_suggestions: ApplySuggestedRulesResponse | null;
}

// API functions
export const connectDatabase = async (): Promise<DatabaseConnectionResponse> => {
  const response = await api.get('/api/v1/database/connect');
  return response.data;
};

export const listTables = async (): Promise<string[]> => {
  const response = await api.get('/api/v1/database/tables');
  return response.data;
};

export const getTableSchema = async (tableName: string): Promise<TableSchema> => {
  const response = await api.get(`/api/v1/database/tables/${tableName}/schema`);
  return response.data;
};

export const generateRules = async (tableName: string): Promise<Rule[]> => {
  const response = await api.post(`/api/v1/rules/generate?table_name=${tableName}`);
  return response.data;
};

export const checkRuleOutdated = async (ruleId: number): Promise<RuleCheckResult> => {
  const response = await api.get(`/api/v1/rules/check-outdated/${ruleId}`);
  return response.data;
};

export const executeRules = async (tableName: string, ruleIds: number[]): Promise<RuleExecutionResult> => {
  const response = await api.post('/api/v1/rules/execute', {
    table_name: tableName,
    rule_ids: ruleIds,
  });
  return response.data;
};

export const listRules = async (): Promise<Rule[]> => {
  const response = await api.get('/api/v1/rules');
  return response.data;
};

export const getRuleById = async (ruleId: number): Promise<Rule> => {
  const response = await api.get(`/api/v1/rules/${ruleId}`);
  return response.data;
};

export const generateRuleFromDescription = async (request: GenerateRuleFromDescriptionRequest): Promise<Rule> => {
  const response = await api.post('/api/v1/rules/generate-from-description', request);
  return response.data;
};

export const updateRule = async (ruleId: number, request: UpdateRuleRequest): Promise<Rule> => {
  const response = await api.put(`/api/v1/rules/${ruleId}`, request);
  return response.data;
};

export const deleteRule = async (ruleId: number): Promise<void> => {
  await api.delete(`/api/v1/rules/${ruleId}`);
};

// New API functions for suggesting and applying rules
export const suggestRules = async (tableName: string): Promise<SuggestRulesResponse> => {
  const response = await api.get(`/api/v1/tables/${tableName}/suggest-rules`);
  return response.data;
};

export const applySuggestedRules = async (request: ApplySuggestedRulesRequest): Promise<ApplySuggestedRulesResponse> => {
  const response = await api.post(`/api/v1/tables/${request.table_name}/apply-suggested-rules`, request);
  return response.data;
};

export const analyzeTable = async (request: ComprehensiveTableAnalysisRequest): Promise<ComprehensiveTableAnalysisResponse> => {
  const response = await api.post('/api/v1/analyze-table', request);
  return response.data;
};

export default api; 