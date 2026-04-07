import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldAlert, Power, Users, KeyRound, Ban, LogOut, Plus, Megaphone, Trash2, Radio, Activity, Monitor, RefreshCw, Lock } from 'lucide-react';

import { supabase } from '../supabase';

export default function MasterAdmin() {
  const { logout } = useAuth();
  const [data, setData] = useState({ system: {}, gyms: [] });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPackage, setNewPackage] = useState('starter');
  const [newDeviceLimit, setNewDeviceLimit] = useState(5);
  const [creating, setCreating] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastForm, setBroadcastForm] = useState({
    message: '', type: 'info', recipients: 'ALL',
    specificKeys: '', durationHours: 24
  });
  const [sending, setSending] = useState(false);
  const [msgStats, setMsgStats] = useState([]);

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
         logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get('/broadcasts?gymKey=ADMIN', getAdminHeaders());
      setBroadcasts(res.data.broadcasts || []);
    } catch {}
  };

  const fetchMsgStats = async () => {
    try {
      const { data } = await supabase
        .from('message_jobs')
        .select('gym_key, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const stats = {};
      (data || []).forEach(job => {
        const date = job.created_at?.slice(0, 10);
        const key = `${job.gym_key}__${date}`;
        stats[key] = (stats[key] || 0) + 1;
      });

      const result = Object.entries(stats).map(([key, count]) => {
        const [gymKey, date] = key.split('__');
        return { gymKey, date, count };
      }).sort((a, b) => b.date.localeCompare(a.date));

      setMsgStats(result);
    } catch {}
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.message) return toast.error('Enter a message');
    setSending(true);
    try {
      const recipients = broadcastForm.recipients === 'ALL'
        ? ['ALL']
        : broadcastForm.specificKeys.split(',').map(k => k.trim().toUpperCase()).filter(Boolean);

      await api.post('/broadcasts', {
        message: broadcastForm.message,
        type: broadcastForm.type,
        recipients,
        durationHours: Number(broadcastForm.durationHours)
      }, getAdminHeaders());

      toast.success('Broadcast sent!');
      setBroadcastForm({ message: '', type: 'info', recipients: 'ALL', specificKeys: '', durationHours: 24 });
      fetchBroadcasts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    try {
      await api.delete('/broadcasts', { ...getAdminHeaders(), data: { id } });
      toast.success('Broadcast deleted');
      fetchBroadcasts();
    } catch {
      toast.error('Failed to delete broadcast');
    }
  };

  useEffect(() => {
    fetchData();
    fetchBroadcasts();
    fetchMsgStats();
    fetchApplications();
  }, []);

  const handleCreateGym = async (e) => {
    e.preventDefault();
    if (!newKey || !newPassword) return toast.error('Fill both fields');
    setCreating(true);
    try {
      await api.post('/admin?action=create', { 
        gymKey: newKey, 
        password: newPassword, 
        package: newPackage,
        deviceLimit: newDeviceLimit
      }, getAdminHeaders());
      toast.success('New Gym Key minted successfully');
      setNewKey('');
      setNewPassword('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate key');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = (app) => {
    setNewKey(app.gym_key_choice || app.gym_name.toUpperCase().replace(/\s/g, '-'));
    setNewPackage(app.package_name.toLowerCase());
    setNewPassword(Math.random().toString(36).substring(2, 10).toUpperCase());
    
    // Smooth scroll to provisioning
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Fields pre-filled. Press Mint to complete.');

    // Update status in Supabase
    supabase.from('registrations').update({ status: 'approved' }).eq('id', app.id).then(() => {
      fetchApplications();
    });
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this application?')) return;
    try {
      await supabase.from('registrations').update({ status: 'rejected' }).eq('id', id);
      toast.success('Application rejected');
      fetchApplications();
    } catch {
      toast.error('Failed to reject');
    }
  };

  const handleToggleLock = async (gymKey) => {
    try {
      const res = await api.post(`/admin?action=lock`, { gymKey }, getAdminHeaders());
      toast.success(res.data.message);
      fetchData();
    } catch {
      toast.error('Toggle lock failed');
    }
  };

  const handleToggleBan = async (gymKey) => {
    if (!window.confirm(`Are you sure you want to change suspension status for ${gymKey}?`)) return;
    try {
      const res = await api.post('/admin?action=toggle', { 
        gymKey 
      }, getAdminHeaders());
      toast.success(res.data.message);
      fetchData();
    } catch {
      toast.error('Failed to ban/unban gym');
    }
  };

  const handleSetPackage = async (gymKey, pkg) => {
    if (!window.confirm(`Set package for ${gymKey} to ${pkg.toUpperCase()}?`)) return;
    try {
      const res = await api.post('/admin?action=package', { gymKey, package: pkg }, getAdminHeaders());
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
      const res = await api.post('/admin?action=shutdown', {}, getAdminHeaders());
      toast.success(res.data.message);
      fetchData();
    } catch {
      toast.error('Shutdown override failed');
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading NEXORA CORE...</div>;

  const isOffline = data.system.globalShutdown;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono" style={{ background: 'radial-gradient(circle at top right, #0f172a, #020617)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
           <div className="flex items-center gap-4">
              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                 <ShieldAlert className="text-red-500" size={32} />
              </div>
              <div>
                 <h1 className="text-3xl font-black tracking-tighter text-white">NEXORA GOD MODE</h1>
                 <p className="text-red-400 text-xs font-bold tracking-widest uppercase">Root Access: Level 0 Authority</p>
              </div>
           </div>
           
           <button 
             onClick={logout}
             className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 hover:border-slate-700 text-sm font-bold"
           >
             <LogOut size={16} /> DE-AUTHORIZE
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           <div className={`lg:col-span-4 p-8 rounded-2xl border ${isOffline ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900/50 border-slate-800'} backdrop-blur-md`}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                      <Power className={isOffline ? 'text-red-500' : 'text-emerald-500'} /> 
                      Network Status
                   </h2>
                   <p className="text-xs text-slate-500">Global kill-switch authority</p>
                 </div>
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${isOffline ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {isOffline ? 'DEADLINE' : 'OPERATIONAL'}
                 </span>
              </div>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                 Engaging the Kill Switch immediately terminates all active tenant sessions and prevents any new API handshakes.
              </p>
              <button 
                onClick={handleGlobalShutdown}
                className={`w-full py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all uppercase ${
                   isOffline 
                   ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(5,150,105,0.3)]' 
                   : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]'
                }`}
              >
                 {isOffline ? 'Initiate Core Reboot' : 'Execute Platform Silence'}
              </button>
           </div>
           
           <div className="lg:col-span-8 p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                 <KeyRound className="text-blue-400" /> 
                 Tenant Provisioning
              </h2>
              <p className="text-xs text-slate-500 mb-8">Mint unique authorization keys for new gym instances.</p>
              
              <form onSubmit={handleCreateGym} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      type="text" 
                      placeholder="GYM IDENTIFIER" 
                      value={newKey}
                      onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s/g, '-'))}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 uppercase text-sm font-bold"
                    />
                    <input 
                      required
                      type="text" 
                      placeholder="ACCESS PASSWORD" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm appearance-none"
                      value={newPackage}
                      onChange={(e) => setNewPackage(e.target.value)}
                    >
                      <option value="starter">Starter Plan</option>
                      <option value="growth">Growth Plan</option>
                      <option value="pro">Pro Plan</option>
                      <option value="pro_plus">Pro Plus Plan</option>
                    </select>
 
                    <div className="relative">
                      <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="number"
                        placeholder="Node Device Limit"
                        value={newDeviceLimit}
                        onChange={e => setNewDeviceLimit(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 w-full text-white focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                 </div>
 
                 <button 
                   disabled={creating}
                   type="submit" 
                   className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 uppercase shadow-[0_0_30px_rgba(37,99,235,0.2)]"
                 >
                    <Plus size={18} /> {creating ? 'Authorizing...' : 'Mint New Authorization Key'}
                 </button>
              </form>
           </div>
        </div>

        {/* Incoming Applications Section */}
        <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  <Activity className="text-emerald-400" /> 
                  Incoming Applications
               </h2>
               <p className="text-xs text-slate-500">Review pending gym signups and payment proofs</p>
             </div>
             <div className="bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20">
                <span className="text-emerald-400 text-xs font-black">{applications.length} PENDING</span>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {applications.length === 0 ? (
                <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm">
                  Zero incoming signals. The ecosystem is quiet.
                </div>
              ) : (
                applications.map(app => (
                  <div key={app.id} className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-emerald-500/30 transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-black text-white text-sm uppercase mb-1">{app.gym_name}</h3>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{app.owner_name}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded border border-blue-500/20 uppercase">
                           {app.package_name}
                        </span>
                     </div>

                     <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-[11px]">
                           <span className="text-slate-500 font-bold">WHATSAPP:</span>
                           <span className="text-slate-300 tabular-nums">{app.phone}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                           <span className="text-slate-500 font-bold">KEY CHOICE:</span>
                           <span className="text-emerald-400 font-black">{app.gym_key_choice || 'NONE'}</span>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <a 
                          href={app.payment_proof_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black text-center rounded-lg transition-all uppercase border border-slate-700"
                        >
                           View Proof
                        </a>
                        <button 
                          onClick={() => handleApprove(app)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg transition-all uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        >
                           Approve
                        </button>
                        <button 
                          onClick={() => handleReject(app.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20"
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  <Users className="text-purple-400" /> 
                  Tenant Infrastructure
               </h2>
               <p className="text-xs text-slate-500">Live monitoring and control of active instances</p>
             </div>
             <div className="flex gap-4">
                <div className="text-right">
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Total Tenants</p>
                   <p className="text-xl font-black text-purple-400">{data.gyms.length}</p>
                </div>
             </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                   <th className="py-4 px-4">Gym Identity</th>
                   <th className="py-4 px-4">Node Quota</th>
                   <th className="py-4 px-4 text-center">Instance Limit</th>
                   <th className="py-4 px-4 text-center">Plan Override</th>
                   <th className="py-4 px-4 text-center">Settings Lock</th>
                   <th className="py-4 px-4 text-right">Sanctions</th>
                 </tr>
               </thead>
               <tbody>
                  {data.gyms.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-slate-600 text-sm italic">Zero tenants identified in local cluster.</td></tr>
                  ) : (
                    data.gyms.map(g => (
                      <tr key={g.gymKey} className={`border-b border-slate-800/50 hover:bg-white/5 transition-colors group ${g.isActive ? '' : 'bg-red-950/10 opacity-70'}`}>
                        <td className="py-5 px-4">
                          <div className="font-black text-blue-400 text-sm mb-1">{g.gymKey}</div>
                          <div className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{g.name || 'UNINITIALIZED'}</div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Users size={12} className="text-slate-600" />
                            <span className="text-sm font-bold text-slate-200">{g.memberCount}</span>
                          </div>
                          <div className={`text-[10px] font-black uppercase ${g.whatsappStatus === 'connected' ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {g.whatsappStatus || 'dis-linked'}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Monitor size={12} className="text-slate-600" />
                            <input 
                              type="number"
                              defaultValue={g.deviceLimit || 5}
                              onBlur={(e) => {
                                api.post('/admin?action=update', { gymKey: g.gymKey, field: 'deviceLimit', value: e.target.value }, getAdminHeaders()).then(() => {
                                  toast.success('Limit updated');
                                }).catch(() => toast.error('Update failed'));
                              }}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[11px] w-12 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex gap-1.5 justify-center">
                            {['starter', 'growth', 'pro', 'pro_plus'].map(p => (
                              <button
                                key={p}
                                onClick={() => handleSetPackage(g.gymKey, p)}
                                className={`px-2 py-1 rounded text-[9px] font-black tracking-tighter transition-all border ${
                                  (g.package || 'starter') === p
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                {p === 'pro_plus' ? 'PRO+' : p.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleLock(g.gymKey)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border font-black text-[10px] tracking-widest uppercase ${
                                g.isSettingsLocked 
                                  ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                              }`}
                            >
                              {g.isSettingsLocked ? (
                                <><Lock size={14} /> LOCKED</>
                              ) : (
                                <><KeyRound size={14} /> UNLOCKED</>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-right">
                          <button
                            onClick={() => handleToggleBan(g.gymKey)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${
                              g.isActive 
                                ? 'text-red-500 hover:bg-red-500/10 border border-red-500/20' 
                                : 'bg-emerald-600 text-white border border-emerald-500/30'
                            }`}
                          >
                            {g.isActive ? 'Suspend' : 'Amnesty'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
             </table>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <Radio className="text-cyan-400" /> Core Broadcast
              </h2>
              <p className="text-xs text-slate-500 mb-8">Push system notification directly to gym dashboards.</p>

              <form onSubmit={handleSendBroadcast} className="space-y-4 mb-10">
                <textarea
                  required
                  placeholder="Transmission content..."
                  value={broadcastForm.message}
                  onChange={e => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-500 resize-none text-sm leading-relaxed"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select value={broadcastForm.type} onChange={e => setBroadcastForm(f => ({ ...f, type: e.target.value }))} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none text-xs">
                    <option value="info">Status: Info</option>
                    <option value="warning">Status: Warning</option>
                    <option value="alert">Status: Critical</option>
                  </select>

                  <select value={broadcastForm.durationHours} onChange={e => setBroadcastForm(f => ({ ...f, durationHours: e.target.value }))} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none text-xs">
                    <option value={1}>TTL: 1 Hour</option>
                    <option value={24}>TTL: 24 Hours</option>
                    <option value={168}>TTL: 7 Days</option>
                  </select>
                </div>
                
                <div className="flex gap-4">
                  <select value={broadcastForm.recipients} onChange={e => setBroadcastForm(f => ({ ...f, recipients: e.target.value }))} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none text-xs flex-1">
                    <option value="ALL">Global Transmission</option>
                    <option value="SPECIFIC">Targeted Uplink</option>
                  </select>
                  <button type="submit" disabled={sending} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] tracking-widest rounded-xl px-8 py-3 flex items-center gap-2 justify-center transition-all uppercase shadow-[0_0_20px_rgba(8,145,178,0.2)]">
                    <Megaphone size={14} /> Send
                  </button>
                </div>

                {broadcastForm.recipients === 'SPECIFIC' && (
                  <input
                    placeholder="Enter gym IDs: GYM-01, GYM-02"
                    value={broadcastForm.specificKeys}
                    onChange={e => setBroadcastForm(f => ({ ...f, specificKeys: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none text-xs"
                  />
                )}
              </form>

              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Active Streams</h3>
              <div className="space-y-3">
                {broadcasts.length === 0 ? (
                  <p className="text-slate-600 text-xs italic">No active data streams.</p>
                ) : (
                  broadcasts.map(b => (
                    <div key={b.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800 group">
                      <div className="flex-1">
                        <p className="text-slate-300 text-xs leading-relaxed">{b.message}</p>
                        <div className="flex gap-3 mt-2">
                           <span className="text-[9px] font-bold text-slate-600 uppercase tabular-nums">EXP: {new Date(b.expires_at).toLocaleDateString()}</span>
                           <span className="text-[9px] font-bold text-cyan-600/50 uppercase">TYPE: {b.type}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteBroadcast(b.id)} className="text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <Activity className="text-purple-400" /> Traffic Analysis
              </h2>
              <p className="text-xs text-slate-500 mb-8">Message throughput across all nodes (last 7D).</p>
              
              <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="pr-2 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="py-4 px-2">Node</th>
                      <th className="py-4 px-2 text-right">Volume</th>
                      <th className="py-4 px-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msgStats.length === 0 ? (
                      <tr><td colSpan="3" className="py-12 text-center text-slate-600 text-xs italic">No message traffic detected.</td></tr>
                    ) : (
                      msgStats.map((row, i) => {
                        const color = row.count <= 20 ? '#10b981' : row.count <= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <tr key={i} className="border-b border-slate-800/50">
                            <td className="py-3 px-2">
                               <div className="font-bold text-slate-300 text-[11px]">{row.gymKey}</div>
                               <div className="text-[9px] text-slate-600">{row.date}</div>
                            </td>
                            <td className="py-3 px-2 text-right font-black text-xs tabular-nums text-slate-200">{row.count}</td>
                            <td className="py-3 px-2 text-right">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                style={{ color, background: `${color}10`, border: `1px solid ${color}20` }}>
                                {row.count <= 20 ? 'NOMINAL' : row.count <= 40 ? 'HIGH' : 'STRESS'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>

      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}