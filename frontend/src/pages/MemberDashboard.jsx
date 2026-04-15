import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
  User, Phone, Calendar, ShieldCheck, 
  CreditCard, History, MapPin, PhoneCall, 
  Download, LogOut, Dumbbell, Zap, Activity
} from 'lucide-react';
import printReceiptHtml from '../utils/printReceipt';
import toast from 'react-hot-toast';

export default function MemberDashboard() {
  const { gymKey, memberPhone, memberId, logout } = useAuth();
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inactivity Logout (30 minutes)
  useEffect(() => {
    let timeoutId;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        toast.error('Session expired due to inactivity');
        logout();
      }, 30 * 60 * 1000); 
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [logout]);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, payRes, attRes] = await Promise.all([
        api.get(`/member/me?gymKey=${gymKey}&phone=${memberPhone}`),
        api.get(`/member/payments?gymKey=${gymKey}&memberId=${memberId}`),
        api.get(`/member/attendance?gymKey=${gymKey}&memberId=${memberId}&phone=${memberPhone}`)
      ]);
      setData(meRes.data);
      setPayments(payRes.data.payments || []);
      setAttendance(attRes.data.attendance || []);
    } catch (err) {
      console.error('Fetch Error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [gymKey, memberPhone, memberId]);

  useEffect(() => {
    if (gymKey && memberPhone && memberId) {
      fetchData();
    }
  }, [fetchData, gymKey, memberPhone, memberId]);

  const handlePrint = (payment) => {
    if (!data?.profile) return;
    printReceiptHtml(payment, data.gymInfo, data.profile);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050a10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
      Loading your portal...
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#050a10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
      Error loading information. Please try logging in again.
    </div>
  );

  const { profile, gymInfo } = data;

  const cardStyle = {
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '24px',
    backdropFilter: 'blur(16px)',
  };

  return (
    <div style={{ 
      minHeight: '100vh', background: '#050a10', color: '#f1f5f9',
      padding: '40px 20px', fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Dumbbell size={28} color="#00d4ff" />
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: 800, margin: 0 }}>
                NEXORA <span style={{ color: '#00d4ff' }}>MEMBER PORTAL</span>
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Authenticated access reserved for {profile.name}</p>
          </div>
          <button 
            onClick={logout}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
           <LogOut size={16} /> Logout
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          
          {/* Profile Card */}
          <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.05 }}>
              <User size={120} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #00d4ff, #0072ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#050a10" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{profile.name}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Member since {new Date(profile.joiningDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div style={{ spaceY: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
                <Phone size={14} color="#00d4ff" /> {profile.phone}
              </div>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '6px', 
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                background: profile.status === 'Active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: profile.status === 'Active' ? '#34d399' : '#f87171',
                border: profile.status === 'Active' ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <ShieldCheck size={12} /> {profile.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Package Card */}
          <div style={{ ...cardStyle }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{profile.packageName}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Active Subscription</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 4px 0' }}>Current Fee</p>
                <p style={{ fontSize: '24px', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>Rs. {profile.amount}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 4px 0' }}>Expires On</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: profile.status === 'Active' ? '#34d399' : '#f87171', margin: 0 }}>
                  {profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Gym Info Card */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={20} color="#94a3b8" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{gymInfo.name}</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
              {gymInfo.address}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#00d4ff', fontWeight: 700 }}>
              <PhoneCall size={14} /> {gymInfo.contact}
            </div>
          </div>
        </div>

        {/* History Tabs / Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          
          {/* Payment History */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <History size={20} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Payment History</h3>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '12px 8px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 8px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '12px 8px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Method</th>
                    <th style={{ padding: '12px 8px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length > 0 ? payments.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 8px', fontSize: '13px' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', fontWeight: 700 }}>Rs. {p.amount}</td>
                      <td style={{ padding: '14px 8px', fontSize: '12px', color: '#94a3b8' }}>{p.method}</td>
                      <td style={{ padding: '14px 8px' }}>
                        <button 
                          onClick={() => handlePrint(p)}
                          style={{ 
                            background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700
                          }}
                        >
                          <Download size={12} /> Receipt
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: '#475569', fontSize: '14px' }}>
                        No payment records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance History */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Activity size={20} color="#fbbf24" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Attendance</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {attendance.length > 0 ? attendance.slice(0, 10).map((a, index) => (
                <div key={index} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={14} color="#64748b" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(a.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569', fontSize: '14px' }}>
                  No check-ins recorded
                </div>
              )}
            </div>
          </div>

        </div>

        <p style={{ textAlign: 'center', marginTop: '60px', fontSize: '11px', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          NEXORA OPERATING SYSTEM © 2026 — POWERED BY HARIS MEHMOOD
        </p>
      </div>
    </div>
  );
}
