import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  CssBaseline,
  Box,
  Chip,
} from '@mui/material';
import TableList from './components/TableList';
import TableDetails from './components/TableDetails';
import QualityAnalysis from './components/QualityAnalysis';
import { DatabaseProvider, useDatabase } from './contexts/DatabaseContext';

const DatabaseInfo = () => {
  const { isConnected, connectionDetails } = useDatabase();
  
  const getDatabaseName = (url: string) => {
    const matches = url.match(/\/([^/]+)$/);
    return matches ? matches[1] : url;
  };

  return (
    <Box sx={{ ml: 2 }}>
      {isConnected && connectionDetails?.database_url && (
        <Chip
          label={`Database: ${getDatabaseName(connectionDetails.database_url)}`}
          color="primary"
          variant="outlined"
          size="small"
        />
      )}
    </Box>
  );
};

const AppContent = () => {
  return (
    <>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Data Quality Assistant
          </Typography>
          <DatabaseInfo />
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/" element={<TableList />} />
          <Route path="/table/:tableName" element={<TableDetails />} />
          <Route path="/analysis/:tableName" element={<QualityAnalysis />} />
        </Routes>
      </Container>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </Router>
  );
};

export default App; 