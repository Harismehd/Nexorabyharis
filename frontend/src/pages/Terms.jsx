import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, ScrollText, CheckCircle } from 'lucide-react';

export default function Terms() {
  const { gymKey, acceptTerms } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        setScrolled(true);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAccept = async () => {
    if (!checked) return toast.error('Please check the agreement box first');
    setLoading(true);
    try {
      await api.post('/terms', { gymKey });
      toast.success('Terms accepted. Welcome to GymFlow!');
      acceptTerms();
    } catch (err) {
      toast.error('Failed to save acceptance. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'DM Sans, sans-serif', position: 'relative'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,112,196,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '760px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '18px', marginBottom: '16px',
            background: 'linear-gradient(135deg, #0a1018, #0e1622)',
            border: '1px solid rgba(0,212,255,0.2)'
          }}>
            <ScrollText size={28} color="#00d4ff" />
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '28px', color: '#f1f5f9', margin: 0
          }}>
            Terms of Service & Privacy Policy
          </h1>
          <p style={{ color: '#475569', marginTop: '8px', fontSize: '14px' }}>
            Please read and accept before using GymFlow
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            marginTop: '12px', padding: '6px 16px', borderRadius: '99px',
            background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)'
          }}>
            <span style={{ fontSize: '12px', color: '#00d4ff', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
              Version 1.0 — March 28, 2026
            </span>
          </div>
        </div>

        {/* Scrollable Terms */}
        <div style={{
          background: '#0e1622', border: '1px solid #1a2540',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <div
            ref={scrollRef}
            style={{
              height: '480px', overflowY: 'auto', padding: '32px',
              fontSize: '13px', lineHeight: '1.8', color: '#94a3b8'
            }}
          >
            {/* TERMS CONTENT */}
            <Section title="TERMS OF SERVICE & PRIVACY POLICY">
              <p style={{ color: '#64748b', fontSize: '12px' }}>
                Service Provider: <strong style={{ color: '#94a3b8' }}>Haris Mehmood</strong> &nbsp;|&nbsp;
                Effective: March 28, 2026 &nbsp;|&nbsp; Version 1.0
              </p>
            </Section>

            <Section title="1. Agreement to Terms">
              <p>By activating your GymFlow account and checking the acceptance box, you ("Gym", "Client", "User") confirm that you have read, understood, and agree to be legally bound by these Terms of Service. If you do not agree, you must not use the software.</p>
            </Section>

            <Section title="2. Nature of Service">
              <p>GymFlow is a gym management and fee automation software providing member management, payment recording, automated WhatsApp reminders, and financial reporting. The software is a tool to assist gym operations — it does not guarantee any specific business outcomes.</p>
            </Section>

            <Section title="3. WhatsApp Integration — Critical Disclaimer" highlight>
              <p>GymFlow uses an unofficial WhatsApp automation method. By using this feature, you explicitly acknowledge:</p>
              <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>This integration is <strong>not affiliated with, endorsed by, or officially supported by WhatsApp Inc. or Meta Platforms Inc.</strong></li>
                <li>WhatsApp's Terms of Service prohibit unauthorized automation. Use <strong>may result in temporary or permanent suspension of your WhatsApp number.</strong></li>
                <li>The Developer has <strong>no control over WhatsApp's policies or enforcement actions.</strong></li>
                <li>The Developer accepts <strong>zero liability</strong> for any WhatsApp account suspension, ban, or restriction.</li>
                <li>You use the WhatsApp automation feature <strong>entirely at your own risk.</strong></li>
              </ul>
            </Section>

            <Section title="4. Force Majeure & Service Interruptions">
              <p>The Developer shall not be held liable for any failure or delay in providing services resulting from circumstances beyond reasonable control, including but not limited to:</p>
              <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Server outages, cloud provider failures (Supabase, Vercel, or any infrastructure provider)</li>
                <li>WhatsApp platform bans, policy changes, or API restrictions by Meta Platforms Inc.</li>
                <li>Internet service disruptions, telecommunications failures, or power outages</li>
                <li>Natural disasters, floods, earthquakes, or other acts of God</li>
                <li>Government actions, regulations, sanctions, or legal orders</li>
                <li>Cyberattacks, DDoS attacks, or security breaches beyond the Developer's control</li>
                <li>Any other event that reasonably could not have been anticipated or prevented</li>
              </ul>
              <p style={{ marginTop: '12px' }}>In such events, the Developer will make reasonable efforts to restore service as soon as practicable but accepts no liability for losses incurred during such interruptions.</p>
            </Section>

            <Section title="5. Limitation of Liability">
              <p>To the maximum extent permitted by applicable law, the Developer's total liability shall not exceed the total amount paid in the last 30 days. The Developer is not liable for:</p>
              <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Loss of business, revenue, profits, or data</li>
                <li>Loss or suspension of your WhatsApp account or number</li>
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Damages from third-party services (WhatsApp, Supabase, Vercel)</li>
                <li>Service interruptions, downtime, or data loss</li>
                <li>Financial loss, legal claims, or disputes with your gym members</li>
              </ul>
              <p style={{ marginTop: '12px' }}>The Developer is <strong>only responsible</strong> for ensuring core software features function as described.</p>
            </Section>

            <Section title="6. Your Responsibilities">
              <p>You agree that you are solely responsible for how you use the software, will only message your own registered members, will not use GymFlow for spam or harassment, will maintain security of your credentials, and will comply with all applicable local laws.</p>
            </Section>

            <Section title="7. Service Availability">
              <p>GymFlow is provided "as is" and "as available." The Developer does not guarantee 100% uptime. The Developer may modify, suspend, or discontinue features at any time with reasonable notice where possible.</p>
            </Section>

            <Section title="8. Subscription & Payment">
              <p>Subscription fees are agreed between the Developer and the Gym. Fees are non-refundable unless otherwise agreed in writing. The Developer reserves the right to suspend access for non-payment. Pricing may change with 30 days notice.</p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>GymFlow, its code, design, and all related materials are the intellectual property of Haris Mehmood. You may not copy, resell, reverse engineer, or redistribute the software or any part of it.</p>
            </Section>

            <Section title="10. Governing Law">
              <p>These Terms are governed by the laws of Pakistan. Any disputes shall be resolved under Pakistani jurisdiction.</p>
            </Section>

            <Section title="PRIVACY POLICY" divider>
              <p style={{ color: '#64748b', fontSize: '12px' }}>How we collect, use, and protect your data.</p>
            </Section>

            <Section title="11. Data We Collect">
              <p>GymFlow collects: gym name, contact info, login credentials, member names and phone numbers, payment records, WhatsApp message logs, and your acceptance of these Terms with timestamp and device info.</p>
            </Section>

            <Section title="12. Data Usage">
              <p>Your data is used solely to provide GymFlow services, send WhatsApp reminders to your members, generate reports and receipts, and maintain security.</p>
            </Section>

            <Section title="13. Data Storage & Security">
              <p>All data is stored in Supabase cloud database. The Developer implements reasonable security measures but cannot guarantee absolute security against all threats.</p>
            </Section>

            <Section title="14. Data Sharing">
              <p>We do not sell, share, or rent your data to any third party. Data may be shared with infrastructure providers (Supabase, Vercel) solely for service operation.</p>
            </Section>

            <Section title="15. Member Data Responsibility">
              <p>You are solely responsible for obtaining consent from your gym members before storing their personal information in GymFlow. The Developer accepts no liability for your data handling practices toward your members.</p>
            </Section>

            <Section title="16. Your Rights">
              <p>You may request deletion of your data at any time by contacting the Developer. Account deletion will permanently remove all your gym and member data from our systems.</p>
            </Section>

            <div style={{ marginTop: '32px', padding: '16px', borderRadius: '12px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', textAlign: 'center' }}>
              <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
                For questions or concerns contact: <strong style={{ color: '#00d4ff' }}>Haris Mehmood — GymFlow Developer</strong>
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          {!scrolled && (
            <div style={{
              textAlign: 'center', padding: '10px',
              background: 'linear-gradient(to top, #0e1622, transparent)',
              color: '#334155', fontSize: '12px', fontStyle: 'italic'
            }}>
              ↓ Scroll to read all terms before accepting
            </div>
          )}

          {/* Accept section */}
          <div style={{ padding: '24px 32px', borderTop: '1px solid #1a2540', background: '#080d14' }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              cursor: scrolled ? 'pointer' : 'not-allowed', opacity: scrolled ? 1 : 0.4,
              marginBottom: '20px'
            }}>
              <div
                onClick={() => scrolled && setChecked(!checked)}
                style={{
                  width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                  border: checked ? '2px solid #00d4ff' : '2px solid #1a2540',
                  background: checked ? 'rgba(0,212,255,0.15)' : '#080d14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease', marginTop: '2px'
                }}
              >
                {checked && <CheckCircle size={14} color="#00d4ff" />}
              </div>
              <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                I, the authorized representative of this gym, confirm that I have fully read and understood the Terms of Service and Privacy Policy. I accept all terms including the WhatsApp disclaimer and force majeure clause, and agree to use GymFlow entirely at my own risk.
                <strong style={{ color: '#e2e8f0' }}> Gym Key: {gymKey}</strong>
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!checked || !scrolled || loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
            >
              <ShieldCheck size={20} />
              {loading ? 'Saving acceptance...' : 'I Accept — Activate GymFlow'}
            </button>

            {!scrolled && (
              <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#334155' }}>
                You must scroll through and read all terms before accepting.
              </p>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#1e293b' }}>
          GymFlow © 2026 — Haris Mehmood — Pakistan
        </p>
      </div>
    </div>
  );
}

function Section({ title, children, highlight, divider }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {divider && <hr style={{ border: 'none', borderTop: '1px solid #1a2540', margin: '32px 0 24px' }} />}
      <h3 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
        color: highlight ? '#f87171' : '#e2e8f0',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: '10px',
        ...(highlight ? {
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.15)'
        } : {})
      }}>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}