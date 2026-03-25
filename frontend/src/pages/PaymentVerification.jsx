import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentVerification() {
  const { gymKey } = useAuth();
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
      const profRes = await api.get(`/profile?gymKey=${gymKey}`);
      const pkg = profRes.data.profile?.package || 'starter';
      setGymPackage(pkg);

      if (!(pkg === 'growth' || pkg === 'pro')) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [gymKey]);

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
    if (!(gymPackage === 'growth' || gymPackage === 'pro')) return;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Payment Verification</h1>
        <p className="text-slate-500 mt-2">
          Secure proof queue for EasyPaisa, JazzCash, and Bank transfers with strong confirmation code generation.
        </p>
      </div>

      {!(gymPackage === 'growth' || gymPackage === 'pro') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          <div className="font-bold mb-1">Upgrade required</div>
          Payment verification is available in <b>Growth</b> and <b>Pro</b> packages only.
        </div>
      )}

      {(gymPackage === 'growth' || gymPackage === 'pro') && (
      <>
      <div className="card">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Submit Payment Proof</h2>
        <form onSubmit={submitProof} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="input-field"
            value={form.memberId}
            onChange={(e) => setForm(f => ({ ...f, memberId: e.target.value }))}
          >
            <option value="">Select Member</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
            ))}
          </select>

          <input
            type="number"
            className="input-field"
            placeholder="Amount (Rs)"
            value={form.amount}
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
          />

          <select
            className="input-field"
            value={form.method}
            onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))}
          >
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="bank">Bank Transfer</option>
          </select>

          <input
            type="text"
            className="input-field"
            placeholder="Transaction ID / Ref No"
            value={form.transactionId}
            onChange={(e) => setForm(f => ({ ...f, transactionId: e.target.value }))}
          />

          <textarea
            className="input-field md:col-span-2"
            placeholder="Proof note (optional): payer name, time, screenshot ref"
            value={form.proofNote}
            onChange={(e) => setForm(f => ({ ...f, proofNote: e.target.value }))}
          />

          <button type="submit" className="btn-primary md:col-span-2 justify-center">
            <ShieldCheck size={18} /> Submit To Secure Queue
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Pending Verification Queue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Txn Last 4</th>
                <th className="py-3 px-4">Strength</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 px-4 text-center text-slate-500">No pending proofs</td>
                </tr>
              ) : (
                pendingPayments.map(p => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 px-4">{memberMap.get(p.memberId)?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">Rs {p.amount}</td>
                    <td className="py-3 px-4 uppercase">{p.method}</td>
                    <td className="py-3 px-4 font-mono">****{p.transactionLast4}</td>
                    <td className="py-3 px-4">{p.verificationStrength || 'high'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => verifyProof(p.id, true)}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300"
                        >
                          <CheckCircle2 size={14} className="inline mr-1" />
                          Verify
                        </button>
                        <button
                          onClick={() => verifyProof(p.id, false)}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300"
                        >
                          <XCircle size={14} className="inline mr-1" />
                          Reject
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
      </>
      )}
    </div>
  );
}
