import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  alpha,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Container,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api, {
  Rule,
  RuleCheckResult,
  RuleExecutionResult,
  RuleExpectation,
  generateRuleFromDescription,
  updateRule,
  deleteRule,
  UpdateRuleRequest,
  getTableSchema,
  TableSchema,
  TableSchemaColumn,
  SuggestedRule,
  RuleUpdateSuggestion,
  SuggestRulesResponse,
  suggestRules,
  applySuggestedRules,
  ApplySuggestedRulesRequest,
  ApplySuggestedRulesResponse,
  ComprehensiveTableAnalysisResponse,
  analyzeTable,
} from '../services/api';

const EXPECTATION_TYPES = [
  'expect_column_values_to_not_be_null',
  'expect_column_values_to_be_unique',
  'expect_column_values_to_be_between',
  'expect_column_values_to_be_in_set',
  'expect_column_values_to_match_regex',
  'expect_column_values_to_be_of_type',
];

interface RuleConfig {
  expectation_type: string;
  kwargs: Record<string, any>;
}

interface UpdateRuleForm {
  name: string;
  description: string;
  is_active: boolean;
  columns?: string[];
  ruleConfig?: RuleExpectation | RuleExpectation[];
}

interface SuggestedRuleResponse {
  rule_type: string;
  column: string | null;
  columns: string[] | null;
  description: string;
  rule_config: string;
  confidence: number;
}

