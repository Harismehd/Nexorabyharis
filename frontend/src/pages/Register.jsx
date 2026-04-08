import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Dumbbell, ShieldCheck, HelpCircle, Check, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pkgFromUrl = searchParams.get('package') || 'Starter';

  const [formData, setFormData] = useState({
    gymName: '',
    ownerName: '',
    businessPhone: '',
    emailAddress: '',
    packageName: pkgFromUrl,
    gymKeyChoice: '',
  });

  const [paymentProof, setPaymentProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const SETUP_FEE = 5000;
  const pricingMap = {
    'Starter': 3999,
    'Growth': 7999,
    'Pro': 11999,
    'Pro Plus': 15999
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentProof) return toast.error('Please upload your payment screenshot');
    
    setLoading(true);

    try {
      // 1. Upload Screenshot to Supabase Storage
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('registration-proofs')
        .upload(filePath, paymentProof);

      if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('registration-proofs')
        .getPublicUrl(filePath);

      // 2. Insert Record into registrations Table
      const { error: insertError } = await supabase
        .from('registrations')
        .insert([{
          gym_name: formData.gymName,
          owner_name: formData.ownerName,
          phone: formData.businessPhone,
          email: formData.emailAddress,
          package_name: formData.packageName,
          gym_key_choice: formData.gymKeyChoice,
          payment_proof_url: publicUrl,
          status: 'pending'
        }]);

      if (insertError) throw new Error('Database insertion failed: ' + insertError.message);

      setSubmitted(true);
      toast.success('Registration submitted to Master Admin!');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Try again.');
      console.error('Registration Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', background: '#050a10', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', fontFamily: 'DM Sans, sans-serif'
      }}>
        <div style={{
          width: '100%', maxWidth: '600px', textAlign: 'center',
          background: '#0e1622', border: '1px solid #1a2540',
          borderRadius: '32px', padding: '60px 40px',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.5)',
          animation: 'scaleIn 0.5s ease-out'
        }}>
          <div style={{
            width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 32px auto', color: '#22c55e'
          }}>
            <Check size={40} />
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
            Registration Received!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
            Thank you for choosing Nexora. We have received your registration and payment proof.
          </p>
          <div style={{
            textAlign: 'left', background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.1)',
            padding: '24px', borderRadius: '16px', marginBottom: '32px'
          }}>
            <p style={{ color: '#00d4ff', fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0' }}>WHAT HAPPENS NEXT?</p>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              Your gym key and secure 8-digit password will be sent to your <strong style={{ color: '#fff' }}>WhatsApp number</strong> within 24 hours after verification. Make sure not to share it with anyone.
            </p>
          </div>
          <p style={{ color: '#475569', fontSize: '13px' }}>
            For urgent inquiries, contact support at <a href="mailto:harismehmd1@gmail.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>harismehmd1@gmail.com</a>
          </p>
          <button onClick={() => navigate('/login')} style={{
            marginTop: '40px', background: 'transparent', border: '1px solid #1e293b',
            color: '#94a3b8', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer',
            fontSize: '14px', transition: 'all 0.2s ease'
          }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050a10', display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif', color: '#fff'
    }}>
      {/* Header */}
      <header style={{
        padding: '32px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#00d4ff', padding: '10px', borderRadius: '12px' }}>
            <Dumbbell color="#050a10" size={24} />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em' }}>
            NEXORA
          </span>
        </div>
        <button onClick={() => navigate('/login')} style={{
          display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px'
        }}>
          <ArrowLeft size={16} /> Exit Registration
        </button>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <div style={{ marginBottom: '48px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 800, marginBottom: '24px' }}>
              <ShieldCheck size={14} /> SECURE REGISTRATION GATEWAY
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '40px', fontWeight: 800, margin: '0 0 16px 0' }}>
              Let's Build Your <span style={{ color: '#00d4ff' }}>Empire</span>.
            </h1>
            <p style={{ color: '#64748b', fontSize: '16px' }}>Provide your gym details below to begin the automation era.</p>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px'
          }}>
            {/* Left Column: Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: '#0e1622', border: '1px solid #1a2540', padding: '32px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 24px 0', color: '#f1f5f9' }}>Gym Information</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Gym Name</label>
                    <input type="text" name="gymName" required placeholder="Apex Fitness Center" 
                      style={inputStyle} value={formData.gymName} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Owner Name</label>
                    <input type="text" name="ownerName" required placeholder="Haris Mehmood" 
                      style={inputStyle} value={formData.ownerName} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp Business Phone</label>
                    <input type="tel" name="businessPhone" required placeholder="+92 3XX XXXXXXX" 
                      style={inputStyle} value={formData.businessPhone} onChange={handleInputChange} />
                    <span style={{ fontSize: '10px', color: '#475569', marginTop: '6px', display: 'block' }}>We'll send your credentials to this number.</span>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" name="emailAddress" required placeholder="owner@gym.com" 
                      style={inputStyle} value={formData.emailAddress} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div style={{ background: '#0e1622', border: '1px solid #1a2540', padding: '32px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#f1f5f9' }}>Proposed Gym Key</h3>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '20px' }}>
                  Choose your desired gym key (3-10 characters). We'll confirm availability.
                </p>
                <input type="text" name="gymKeyChoice" placeholder="E.g., APEX1" 
                  style={inputStyle} value={formData.gymKeyChoice} onChange={handleInputChange} />
              </div>
            </div>

            {/* Right Column: Package + Payment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: '#0e1622', border: '1px solid #1a2540', padding: '32px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 24px 0', color: '#f1f5f9' }}>Plan Summary</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8' }}>
                    <span>One-time Setup & Training Fee</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>PKR {SETUP_FEE.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8' }}>
                    <span>{formData.packageName} Subscription</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>PKR {pricingMap[formData.packageName]?.toLocaleString()}</span>
                  </div>
                  
                  <div style={{ height: '1px', background: '#1e293b', margin: '8px 0' }} />
                  
                  <div style={{ 
                    background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.1)', 
                    padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#00d4ff', textTransform: 'uppercase' }}>Total Due Today</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#475569' }}>Includes setup & first month</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#00d4ff' }}>
                        PKR {(SETUP_FEE + (pricingMap[formData.packageName] || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#f59e0b', background: 'rgba(245,158,11,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.1)', lineHeight: 1.5 }}>
                    <strong>Note:</strong> Please transfer the exact <strong>Total Due</strong> amount shown above. This screenshot will be used by Master Admin for account activation.
                  </p>
                </div>
              </div>

              <div style={{ background: '#0e1622', border: '1px solid #1a2540', padding: '32px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#f1f5f9' }}>Payment Proof</h3>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '24px' }}>
                  Upload your Easypaisa/JazzCash/Bank transfer screenshot.
                </p>

                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    id="paymentProof" 
                    onChange={(e) => setPaymentProof(e.target.files[0])}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{
                    height: '140px', border: '2px dashed #1e293b', borderRadius: '16px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '12px', background: paymentProof ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                    borderColor: paymentProof ? '#22c55e' : '#1e293b',
                    transition: 'all 0.2s ease'
                  }}>
                    {paymentProof ? (
                      <>
                        <Check size={24} color="#22c55e" />
                        <span style={{ fontSize: '13px', color: '#22c55e' }}>{paymentProof.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} color="#475569" />
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Drop screenshot or click to upload</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: '12px', width: '100%', padding: '20px', borderRadius: '16px',
                background: '#00d4ff', color: '#050a10', border: 'none',
                fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1
              }}>
                {loading ? (
                  <><Loader2 className="spinner" size={20} /> Processing...</>
                ) : (
                  <>Submit Registration & Payment Proof</>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 800px) {
          form { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const labelStyle = { 
  display: 'block', fontSize: '11px', fontFamily: 'Syne, sans-serif', 
  fontWeight: 800, color: '#475569', textTransform: 'uppercase', 
  letterSpacing: '0.1em', marginBottom: '10px' 
};

const inputStyle = {
  width: '100%', height: '52px', background: '#050a10', 
  border: '1px solid #1e293b', borderRadius: '12px',
  padding: '0 16px', color: '#fff', fontSize: '14px',
  outline: 'none', transition: 'all 0.3s ease'
};

export default Register;
