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
      minHeight: '100vh', background: '#080d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,112,196,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1,
        animation: 'fadeSlideIn 0.6s ease forwards'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', position: 'relative', marginBottom: '20px' }}>
            <div style={{
              position: 'absolute', inset: '-4px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #0070c4, #00d4ff)',
              filter: 'blur(12px)', opacity: 0.4
            }} />
            <div style={{
              position: 'relative', width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #0a1018, #0e1622)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '18px', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Dumbbell size={28} color="#00d4ff" />
            </div>
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '32px', color: '#f1f5f9', margin: 0, lineHeight: 1
          }}>
            Nexora
          </h1>
          <p style={{ color: '#475569', marginTop: '8px', fontSize: '14px' }}>
            Next-Level Gym Intelligence
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0e1622', border: '1px solid #1a2540',
          borderRadius: '20px', padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          {!adminStage ? (
            <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Gym Key
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your gym key or ADMIN"
                  value={gymKey}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                />
              </div>

              {normalizedGymKey !== 'ADMIN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>
                    Use credentials provided by your administrator.
                  </p>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '14px' }}>
                {normalizedGymKey === 'ADMIN' ? (
                  <><ShieldCheck size={18} /> Continue to Admin</>
                ) : loading ? 'Authenticating...' : (
                  <><ArrowRight size={18} /> Login Securely</>
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
                Super Admin key accepted. Enter master password.
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Master Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter master password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setAdminStage(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? 'Authenticating...' : 'Enter God Mode'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#1e293b' }}>
          Nexora © 2026 — Powered by Haris Mehmood
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}