import React, { useState, useEffect } from 'react';
import { X, Check, Clock, TrendingUp, ShieldCheck, Zap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PackagesModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 23, seconds: 59 });

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else if (minutes > 0) { minutes--; seconds = 59; }
        else if (hours > 0) { hours--; minutes = 59; seconds = 59; }
        else if (days > 0) { days--; hours = 23; minutes = 59; seconds = 59; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const packages = [
    {
      name: 'Starter',
      price: '3,999',
      original: '5,399',
      badge: 'Basic',
      color: '#94a3b8',
      description: 'Target: Small local gyms.',
      features: [
        { text: 'Basic Member Management', included: true },
        { text: 'Manual Payments', included: true },
        { text: 'Basic WhatsApp Reminders', included: true },
        { text: 'Payment Verification', included: false },
        { text: 'Advanced Analytics', included: false },
      ],
      cta: 'Register Now'
    },
    {
      name: 'Growth',
      price: '7,999',
      original: '10,699',
      badge: 'Best Value',
      color: '#00d4ff',
      description: 'Target: Standard gyms (up to 50 members).',
      features: [
        { text: 'Everything in Starter', included: true },
        { text: 'Payment Verification', included: true },
        { text: 'Auto WhatsApp Reminders', included: true },
        { text: 'Daily Cash Closing', included: true },
        { text: '2 Package Slots', included: true },
      ],
      cta: 'Choose Growth'
    },
    {
      name: 'Pro',
      price: '8,999',
      original: '11,999',
      badge: 'Most Popular',
      color: '#00d4ff',
      isPopular: true,
      description: 'Target: Growing gyms (50-150 members).',
      features: [
        { text: 'Everything in Starter', included: true },
        { text: 'Payment Verification Flow', included: true },
        { text: 'Automated Reminders', included: true },
        { text: 'Daily Cash Closing', included: true },
        { text: 'Package Builder (3 Slots)', included: true },
        { text: 'CSV Exports & Templates', included: true },
        { text: '2 Device Login Limit', included: true },
      ],
      cta: 'Choose Pro'
    },
    {
      name: 'Pro Plus',
      price: '14,999',
      original: '19,999',
      badge: 'Ultimate',
      color: '#f59e0b',
      limited: true,
      description: 'Target: Premium gyms, franchise owners.',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Revenue Leak Guard', included: true },
        { text: 'Advanced Analytics', included: true },
        { text: 'Package Builder (7 Slots)', included: true },
        { text: 'Multi-Device Access (5 Units)', included: true },
        { text: 'Priority Performance VIP', included: true },
      ],
      cta: 'Scale Now'
    }
  ];

  const handleRegister = (pkg) => {
    onClose();
    // Use target="_blank" via window.open to satisfy user's "new tab" request
    const url = `/register?package=${pkg.name}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(5, 10, 16, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', overflowY: 'auto'
    }}>
      <div style={{
        width: '100%', maxWidth: '1200px', background: '#080d14',
        borderRadius: '32px', border: '1px solid #1e293b',
        position: 'relative', overflow: 'hidden',
        animation: 'modalFadeIn 0.4s ease-out'
      }}>
        {/* Header Background Glow */}
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <button onClick={onClose} style={{
          position: 'absolute', top: '24px', right: '24px', background: 'rgba(30, 41, 59, 0.5)',
          border: 'none', color: '#94a3b8', padding: '10px', borderRadius: '12px', cursor: 'pointer',
          zIndex: 10
        }}>
          <X size={20} />
        </button>

        <div style={{ padding: '80px 40px 60px 40px', position: 'relative' }}>
          {/* Social Proof & Timer Row */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '48px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 20px', borderRadius: '100px',
              color: '#f59e0b', fontSize: '14px', fontWeight: 700
            }}>
              <Clock size={16} />
              Offer ends in: {timeLeft.days}d {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.2)', padding: '12px 20px', borderRadius: '100px',
              color: '#00d4ff', fontSize: '14px', fontWeight: 700
            }}>
              <TrendingUp size={16} />
              13 gyms joined this month
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '42px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0' }}>
              Select Your <span style={{ color: '#00d4ff' }}>Empire Tier</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '18px', maxWidth: '600px', margin: '0 auto 24px auto' }}>
              First 50 gyms get <span style={{ color: '#fff', fontWeight: 700 }}>Lifetime 25% Discount</span>. Scale your gym operations with Nexora.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)',
              padding: '12px 24px', borderRadius: '16px', color: '#94a3b8', fontSize: '13px'
            }}>
              <ShieldCheck size={16} color="#00d4ff" />
              <span>One-time <strong style={{ color: '#00d4ff' }}>PKR 8,999</strong> activation fee covers full profile setup, one <strong>30-minute training session</strong>, WhatsApp integration, and desktop optimization.</span>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {packages.map((pkg, i) => (
              <div key={i} style={{
                background: pkg.isPopular ? '#0e1622' : '#0a0f18',
                border: `1px solid ${pkg.isPopular ? '#00d4ff' : '#1e293b'}`,
                borderRadius: '24px', padding: '32px', position: 'relative',
                display: 'flex', flexDirection: 'column',
                boxShadow: pkg.isPopular ? '0 10px 40px rgba(0, 212, 255, 0.05)' : 'none',
                transition: 'transform 0.3s ease',
                cursor: 'default'
              }}>
                {pkg.badge && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: pkg.isPopular ? '#00d4ff' : '#1e293b',
                    color: pkg.isPopular ? '#050a10' : '#94a3b8',
                    padding: '4px 16px', borderRadius: '100px', fontSize: '11px', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {pkg.badge}
                  </div>
                )}

                {pkg.limited && (
                  <div style={{
                    position: 'absolute', top: '20px', right: '20px',
                    color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <Star size={12} fill="#f59e0b" />
                    <span style={{ fontSize: '10px', fontWeight: 800 }}>LIMITED SPOTS</span>
                  </div>
                )}

                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>{pkg.name}</h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#475569', fontWeight: 600 }}>{pkg.description}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>PKR {pkg.price}</span>
                    <span style={{ fontSize: '14px', color: '#475569', textDecoration: 'line-through' }}>PKR {pkg.original}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#475569' }}>per month, billed monthly</span>
                </div>

                <div style={{ flex: 1, marginBottom: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pkg.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {f.included ? (
                          <Check size={16} color={pkg.color} />
                        ) : (
                          <Check size={16} color="#1e293b" />
                        )}
                        <span style={{ fontSize: '13px', color: f.included ? '#94a3b8' : '#334155' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handleRegister(pkg)}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px',
                    border: 'none', background: pkg.isPopular ? '#00d4ff' : '#1e293b',
                    color: pkg.isPopular ? '#050a10' : '#f1f5f9',
                    fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                  {pkg.cta} <Zap size={14} />
                </button>
              </div>
            ))}
          </div>

          <p style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#334155' }}>
            Prices listed already include a 25% lifetime discount. Taxes applicable based on region.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PackagesModal;
