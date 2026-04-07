import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Save, Store, Bell, Wallet, Lock, Plus, Trash2, Edit2, Check, Package as PackageIcon } from 'lucide-react';

const PACKAGE_BADGES = {
  starter: { label: 'Starter', color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
  growth: { label: 'Growth', color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  pro: { label: 'Pro', color: '#00d4ff', bg: 'rgba(0,212,255,0.15)', border: 'rgba(0,212,255,0.3)' },
  pro_plus: { label: 'Pro Plus ⭐', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' }
};

function UpgradeBadge({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 14px', borderRadius: '10px',
      background: 'rgba(251,191,36,0.06)',
      border: '1px solid rgba(251,191,36,0.2)',
      fontSize: '13px', color: '#fbbf24'
    }}>
      <Lock size={14} />
      {message}
    </div>
  );
}

export default function Settings() {
  const { gymKey } = useAuth();
  const [profile, setProfile] = useState({
    name: '', address: '', contact: '', email: '', taxReg: '', footerMessage: '',
    autoMessagingEnabled: false, reminderIntervals: [1, 3, 7], template: '',
    paymentSettings: { methods: ['easypaisa'], easypaisaNumber: '', jazzcashNumber: '', bankTitle: '', bankIban: '' },
    package: 'starter',
    packages: []
  });
  const [members, setMembers] = useState([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({
    id: '', name: '', description: '', duration: 'monthly', customDays: '', 
    price: '', discountType: 'none', discountValue: '', badgeColor: '#00d4ff', isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/profile?gymKey=${gymKey}`);
        if (res.data.profile) setProfile(p => ({ ...p, ...res.data.profile }));
      } catch {} finally { setLoading(false); }
    };
    const fetchMembers = async () => {
      try {
        const res = await api.get(`/members?gymKey=${gymKey}`);
        setMembers(res.data.members || []);
      } catch {}
    };
    fetchProfile();
    fetchMembers();
  }, [gymKey]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleIntervalChange = (e) => {
    const intervals = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    setProfile(p => ({ ...p, reminderIntervals: intervals }));
  };

  const handleSave = async () => {
    // Email Validation (Gmail check)
    if (profile.email && !profile.email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Automated features require a valid @gmail.com address');
      // We don't block saving but we warn. 
      // return; 
    }

    setSaving(true);
    try {
      await api.post('/profile', { gymKey, profile });
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const toggleMethod = (method) => {
    setProfile(prev => {
      const current = prev.paymentSettings?.methods || [];
      const methods = current.includes(method) ? current.filter(m => m !== method) : [...current, method];
      return { ...prev, paymentSettings: { ...prev.paymentSettings, methods: methods.length ? methods : [method] } };
    });
  };

  const handlePaymentField = (name, value) => {
    setProfile(prev => ({ ...prev, paymentSettings: { ...prev.paymentSettings, [name]: value } }));
  };

  const openPackageModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({ ...pkg });
    } else {
      setEditingPackage(null);
      setPackageForm({
        id: Math.random().toString(36).substr(2, 9),
        name: '', description: '', duration: 'monthly', customDays: '', 
        price: '', discountType: 'none', discountValue: '', badgeColor: '#00d4ff', isActive: true
      });
    }
    setShowPackageModal(true);
  };

  const handleSavePackage = () => {
    if (!packageForm.name || !packageForm.price) return toast.error('Name and Price are required');
    
    setProfile(prev => {
      const currentPackages = prev.packages || [];
      let updated;
      if (editingPackage) {
        updated = currentPackages.map(p => p.id === editingPackage.id ? packageForm : p);
      } else {
        updated = [...currentPackages, packageForm];
      }
      return { ...prev, packages: updated };
    });
    setShowPackageModal(false);
  };

  const deletePackage = (id) => {
    const usageCount = members.filter(m => m.packageId === id).length;
    let msg = 'Delete this package?';
    if (usageCount > 0) msg = `This package is used by ${usageCount} members. Deleting it will not affect them but you won't be able to assign it to new members. Proceed?`;
    
    if (!window.confirm(msg)) return;
    setProfile(prev => ({ ...prev, packages: (prev.packages || []).filter(p => p.id !== id) }));
  };

  if (loading) return <div style={{ color: '#475569', padding: '32px' }}>Loading settings...</div>;

  const pkg = profile.package || 'starter';
  const isGrowth = pkg === 'growth' || pkg === 'pro' || pkg === 'pro_plus';
  const isPro = pkg === 'pro' || pkg === 'pro_plus';
  const badge = PACKAGE_BADGES[pkg] || PACKAGE_BADGES.starter;

  return (
    <>
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9' }}>
                Gym Settings
              </h1>
              <span style={{
                padding: '4px 12px', borderRadius: '99px', fontSize: '12px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.05em',
                color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`
              }}>
                {badge.label}
              </span>
            </div>
            <p style={{ color: '#475569', fontSize: '14px' }}>Manage your gym profile, automated sending, and message templates.</p>
            {profile.isSettingsLocked === true && (
              <div className="mt-4 flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-bold shadow-[0_0_20px_rgba(245,158,11,0.05)] animate-pulse">
                <Lock size={16} /> 
                <span>Access Restrict: This configuration is currently locked by NEXORA Master Admin.</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || profile.isSettingsLocked === true} 
            className={`btn-primary px-8 shadow-[0_0_20px_rgba(37,99,235,0.2)] ${profile.isSettingsLocked === true ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        <div className={`custom-scrollbar pr-4 ${profile.isSettingsLocked === true ? 'pointer-events-none' : ''}`} style={{ 
          maxHeight: 'calc(100vh - 250px)', 
          overflowY: 'auto',
          paddingBottom: '40px',
          filter: profile.isSettingsLocked === true ? 'grayscale(0.5) opacity(0.8)' : 'none'
        }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {profile.isSettingsLocked === true && (
              <div className="absolute inset-0 z-50 rounded-2xl flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
                 <div className="bg-slate-900/90 p-8 rounded-3xl border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 border-dashed">
                    <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
                      <Lock size={40} className="text-amber-500" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-white font-black text-xl uppercase tracking-tighter">Vault Protocol Active</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-[240px]">This node's configuration is read-only. Contact Master Admin for modifications.</p>
                    </div>
                 </div>
              </div>
            )}

            {/* Gym Profile */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                <div style={{ background: 'rgba(0,112,196,0.15)', padding: '8px', borderRadius: '10px' }}>
                  <Store size={20} color="#0c8ee7" />
                </div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Gym Profile</h2>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Gym Name *</label>
                <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="input-field" placeholder="E.g. Titan Fitness" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Address</label>
                <textarea name="address" value={profile.address || ''} onChange={handleChange} className="input-field" style={{ height: '80px', resize: 'vertical' }} placeholder="Full gym address..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Contact No.</label>
                  <input type="text" name="contact" value={profile.contact || ''} onChange={handleChange} className="input-field" placeholder="03XXXXXXXXX" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Email</label>
                  <input type="email" name="email" value={profile.email || ''} onChange={handleChange} className="input-field" placeholder="gym@gmail.com" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tax Reg. No.</label>
                <input type="text" name="taxReg" value={profile.taxReg || ''} onChange={handleChange} className="input-field" placeholder="Optional" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Receipt Footer Message</label>
                <input type="text" name="footerMessage" value={profile.footerMessage || ''} onChange={handleChange} className="input-field" placeholder="e.g. Thanks for choosing us!" />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Offer Craft - Package Builder */}
              <div className="card">
                <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ background: 'rgba(0,212,255,0.15)', padding: '8px', borderRadius: '10px' }}>
                      <PackageIcon size={20} color="#00d4ff" />
                    </div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Offer Craft</h2>
                  </div>
                  {isPro && (
                    <button onClick={() => openPackageModal()} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={(pkg === 'pro' && (profile.packages?.length >= 3)) || (pkg === 'pro_plus' && (profile.packages?.length >= 7))}>
                      <Plus size={14} /> Add Package
                    </button>
                  )}
                </div>

                {!isPro ? (
                  <UpgradeBadge message="Upgrade to Pro or Pro Plus to build custom plans." />
                ) : (
                  <div className="space-y-4">
                    {(profile.packages || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', background: '#080d14', borderRadius: '12px', border: '1px dashed #1a2540' }}>
                        <p style={{ fontSize: '13px', color: '#475569' }}>No custom packages created yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {profile.packages.map(p => (
                          <div key={p.id} style={{ background: '#080d14', border: '1px solid #1a2540', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="flex items-center gap-3">
                              <div style={{ width: '4px', height: '32px', background: p.badgeColor, borderRadius: '4px' }} />
                              <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{p.name}</h4>
                                <p style={{ fontSize: '11px', color: '#475569' }}>Rs {p.price} • {p.duration} • {members.filter(m => m.packageId === p.id).length} members</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => openPackageModal(p)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                              <button onClick={() => deletePackage(p.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: '16px' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>PACKAGE LIMITS</span>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>{profile.packages?.length || 0} / {pkg === 'pro_plus' ? '7' : '3'}</span>
                      </div>
                      <div style={{ height: '4px', background: '#1a2540', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${((profile.packages?.length || 0) / (pkg === 'pro_plus' ? 7 : 3)) * 100}%`, background: 'linear-gradient(90deg, #0070c4, #00d4ff)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Automated Reminders */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                  <div style={{ background: 'rgba(251,191,36,0.15)', padding: '8px', borderRadius: '10px' }}>
                    <Bell size={20} color="#fbbf24" />
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Automated Reminders</h2>
                </div>

                {!isGrowth ? (
                  <UpgradeBadge message="Upgrade to enable automated reminders." />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Enable Auto-Messaging</h4>
                        <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Automatically send reminders daily for overdue members.</p>
                      </div>
                      <div
                        onClick={() => setProfile(p => ({ ...p, autoMessagingEnabled: !p.autoMessagingEnabled }))}
                        style={{
                          width: '44px', height: '24px', borderRadius: '99px', cursor: 'pointer',
                          background: profile.autoMessagingEnabled ? '#0070c4' : '#1a2540',
                          position: 'relative', transition: 'background 0.2s ease',
                          border: profile.autoMessagingEnabled ? '1px solid #00d4ff40' : '1px solid #1a2540'
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: '2px',
                          left: profile.autoMessagingEnabled ? '22px' : '2px',
                          width: '18px', height: '18px', borderRadius: '50%',
                          background: 'white', transition: 'left 0.2s ease',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Reminder Intervals (Days After Due)</label>
                      <input type="text" value={profile.reminderIntervals?.join(', ') || ''} onChange={handleIntervalChange} className="input-field" placeholder="e.g. 1, 3, 7" />
                    </div>
                  </>
                )}
              </div>

              {/* Message Template */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                  <div style={{ background: 'rgba(16,185,129,0.15)', padding: '8px', borderRadius: '10px' }}>
                    <SettingsIcon size={20} color="#34d399" />
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Message Template</h2>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {['{name}', '{amount}', '{date}'].map(tag => (
                    <span key={tag} style={{ background: '#131f30', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#00d4ff', fontFamily: 'monospace', border: '1px solid #1a2540' }}>{tag}</span>
                  ))}
                </div>
                <textarea name="template" value={profile.template || ''} onChange={handleChange} className="input-field" style={{ height: '120px', resize: 'vertical', marginBottom: '12px', opacity: isPro ? 1 : 0.5 }} placeholder="Hi {name}, your gym fee is due..." disabled={!isPro} />
              </div>

              {/* Payment Settings */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
                  <div style={{ background: 'rgba(139,92,246,0.15)', padding: '8px', borderRadius: '10px' }}>
                    <Wallet size={20} color="#a78bfa" />
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Payment Settings</h2>
                </div>

                {!isGrowth ? (
                  <UpgradeBadge message="Upgrade to configure payment collection." />
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      {['easypaisa', 'jazzcash', 'bank'].map(method => (
                        <button key={method} type="button" onClick={() => toggleMethod(method)} style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'Syne, sans-serif', ...(profile.paymentSettings?.methods?.includes(method) ? { background: 'rgba(0,112,196,0.2)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' } : { background: '#080d14', color: '#475569', border: '1px solid #1a2540' }) }}>{method.toUpperCase()}</button>
                      ))}
                    </div>

                    {profile.paymentSettings?.methods?.includes('easypaisa') && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>EasyPaisa Number</label>
                        <input type="text" className="input-field" value={profile.paymentSettings?.easypaisaNumber || ''} onChange={e => handlePaymentField('easypaisaNumber', e.target.value)} placeholder="03XXXXXXXXX" />
                      </div>
                    )}
                    {profile.paymentSettings?.methods?.includes('jazzcash') && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>JazzCash Number</label>
                        <input type="text" className="input-field" value={profile.paymentSettings?.jazzcashNumber || ''} onChange={e => handlePaymentField('jazzcashNumber', e.target.value)} placeholder="03XXXXXXXXX" />
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {showPackageModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', border: '1px solid #1a2540' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#f1f5f9', marginBottom: '20px' }}>{editingPackage ? 'Edit Package' : 'Create Package'}</h2>
            <div className="space-y-4">
              <input type="text" className="input-field" placeholder="Package Name" value={packageForm.name} onChange={e => setPackageForm(prev => ({ ...prev, name: e.target.value }))} />
              <textarea className="input-field" placeholder="Description" value={packageForm.description} onChange={e => setPackageForm(prev => ({ ...prev, description: e.target.value }))} />
              <input type="number" className="input-field" placeholder="Price (PKR)" value={packageForm.price} onChange={e => setPackageForm(prev => ({ ...prev, price: e.target.value }))} />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowPackageModal(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handleSavePackage}>{editingPackage ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
