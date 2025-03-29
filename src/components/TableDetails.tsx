import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getTableSchema, TableSchema } from '../services/api';

const TableDetails: React.FC = () => {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();

  const { data: schema, isLoading, error } = useQuery<TableSchema>({
    queryKey: ['tableSchema', tableName],
    queryFn: () => getTableSchema(tableName!),
    enabled: !!tableName,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#ce93d8' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load table schema. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
          sx={{
            borderColor: alpha('#ce93d8', 0.5),
            color: '#ce93d8',
            '&:hover': {
              borderColor: '#ce93d8',
              background: alpha('#ce93d8', 0.1),
            }
          }}
        >
        </Button>
        <Typography variant="h5" sx={{ color: '#ff9800' }}>Table Details - {tableName}</Typography>
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
            <Typography variant="h6" gutterBottom sx={{ color: '#ce93d8', fontWeight: 'bold' }}>
              Schema Information
            </Typography>
            <TableContainer>
              <Table sx={{
                '& .MuiTableCell-root': {
                  borderColor: alpha('#ffffff', 0.1),
                },
                '& .MuiTableCell-head': {
                  backgroundColor: alpha('#000000', 0.6),
                  color: '#ce93d8',
                  fontWeight: 'bold',
                },
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Column Name</TableCell>
                    <TableCell>Data Type</TableCell>
                    <TableCell>Nullable</TableCell>
                    <TableCell>Default Value</TableCell>
                    <TableCell>Max Length</TableCell>
                    <TableCell>Constraints</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema?.columns.map((column, index) => (
                    <TableRow key={column.column_name} sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: alpha('#ffffff', 0.03),
                      },
                      '&:hover': {
                        backgroundColor: alpha('#ffffff', 0.05),
                      },
                    }}>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        color: index % 2 === 0 ? '#ff9800' : '#ce93d8', 
                      }}>
                        {column.column_name}
                      </TableCell>
                      <TableCell>{column.data_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={column.is_nullable ? 'Yes' : 'No'}
                          size="small"
                          sx={{
                            ...(column.is_nullable ? {
                              backgroundColor: alpha('#ffffff', 0.1),
                            } : {
                              backgroundColor: alpha('#f48fb1', 0.2), // Pink highlight
                              borderColor: alpha('#f48fb1', 0.5),
                              color: '#f48fb1',
                              fontWeight: 'bold',
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell>{column.column_default || '-'}</TableCell>
                      <TableCell>{column.character_maximum_length || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {schema.primary_keys.includes(column.column_name) && (
                            <Chip
                              label="Primary Key"
                              size="small"
                              sx={{
                                backgroundColor: alpha('#ff9800', 0.2),
                                borderColor: alpha('#ff9800', 0.5),
                                color: '#ff9800',
                                fontWeight: 'bold',
                              }}
                            />
                          )}
                          {schema.foreign_keys
                            .filter(fk => fk.column_name === column.column_name)
                            .map(fk => (
                              <Chip
                                key={`${fk.references_table}-${fk.references_column}`}
                                label={`FK → ${fk.references_table}.${fk.references_column}`}
                                size="small"
                                sx={{
                                  backgroundColor: alpha('#f48fb1', 0.2), // Pink highlight
                                  borderColor: alpha('#f48fb1', 0.5),
                                  color: '#f48fb1',
                                  fontWeight: 'bold',
                                }}
                              />
                            ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TableDetails; 