import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, CheckCircle2, XCircle, Zap, Shield, HelpCircle, Activity } from 'lucide-react';
import LockedOverlay from '../components/LockedOverlay';

export default function PaymentVerification() {
  const { gymKey, packageTier } = useAuth();
  const [members, setMembers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [gymPackage, setGymPackage] = useState('starter');
  const [form, setForm] = useState({
    memberId: '',
    amount: '',
    method: 'easypaisa',
    transactionId: '',
    proofNote: ''
  });

  const memberMap = useMemo(() => {
    const map = new Map();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  const loadData = async () => {
    try {
      const pkg = profRes.data.profile?.package || 'starter';
      setGymPackage(pkg);

      if (!(pkg === 'growth' || pkg === 'pro' || pkg === 'pro_plus')) {
        return;
      }

      const [memRes, pendingRes] = await Promise.all([
        api.get(`/members?gymKey=${gymKey}`),
        api.get(`/payments/pending?gymKey=${gymKey}`)
      ]);
      setMembers(memRes.data.members || []);
      setPendingPayments(pendingRes.data.pendingPayments || []);
    } catch {
      toast.error('Failed to load payment verification data');
    }
  };

  useEffect(() => {
    loadData();
  }, [gymKey]);

  const handleBulkVerify = async () => {
    if (!window.confirm('Verify ALL pending payments? This will update memberships and send WhatsApp confirmations.')) return;
    try {
      const res = await api.post('/payments/pending/bulk-verify', { gymKey });
      toast.success(res.data.message);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk verification failed');
    }
  };

  const handleBulkClear = async () => {
    if (!window.confirm('Clear the entire queue? This will DELETE all pending verification records.')) return;
    try {
      const res = await api.post('/payments/pending/bulk-clear', { gymKey });
      toast.success(res.data.message);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear queue');
    }
  };

  const submitProof = async (e) => {
    e.preventDefault();
    if (!form.memberId || !form.amount || !form.transactionId) {
      return toast.error('Fill all required proof fields');
    }

    try {
      const res = await api.post('/payments/proof', { gymKey, ...form });
      toast.success(res.data.message);
      setForm({ memberId: '', amount: '', method: 'easypaisa', transactionId: '', proofNote: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proof');
    }
  };

  const verifyProof = async (id, approved) => {
    if (!(gymPackage === 'growth' || gymPackage === 'pro' || gymPackage === 'pro_plus')) return;
    try {
      const res = await api.post(`/payments/pending/${id}/verify`, { gymKey, approved, monthsCovered: 1 });
      if (approved && res.data.confirmation) {
        toast.success(`Verified: ${res.data.confirmation.verificationCode}`);
      } else {
        toast.success(res.data.message);
      }
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification action failed');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: '#f1f5f9', margin: 0 }}>
          Payment Verification
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '6px' }}>
          Nexora Secure Proof Queue for Automated Transaction Reconciliation.
        </p>
      </div>

      {!(gymPackage === 'growth' || gymPackage === 'pro' || gymPackage === 'pro_plus') && (
        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield color="#f59e0b" size={20} />
          <p style={{ fontSize: '14px', color: '#f59e0b', margin: 0 }}>
            <strong>Upgrade Required:</strong> Payment verification is available in <strong>Growth</strong> and <strong>Pro</strong> packages only.
          </p>
        </div>
      )}

      {(gymPackage === 'growth' || gymPackage === 'pro' || gymPackage === 'pro_plus') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="card h-full">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck size={20} color="#00d4ff" />
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f1f5f9', margin: 0 }}>
                  Submit Payment Proof
                </h2>
              </div>
              <form onSubmit={submitProof} className="space-y-4">
                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Member</label>
                  <select className="input-field" value={form.memberId} onChange={(e) => setForm(f => ({ ...f, memberId: e.target.value }))}>
                    <option value="">Select Member</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Amount (Rs)</label>
                    <input type="number" className="input-field" placeholder="Entry amount" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Method</label>
                    <select className="input-field" value={form.method} onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))}>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Transaction Reference</label>
                  <input type="text" className="input-field" placeholder="ID or Referral Number" value={form.transactionId} onChange={(e) => setForm(f => ({ ...f, transactionId: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Collector's Note</label>
                  <textarea className="input-field" rows={3} placeholder="Any additional proof details..." value={form.proofNote} onChange={(e) => setForm(f => ({ ...f, proofNote: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-sm font-bold">
                  <ShieldCheck size={18} /> Submit To Secure Queue
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity size={20} color="#34d399" />
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f1f5f9', margin: 0 }}>
                    Verification Queue
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleBulkVerify}
                    disabled={pendingPayments.length === 0}
                    style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Verify All
                  </button>
                  <button 
                    onClick={handleBulkClear}
                    disabled={pendingPayments.length === 0}
                    style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #1a2540', background: '#080d14' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', color: '#475569' }}>
                        <th style={{ padding: '16px' }}>Member</th>
                        <th style={{ padding: '16px' }}>Amount</th>
                        <th style={{ padding: '16px' }}>Plan</th>
                        <th style={{ padding: '16px' }}>Month</th>
                        <th style={{ padding: '16px' }}>Proof</th>
                        <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: '#f1f5f9' }}>
                      {pendingPayments.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#475569', fontStyle: 'italic' }}>Clean Queue: No pending payments</td>
                        </tr>
                      ) : (
                        pendingPayments.map(p => (
                          <tr key={p.id} style={{ borderTop: '1px solid #1a2540' }}>
                            <td style={{ padding: '16px' }}>
                              <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{p.memberName || memberMap.get(p.memberId)?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '11px', color: '#475569' }}>{memberMap.get(p.memberId)?.phone}</div>
                            </td>
                            <td style={{ padding: '16px', color: '#34d399', fontWeight: 800 }}>Rs {p.amount}</td>
                            <td style={{ padding: '16px' }}>
                               <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.2)', textTransform: 'uppercase', fontWeight: 700 }}>
                                 {p.packageName || 'Monthly'}
                               </span>
                            </td>
                            <td style={{ padding: '16px', color: '#94a3b8' }}>
                              {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '16px' }}>
                               <div className="flex items-center gap-1">
                                 <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', textTransform: 'uppercase', color: '#64748b' }}>{p.method}</span>
                                 <span style={{ fontFamily: 'mono', fontSize: '11px', color: '#475569' }}>
                                   {p.transactionLast4 !== 'OFFLINE' ? `****${p.transactionLast4}` : 'INTERNAL'}
                                 </span>
                               </div>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => verifyProof(p.id, true)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)', cursor: 'pointer' }}>
                                  <CheckCircle2 size={16} />
                                </button>
                                <button onClick={() => verifyProof(p.id, false)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer' }}>
                                  <XCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '11px' }}>
                <HelpCircle size={14} />
                <span>Verifying a proof generates an automated receipt and WhatsApp confirmation to the member.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
