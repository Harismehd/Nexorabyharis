import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Receipts from './pages/Receipts';
import Connect from './pages/Connect';
import Upload from './pages/Upload';
import SendReminders from './pages/SendReminders';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import About from './pages/About';
import MasterAdmin from './pages/MasterAdmin';
import PaymentVerification from './pages/PaymentVerification';
import FinanceGuard from './pages/FinanceGuard';
import Terms from './pages/Terms';
import Register from './pages/Register';
import Support from './pages/Support';
import api from './api';

const ProtectedRoute = ({ children }) => {
  const { gymKey, role, termsAccepted } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsTerms, setNeedsTerms] = useState(false);

  useEffect(() => {
    if (!gymKey || role === 'admin') {
      setChecking(false);
      return;
    }
    if (termsAccepted) {
      setChecking(false);
      return;
    }
    // Check from server
    api.get(`/terms?gymKey=${gymKey}`)
      .then(res => {
        if (res.data.accepted) {
          // Already accepted before — mark locally
          localStorage.setItem('termsAccepted', 'true');
          setNeedsTerms(false);
        } else {
          setNeedsTerms(true);
        }
      })
      .catch(() => setNeedsTerms(false))
      .finally(() => setChecking(false));
  }, [gymKey, role, termsAccepted]);

  if (!gymKey) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (checking) return (
    <div style={{
      minHeight: '100vh', background: '#080d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>Loading...</div>
    </div>
  );
  if (needsTerms && !termsAccepted) return <Terms />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { gymKey, role } = useAuth();
  if (!gymKey) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { gymKey, role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={gymKey ? <Navigate to={role === 'admin' ? '/admin' : '/'} replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="connect" element={<Connect />} />
        <Route path="upload" element={<Upload />} />
        <Route path="send" element={<SendReminders />} />
        <Route path="payment-verification" element={<PaymentVerification />} />
        <Route path="finance-guard" element={<FinanceGuard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="logs" element={<Logs />} />
        <Route path="about" element={<About />} />
        <Route path="support" element={<Support />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><MasterAdmin /></AdminRoute>} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0e1622',
            color: '#e2e8f0',
            border: '1px solid #1a2540',
            fontFamily: 'DM Sans, sans-serif'
          }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;