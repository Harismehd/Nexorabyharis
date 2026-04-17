import { ShieldCheck, ScrollText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', background: '#080d14',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 24px', fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#64748b', padding: '8px 16px', borderRadius: '10px',
            marginBottom: '32px', cursor: 'pointer', fontSize: '13px'
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '18px', marginBottom: '16px',
            background: 'linear-gradient(135deg, #0a1018, #0e1622)',
            border: '1px solid rgba(0,212,255,0.2)'
          }}>
            <ScrollText size={28} color="#00d4ff" />
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: '#fff' }}>
            Terms & Privacy Policy
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '8px' }}>
            Official Legal Documentation for Nexora OS
          </p>
        </div>

        <div style={{ 
          background: '#0e1622', border: '1px solid #1a2540',
          borderRadius: '24px', padding: '40px', color: '#94a3b8',
          lineHeight: '1.8', fontSize: '14px'
        }}>
          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #1a2540', paddingBottom: '12px' }}>
            1. Terms of Use
          </h2>
          <p>Nexora is a gym automation software. By using the platform, you agree to comply with all local laws and our specific usage guidelines regarding WhatsApp automation.</p>
          
          <h3 style={{ color: '#00d4ff', fontSize: '15px', marginTop: '24px' }}>WhatsApp Responsibility</h3>
          <p>Nexora acts only as an interface. The gym owner is solely responsible for any bans or restrictions placed on their WhatsApp number by Meta/WhatsApp Inc. Use of unofficial automation is at your own risk.</p>

          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #1a2540', paddingBottom: '12px', marginTop: '40px' }}>
            2. Privacy & Data Handling
          </h2>
          <p>We collect gym performance data, member records, and payment logs to provide automation services. We do not sell your data to third parties.</p>
          
          <h3 style={{ color: '#00d4ff', fontSize: '15px', marginTop: '24px' }}>Data Portability</h3>
          <p>Gym owners retain ownership of their data. You may request a export of your member list at any time via the Support channel if you choose to terminate your subscription.</p>

          <div style={{ marginTop: '40px', padding: '20px', borderRadius: '16px', background: 'rgba(0,212,255,0.02)', border: '1px solid rgba(0,212,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
              Last Updated: April 17, 2026 <br />
              Developer: Haris Mehmood (Nexora Lab)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
