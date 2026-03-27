/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [gymKey, setGymKey] = useState(localStorage.getItem('gymKey') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || 'gym');
  const [packageTier, setPackageTier] = useState(localStorage.getItem('packageTier') || 'starter');

  const login = (key, userRole = 'gym', pkg = 'starter') => {
    localStorage.setItem('gymKey', key);
    localStorage.setItem('role', userRole);
    localStorage.setItem('packageTier', pkg || 'starter');
    setGymKey(key);
    setRole(userRole);
    setPackageTier(pkg || 'starter');
  };

  const logout = () => {
    localStorage.removeItem('gymKey');
    localStorage.removeItem('role');
    localStorage.removeItem('packageTier');
    setGymKey(null);
    setRole('gym');
    setPackageTier('starter');
  };

  return (
    <AuthContext.Provider value={{ gymKey, role, packageTier, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
