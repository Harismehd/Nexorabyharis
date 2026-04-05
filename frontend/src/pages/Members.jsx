import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, DollarSign, RefreshCcw, Phone, Calendar, User, Printer, CheckCircle, Package, Clock, Eye, X } from 'lucide-react';
import printReceiptHtml from '../utils/printReceipt';
import LockedOverlay from '../components/LockedOverlay';

export default function Members() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [memberPayments, setMemberPayments] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [profile, setProfile] = useState(null);
  const [newMember, setNewMember] = useState({ 
    name: '', phone: '', email: '', joiningDate: '', subscriptionType: 'monthly', 
    amount: '', packageId: '', packageName: '' 
  });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', monthsCovered: 1 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, pRes] = await Promise.all([
          api.get(`/members?gymKey=${gymKey}`),
          api.get(`/profile?gymKey=${gymKey}`)
        ]);
        setMembers(mRes.data.members || []);
        setProfile(pRes.data.profile || null);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gymKey]);

  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.phone || '').includes(searchTerm)
  );

  const activeCount = filteredMembers.filter(m => m.status === 'Active').length;
  const dueCount = filteredMembers.filter(m => m.status !== 'Active').length;

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    // Pakistani Phone Validation (03xx-xxxxxxx or +92xxxxxxxxxx)
    const phoneRegex = /^(03[0-9]{9}|\+92[0-9]{10})$/;
    if (!phoneRegex.test(newMember.phone.replace(/[\s-]/g, ''))) {
      return toast.error('Invalid Pakistani phone number (03XXXXXXXXX)');
    }

    // Gmail Validation (Optional but recommended for quality)
    if (newMember.email && !newMember.email.toLowerCase().endsWith('@gmail.com')) {
       // Just a warning or strict? Let's make it a warning for now but inform.
       // toast.error('Only @gmail.com addresses are accepted for automation');
       // return;
    }

    try {
      const res = await api.post('/members', { gymKey, ...newMember });
      toast.success(res.data.message || 'Member added');
      setShowAddModal(false);
      setNewMember({ name: '', phone: '', email: '', joiningDate: '', subscriptionType: 'monthly', amount: '' });
      const memRes = await api.get(`/members?gymKey=${gymKey}`);
      setMembers(memRes.data.members || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    try {
      await api.delete(`/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Member deleted');
    } catch { toast.error('Failed to delete member'); }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'Active' ? 'Dues' : 'Active';
    try {
      const res = await api.put(`/members/${member.id}/status`, { gymKey, status: newStatus });
      toast.success(res.data.message || `Marked as ${newStatus === 'Active' ? 'Paid' : 'Unpaid'}`);
      setMembers(prev => prev.map(m => m.id === member.id ? res.data.member : m));
    } catch { toast.error('Failed to update status'); }
  };

  const handleCheckIn = async (member) => {
    try {
      const res = await api.put(`/members/${member.id}/checkin`, { gymKey });
      toast.success(`${member.name} checked in!`);
      // Update state with returned check-in data
      setMembers(prev => prev.map(m => m.id === member.id ? { 
        ...m, 
        lastVisit: res.data.lastVisit, 
        lastVisitFormatted: res.data.lastVisitFormatted 
      } : m));
    } catch { toast.error('Check-in failed'); }
  };

  const openPayModal = (member) => {
    setSelectedMember(member);
    setPaymentForm({ amount: member.amount || '', method: 'Cash', monthsCovered: 1 });
    setShowPayModal(true);
  };

  const openDetailModal = async (member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/payments?gymKey=${gymKey}`);
      const filtered = (res.data.payments || []).filter(p => p.memberId === member.id);
      setMemberPayments(filtered.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)));
    } catch {
      toast.error('Failed to load payment history');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const res = await api.post('/payments', { gymKey, memberId: selectedMember.id, ...paymentForm });
      toast.success(res.data.message || 'Payment recorded');
      const memRes = await api.get(`/members?gymKey=${gymKey}`);
      setMembers(memRes.data.members || []);
      setShowPayModal(false);
      setSelectedMember(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to record payment'); }
  };

  const handlePrintLatestReceipt = async (member) => {
    try {
      const [payRes, profRes] = await Promise.all([
        api.get(`/payments?gymKey=${gymKey}`),
        api.get(`/profile?gymKey=${gymKey}`)
      ]);
      const latest = (payRes.data.payments || [])
        .filter(p => p.memberId === member.id)
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
      if (!latest) return toast.error('No payment found for this member');
      printReceiptHtml(latest, profRes.data.profile || {}, member);
    } catch { toast.error('Failed to print receipt'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const avatarColors = [
    'linear-gradient(135deg, #0070c4, #00d4ff)',
    'linear-gradient(135deg, #7c3aed, #a78bfa)',
    'linear-gradient(135deg, #059669, #34d399)',
    'linear-gradient(135deg, #dc2626, #f87171)',
    'linear-gradient(135deg, #d97706, #fbbf24)',
    'linear-gradient(135deg, #0891b2, #67e8f9)',
  ];

  const getAvatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#475569' }}>
      Loading members...
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9' }}>Members</h1>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '6px' }}>Manage your gym members and track dues.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} /> Add New Member
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Members', value: filteredMembers.length, color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)' },
          { label: 'Active', value: activeCount, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
          { label: 'Due', value: dueCount, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.bg, border: `1px solid ${stat.border}`,
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: stat.color, fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>{stat.label}</span>
            <span style={{ fontSize: '28px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} size={16} />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="input-field"
          style={{ paddingLeft: '42px', fontSize: '14px' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px', color: '#334155',
          background: '#0e1622', borderRadius: '16px', border: '1px solid #1a2540'
        }}>
          <User size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>No members found</p>
        </div>
      ) : (
        <div className="custom-scrollbar" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
          maxHeight: 'calc(100vh - 320px)',
          overflowY: 'auto',
          paddingRight: '8px',
          paddingBottom: '20px'
        }}>
          {filteredMembers.map((m, index) => {
            const isPaid = m.status === 'Active';
            const statusColor = isPaid ? '#34d399' : '#f87171';
            const statusBg = isPaid ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';
            const statusBorder = isPaid ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)';
            const topBorder = isPaid ? '#34d399' : '#f87171';

            return (
              <div key={m.id} style={{
                background: '#0e1622',
                border: '1px solid #1a2540',
                borderTop: `3px solid ${topBorder}`,
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                animation: `fadeSlideIn 0.4s ease ${index * 30}ms both`
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.3), 0 0 0 1px ${topBorder}30`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Card Header */}
                <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                    background: getAvatarColor(m.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {getInitials(m.name)}
                  </div>

                  {/* Name + Plan */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                      color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      {m.name}
                      <Eye 
                        size={14} 
                        style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }} 
                        onClick={(e) => { e.stopPropagation(); openDetailModal(m); }}
                        onMouseEnter={e => e.target.style.color = '#00d4ff'}
                        onMouseLeave={e => e.target.style.color = '#475569'}
                      />
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: m.packageName ? 'rgba(0, 212, 255, 0.1)' : 'rgba(71, 85, 105, 0.1)',
                        color: m.packageName ? '#00d4ff' : '#94a3b8',
                        border: `1px solid ${m.packageName ? 'rgba(0, 212, 255, 0.2)' : 'rgba(71, 85, 105, 0.2)'}`,
                        fontWeight: 700,
                        fontFamily: 'Syne, sans-serif',
                        textTransform: 'uppercase'
                      }}>
                        {m.packageName || 'Monthly'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>
                        Rs {m.amount || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <button
                    onClick={() => handleToggleStatus(m)}
                    title="Click to toggle status"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '99px', fontSize: '11px',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.05em',
                      color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`,
                      cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0
                    }}
                  >
                    <RefreshCcw size={10} />
                    {isPaid ? 'PAID' : 'DUE'}
                  </button>
                </div>

                {/* Card Details */}
                <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} color="#334155" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>{m.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={13} color="#334155" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>
                      Expires: {m.subscriptionEndDate ? new Date(m.subscriptionEndDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <Clock size={13} color={m.lastVisitFormatted === 'Today' ? '#34d399' : '#334155'} />
                    <span style={{ 
                      fontSize: '12px', 
                      color: m.lastVisitFormatted === 'Today' ? '#34d399' : '#475569', 
                      fontWeight: m.lastVisitFormatted === 'Today' ? 700 : 400
                    }}>
                      Last: {m.lastVisitFormatted || 'Never'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #1a2540',
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  background: '#080d14'
                }}>
                  <button
                    onClick={() => handleCheckIn(m)}
                    disabled={m.lastVisitFormatted === 'Today'}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', padding: '10px', borderRadius: '10px', fontSize: '12px',
                      fontFamily: 'Syne, sans-serif', fontWeight: 800, cursor: m.lastVisitFormatted === 'Today' ? 'default' : 'pointer',
                      background: m.lastVisitFormatted === 'Today' ? 'rgba(52,211,153,0.1)' : 'rgba(0,212,255,0.1)',
                      color: m.lastVisitFormatted === 'Today' ? '#34d399' : '#00d4ff',
                      border: `1px solid ${m.lastVisitFormatted === 'Today' ? 'rgba(52,211,153,0.2)' : 'rgba(0,212,255,0.2)'}`,
                      marginBottom: '4px', transition: 'all 0.2s ease'
                    }}
                  >
                    {m.lastVisitFormatted === 'Today' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {m.lastVisitFormatted === 'Today' ? 'Present Today' : 'Mark Present'}
                  </button>
                  <button
                    onClick={() => openPayModal(m)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', padding: '8px', borderRadius: '10px', fontSize: '12px',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer',
                      background: 'rgba(0,112,196,0.15)', color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,0.2)', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,112,196,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,112,196,0.15)'}
                  >
                    <DollarSign size={14} /> Pay
                  </button>

                  <button
                    onClick={() => handlePrintLatestReceipt(m)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', padding: '8px', borderRadius: '10px', fontSize: '12px',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer',
                      background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                  >
                    <Printer size={14} /> Print
                  </button>

                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      padding: '8px 12px', borderRadius: '10px', fontSize: '12px',
                      cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#f1f5f9', marginBottom: '20px' }}>
              Add New Member
            </h2>
            
            <form onSubmit={handleAddMember} className="space-y-6">
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Full Name</label>
                  <input className="input-field" placeholder="John Doe" value={newMember.name} onChange={e => setNewMember(v => ({ ...v, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Phone Number</label>
                  <input className="input-field" placeholder="03XXXXXXXXX" value={newMember.phone} onChange={e => setNewMember(v => ({ ...v, phone: e.target.value }))} required />
                </div>
              </div>

              {/* Package Selection Grid (Only for Pro/Pro Plus) */}
              {profile?.packages?.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Select Membership Package</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {profile.packages.map(pkg => (
                      <div 
                        key={pkg.id}
                        onClick={() => setNewMember(prev => ({ 
                          ...prev, 
                          packageId: pkg.id, 
                          packageName: pkg.name,
                          amount: pkg.price,
                          subscriptionType: pkg.duration === 'custom' ? `${pkg.customDays} days` : pkg.duration
                        }))}
                        style={{
                          background: newMember.packageId === pkg.id ? 'rgba(0,212,255,0.1)' : '#080d14',
                          border: `1px solid ${newMember.packageId === pkg.id ? '#00d4ff' : '#1a2540'}`,
                          borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {newMember.packageId === pkg.id && (
                          <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#00d4ff', borderRadius: '50%', padding: '2px' }}>
                            <CheckCircle size={14} color="#080d14" />
                          </div>
                        )}
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px 0' }}>{pkg.name}</h4>
                        <p style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600, margin: 0 }}>Rs {pkg.price}</p>
                        <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0 0 0' }}>{pkg.duration}</p>
                      </div>
                    ))}
                    <div 
                      onClick={() => setNewMember(prev => ({ ...prev, packageId: '', packageName: '', amount: '', subscriptionType: 'monthly' }))}
                      style={{
                        background: !newMember.packageId ? 'rgba(100,116,139,0.1)' : '#080d14',
                        border: `1px solid ${!newMember.packageId ? '#64748b' : '#1a2540'}`,
                        borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 700, color: !newMember.packageId ? '#f1f5f9' : '#475569' }}>Manual Entry</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Subscription Duration</label>
                  <select className="input-field" value={newMember.subscriptionType} onChange={e => setNewMember(v => ({ ...v, subscriptionType: e.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Monthly Fee (PKR)</label>
                  <input className="input-field" placeholder="5000" value={newMember.amount} onChange={e => setNewMember(v => ({ ...v, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Joining Date</label>
                  <input className="input-field" type="date" value={newMember.joiningDate} onChange={e => setNewMember(v => ({ ...v, joiningDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Email (Optional)</label>
                  <input className="input-field" placeholder="alex@example.com" value={newMember.email} onChange={e => setNewMember(v => ({ ...v, email: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', pt: '16px', borderTop: '1px solid #1a2540' }}>
                <button type="button" className="btn-secondary px-6" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary px-8">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedMember && (
        <div style={{
          position: 'fixed', inset: 0, zGenerateSessionId: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#f1f5f9', marginBottom: '6px' }}>
              Record Payment
            </h2>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '20px', padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: getAvatarColor(selectedMember.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', color: 'white'
              }}>
                {getInitials(selectedMember.name)}
              </div>
              <div>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9', fontSize: '14px', margin: 0 }}>{selectedMember.name}</p>
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>{selectedMember.phone}</p>
              </div>
            </div>
            <form onSubmit={handleRecordPayment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <input className="input-field" type="number" placeholder="Amount (Rs)" value={paymentForm.amount} onChange={e => setPaymentForm(v => ({ ...v, amount: e.target.value }))} required />
              <select className="input-field" value={paymentForm.method} onChange={e => setPaymentForm(v => ({ ...v, method: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Bank">Bank Transfer</option>
              </select>
              <input className="input-field" type="number" min="1" placeholder="Months Covered" value={paymentForm.monthsCovered} onChange={e => setPaymentForm(v => ({ ...v, monthsCovered: e.target.value }))} />
              <div />
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowPayModal(false); setSelectedMember(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Detail Modal (Task 6) */}
      {showDetailModal && selectedMember && (
        <div style={{
          position: 'fixed', inset: 0, zGenerateSessionId: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => { setShowDetailModal(false); setSelectedMember(null); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px', flexShrink: 0,
                background: getAvatarColor(selectedMember.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: 'white',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}>
                {getInitials(selectedMember.name)}
              </div>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: '#f1f5f9', margin: '0 0 4px 0' }}>
                  {selectedMember.name}
                </h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#00d4ff', fontWeight: 600 }}>{selectedMember.phone}</span>
                  <span style={{ fontSize: '14px', color: '#475569' }}>•</span>
                  <span style={{ fontSize: '14px', color: '#475569' }}>Joined: {new Date(selectedMember.joiningDate || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="glass-pane" style={{ padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Current Plan</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={20} color="#00d4ff" />
                  <div>
                    <p style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: 700, margin: 0 }}>{selectedMember.packageName || 'Manual'}</p>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>Rs {selectedMember.amount} / {selectedMember.subscriptionType}</p>
                  </div>
                </div>
              </div>
              <div className="glass-pane" style={{ padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Subscription End</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} color={selectedMember.status === 'Active' ? '#34d399' : '#f87171'} />
                  <div>
                    <p style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: 700, margin: 0 }}>
                      {selectedMember.subscriptionEndDate ? new Date(selectedMember.subscriptionEndDate).toLocaleDateString() : 'No Payment'}
                    </p>
                    <p style={{ fontSize: '13px', color: selectedMember.status === 'Active' ? '#34d399' : '#f87171', margin: 0 }}>
                      Status: {selectedMember.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#f1f5f9', marginBottom: '16px' }}>
              Payment History
            </h3>
            <div style={{ background: '#080d14', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1a2540' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Method</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {memberPayments.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#334155 italic' }}>No payment records found</td>
                    </tr>
                  ) : (
                    memberPayments.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: '1px solid #1a2540' }}>
                        <td style={{ padding: '12px 16px', color: '#f1f5f9' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 700 }}>Rs {p.amount}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{p.method}</td>
                        <td style={{ padding: '12px 16px', color: '#00d4ff' }}>{p.receiptNumber}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => { setShowDetailModal(false); setSelectedMember(null); }}
                style={{ padding: '10px 24px' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}