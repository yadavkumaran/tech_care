import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthResponse } from '../types';

interface AuthContextType {
  user: AuthResponse | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('techcare_token');
    const savedUser = localStorage.getItem('techcare_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('techcare_token');
        localStorage.removeItem('techcare_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem('techcare_token', data.token);
    localStorage.setItem('techcare_user', JSON.stringify(data));
    setToken(data.token);
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('techcare_token');
    localStorage.removeItem('techcare_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.roles.includes(`ROLE_${role}`) || user.roles.includes(role);
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

