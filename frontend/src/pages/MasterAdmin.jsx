import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldAlert, Power, Users, KeyRound, Ban, CheckCircle2, LogOut, Plus } from 'lucide-react';

export default function MasterAdmin() {
  const { logout } = useAuth();
  const [data, setData] = useState({ system: {}, gyms: [] });
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPackage, setNewPackage] = useState('starter');
  const [creating, setCreating] = useState(false);

  // Helper config for authorized admin calls
  const getAdminHeaders = () => ({
    headers: { 'x-admin-key': localStorage.getItem('adminKey') }
  });

  const fetchData = async () => {
    try {
      const [systemRes, gymsRes] = await Promise.all([
        api.get('/admin/dashboard', getAdminHeaders()),
        api.get('/admin/gyms', getAdminHeaders())
      ]);
      setData({ system: systemRes.data.system, gyms: gymsRes.data.gyms });
    } catch (err) {
      toast.error('Failed to load God Mode dashboard');
      if (err.response?.status === 403) {
         logout(); // Bad admin key somehow
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGym = async (e) => {
    e.preventDefault();
    if (!newKey || !newPassword) return toast.error('Fill both fields');
    setCreating(true);
    try {
      await api.post('/admin/gyms/create', { gymKey: newKey, password: newPassword, package: newPackage }, getAdminHeaders());
      toast.success('New Gym Key generated successfully');
      setNewKey('');
      setNewPassword('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBan = async (gymKey) => {
    if (!window.confirm(`Are you sure you want to change suspension status for ${gymKey}?`)) return;
    try {
      const res = await api.post('/admin/gyms/toggle', { gymKey }, getAdminHeaders());
      toast.success(res.data.message);
      fetchData();
    } catch {
      toast.error('Failed to ban/unban gym');
    }
  };

  const handleSetPackage = async (gymKey, pkg) => {
    if (!window.confirm(`Set package for ${gymKey} to ${pkg.toUpperCase()}?`)) return;
    try {
      const res = await api.post('/admin/gyms/package', { gymKey, package: pkg }, getAdminHeaders());
      toast.success(res.data.message || 'Package updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update package');
    }
  };

  const handleGlobalShutdown = async () => {
    const isOffline = data.system.globalShutdown;
    const action = isOffline ? 'BRING ONLINE' : 'SHUT DOWN';
    if (!window.confirm(`MASTER OVERRIDE: Are you absolutely sure you want to ${action} the entire platform?`)) return;
    
    try {
      const res = await api.post('/admin/shutdown', {}, getAdminHeaders());
      toast.success(res.data.message);
      fetchData();
    } catch {
      toast.error('Failed to execute Kill Switch');
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading GOD MODE...</div>;

  const isOffline = data.system.globalShutdown;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-6">
           <div className="flex items-center gap-4">
              <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                 <ShieldAlert className="text-red-500" size={32} />
              </div>
              <div>
                 <h1 className="text-3xl font-bold tracking-tight text-white">MASTER CONTROLS</h1>
                 <p className="text-red-400 text-sm">God Mode Enabled. Direct database access active.</p>
              </div>
           </div>
           
           <button 
             onClick={logout}
             className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
           >
             <LogOut size={16} /> Exit Matrix
           </button>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           
           {/* Kill Switch Card */}
           <div className={`p-6 rounded-xl border ${isOffline ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Power className={isOffline ? 'text-red-500' : 'text-emerald-500'} /> 
                    Global Network Status
                 </h2>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOffline ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isOffline ? 'OFFLINE (LOCKED)' : 'ONLINE (ACTIVE)'}
                 </span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                 When the network is shut down, ZERO gym clients will be able to log in or use the API. This acts as an emergency suspension for all tenants.
              </p>
              <button 
                onClick={handleGlobalShutdown}
                className={`w-full py-4 rounded-lg font-bold text-lg tracking-widest transition-all ${
                   isOffline 
                   ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)]' 
                   : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                }`}
              >
                 {isOffline ? 'INITIATE PLATFORM REBOOT' : 'ENGAGE GLOBAL KILL SWITCH'}
              </button>
           </div>
           
           {/* Key Generator Card */}
           <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                 <KeyRound className="text-blue-400" /> 
                 Generate Tenant Gateway
              </h2>
              <p className="text-sm text-slate-400 mb-6">Create rigid login credentials for new gyms. Auto-registration is disabled for security.</p>
              
              <form onSubmit={handleCreateGym} className="space-y-4">
                 <div className="flex gap-4">
                    <input 
                      required
                      type="text" 
                      placeholder="NEW GYM KEY (e.g. GYM-X99)" 
                      value={newKey}
                      onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s/g, '-'))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex-1 text-white focus:outline-none focus:border-blue-500 uppercase"
                    />
                    <input 
                      required
                      type="text" 
                      placeholder="Initial Password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex-1 text-white focus:outline-none focus:border-blue-500"
                    />
                 </div>
                <div className="flex gap-4">
                  <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex-1 text-white focus:outline-none focus:border-blue-500"
                    value={newPackage}
                    onChange={(e) => setNewPackage(e.target.value)}
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                    <option value="pro_plus">Pro Plus</option>
                  </select>
                  <div className="flex-1 text-xs text-slate-400 pt-2">
                    Choose package for this tenant.
                  </div>
                </div>
                 <button 
                   disabled={creating}
                   type="submit" 
                   className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                    <Plus size={18} /> {creating ? 'Generating...' : 'Mint New Authorization Key'}
                 </button>
              </form>
           </div>

        </div>

        {/* Tenant Roster */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
           <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Users className="text-purple-400" /> 
              Tenant Roster ({data.gyms.length})
           </h2>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-700 text-slate-400 text-sm">
                   <th className="py-3 px-4">Gym Key</th>
                   <th className="py-3 px-4">Gym Name</th>
                   <th className="py-3 px-4">Members</th>
                   <th className="py-3 px-4">WhatsApp Link</th>
                   <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Package</th>
                   <th className="py-3 px-4 text-right">Sanctions</th>
                 </tr>
               </thead>
               <tbody>
                 {data.gyms.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-6 text-slate-500">No tenants registered yet.</td></tr>
                 ) : (
                    data.gyms.map(g => (
                       <tr key={g.gymKey} className={`border-b border-slate-700/50 ${g.isActive ? '' : 'bg-red-900/10'}`}>
                          <td className="py-3 px-4 font-bold text-blue-400">{g.gymKey}</td>
                          <td className="py-3 px-4 text-slate-200">{g.name}</td>
                          <td className="py-3 px-4 text-slate-400">{g.memberCount}</td>
                          <td className="py-3 px-4">
                             <span className={`text-xs px-2 py-1 rounded-full ${g.whatsappStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                {g.whatsappStatus || 'none'}
                             </span>
                          </td>
                          <td className="py-3 px-4">
                             {g.isActive ? (
                                <span className="text-emerald-400 flex items-center gap-1 text-sm"><CheckCircle2 size={14}/> ACTIVE</span>
                             ) : (
                                <span className="text-red-400 flex items-center gap-1 text-sm font-bold"><Ban size={14}/> SUSPENDED</span>
                             )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-end">
                              {['starter', 'growth', 'pro', 'pro_plus'].map(p => (
                                <button
                                  key={p}
                                  onClick={() => handleSetPackage(g.gymKey, p)}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                                    (g.package || 'starter') === p
                                      ? 'bg-primary-600 text-white border-primary-600'
                                      : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                                  }`}
                                >
                                  {p === 'pro_plus' ? 'PRO+' : p.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 flex justify-end">
                             <button
                               onClick={() => handleToggleBan(g.gymKey)}
                               className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                  g.isActive 
                                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                               }`}
                             >
                                {g.isActive ? 'SUSPEND' : 'RESTORE'}
                             </button>
                          </td>
                       </tr>
                    ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}
