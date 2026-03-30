import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Save, Store, Bell, Wallet, Lock } from 'lucide-react';

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
    package: 'starter'
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
    fetchProfile();
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

  if (loading) return <div style={{ color: '#475569', padding: '32px' }}>Loading settings...</div>;

  const pkg = profile.package || 'starter';
  const isGrowth = pkg === 'growth' || pkg === 'pro' || pkg === 'pro_plus';
  const isPro = pkg === 'pro' || pkg === 'pro_plus';
  const badge = PACKAGE_BADGES[pkg] || PACKAGE_BADGES.starter;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9' }}>
              Gym Settings
            </h1>
            {/* Package Badge */}
            <span style={{
              padding: '4px 12px', borderRadius: '99px', fontSize: '12px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.05em',
              color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`
            }}>
              {badge.label}
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '14px' }}>Manage your gym profile, automated sending, and message templates.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          <Save size={18} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gym Profile */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
            <div style={{ background: 'rgba(0,112,196,0.15)', padding: '8px', borderRadius: '10px' }}>
              <Store size={20} color="#0c8ee7" />
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Gym Profile</h2>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Gym Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="input-field" placeholder="E.g. Titan Fitness" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Address</label>
            <textarea name="address" value={profile.address || ''} onChange={handleChange} className="input-field" style={{ height: '80px', resize: 'vertical' }} placeholder="Full gym address..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Contact No.</label>
              <input type="text" name="contact" value={profile.contact || ''} onChange={handleChange} className="input-field" placeholder="Phone number" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Email</label>
              <input type="email" name="email" value={profile.email || ''} onChange={handleChange} className="input-field" placeholder="Email address" />
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

          {/* Automated Reminders */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
              <div style={{ background: 'rgba(251,191,36,0.15)', padding: '8px', borderRadius: '10px' }}>
                <Bell size={20} color="#fbbf24" />
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Automated Reminders</h2>
            </div>

            {!isGrowth ? (
              <UpgradeBadge message="Upgrade to Growth, Pro or Pro Plus to enable automated reminders." />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Enable Auto-Messaging</h4>
                    <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Automatically send reminders daily for overdue members.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" name="autoMessagingEnabled" checked={profile.autoMessagingEnabled || false} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                    <div onClick={() => setProfile(p => ({ ...p, autoMessagingEnabled: !p.autoMessagingEnabled }))}
                      style={{
                        width: '44px', height: '24px', borderRadius: '99px', cursor: 'pointer',
                        background: profile.autoMessagingEnabled ? '#0070c4' : '#1a2540',
                        position: 'relative', transition: 'background 0.2s ease',
                        border: profile.autoMessagingEnabled ? '1px solid #00d4ff40' : '1px solid #1a2540'
                      }}>
                      <div style={{
                        position: 'absolute', top: '2px',
                        left: profile.autoMessagingEnabled ? '22px' : '2px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s ease',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                      }} />
                    </div>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Reminder Intervals (Days After Due)
                  </label>
                  <input type="text" value={profile.reminderIntervals?.join(', ') || ''} onChange={handleIntervalChange} className="input-field" placeholder="e.g. 1, 3, 7" />
                  <p style={{ fontSize: '12px', color: '#334155', marginTop: '6px' }}>Comma-separated days to send reminders after the due date.</p>
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

            <textarea
              name="template"
              value={profile.template || ''}
              onChange={handleChange}
              className="input-field"
              style={{ height: '120px', resize: 'vertical', marginBottom: '12px', opacity: isPro ? 1 : 0.5 }}
              placeholder="Hi {name}, your gym fee is due..."
              disabled={!isPro}
            />

            {!isPro && (
              <UpgradeBadge message="Upgrade to Pro or Pro Plus to edit your WhatsApp message template." />
            )}

            <div style={{ background: '#080d14', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1a2540', marginTop: '12px' }}>
              <h4 style={{ fontSize: '10px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Live Preview</h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {(profile.template || '').replace('{name}', 'Ali').replace('{amount}', '5000').replace('{date}', 'Oct 15') || 'No template set.'}
              </p>
            </div>
          </div>

          {/* Payment Collection */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #1a2540' }}>
              <div style={{ background: 'rgba(139,92,246,0.15)', padding: '8px', borderRadius: '10px' }}>
                <Wallet size={20} color="#a78bfa" />
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9' }}>Payment Collection Settings</h2>
            </div>

            {!isGrowth ? (
              <UpgradeBadge message="Upgrade to Growth, Pro or Pro Plus to configure payment collection." />
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>Choose payment methods and update receiving details.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {['easypaisa', 'jazzcash', 'bank'].map(method => (
                    <button key={method} type="button" onClick={() => toggleMethod(method)} style={{
                      padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'Syne, sans-serif',
                      ...(profile.paymentSettings?.methods?.includes(method)
                        ? { background: 'rgba(0,112,196,0.2)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }
                        : { background: '#080d14', color: '#475569', border: '1px solid #1a2540' })
                    }}>
                      {method.toUpperCase()}
                    </button>
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

                {profile.paymentSettings?.methods?.includes('bank') && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Bank Account Title</label>
                      <input type="text" className="input-field" value={profile.paymentSettings?.bankTitle || ''} onChange={e => handlePaymentField('bankTitle', e.target.value)} placeholder="Account title" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Bank IBAN</label>
                      <input type="text" className="input-field" value={profile.paymentSettings?.bankIban || ''} onChange={e => handlePaymentField('bankIban', e.target.value)} placeholder="PKXX...." />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}