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
        <CircularProgress />
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
        >
          Back to Tables
        </Button>
        <Typography variant="h4">Table Details - {tableName}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Schema Information
            </Typography>
            <TableContainer>
              <Table>
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
                  {schema?.columns.map((column) => (
                    <TableRow key={column.column_name}>
                      <TableCell>{column.column_name}</TableCell>
                      <TableCell>{column.data_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={column.is_nullable ? 'Yes' : 'No'}
                          color={column.is_nullable ? 'default' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{column.column_default || '-'}</TableCell>
                      <TableCell>{column.character_maximum_length || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {schema.primary_keys.includes(column.column_name) && (
                            <Chip
                              label="Primary Key"
                              color="primary"
                              size="small"
                            />
                          )}
                          {schema.foreign_keys
                            .filter(fk => fk.column_name === column.column_name)
                            .map(fk => (
                              <Chip
                                key={`${fk.references_table}-${fk.references_column}`}
                                label={`FK → ${fk.references_table}.${fk.references_column}`}
                                color="secondary"
                                size="small"
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