/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [gymKey, setGymKey] = useState(localStorage.getItem('gymKey') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || 'gym');
  const [packageTier, setPackageTier] = useState(localStorage.getItem('packageTier') || 'starter');
  const [termsAccepted, setTermsAccepted] = useState(localStorage.getItem('termsAccepted') === 'true');
  
  // Member Specific
  const [memberId, setMemberId] = useState(localStorage.getItem('memberId') || null);
  const [memberPhone, setMemberPhone] = useState(localStorage.getItem('memberPhone') || null);
  const [memberName, setMemberName] = useState(localStorage.getItem('memberName') || null);

  const login = (key, userRole = 'gym', extra = {}) => {
    localStorage.setItem('gymKey', key);
    localStorage.setItem('role', userRole);
    
    setGymKey(key);
    setRole(userRole);

    if (userRole === 'member') {
      localStorage.setItem('memberId', extra.memberId);
      localStorage.setItem('memberPhone', extra.phone);
      localStorage.setItem('memberName', extra.name);
      setMemberId(extra.memberId);
      setMemberPhone(extra.phone);
      setMemberName(extra.name);
    } else {
      localStorage.setItem('packageTier', extra.package || 'starter');
      setPackageTier(extra.package || 'starter');
    }
    
    // Reset terms for each new login so we check fresh from server
    setTermsAccepted(false);
    localStorage.removeItem('termsAccepted');
  };

  const logout = () => {
    localStorage.removeItem('gymKey');
    localStorage.removeItem('role');
    localStorage.removeItem('packageTier');
    localStorage.removeItem('termsAccepted');
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberPhone');
    localStorage.removeItem('memberName');

    setGymKey(null);
    setRole('gym');
    setPackageTier('starter');
    setTermsAccepted(false);
    setMemberId(null);
    setMemberPhone(null);
    setMemberName(null);
  };

  const acceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setTermsAccepted(true);
  };

  return (
    <AuthContext.Provider value={{ 
      gymKey, role, packageTier, termsAccepted, 
      memberId, memberPhone, memberName,
      login, logout, acceptTerms 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);