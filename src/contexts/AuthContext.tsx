import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  managerUnit: string | null;
  updateUserPhone: (phone: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};