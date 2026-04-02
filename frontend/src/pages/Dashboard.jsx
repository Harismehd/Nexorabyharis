import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
} from 'recharts';

export default function Dashboard() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/members?gymKey=${gymKey}`),
      api.get(`/payments?gymKey=${gymKey}`)
    ]).then(([memRes, payRes]) => {
      setMembers(memRes.data.members || []);
      setPayments(payRes.data.payments || []);
    }).catch(console.error).finally(() => setLoading(false));
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
    background: 'rgba(14,22,34,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '18px',
    padding: '20px',
    backdropFilter: 'blur(12px)'
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(14,22,34,0.95)',
    border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '12px'
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>
      Loading dashboard...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9', margin: 0 }}>
          Financial Reports & Insights
        </h1>
        <p style={{ color: '#475569', fontSize: '13px', marginTop: '6px' }}>A Comprehensive View of Gym Performance</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          {
            label: 'Total Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`,
            sub: 'All-Time Collections', icon: '💰',
            gradient: 'linear-gradient(135deg, #1e3a6e 0%, #1a56a0 100%)',
            labelColor: '#93c5fd', extra: null
          },
          {
            label: 'Current Month Revenue', value: `Rs. ${monthRevenue.toLocaleString()}`,
            sub: `Goal progress: ${progress}%`, icon: '📈',
            gradient: 'linear-gradient(135deg, #064e3b 0%, #0d7a5a 100%)',
            labelColor: '#6ee7b7', extra: 'progress'
          },
          {
            label: 'Active Subscriptions', value: activeCount,
            sub: `Peak this month: ${members.length}`, icon: '💳',
            gradient: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)',
            labelColor: '#d8b4fe', extra: null
          },
          {
            label: 'Overdue Members', value: dueCount,
            sub: 'Action Required', icon: '⚠️',
            gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
            labelColor: '#fca5a5', extra: null
          }
        ].map((card, i) => (
          <div key={i} style={{
            background: card.gradient, borderRadius: '18px', padding: '20px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'transform 0.2s ease', cursor: 'default'
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: card.labelColor, marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '26px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '11px', color: card.labelColor, opacity: 0.7, marginTop: '6px' }}>{card.sub}</div>
            {card.extra === 'progress' && (
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px', marginTop: '10px' }}>
                <div style={{ height: '100%', width: `${progress}%`, borderRadius: '99px', background: 'rgba(255,255,255,0.6)', transition: 'width 1s ease' }} />
              </div>
            )}
            <div style={{
              position: 'absolute', right: '16px', top: '16px',
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '22px'
            }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

        {/* Revenue Trend */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Monthly Revenue Trend
          </h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0c8ee7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0c8ee7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#00d4ff' }} />
                <Area type="monotone" dataKey="Revenue" stroke="#0c8ee7" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#00d4ff', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#00d4ff' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '13px' }}>No data yet</div>
          )}
        </div>

        {/* Member Distribution */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Member Distribution
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} stroke="#080d14" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PIE_COLORS[i] }} />
                {d.name} {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 3 widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

        {/* Membership Growth */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Membership Growth
          </h3>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="Members" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '12px' }}>No data yet</div>
          )}
        </div>

        {/* Revenue by Method */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Revenue by Method
          </h3>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {methodData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '12px' }}>No data yet</div>
          )}
        </div>

        {/* Activity Heatmap */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Activity Heatmap
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '6px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ fontSize: '9px', color: '#334155', textAlign: 'center', fontWeight: 700 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {heatmapCells.map((cell, i) => (
              <div key={i} style={{
                height: '16px', borderRadius: '3px',
                background: `rgba(0,212,255,${(0.08 + cell.value * 0.85).toFixed(2)})`
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', color: '#334155' }}>
            <span>Less</span><span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}