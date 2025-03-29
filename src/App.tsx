import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  CssBaseline,
  Box,
  Chip,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import TableList from './components/TableList';
import TableDetails from './components/TableDetails';
import QualityAnalysis from './components/QualityAnalysis';
import { DatabaseProvider, useDatabase } from './contexts/DatabaseContext';

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#121212',
    },
    primary: {
      main: '#ff9800',
    },
    secondary: {
      main: '#ce93d8',
    },
  },
});

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
          sx={{
            fontWeight: 'bold',
            borderColor: 'rgba(255, 152, 0, 0.5)',
            background: 'rgba(255, 152, 0, 0.15)',
            '& .MuiChip-label': {
              color: '#ff9800',
            }
          }}
        />
      )}
    </Box>
  );
};

const AppContent = () => {
  return (
    <>
      <CssBaseline />
      <AppBar position="static" sx={{ 
        background: 'linear-gradient(90deg, #000000 0%, #121212 100%)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      }}>
        <Toolbar>
          <Typography 
            variant="h5" 
            component={Link}
            to="/"
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              color: '#ff9800',
              letterSpacing: '0.5px',
              textDecoration: 'none',
              '&:hover': {
                color: '#ffb74d',
                cursor: 'pointer',
              }
            }}
          >
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
    <ThemeProvider theme={darkTheme}>
      <Box sx={{
        bgcolor: '#000000',
        minHeight: '100vh',
        color: '#ffffff'
      }}>
        <Router>
          <DatabaseProvider>
            <AppContent />
          </DatabaseProvider>
        </Router>
      </Box>
    </ThemeProvider>
  );
};

export default App; 