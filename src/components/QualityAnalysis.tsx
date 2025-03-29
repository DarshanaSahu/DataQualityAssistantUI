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
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api, {
  Rule,
  RuleCheckResult,
  RuleExecutionResult,
  generateRuleFromDescription,
  updateRule,
  deleteRule,
  UpdateRuleRequest,
  getTableSchema,
  TableSchema,
  TableSchemaColumn,
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
  column?: string;
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
    column: '',
  });
  const [expandedSamples, setExpandedSamples] = useState<Record<string, boolean>>({});
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);

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
      
      if (editForm.column && editForm.column !== editingRule.rule_config.kwargs.column) {
        updateRequest.rule_config = {
          ...editingRule.rule_config,
          kwargs: {
            ...editingRule.rule_config.kwargs,
            column: editForm.column
          }
        };
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
        column: '',
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
    setEditForm({
      name: rule.name,
      description: rule.description,
      is_active: rule.is_active,
      column: rule.rule_config.kwargs.column,
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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          
        </Button>
        <Typography variant="h5" gutterBottom sx={{ color: '#ce93d8' }}>Quality Analysis - {tableName}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3,
            background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
            borderRadius: 8,
            border: `1px solid ${alpha('#ce93d8', 0.1)}`,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Quality Rules</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setOpenGenerateDialog(true)}
                  disabled={generateFromDescriptionMutation.isPending}
                >
                  Generate from Description
                </Button>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerateRules}
                  disabled={generateRulesMutation.isPending}
                >
                  Generate Rules
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleExecuteRules}
                  disabled={selectedRules.length === 0 || executeRulesMutation.isPending}
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
                <Grid container spacing={2}>
                  {executionResult.results.map((result) => (
                    <Grid item xs={12} key={result.rule_id}>
                      <Card sx={{ 
                        background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                        borderRadius: 8,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {result.success ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <ErrorIcon color="error" />
                            )}
                            <Typography variant="h6">
                              {result.rule_name}
                            </Typography>
                          </Box>
                          <Typography color="text.secondary" gutterBottom>
                            Rule ID: {result.rule_id}
                          </Typography>
                          <Typography color="text.secondary" gutterBottom>
                            Execution Time: {result.execution_time.toFixed(4)}s
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            {result.statistics && (
                              <>
                                <Chip
                                  label={`Evaluated: ${result.statistics?.evaluated_expectations || 0}`}
                                  size="small"
                                />
                                <Chip
                                  label={`Success: ${result.statistics?.successful_expectations || 0}`}
                                  color="success"
                                  size="small"
                                />
                                <Chip
                                  label={`Failed: ${result.statistics?.unsuccessful_expectations || 0}`}
                                  color="error"
                                  size="small"
                                />
                              </>
                            )}
                          </Box>
                          {result.error ? (
                            <Typography variant="body2" color="error">
                              Error: {result.error}
                            </Typography>
                          ) : (
                            <>
                              {result.results?.map((expectation, index) => (
                                <Box key={index} sx={{ mt: 2, mb: 2, borderLeft: '2px solid #eee', pl: 2 }}>
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
                                      
                                      {expectation.result.unexpected_values && (
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
                                              maxHeight: '150px', 
                                              overflowY: 'auto', 
                                              border: `1px solid ${alpha('#777777', 0.3)}`, 
                                              p: 1, 
                                              borderRadius: 1 
                                            }}>
                                              {expectation.result.unexpected_values.map((value, idx) => (
                                                <Typography key={idx} variant="body2" color="error" sx={{ mb: 0.5 }}>
                                                  {value}
                                                </Typography>
                                              ))}
                                            </Box>
                                          )}
                                        </Box>
                                      )}
                                      
                                      {expectation.sample_rows && expectation.sample_rows.length > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                          <Box 
                                            sx={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              cursor: 'pointer',
                                              '&:hover': { bgcolor: alpha('#333333', 0.2) },
                                              p: 1,
                                              borderRadius: 1
                                            }}
                                            onClick={() => toggleSampleExpand(index)}
                                          >
                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                              Sample Rows ({Math.min(expectation.sample_rows.length, 5)} of {expectation.sample_rows.length})
                                            </Typography>
                                            <IconButton size="small">
                                              {expandedSamples[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                            </IconButton>
                                          </Box>
                                          
                                          <Collapse in={expandedSamples[index]} timeout="auto">
                                            <TableContainer sx={{ 
                                              mt: 1, 
                                              border: `1px solid ${alpha('#777777', 0.3)}`, 
                                              borderRadius: 1, 
                                              maxHeight: '300px' 
                                            }}>
                                              <Table size="small" stickyHeader>
                                                <TableHead>
                                                  <TableRow>
                                                    {expectation.sample_rows[0] && Object.keys(expectation.sample_rows[0]).map((column) => (
                                                      <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                                                        {column}
                                                      </TableCell>
                                                    ))}
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {expectation.sample_rows.slice(0, 5).map((row, rowIdx) => (
                                                    <TableRow key={rowIdx}>
                                                      {Object.entries(row).map(([column, value]) => {
                                                        const failingColumn = getFailingColumn(expectation);
                                                        const isError = column === failingColumn && 
                                                          expectation.result.unexpected_values && 
                                                          expectation.result.unexpected_values.includes(String(value));
                                                        
                                                        return (
                                                          <TableCell 
                                                            key={column} 
                                                            sx={{
                                                              ...(isError && {
                                                                bgcolor: 'error.light',
                                                                color: 'error.contrastText',
                                                                fontWeight: 'bold'
                                                              })
                                                            }}
                                                          >
                                                            {value !== null && value !== undefined ? String(value) : 'null'}
                                                          </TableCell>
                                                        );
                                                      })}
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </TableContainer>
                                          </Collapse>
                                        </Box>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              ))}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            <Grid container spacing={2}>
              {rules?.map((rule) => (
                <Grid item xs={12} md={6} key={rule.id}>
                  <Card sx={{ 
                    background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    borderRadius: 8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {rule.name}
                          </Typography>
                          <Typography color="text.secondary" gutterBottom>
                            {rule.description}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Expectation: {rule.rule_config.expectation_type}
                          </Typography>
                          <Typography variant="body2">
                            Column: {rule.rule_config.kwargs.column}
                          </Typography>
                        </Box>
                        <Box>
                          <Chip
                            label={rule.is_active ? 'Active' : 'Inactive'}
                            color={rule.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ mt: 'auto' }}>
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
                <InputLabel id="column-select-label">Column</InputLabel>
                <Select
                  labelId="column-select-label"
                  label="Column"
                  value={editForm.column || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, column: e.target.value }))}
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
    </Box>
  );
};

export default QualityAnalysis; 