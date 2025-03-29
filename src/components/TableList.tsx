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
  alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { listTables, listRules } from '../services/api';

// List of internal tables to hide
const INTERNAL_TABLES = ['rules', 'rule_versions'];

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

  // Filter out internal tables
  const filteredTables = tables.filter(tableName => !INTERNAL_TABLES.includes(tableName));

  const getTableHasRules = (tableName: string) => {
    return rules?.some(rule => rule.table_name === tableName) || false;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#ff9800' }}>
        Available Tables
      </Typography>
      <Grid container spacing={3}>
        {filteredTables.map((tableName, index) => (
          <Grid item xs={12} md={6} key={tableName}>
            <Card sx={{ 
              background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
              borderRadius: 8,
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              height: '100%', // Make all cards the same height
              display: 'flex',
              flexDirection: 'column', // Organize content vertically
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 20px rgba(0,0,0,0.6)'
              },
            }}>
              <CardContent sx={{ flexGrow: 1 }}> {/* Take available space */}
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    color: index % 2 === 0 ? '#ff9800' : '#ce93d8',
                    fontWeight: 'bold',
                  }}
                >
                  {tableName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {getTableHasRules(tableName) && (
                    <Chip 
                      label="Rules Configured" 
                      size="small"
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: alpha('#f48fb1', 0.2), // Pink highlight
                        borderColor: alpha('#f48fb1', 0.5),
                        color: '#f48fb1',
                      }}
                    />
                  )}
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2, mt: 'auto' }}> {/* Push to bottom */}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/table/${tableName}`)}
                  sx={{
                    borderColor: index % 2 === 0 ? alpha('#ff9800', 0.5) : alpha('#ce93d8', 0.5),
                    color: index % 2 === 0 ? '#ff9800' : '#ce93d8',
                    '&:hover': {
                      borderColor: index % 2 === 0 ? '#ff9800' : '#ce93d8',
                      background: index % 2 === 0 ? alpha('#ff9800', 0.1) : alpha('#ce93d8', 0.1),
                    }
                  }}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate(`/analysis/${tableName}`)}
                  sx={{
                    background: index % 2 === 0 
                      ? 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)'
                      : 'linear-gradient(45deg, #ce93d8 30%, #ba68c8 90%)',
                    color: '#000',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: index % 2 === 0
                        ? 'linear-gradient(45deg, #ffb74d 30%, #ffc107 90%)'
                        : 'linear-gradient(45deg, #ba68c8 30%, #ab47bc 90%)',
                    }
                  }}
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