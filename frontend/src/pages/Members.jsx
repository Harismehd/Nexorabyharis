import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, DollarSign, RefreshCcw } from 'lucide-react';
import printReceiptHtml from '../utils/printReceipt';

export default function Members() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    email: '',
    joiningDate: '',
    subscriptionType: 'monthly',
    amount: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Cash',
    monthsCovered: 1
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get(`/members?gymKey=${gymKey}`);
        setMembers(res.data.members || []);
      } catch {
        toast.error('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [gymKey]);

  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.phone || '').includes(searchTerm)
  );

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/members', { gymKey, ...newMember });
      toast.success(res.data.message || 'Member added');
      setShowAddModal(false);
      setNewMember({ name: '', phone: '', email: '', joiningDate: '', subscriptionType: 'monthly', amount: '' });
      const memRes = await api.get(`/members?gymKey=${gymKey}`);
      setMembers(memRes.data.members || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await api.delete(`/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Member deleted');
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'Active' ? 'Dues' : 'Active';
    try {
      const res = await api.put(`/members/${member.id}/status`, { gymKey, status: newStatus });
      toast.success(`Member marked as ${newStatus === 'Active' ? 'Paid' : 'Unpaid'}`);
      setMembers(prev => prev.map(m => (m.id === member.id ? res.data.member : m)));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openPayModal = (member) => {
    setSelectedMember(member);
    setPaymentForm({ amount: member.amount || '', method: 'Cash', monthsCovered: 1 });
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const res = await api.post('/payments', {
        gymKey,
        memberId: selectedMember.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        monthsCovered: paymentForm.monthsCovered
      });
      toast.success(res.data.message || 'Payment recorded');

      // Refresh members to update status/end date
      const memRes = await api.get(`/members?gymKey=${gymKey}`);
      setMembers(memRes.data.members || []);

      setShowPayModal(false);
      setSelectedMember(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handlePrintLatestReceipt = async (member) => {
    try {
      const [payRes, profRes] = await Promise.all([
        api.get(`/payments?gymKey=${gymKey}`),
        api.get(`/profile?gymKey=${gymKey}`)
      ]);
      const payments = payRes.data.payments || [];
      const latest = payments
        .filter(p => p.memberId === member.id)
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
      if (!latest) return toast.error('No payment found for this member');
      const profile = profRes.data.profile || {};
      printReceiptHtml(latest, profile, member);
    } catch {
      toast.error('Failed to print receipt');
    }
  };

  if (loading) return <div className="py-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Members</h1>
          <p className="text-slate-500 mt-2">Manage your gym members and track dues.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} /> Add New Member
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="input-field pl-10 py-2 text-sm w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500">
            Total: <span className="font-bold text-slate-800">{filteredMembers.length}</span> members
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-600">Name</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Contact</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Plan</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Exp. Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500">No members found.</td></tr>
              ) : (
                filteredMembers.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{m.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{m.phone}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 capitalize">{m.subscriptionType || 'monthly'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        title="Toggle between Paid and Unpaid"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm border ${
                          m.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        <RefreshCcw size={12} /> {m.status === 'Active' ? 'PAID' : 'DUE'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {m.subscriptionEndDate ? new Date(m.subscriptionEndDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openPayModal(m)}
                          className="px-3 py-2 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100 text-sm font-semibold flex items-center gap-2"
                          title="Record Payment"
                        >
                          <DollarSign size={16} /> Pay
                        </button>
                        <button
                          onClick={() => handlePrintLatestReceipt(m)}
                          className="px-3 py-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-sm font-semibold"
                          title="Print latest receipt"
                        >
                          Print
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 text-sm font-semibold flex items-center gap-2"
                          title="Delete member"
                        >
                          <Trash2 size={16} />
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add Member</h2>
            <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input-field" placeholder="Name" value={newMember.name} onChange={(e) => setNewMember(v => ({ ...v, name: e.target.value }))} />
              <input className="input-field" placeholder="Phone" value={newMember.phone} onChange={(e) => setNewMember(v => ({ ...v, phone: e.target.value }))} />
              <input className="input-field" placeholder="Email (optional)" value={newMember.email} onChange={(e) => setNewMember(v => ({ ...v, email: e.target.value }))} />
              <input className="input-field" placeholder="Joining Date (optional)" value={newMember.joiningDate} onChange={(e) => setNewMember(v => ({ ...v, joiningDate: e.target.value }))} />
              <select className="input-field" value={newMember.subscriptionType} onChange={(e) => setNewMember(v => ({ ...v, subscriptionType: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half Yearly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input className="input-field" placeholder="Amount" value={newMember.amount} onChange={(e) => setNewMember(v => ({ ...v, amount: e.target.value }))} />

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Record Payment</h2>
            <p className="text-sm text-slate-500 mb-4">{selectedMember.name} — {selectedMember.phone}</p>
            <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input-field" type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm(v => ({ ...v, amount: e.target.value }))} />
              <select className="input-field" value={paymentForm.method} onChange={(e) => setPaymentForm(v => ({ ...v, method: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Bank">Bank Transfer</option>
              </select>
              <input className="input-field" type="number" min="1" placeholder="Months Covered" value={paymentForm.monthsCovered} onChange={(e) => setPaymentForm(v => ({ ...v, monthsCovered: e.target.value }))} />
              <div className="hidden md:block" />
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}