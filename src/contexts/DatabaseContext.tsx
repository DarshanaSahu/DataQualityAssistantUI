import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DatabaseConnectionResponse } from '../services/api';

interface DatabaseContextType {
  connectionDetails: DatabaseConnectionResponse | null;
  setConnectionDetails: (details: DatabaseConnectionResponse | null) => void;
  isConnected: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionDetails, setConnectionDetails] = useState<DatabaseConnectionResponse | null>(null);

  return (
    <DatabaseContext.Provider
      value={{
        connectionDetails,
        setConnectionDetails,
        isConnected: !!connectionDetails,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}; 