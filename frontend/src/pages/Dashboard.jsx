import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
} from 'recharts';
import { 
  Banknote, TrendingUp, CreditCard, AlertCircle, 
  Users, Calendar, BarChart3, Activity, ArrowUpRight,
  Crown, Zap, Flame, Target, Layers, Lock, Megaphone, Info, AlertTriangle, AlertOctagon,
  BadgeDollarSign, X, History
} from 'lucide-react';
import LockedOverlay from '../components/LockedOverlay';

function DailyClosingModal({ show, onClose, payments, members }) {
  if (!show) return null;

  const today = new Date().toISOString().slice(0, 10);
  
  // 1. Calculate Multi-Method Payments
  const paymentsToday = payments.filter(p => (p.paymentDate || '').startsWith(today));
  const totalCollectedToday = paymentsToday.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  
  const cashToday = paymentsToday.filter(p => {
    const m = String(p.method || '').toLowerCase();
    return m === 'cash';
  });
  const totalCashCollected = cashToday.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  
  // 2. Clear Pending Dues calculation
  const dueMembers = members.filter(m => {
    if (!m.subscriptionEndDate) return true;
    return new Date(m.subscriptionEndDate) < new Date();
  });
  const dueSum = dueMembers.reduce((s, m) => s + parseFloat(m.amount || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="card animate-in zoom-in-95 duration-300" style={{ maxWidth: '420px', width: '100%', border: '1px solid rgba(0, 212, 255, 0.2)', padding: '32px', position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-8">
           <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '12px', borderRadius: '16px', color: '#34d399' }}>
              <BadgeDollarSign size={28} />
           </div>
           <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>Daily Cash Closing</h2>
              <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
           </div>
        </div>

        <div className="space-y-4">
           {/* Detailed Metrics */}
           <div className="space-y-3">
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>💰 Cash Collected Today</p>
                 <p style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', margin: 0 }}>Rs. {totalCashCollected.toLocaleString()}</p>
                 <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{cashToday.length} cash entries</p>
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>💳 Total Collected (All Methods)</p>
                 <p style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Rs. {totalCollectedToday.toLocaleString()}</p>
                 <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{paymentsToday.length} total transactions</p>
              </div>
              
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
                 <p style={{ fontSize: '10px', color: '#00d4ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>💵 Expected Cash in Drawer</p>
                 <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0 }}>Rs. {totalCashCollected.toLocaleString()}</p>
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                 <p style={{ fontSize: '10px', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>⚠️ Pending Dues</p>
                 <p style={{ fontSize: '20px', fontWeight: 800, color: '#f87171', margin: 0 }}>Rs. {dueSum.toLocaleString()}</p>
                 <p style={{ fontSize: '10px', color: '#f87171', fontWeight: 700 }}>{dueMembers.length} members outstanding</p>
              </div>
           </div>

           <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
              <History size={16} color="#fbbf24" />
              <p style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, margin: 0 }}>Match your physical cash drawer with the "Expected" total above.</p>
           </div>
        </div>

        <button onClick={onClose} className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs tracking-widest rounded-xl transition-all uppercase">
          Close Report
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { gymKey, packageTier } = useAuth();
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdvancedLocked = packageTier === 'starter' || packageTier === 'growth';
  const canCloseCash = packageTier === 'pro' || packageTier === 'pro_plus';

  useEffect(() => {
    Promise.all([
      api.get(`/members?gymKey=${gymKey}`),
      api.get(`/payments?gymKey=${gymKey}`),
      api.get(`/broadcasts?gymKey=${gymKey}`),
      api.get(`/profile?gymKey=${gymKey}`)
    ]).then(([memRes, payRes, broadRes, profRes]) => {
      setMembers(memRes.data.members || []);
      setPayments(payRes.data.payments || []);
      setBroadcasts(broadRes.data.broadcasts || []);
    }).catch(err => {
      console.error('Dashboard Fetch Error:', err);
    }).finally(() => setLoading(false));
  }, [gymKey]);

  const activeCount = members.filter(m => new Date(m.subscriptionEndDate) > new Date()).length;
  const dueCount = members.length - activeCount;
  const totalRevenue = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const curMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = payments.filter(p => p.paymentDate?.startsWith(curMonth)).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const progress = totalRevenue > 0 ? Math.min(100, Math.round((monthRevenue / totalRevenue) * 400)) : 0;

  const revenueTrend = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      if (p.paymentDate) {
        const m = new Date(p.paymentDate).toLocaleString('default', { month: 'short' });
        map[m] = (map[m] || 0) + parseFloat(p.amount || 0);
      }
    });
    return Object.keys(map).map(k => ({ name: k, Revenue: map[k] })).slice(-6);
  }, [payments]);

  const methodData = useMemo(() => {
    const map = {};
    payments.forEach(p => { map[p.method] = (map[p.method] || 0) + parseFloat(p.amount || 0); });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [payments]);

  const growthData = useMemo(() => {
    const map = {};
    members.forEach(m => {
      if (m.joiningDate) {
        const month = new Date(m.joiningDate).toLocaleString('default', { month: 'short' });
        map[month] = (map[month] || 0) + 1;
      }
    });
    return Object.keys(map).map(k => ({ name: k, Members: map[k] }));
  }, [members]);

  const pieData = [
    { name: 'Active', value: activeCount },
    { name: 'Due', value: dueCount }
  ];
  const PIE_COLORS = ['#34d399', '#f87171'];
  const METHOD_COLORS = ['#0c8ee7', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

  const heatmapCells = Array.from({ length: 28 }, (_, i) => ({
    value: Math.random(),
    day: i % 7
  }));

  const cardStyle = {
    background: 'rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '24px',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '12px',
    padding: '12px',
    color: '#f1f5f9',
    fontSize: '12px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)'
  };

  const cardItems = [
    {
      id: 'total_revenue',
      label: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      sub: 'All-Time Collections',
      icon: <Banknote size={24} />,
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      glow: 'rgba(59, 130, 246, 0.4)',
      labelColor: '#93c5fd'
    },
    {
      id: 'current_month_revenue',
      label: 'Current Month Revenue',
      value: `Rs. ${monthRevenue.toLocaleString()}`,
      sub: `Goal progress: ${progress}%`,
      icon: <TrendingUp size={24} />,
      gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
      glow: 'rgba(16, 185, 129, 0.4)',
      labelColor: '#6ee7b7',
      showProgress: true
    },
    {
      id: 'active_subscriptions',
      label: 'Active Subscriptions',
      value: activeCount,
      sub: `Peak this month: ${members.length}`,
      icon: <CreditCard size={24} />,
      gradient: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
      glow: 'rgba(168, 85, 247, 0.4)',
      labelColor: '#d8b4fe'
    },
    {
      id: 'overdue_members',
      label: 'Overdue Members',
      value: dueCount,
      sub: 'Action Required',
      icon: <AlertCircle size={24} />,
      gradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
      glow: 'rgba(239, 68, 68, 0.4)',
      labelColor: '#fca5a5'
    }
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>
      Loading dashboard...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>

      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-premium" style={{ fontWeight: 800, fontSize: '32px', color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
            Nexora Hub
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', opacity: 0.8 }}>Next-Level Gym Intelligence • Fee Automation by Haris</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canCloseCash && (
            <button 
              onClick={() => setShowClosingModal(true)}
              className="glass-pane hover:bg-white/10 transition-all" 
              style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}
            >
              <BadgeDollarSign size={14} />
              Daily Closing
            </button>
          )}
          <div className="glass-pane" style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#00d4ff' }}>
            <Activity size={14} />
            Live System
          </div>
        </div>
      </div>

      <DailyClosingModal 
        show={showClosingModal} 
        onClose={() => setShowClosingModal(false)} 
        payments={payments} 
        members={members} 
      />


      {/* Broadcast System Alerts */}
      {broadcasts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '10px' }}>
          {broadcasts.map(b => {
             const isAlert = b.type === 'alert';
             const isWarning = b.type === 'warning';
             const colors = isAlert 
              ? { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', icon: <AlertOctagon size={18} /> }
              : isWarning
              ? { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', icon: <AlertTriangle size={18} /> }
              : { bg: 'rgba(0, 212, 255, 0.06)', border: 'rgba(0, 212, 255, 0.15)', text: '#00d4ff', icon: <Info size={18} /> };

             return (
               <div key={b.id} className="animate-in fade-in slide-in-from-top-2 duration-500" style={{
                 padding: '16px 20px', borderRadius: '16px', background: colors.bg,
                 border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '14px',
                 boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.1)' : 'none'
               }}>
                 <div style={{ color: colors.text }}>{colors.icon}</div>
                 <div style={{ flex: 1 }}>
                   <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.01em' }}>{b.message}</p>
                   <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: colors.text, opacity: 0.7 }}>
                     System Announcement • {new Date(b.created_at).toLocaleDateString()}
                   </p>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {cardItems.map((card, i) => (
          <div key={i} className="tile-3d" style={{
            background: card.gradient, borderRadius: '24px', padding: '24px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: `0 20px 40px -10px ${card.glow}`,
            cursor: 'default'
          }}>
            {/* Gloss shine */}
            <div style={{
              position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            
            <div className="text-premium" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: card.labelColor, marginBottom: '12px', opacity: 0.9 }}>
              {card.label}
            </div>
            <div className="text-premium" style={{ fontSize: '30px', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '8px' }}>
              {card.value}
            </div>
            <div className="text-premium" style={{ fontSize: '12px', color: card.labelColor, opacity: 0.8 }}>{card.sub}</div>
            
            {card.showProgress && (
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', marginTop: '16px' }}>
                <div style={{ height: '100%', width: `${progress}%`, borderRadius: '99px', background: '#fff', boxShadow: '0 0 10px #fff', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
            )}
            
            <div style={{
              position: 'absolute', right: '20px', bottom: '20px',
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>

        {/* Revenue Trend */}
        <div style={cardStyle}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-premium" style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Monthly Revenue Trend
            </h3>
            <div className="flex gap-2">
              <span style={{ fontSize: '10px', color: '#00d4ff', background: 'rgba(0,212,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>+12.5%</span>
            </div>
          </div>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} dx={-10} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(0,212,255,0.2)', strokeWidth: 2 }} />
                <Area 
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#00d4ff" 
                  strokeWidth={4} 
                  fill="url(#revGrad)" 
                  dot={{ fill: '#00d4ff', stroke: '#fff', strokeWidth: 2, r: 5 }} 
                  activeDot={{ r: 8, fill: '#fff', stroke: '#00d4ff', strokeWidth: 3 }} 
                  filter="url(#glow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>No data yet</div>
          )}
        </div>

        {/* Member Distribution */}
        <LockedOverlay isLocked={isAdvancedLocked} message="Upgrade to Pro for advanced distribution metrics">
          <div style={{ ...cardStyle, height: '100%' }}>
            <h3 className="text-premium" style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 24px' }}>
              Member Distribution
            </h3>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={95} 
                    paddingAngle={8} 
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {pieData.map((_, i) => (
                      <Cell 
                        key={i} 
                        fill={PIE_COLORS[i % PIE_COLORS.length]} 
                        stroke="rgba(255,255,255,0.1)" 
                        strokeWidth={1}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{members.length}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              {pieData.map((d, i) => (
                <div key={i} className="glass-pane" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: PIE_COLORS[i], boxShadow: `0 0 10px ${PIE_COLORS[i]}40` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{d.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LockedOverlay>
      </div>

      {/* Bottom 3 widgets Wrapped in LockedOverlay */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

        {/* Membership Growth */}
        <LockedOverlay isLocked={isAdvancedLocked} message="Upgrade to Pro for growth insights">
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} color="#a855f7" />
              <h3 className="text-premium" style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Membership Growth
              </h3>
            </div>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="Members" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>No data yet</div>
            )}
          </div>
        </LockedOverlay>

        {/* Class Popularity */}
        <LockedOverlay isLocked={isAdvancedLocked} message="Upgrade to Pro for popularity tracking">
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} color="#3b82f6" />
              <h3 className="text-premium" style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Class Popularity
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[
                { name: 'CrossFit', val: 85 },
                { name: 'Yoga', val: 65 },
                { name: 'Spin', val: 45 },
                { name: 'HIIT', val: 95 },
                { name: 'Boxing', val: 75 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <Cell key={i} fill={`url(#barGrad${i})`} />
                  ))}
                </Bar>
                <defs>
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LockedOverlay>

        {/* Attendance Heatmap */}
        <LockedOverlay isLocked={isAdvancedLocked} message="Upgrade to Pro for intensity maps">
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} color="#00d4ff" />
              <h3 className="text-premium" style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Attendance Heatmap
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '8px' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 700 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
              {heatmapCells.map((cell, i) => (
                <div key={i} style={{
                  height: '18px', borderRadius: '4px',
                  background: cell.value > 0.7 ? '#00d4ff' : cell.value > 0.4 ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.05)',
                  boxShadow: cell.value > 0.7 ? '0 0 10px rgba(0,212,255,0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }} 
                title={`Activity: ${Math.round(cell.value * 100)}%`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
              <span>Less Active</span><span>Peak Hours</span>
            </div>
          </div>
        </LockedOverlay>
      </div>
    </div>
  );
}