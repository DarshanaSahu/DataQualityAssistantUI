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

export interface Rule {
  id: number;
  name: string;
  description: string;
  table_name: string;
  rule_config: {
    expectation_type: string;
    kwargs: Record<string, any>;
  };
  is_active: boolean;
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
  rule_config?: {
    expectation_type: string;
    kwargs: Record<string, any>;
  };
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

export default api; 