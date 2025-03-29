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
import api, {
  Rule,
  RuleCheckResult,
  RuleExecutionResult,
  generateRuleFromDescription,
  updateRule,
  deleteRule,
  UpdateRuleRequest,
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
  });

  const { data: rules, isLoading: isLoadingRules } = useQuery<Rule[]>({
    queryKey: ['rules', tableName],
    queryFn: async () => {
      const response = await api.get('/api/v1/rules');
      return response.data.filter((rule: Rule) => rule.table_name === tableName);
    },
  });

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
      return updateRule(editingRule.id, editForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', tableName] });
      setOpenEditDialog(false);
      setEditingRule(null);
      setEditForm({
        name: '',
        description: '',
        is_active: true,
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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Back to Tables
        </Button>
        <Typography variant="h4">Quality Analysis - {tableName}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
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
                <Grid container spacing={2}>
                  {executionResult.results.map((result) => (
                    <Grid item xs={12} key={result.rule_id}>
                      <Card>
                        <CardContent>
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
                            result.results?.map((expectation, index) => (
                              <Box key={index} sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                  Expectation: {expectation.expectation_type}
                                </Typography>
                                <Typography variant="body2">
                                  Success: {expectation.success ? 'Yes' : 'No'}
                                </Typography>
                                {!expectation.success && (
                                  <Typography variant="body2" color="error">
                                    Failed Values: {expectation.result.unexpected_values?.join(', ')}
                                  </Typography>
                                )}
                              </Box>
                            ))
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
                  <Card>
                    <CardContent>
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
                    <CardActions>
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