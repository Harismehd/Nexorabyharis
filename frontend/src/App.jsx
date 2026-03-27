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
import MasterAdmin from './pages/MasterAdmin';
import PaymentVerification from './pages/PaymentVerification';
import FinanceGuard from './pages/FinanceGuard';

const ProtectedRoute = ({ children }) => {
  const { gymKey, role } = useAuth();
  if (!gymKey) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
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
      </Route>
      <Route path="/admin" element={<AdminRoute><MasterAdmin /></AdminRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
