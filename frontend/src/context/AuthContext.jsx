/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [gymKey, setGymKey] = useState(localStorage.getItem('gymKey') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || 'gym');
  const [packageTier, setPackageTier] = useState(localStorage.getItem('packageTier') || 'starter');
  const [termsAccepted, setTermsAccepted] = useState(localStorage.getItem('termsAccepted') === 'true');

  const login = (key, userRole = 'gym', pkg = 'starter') => {
    localStorage.setItem('gymKey', key);
    localStorage.setItem('role', userRole);
    localStorage.setItem('packageTier', pkg || 'starter');
    
    setGymKey(key);
    setRole(userRole);
    setPackageTier(pkg || 'starter');
    
    // Reset terms for each new login so we check fresh from server
    setTermsAccepted(false);
    localStorage.removeItem('termsAccepted');
  };

  const logout = () => {
    localStorage.removeItem('gymKey');
    localStorage.removeItem('role');
    localStorage.removeItem('packageTier');
    localStorage.removeItem('termsAccepted');
    setGymKey(null);
    setRole('gym');
    setPackageTier('starter');
    setTermsAccepted(false);
  };

  const acceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setTermsAccepted(true);
  };

  return (
    <AuthContext.Provider value={{ gymKey, role, packageTier, termsAccepted, login, logout, acceptTerms }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);