import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('billsplit_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest('/api/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('billsplit_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('billsplit_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('billsplit_token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
