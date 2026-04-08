/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [gymKey, setGymKey] = useState(localStorage.getItem('gymKey') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || 'gym');
  const [packageTier, setPackageTier] = useState(localStorage.getItem('packageTier') || 'starter');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(localStorage.getItem('subscriptionEndDate') || null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(localStorage.getItem('subscriptionStatus') || 'active');
  const [termsAccepted, setTermsAccepted] = useState(localStorage.getItem('termsAccepted') === 'true');

  const login = (key, userRole = 'gym', pkg = 'starter', subEnd = null, subStatus = 'active') => {
    localStorage.setItem('gymKey', key);
    localStorage.setItem('role', userRole);
    localStorage.setItem('packageTier', pkg || 'starter');
    localStorage.setItem('subscriptionEndDate', subEnd || '');
    localStorage.setItem('subscriptionStatus', subStatus || 'active');
    
    setGymKey(key);
    setRole(userRole);
    setPackageTier(pkg || 'starter');
    setSubscriptionEndDate(subEnd);
    setSubscriptionStatus(subStatus);
    
    // Reset terms for each new login so we check fresh from server
    setTermsAccepted(false);
    localStorage.removeItem('termsAccepted');
  };

  const logout = () => {
    localStorage.removeItem('gymKey');
    localStorage.removeItem('role');
    localStorage.removeItem('packageTier');
    localStorage.removeItem('subscriptionEndDate');
    localStorage.removeItem('subscriptionStatus');
    localStorage.removeItem('termsAccepted');
    setGymKey(null);
    setRole('gym');
    setPackageTier('starter');
    setSubscriptionEndDate(null);
    setSubscriptionStatus('active');
    setTermsAccepted(false);
  };

  const acceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setTermsAccepted(true);
  };

  return (
    <AuthContext.Provider value={{ gymKey, role, packageTier, subscriptionEndDate, subscriptionStatus, termsAccepted, login, logout, acceptTerms }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);