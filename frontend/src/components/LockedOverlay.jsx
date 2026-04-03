import React from 'react';
import { Lock } from 'lucide-react';

const LockedOverlay = ({ children, isLocked, message = "Upgrade to Pro to unlock this feature" }) => {
  if (!isLocked) return children;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Blurred Content */}
      <div style={{ filter: 'blur(8px)', pointerEvents: 'none', opacity: 0.6 }}>
        {children}
      </div>

      {/* Lock Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'inherit',
        backdropFilter: 'blur(4px)', transition: 'all 0.3s ease'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)'
        }}>
          <Lock size={20} color="#00d4ff" />
        </div>
        <p style={{
          color: '#f1f5f9', fontSize: '13px', fontWeight: 600,
          fontFamily: 'Syne, sans-serif', textAlign: 'center', margin: 0,
          padding: '0 20px'
        }}>
          {message}
        </p>
        <button style={{
          marginTop: '16px', padding: '6px 16px', borderRadius: '99px',
          background: 'linear-gradient(135deg, #00d4ff, #0070c4)',
          border: 'none', color: 'white', fontSize: '11px', fontWeight: 800,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'
        }}
        onClick={() => window.location.href = '#/settings'}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

export default LockedOverlay;
