import React, { useState, useEffect } from 'react';
import {
  Paper,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  alpha,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import StorageIcon from '@mui/icons-material/Storage';
import { connectDatabase, DatabaseConnectionResponse, DatabaseConnectionError } from '../services/api';
import { useDatabase } from '../contexts/DatabaseContext';

const DatabaseConnection: React.FC = () => {
  const { connectionDetails, setConnectionDetails } = useDatabase();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const connectMutation = useMutation<DatabaseConnectionResponse, DatabaseConnectionError>({
    mutationFn: connectDatabase,
    onSuccess: (data) => {
      setConnectionError(null);
      setConnectionDetails(data);
      setShowSuccessMessage(true);
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccessMessage(false), 3000);
    },
    onError: (error) => {
      setConnectionError(error.detail);
    },
  });

  const getDatabaseName = (url: string): string => {
    try {
      const match = url.match(/\/[^/]+$/);
      return match ? match[0].substring(1) : url;
    } catch {
      return url;
    }
  };

  const handleConnect = () => {
    connectMutation.mutate();
  };

  return (
    <Paper sx={{ 
      p: 3, 
      mb: 3,
      background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.15) 100%)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
      borderRadius: 8,
      border: `1px solid ${alpha('#ce93d8', 0.1)}`,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Database Connection</Typography>
        <Button
          variant="contained"
          startIcon={<StorageIcon />}
          onClick={handleConnect}
          disabled={connectMutation.isPending}
        >
          Connect to Database
        </Button>
      </Box>

      {connectMutation.isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {connectionError}
        </Alert>
      )}

      {showSuccessMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Successfully connected to database
        </Alert>
      )}

      {connectionDetails && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Connection Details
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label="Connected"
              color="success"
              size="small"
              sx={{ mr: 1 }}
            />
            <Typography variant="body2">
              Database: {getDatabaseName(connectionDetails.database_url)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Available Tables:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {connectionDetails.tables.map((table) => (
                <Chip
                  key={table}
                  label={table}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default DatabaseConnection; 