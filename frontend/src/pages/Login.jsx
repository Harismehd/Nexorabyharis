import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Dumbbell, ArrowRight, ShieldCheck } from 'lucide-react';

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
      if (code === 'ACCOUNT_SUSPENDED') toast.error('Account Suspended. Contact support.');
      else if (code === 'SYSTEM_OFFLINE') toast.error('Platform Offline. Try again later.');
      else toast.error(err.response?.data?.message || err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#050a10',
      display: 'flex', flexDirection: 'row',
      fontFamily: 'DM Sans, sans-serif', overflow: 'hidden'
    }}>
      {/* Left Pane: Visuals & Mission */}
      <div style={{
        flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '60px',
        background: `url("/nexora_login_visual.png")`,
        backgroundSize: 'cover', backgroundPosition: 'center'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050a10 15%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
          <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', color: '#00d4ff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Mission: Zero Leakage
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '48px', color: '#fff', lineHeight: 1.1, margin: '0 0 16px 0' }}>
            The Apex of Gym <span style={{ color: '#00d4ff' }}>Intelligence.</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
            Hunting for WhatsApp screenshots and paper registers is a relic of the past. Nexora automates your revenue integrity so you can focus on scale, not math.
          </p>
        </div>
      </div>

      {/* Right Pane: Login & Roast */}
      <div style={{
        width: '500px', background: '#080d14', borderLeft: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '40px', right: '40px' }}>
           <Dumbbell size={32} color="#1e293b" />
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9', margin: 0 }}>
            Authorize Access
          </h1>
          <p style={{ color: '#475569', marginTop: '6px', fontSize: '14px' }}>
            Welcome back to the future of fitness management.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0e1622', border: '1px solid #1a2540',
          borderRadius: '24px', padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)', marginBottom: '40px'
        }}>
          {!adminStage ? (
            <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                  Tenant Identifier
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="GYM KEY or ADMIN"
                  value={gymKey}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  style={{ height: '54px', padding: '0 20px' }}
                />
              </div>

              {normalizedGymKey !== 'ADMIN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                    Access Token
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ height: '54px', padding: '0 20px' }}
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '16px', fontSize: '14px', fontWeight: 900 }}>
                {normalizedGymKey === 'ADMIN' ? (
                  <><ShieldCheck size={18} /> Continue to Admin</>
                ) : loading ? 'Validating...' : (
                  <><ArrowRight size={18} /> Enter Dashboard</>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '12px',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.15)',
                fontSize: '13px', color: '#00d4ff',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                <ShieldCheck size={16} style={{ display: 'inline', marginRight: '8px' }} />
                Root access requested.
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  God Mode Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Master Key"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ height: '54px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setAdminStage(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? 'Entering...' : 'Confirm Access'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Roast Section */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '32px' }}>
           <h4 style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
             Nexora Advantage
           </h4>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ color: '#00d4ff' }}>★</div>
                 <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                   <strong style={{ color: '#f1f5f9' }}>End the Scroll:</strong> Stop hunting through WhatsApp for payment screenshots. We verify them instantly.
                 </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ color: '#00d4ff' }}>★</div>
                 <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                   <strong style={{ color: '#f1f5f9' }}>Kill the Museum:</strong> Paper registers belong in a museum, not your gym desk. Nexora brings cloud-native flow.
                 </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ color: '#00d4ff' }}>★</div>
                 <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                   <strong style={{ color: '#f1f5f9' }}>Ghost Hunter:</strong> Legacy systems show members. Nexora finds "Ghost Actives" and recovers stolen revenue.
                 </p>
              </div>
           </div>
        </div>

        <p style={{ position: 'absolute', bottom: '40px', left: '60px', fontSize: '11px', color: '#1e293b', fontWeight: 700 }}>
          NEXORA OPERATING SYSTEM © 2026 — POWERED BY HARIS MEHMOOD
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-field {
          background: #050a10 !important;
          border: 1px solid #1e293b !important;
          color: #fff !important;
          transition: all 0.3s ease;
        }
        .input-field:focus {
          border-color: #00d4ff !important;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.1) !important;
        }
        @media (max-width: 1024px) {
          div[style*="flexDirection: row"] { flexDirection: column !important; }
          div[style*="width: 500px"] { width: 100% !important; border-left: none !important; border-top: 1px solid #1e293b !important; }
          div[style*="flex: 1"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}