const QualityAnalysis: React.FC = () => {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [executionResult, setExecutionResult] = useState<RuleExecutionResult | null>(null);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editForm, setEditForm] = useState<UpdateRuleForm>({
    name: '',
    description: '',
    is_active: true,
    columns: [],
  });
  const [expandedSamples, setExpandedSamples] = useState<Record<string, boolean>>({});
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  
  // New state variables for the new features
  const [suggestedRules, setSuggestedRules] = useState<SuggestRulesResponse | null>(null);
  const [selectedNewRuleIds, setSelectedNewRuleIds] = useState<number[]>([]);
  const [selectedUpdateRuleIds, setSelectedUpdateRuleIds] = useState<number[]>([]);
  const [openSuggestedRulesDialog, setOpenSuggestedRulesDialog] = useState(false);
  const [tableAnalysisResult, setTableAnalysisResult] = useState<ComprehensiveTableAnalysisResponse | null>(null);
  const [openAnalysisDialog, setOpenAnalysisDialog] = useState(false);

  const { data: rules, isLoading: isLoadingRules } = useQuery<Rule[]>({
    queryKey: ['rules', tableName],
    queryFn: async () => {
      const response = await api.get('/api/v1/rules');
      return response.data.filter((rule: Rule) => rule.table_name === tableName);
    },
  });

  const { data: schema } = useQuery<TableSchema>({
    queryKey: ['tableSchema', tableName],
    queryFn: () => getTableSchema(tableName!),
  });

  React.useEffect(() => {
    if (schema) {
      setTableSchema(schema);
    }
  }, [schema]);

  const generateRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/v1/rules/generate?table_name=${tableName}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
    },
  });

  const generateFromDescriptionMutation = useMutation({
    mutationFn: async () => {
      return generateRuleFromDescription({
        table_name: tableName!,
        rule_description: ruleDescription,
        rule_name: ruleName || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
      setOpenGenerateDialog(false);
      setRuleDescription('');
      setRuleName('');
      setGenerateError(null);
    },
    onError: (error: any) => {
      setGenerateError(error.response?.data?.detail || 'Failed to generate rule');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async () => {
      if (!editingRule) throw new Error('No rule selected for editing');
      
      const updateRequest: UpdateRuleRequest = {
        name: editForm.name,
        description: editForm.description,
        is_active: editForm.is_active,
      };
      
      if (editForm.columns && editForm.columns.length > 0) {
        // If there are multiple columns, create appropriate expectations
        if (editForm.columns.length > 1) {
          updateRequest.rule_config = [
            {
              expectation_type: "expect_column_values_to_not_be_null",
              kwargs: { column: editForm.columns[0] }
            },
            {
              expectation_type: "expect_column_values_to_not_be_null",
              kwargs: { column: editForm.columns[1] }
            },
            {
              expectation_type: "expect_column_values_to_be_greater_than_other_column",
              kwargs: { 
                column: editForm.columns[1], 
                compare_to: editForm.columns[0] 
              }
            }
          ];
        } else {
          // Single column rule
          updateRequest.rule_config = {
            expectation_type: "expect_column_values_to_not_be_null",
            kwargs: { column: editForm.columns[0] }
          };
        }
      }
      
      return updateRule(editingRule.id, updateRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
      setOpenEditDialog(false);
      setEditingRule(null);
      setEditForm({
        name: '',
        description: '',
        is_active: true,
        columns: [],
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await deleteRule(ruleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
    },
  });

  const executeRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/v1/rules/execute', {
        table_name: tableName,
        rule_ids: selectedRules,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setExecutionResult(data);
    },
  });

  const checkRuleOutdatedMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const response = await api.get(`/api/v1/rules/check-outdated/${ruleId}`);
      return response.data;
    },
  });

  // New API queries and mutations
  const suggestRulesMutation = useMutation({
    mutationFn: async () => {
      return suggestRules(tableName!);
    },
    onSuccess: (data) => {
      setSuggestedRules(data);
      setOpenSuggestedRulesDialog(true);
    },
  });

  const applySuggestedRulesMutation = useMutation({
    mutationFn: async () => {
      // Filter out any potentially invalid rule IDs before sending the request
      const validUpdateRuleIds = selectedUpdateRuleIds.filter(id => 
        suggestedRules?.rule_update_suggestions.some(rule => rule.rule_id === id) || false
      );
      
      const request: ApplySuggestedRulesRequest = {
        table_name: tableName!,
        new_rule_ids: selectedNewRuleIds,
        update_rule_ids: validUpdateRuleIds,
      };
      
      return applySuggestedRules(request);
    },
    onSuccess: (data) => {
      // Check if there were any errors
      if (data.errors && data.errors.length > 0) {
        // Show an alert with the errors
        alert(`Some errors occurred when applying rules:\n${data.errors.join('\n')}`);
      }
      
      // Still invalidate queries and reset state
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
      setOpenSuggestedRulesDialog(false);
      setSelectedNewRuleIds([]);
      setSelectedUpdateRuleIds([]);
    },
    onError: (error: any) => {
      alert(`Failed to apply suggested rules: ${error.message || 'Unknown error'}`);
    }
  });

  const analyzeTableMutation = useMutation({
    mutationFn: async (applySuggestions: boolean) => {
      return analyzeTable({
        table_name: tableName!,
        apply_suggestions: applySuggestions,
      });
    },
    onSuccess: (data) => {
      setTableAnalysisResult(data);
      setOpenAnalysisDialog(true);
      if (data.applied_suggestions) {
        queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
      }
    },
  });

  if (isLoadingRules) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const handleGenerateRules = () => {
    generateRulesMutation.mutate();
  };

  const handleGenerateFromDescription = () => {
    if (ruleDescription.trim()) {
      generateFromDescriptionMutation.mutate();
    }
  };

  const handleExecuteRules = () => {
    if (selectedRules.length > 0) {
      executeRulesMutation.mutate();
    }
  };

  const handleCheckRuleOutdated = async (ruleId: number) => {
    const result = await checkRuleOutdatedMutation.mutateAsync(ruleId);
    if (result.is_outdated) {
      alert(`Rule is outdated. Confidence: ${result.confidence}\nSuggestion: ${result.suggestion}`);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    
    // Extract columns from rule configuration
    let columns: string[] = [];
    
    if (Array.isArray(rule.rule_config)) {
      columns = rule.columns || rule.rule_config.reduce((cols, expectation) => {
        if (expectation.kwargs.column && !cols.includes(expectation.kwargs.column)) {
          cols.push(expectation.kwargs.column);
        }
        if (expectation.kwargs.compare_to && !cols.includes(expectation.kwargs.compare_to)) {
          cols.push(expectation.kwargs.compare_to);
        }
        return cols;
      }, [] as string[]);
    } else if (rule.rule_config.kwargs.column) {
      columns = [rule.rule_config.kwargs.column];
    }
    
    setEditForm({
      name: rule.name,
      description: rule.description,
      is_active: rule.is_active,
      columns,
      ruleConfig: rule.rule_config
    });
    
    setOpenEditDialog(true);
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  const toggleRuleSelection = (ruleId: number) => {
    setSelectedRules(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const toggleSampleExpand = (expectationIndex: number) => {
    setExpandedSamples(prev => ({
      ...prev,
      [expectationIndex]: !prev[expectationIndex]
    }));
  };

  const getFailingColumn = (expectation: any): string => {
    try {
      if (expectation.kwargs?.column) return expectation.kwargs.column;
      if (expectation.column) return expectation.column;
      
      const match = expectation.expectation_type.match(/expect_column_(.+)_to/);
      if (match && match[1]) return match[1];
      
      return '';
    } catch (e) {
      return '';
    }
  };

  // New event handlers for the new features
  const handleSuggestRules = () => {
    suggestRulesMutation.mutate();
  };

  const handleApplySuggestedRules = () => {
    applySuggestedRulesMutation.mutate();
  };

  const handleAnalyzeTable = (applySuggestions: boolean) => {
    analyzeTableMutation.mutate(applySuggestions);
  };

  const toggleNewRuleSelection = (index: number) => {
    setSelectedNewRuleIds((prev) => {
      if (prev.includes(index)) {
        return prev.filter((id) => id !== index);
      }
      return [...prev, index];
    });
  };

  const toggleUpdateRuleSelection = (id: number) => {
    setSelectedUpdateRuleIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((ruleId) => ruleId !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <Box>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2 
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            borderColor: alpha('#ce93d8', 0.5),
            color: '#ce93d8',
            '&:hover': {
              borderColor: '#ce93d8',
              background: alpha('#ce93d8', 0.1),
            }
          }}
        >

        </Button>
        <Typography variant="h5" sx={{ color: '#ff9800' }}>Quality Analysis - {tableName}</Typography>
      </Box>

      <Container maxWidth="xl">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 3,
              background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
              borderRadius: 8,
              border: `1px solid ${alpha('#ce93d8', 0.1)}`,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">Quality Rules</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => setOpenGenerateDialog(true)}
                    disabled={generateFromDescriptionMutation.isPending}
                    size="small"
                  >
                    Generate from Description
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={suggestRulesMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <LightbulbIcon />}
                    onClick={handleSuggestRules}
                    disabled={suggestRulesMutation.isPending}
                    size="small"
                    sx={{
                      background: 'linear-gradient(45deg, #ce93d8 30%, #ba68c8 90%)',
                      color: '#000',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #ba68c8 30%, #ab47bc 90%)',
                      }
                    }}
                  >
                    {suggestRulesMutation.isPending ? 'Suggesting...' : 'Suggest Rules'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={analyzeTableMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                    onClick={() => handleAnalyzeTable(false)}
                    disabled={analyzeTableMutation.isPending}
                    size="small"
                    sx={{
                      background: 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)',
                      color: '#000',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #f06292 30%, #ec407a 90%)',
                      }
                    }}
                  >
                    {analyzeTableMutation.isPending ? 'Analyzing...' : 'Analyze Table'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={handleGenerateRules}
                    disabled={generateRulesMutation.isPending}
                    size="small"
                  >
                    Generate Rules
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleExecuteRules}
                    disabled={selectedRules.length === 0 || executeRulesMutation.isPending}
                    size="small"
                  >
                    Execute Selected Rules
                  </Button>
                </Box>
              </Box>

              {generateRulesMutation.isPending && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Generating rules for {tableName}...
                </Alert>
              )}

              {executionResult && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Execution Results
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Success Rate: {(executionResult.success_rate * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">
                      Total Rules: {executionResult.total_rules} 
                      ({executionResult.successful_rules} succeeded, {executionResult.failed_rules} failed)
                    </Typography>
                    <Typography variant="body2">
                      Execution Time: {new Date(executionResult.execution_time).toLocaleString()}
                    </Typography>
                  </Box>
                  <Grid container spacing={1}>
                    {executionResult.results.map((result) => (
                      <Grid item xs={12} md={12} lg={12} key={result.rule_id}>
                        <Card sx={{ 
                          background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                          borderRadius: 8,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '300px',
                          overflow: 'visible'
                        }}>
                          <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {result.success ? (
                                <CheckCircleIcon color="success" />
                              ) : (
                                <ErrorIcon color="error" />
                              )}
                              <Typography variant="h6" noWrap title={result.rule_name}>
                                {result.rule_name}
                              </Typography>
                            </Box>
                            <Typography color="text.secondary" gutterBottom>
                              Rule ID: {result.rule_id}
                            </Typography>
                            <Typography color="text.secondary" gutterBottom>
                              Execution Time: {result.execution_time.toFixed(4)}s
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              {result.statistics && (
                                <>
                                  <Chip
                                    label={`Expectations: ${result.statistics?.evaluated_expectations || 0}`}
                                    size="small"
                                    sx={{ backgroundColor: alpha('#9c27b0', 0.1), color: '#9c27b0' }}
                                  />
                                  <Chip
                                    label={`Success: ${result.statistics?.successful_expectations || 0}`}
                                    color="success"
                                    size="small"
                                  />
                                  {result.statistics.unsuccessful_expectations > 0 && (
                                    <Chip
                                      label={`Failed: ${result.statistics?.unsuccessful_expectations || 0}`}
                                      color="error"
                                      size="small"
                                    />
                                  )}
                                </>
                              )}
                            </Box>
                            {result.error ? (
                              <Typography variant="body2" color="error">
                                Error: {result.error}
                              </Typography>
                            ) : (
                              <Box sx={{ maxHeight: '150px', overflow: 'auto' }}>
                                {result.results?.map((expectation, index) => (
                                  <Box 
                                    key={index} 
                                    sx={{ 
                                      mt: 2, 
                                      mb: 2, 
                                      borderLeft: `2px solid ${expectation.success ? '#4caf50' : '#f44336'}`,
                                      pl: 2 
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                      Expectation: {expectation.expectation_type}
                                    </Typography>
                                    <Typography variant="body2">
                                      Success: {expectation.success ? 'Yes' : 'No'}
                                    </Typography>
                                    
                                    {!expectation.success && expectation.result && (
                                      <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2">
                                          Total rows checked: {expectation.result.element_count || 0}
                                        </Typography>
                                        <Typography variant="body2" color="error">
                                          Failed: {expectation.result.unexpected_count || 0} rows 
                                          ({expectation.result.unexpected_percent?.toFixed(1) || 0}%)
                                        </Typography>
                                        
                                        {expectation.result.unexpected_values && expectation.result.unexpected_values.length > 0 && (
                                          <Box sx={{ mt: 1 }}>
                                            <Typography variant="body2" color="error">
                                              Failed Values ({expectation.result.unexpected_values.length}):
                                            </Typography>
                                            {expectation.result.unexpected_values.length <= 5 ? (
                                              <Typography variant="body2" color="error">
                                                {expectation.result.unexpected_values.join(', ')}
                                              </Typography>
                                            ) : (
                                              <Box sx={{ 
                                                maxHeight: '80px', 
                                                overflowY: 'auto', 
                                                border: `1px solid ${alpha('#777777', 0.3)}`, 
                                                p: 1, 
                                                borderRadius: 1 
                                              }}>
                                                {expectation.result.unexpected_values.slice(0, 10).map((value, idx) => (
                                                  <Typography key={idx} variant="body2" color="error" sx={{ mb: 0.5 }}>
                                                    {value}
                                                  </Typography>
                                                ))}
                                                {expectation.result.unexpected_values.length > 10 && (
                                                  <Typography variant="caption" color="text.secondary">
                                                    And {expectation.result.unexpected_values.length - 10} more...
                                                  </Typography>
                                                )}
                                              </Box>
                                            )}
                                          </Box>
                                        )}
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </CardContent>
                          {!result.error && result.results?.some(exp => Array.isArray(exp.sample_rows) && exp.sample_rows.length > 0) && (
                            <CardActions sx={{ mt: 'auto', borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
                              <Button
                                size="small"
                                onClick={() => toggleSampleExpand(result.rule_id)}
                                endIcon={expandedSamples[result.rule_id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              >
                                {expandedSamples[result.rule_id] ? 'Hide Samples' : 'View Samples'}
                              </Button>
                            </CardActions>
                          )}
                          <Collapse in={expandedSamples[result.rule_id]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: alpha('#f5f5f5', 0.5), borderRadius: 1, mt: 1 }}>
                              {result.results?.map((exp, expIdx) => (
                                exp.sample_rows && exp.sample_rows.length > 0 && (
                                  <Box key={expIdx} sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2">
                                      Failed samples for: {exp.expectation_type}
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ mt: 1, maxHeight: 200 }}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            {/* Create table headers based on the keys in the first sample row */}
                                            {exp.sample_rows[0] && Object.keys(exp.sample_rows[0]).map(key => (
                                              <TableCell key={key}>{key}</TableCell>
                                            ))}
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {exp.sample_rows.map((row, rowIdx) => (
                                            <TableRow key={rowIdx}>
                                              {Object.values(row).map((value, valIdx) => (
                                                <TableCell key={valIdx}>{String(value)}</TableCell>
                                              ))}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Box>
                                )
                              ))}
                            </Box>
                          </Collapse>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              <Grid container spacing={2}>
                {rules?.map((rule) => (
                  <Grid item xs={12} sm={6} md={4} key={rule.id}>
                    <Card sx={{ 
                      background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      borderRadius: 8,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '280px',
                      overflow: 'visible'
                    }}>
                      <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '240px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ width: 'calc(100% - 80px)' }}>
                            <Typography variant="h6" gutterBottom noWrap title={rule.name}>
                              {rule.name}
                            </Typography>
                            <Typography 
                              color="text.secondary" 
                              gutterBottom
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={rule.description}
                            >
                              {rule.description}
                            </Typography>
                            
                            {/* Handle multiple expectations or single expectation */}
                            {Array.isArray(rule.rule_config) ? (
                              <>
                                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                  Expectations:
                                </Typography>
                                <Box sx={{ maxHeight: '120px', overflow: 'auto' }}>
                                  {rule.rule_config.map((config, idx) => (
                                    <Box key={idx} sx={{ mb: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                        {config.expectation_type}
                                      </Typography>
                                      <Box sx={{ ml: 2 }}>
                                        {Object.entries(config.kwargs).map(([key, value]) => (
                                          <Typography variant="body2" key={key}>
                                            {key}: <strong>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</strong>
                                          </Typography>
                                        ))}
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                                
                                {/* Display columns as chips */}
                                {rule.columns && rule.columns.length > 0 && (
                                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Typography variant="body2">Columns:</Typography>
                                    {rule.columns.map((col, idx) => (
                                      <Chip 
                                        key={idx}
                                        label={col}
                                        size="small"
                                        sx={{ 
                                          backgroundColor: alpha('#9c27b0', 0.1),
                                          borderColor: alpha('#9c27b0', 0.3),
                                          color: '#9c27b0',
                                          fontSize: '0.7rem'
                                        }}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </>
                            ) : (
                              <>
                                <Typography variant="body2" gutterBottom>
                                  Expectation: {rule.rule_config.expectation_type}
                                </Typography>
                                <Typography variant="body2">
                                  Column: {rule.rule_config.kwargs.column}
                                </Typography>
                              </>
                            )}
                          </Box>
                          <Box>
                            <Chip
                              label={rule.is_active ? 'Active' : 'Inactive'}
                              color={rule.is_active ? 'success' : 'default'}
                              size="small"
                            />
                            {rule.is_draft && (
                              <Chip
                                label="Draft"
                                color="warning"
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions sx={{ mt: 'auto', borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
                        <Button
                          size="small"
                          onClick={() => toggleRuleSelection(rule.id)}
                          color={selectedRules.includes(rule.id) ? 'primary' : 'inherit'}
                        >
                          {selectedRules.includes(rule.id) ? 'Selected' : 'Select'}
                        </Button>
                        <Tooltip title="Edit rule">
                          <IconButton
                            onClick={() => handleEditRule(rule)}
                            disabled={updateRuleMutation.isPending}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Check if rule is outdated">
                          <IconButton
                            onClick={() => handleCheckRuleOutdated(rule.id)}
                            disabled={checkRuleOutdatedMutation.isPending}
                          >
                            <WarningIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete rule">
                          <IconButton
                            onClick={() => handleDeleteRule(rule.id)}
                            disabled={deleteRuleMutation.isPending}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Generate from Description Dialog */}
      <Dialog
        open={openGenerateDialog}
        onClose={() => setOpenGenerateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Rule from Description</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Rule Name (Optional)"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Rule Description"
              multiline
              rows={4}
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              error={!!generateError}
              helperText={generateError}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleGenerateFromDescription}
            variant="contained"
            disabled={!ruleDescription.trim() || generateFromDescriptionMutation.isPending}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Rule Name"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />
            {tableSchema && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="column-select-label">Columns</InputLabel>
                <Select
                  labelId="column-select-label"
                  label="Columns"
                  multiple
                  value={editForm.columns || []}
                  onChange={(e) => setEditForm(prev => ({ ...prev, columns: e.target.value as string[] }))}
                >
                  {tableSchema.columns.map((column) => (
                    <MenuItem key={column.column_name} value={column.column_name}>
                      {column.column_name} ({column.data_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />
            
            {/* Display hint when multiple columns are selected */}
            {editForm.columns && editForm.columns.length > 1 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  When multiple columns are selected, the system will automatically create:
                </Typography>
                <ul>
                  <li>Not-null checks for each column</li>
                  <li>
                    A comparison rule that ensures the {editForm.columns[1]} column is greater than the {editForm.columns[0]} column
                  </li>
                </ul>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button
            onClick={() => updateRuleMutation.mutate()}
            variant="contained"
            disabled={updateRuleMutation.isPending}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suggested Rules Dialog */}
      <Dialog
        open={openSuggestedRulesDialog}
        onClose={() => setOpenSuggestedRulesDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Suggested Rules for {tableName}</DialogTitle>
        <DialogContent>
          {suggestedRules && (
            <Box sx={{ pt: 2 }}>
              {suggestedRules.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {suggestedRules.error}
                </Alert>
              )}
              
              {suggestedRules.new_rule_suggestions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    New Rule Suggestions
                  </Typography>
                  <Grid container spacing={2}>
                    {suggestedRules.new_rule_suggestions.map((suggestion, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card sx={{ 
                          background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                          borderRadius: 2,
                          height: '100%',
                          border: `1px solid ${alpha('#ce93d8', 0.1)}`,
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <Checkbox
                                checked={selectedNewRuleIds.includes(index)}
                                onChange={() => toggleNewRuleSelection(index)}
                                sx={{ mt: 0.5 }}
                              />
                              <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Typography variant="subtitle1" noWrap sx={{ maxWidth: 'calc(100% - 75px)' }} title={suggestion.rule_type}>
                                    {suggestion.rule_type}
                                  </Typography>
                                  <Chip 
                                    label={`${suggestion.confidence}% confidence`} 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha('#f48fb1', 0.2),
                                      color: '#f48fb1',
                                    }}
                                  />
                                </Box>
                                
                                {/* Display column or columns */}
                                {suggestion.columns && Array.isArray(suggestion.columns) && suggestion.columns.length > 0 ? (
                                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Typography variant="body2">Columns:</Typography>
                                    {suggestion.columns.map((col: string, idx: number) => (
                                      <Chip 
                                        key={idx}
                                        label={col}
                                        size="small"
                                        sx={{ 
                                          backgroundColor: alpha('#9c27b0', 0.1),
                                          color: '#9c27b0',
                                          fontSize: '0.7rem'
                                        }}
                                      />
                                    ))}
                                  </Box>
                                ) : suggestion.column ? (
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    Column: <strong>{suggestion.column}</strong>
                                  </Typography>
                                ) : null}
                                
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    mt: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={suggestion.description}
                                >
                                  {suggestion.description}
                                </Typography>
                                
                                <Box sx={{ mt: 1 }}>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" color="text.secondary">Configuration:</Typography>
                                  <Box 
                                    sx={{ 
                                      maxHeight: '100px',
                                      overflow: 'auto',
                                      backgroundColor: alpha('#f5f5f5', 0.5),
                                      p: 1,
                                      borderRadius: 1,
                                      mt: 0.5,
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all'
                                    }}
                                  >
                                    {typeof suggestion.rule_config === 'string' 
                                      ? suggestion.rule_config 
                                      : JSON.stringify(suggestion.rule_config, null, 2)}
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {suggestedRules.rule_update_suggestions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Rule Update Suggestions
                  </Typography>
                  <Grid container spacing={2}>
                    {suggestedRules.rule_update_suggestions.map((suggestion, index) => (
                      <Grid item xs={12} sm={6} lg={4} key={index}>
                        <Card sx={{ 
                          background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                          borderRadius: 2,
                          height: '100%',
                          border: `1px solid ${alpha('#ce93d8', 0.1)}`,
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <Checkbox
                                checked={suggestion.rule_id !== undefined ? selectedUpdateRuleIds.includes(suggestion.rule_id) : false}
                                onChange={() => {
                                  if (suggestion.rule_id !== undefined) {
                                    toggleUpdateRuleSelection(suggestion.rule_id);
                                  }
                                }}
                                sx={{ mt: 0.5 }}
                              />
                              <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Typography variant="subtitle1">
                                    Rule ID: {suggestion.rule_id}
                                  </Typography>
                                  <Chip 
                                    label={`${suggestion.confidence}% confidence`} 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha('#f48fb1', 0.2),
                                      color: '#f48fb1',
                                    }}
                                  />
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mt: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={suggestion.reason}
                                >
                                  {suggestion.reason}
                                </Typography>
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="text.secondary">Current:</Typography>
                                  <Box 
                                    sx={{ 
                                      maxHeight: '80px',
                                      overflow: 'auto',
                                      backgroundColor: alpha('#f5f5f5', 0.5),
                                      p: 1,
                                      borderRadius: 1,
                                      mt: 0.5,
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all'
                                    }}
                                  >
                                    {suggestion.current_config}
                                  </Box>
                                  
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Suggested:
                                  </Typography>
                                  <Box 
                                    sx={{ 
                                      maxHeight: '80px',
                                      overflow: 'auto',
                                      backgroundColor: alpha('#e8f5e9', 0.5),
                                      p: 1,
                                      borderRadius: 1,
                                      mt: 0.5,
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all'
                                    }}
                                  >
                                    {typeof suggestion.suggested_config === 'string' 
                                      ? suggestion.suggested_config 
                                      : JSON.stringify(suggestion.suggested_config)}
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {suggestedRules.new_rule_suggestions.length === 0 && suggestedRules.rule_update_suggestions.length === 0 && (
                <Alert severity="info">
                  No rule suggestions found for this table.
                </Alert>
              )}
            </Box>
          )}
          
          {suggestRulesMutation.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSuggestedRulesDialog(false)}>Cancel</Button>
          <Button
            onClick={handleApplySuggestedRules}
            variant="contained"
            disabled={
              applySuggestedRulesMutation.isPending || 
              (selectedNewRuleIds.length === 0 && selectedUpdateRuleIds.length === 0)
            }
            sx={{
              background: 'linear-gradient(45deg, #ce93d8 30%, #ba68c8 90%)',
              color: '#000',
            }}
            startIcon={applySuggestedRulesMutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {applySuggestedRulesMutation.isPending ? 'Applying...' : 'Apply Selected Suggestions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Analysis Dialog */}
      <Dialog
        open={openAnalysisDialog}
        onClose={() => setOpenAnalysisDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Comprehensive Analysis: {tableName}</DialogTitle>
        <DialogContent>
          {tableAnalysisResult && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Table Analysis Results
              </Typography>
              <Grid container spacing={2}>
                {tableAnalysisResult.column_analysis.columns.map((column, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card sx={{ 
                      background: 'linear-gradient(145deg, rgba(63, 81, 181, 0.05) 0%, rgba(63, 81, 181, 0.15) 100%)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      borderRadius: 8,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '240px'
                    }}>
                      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <Typography variant="h6" gutterBottom noWrap title={column.column_name}>
                          {column.column_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Type: {column.data_type}
                        </Typography>
                        {tableAnalysisResult.data_statistics.column_stats[column.column_name] && (
                          <>
                            <Typography variant="body2">
                              Null Count: {tableAnalysisResult.data_statistics.column_stats[column.column_name].null_count} 
                              ({(tableAnalysisResult.data_statistics.column_stats[column.column_name].null_count / tableAnalysisResult.data_statistics.row_count * 100).toFixed(1)}%)
                            </Typography>
                            <Typography variant="body2">
                              Unique Count: {tableAnalysisResult.data_statistics.column_stats[column.column_name].non_null_count}
                            </Typography>
                            {tableAnalysisResult.data_statistics.column_stats[column.column_name].min_value !== undefined && (
                              <Typography variant="body2" noWrap title={String(tableAnalysisResult.data_statistics.column_stats[column.column_name].min_value)}>
                                Min Value: {String(tableAnalysisResult.data_statistics.column_stats[column.column_name].min_value)}
                              </Typography>
                            )}
                            {tableAnalysisResult.data_statistics.column_stats[column.column_name].max_value !== undefined && (
                              <Typography variant="body2" noWrap title={String(tableAnalysisResult.data_statistics.column_stats[column.column_name].max_value)}>
                                Max Value: {String(tableAnalysisResult.data_statistics.column_stats[column.column_name].max_value)}
                              </Typography>
                            )}
                            {tableAnalysisResult.data_statistics.column_stats[column.column_name] && 
                              tableAnalysisResult.data_statistics.column_stats[column.column_name].avg_value !== undefined && (
                              <Typography variant="body2" noWrap title={String(tableAnalysisResult.data_statistics.column_stats[column.column_name].avg_value)}>
                                Avg Value: {String(tableAnalysisResult.data_statistics.column_stats[column.column_name].avg_value)}
                              </Typography>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {analyzeTableMutation.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnalysisDialog(false)}>Close</Button>
          <Button
            onClick={() => handleAnalyzeTable(true)}
            variant="contained"
            disabled={analyzeTableMutation.isPending}
            startIcon={analyzeTableMutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined}
            sx={{
              background: 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)',
              color: '#000',
            }}
          >
            {analyzeTableMutation.isPending ? 'Applying...' : 'Apply Suggested Rules'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QualityAnalysis; 