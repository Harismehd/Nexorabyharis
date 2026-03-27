import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Dumbbell } from 'lucide-react';

export default function Login() {
  const [gymKey, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [adminStage, setAdminStage] = useState(false);
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const normalizedGymKey = gymKey.trim().toUpperCase();

  const handleContinue = (e) => {
    e.preventDefault();
    if (!normalizedGymKey) return toast.error('Please enter your key');
    if (normalizedGymKey === 'ADMIN') {
      setAdminStage(true);
      setPassword('');
      return;
    }
    setAdminStage(false);
    handleSubmit(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!normalizedGymKey || !password) return toast.error('Please fill both fields');
    
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { gymKey: normalizedGymKey, password });
      toast.success(res.data.message);
      
      if (res.data.role === 'admin') {
        localStorage.setItem('adminKey', password);
      } else {
        localStorage.removeItem('adminKey');
      }
      
      login(res.data.gymKey, res.data.role, res.data.package);
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === 'ACCOUNT_SUSPENDED') {
        toast.error('Account Suspended. Contact support.');
      } else if (code === 'SYSTEM_OFFLINE') {
        toast.error('Platform Offline. Try again later.');
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 shadow-xl border-t-4 border-primary-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-100 text-primary-600 p-4 rounded-full mb-4">
            <Dumbbell size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">GymFlow Login</h1>
          <p className="text-slate-500 mt-2 text-center">Manage your gym members and automate fee reminders via WhatsApp.</p>
        </div>
        
        {!adminStage ? (
        <form onSubmit={handleContinue} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gym Key</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your unique gym key or ADMIN"
              value={gymKey}
              onChange={e => setKey(e.target.value.toUpperCase())}
            />
          </div>

          {normalizedGymKey !== 'ADMIN' && (
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-2">Please use the Key and Password provided by the administrator.</p>
          </div>
          )}
          
          <button type="submit" className="w-full btn-primary py-3 text-lg" disabled={loading}>
            {normalizedGymKey === 'ADMIN' ? 'Continue to Super Admin' : (loading ? 'Authenticating...' : 'Login securely')}
          </button>
        </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
            Super Admin key accepted. Enter master password.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Master Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter strong master password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" className="w-1/3 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => setAdminStage(false)}>
              Back
            </button>
            <button type="submit" className="w-2/3 btn-primary py-3 text-lg" disabled={loading}>
              {loading ? 'Authenticating...' : 'Enter God Mode'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
