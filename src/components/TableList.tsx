import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { listTables, listRules } from '../services/api';

const TableList: React.FC = () => {
  const navigate = useNavigate();

  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables'],
    queryFn: listTables,
  });

  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['rules'],
    queryFn: listRules,
  });

  if (isLoadingTables || isLoadingRules) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tables?.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No tables found in the database.
      </Alert>
    );
  }

  const getTableHasRules = (tableName: string) => {
    return rules?.some(rule => rule.table_name === tableName) || false;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Available Tables
      </Typography>
      <Grid container spacing={3}>
        {tables.map((tableName) => (
          <Grid item xs={12} md={6} key={tableName}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {tableName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {getTableHasRules(tableName) && (
                    <Chip 
                      label="Rules Configured" 
                      color="success" 
                      size="small" 
                    />
                  )}
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate(`/table/${tableName}`)}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate(`/analysis/${tableName}`)}
                >
                  Analyze
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TableList; 