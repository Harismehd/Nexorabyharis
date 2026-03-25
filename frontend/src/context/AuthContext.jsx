/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [gymKey, setGymKey] = useState(localStorage.getItem('gymKey') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || 'gym');

  const login = (key, userRole = 'gym') => {
    localStorage.setItem('gymKey', key);
    localStorage.setItem('role', userRole);
    setGymKey(key);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem('gymKey');
    localStorage.removeItem('role');
    setGymKey(null);
    setRole('gym');
  };

  return (
    <AuthContext.Provider value={{ gymKey, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
