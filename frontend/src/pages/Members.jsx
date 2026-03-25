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

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/members?gymKey=${gymKey}`);
      setMembers(res.data.members);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [gymKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await api.delete(`/members/${id}`);
      setMembers(members.filter(m => m.id !== id));
      toast.success('Member deleted');
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const handleToggleStatus = async (member) => {
    // Determine the new opposite status
    const newStatus = member.status === 'Active' ? 'Dues' : 'Active';
    try {
      const res = await api.put(`/members/${member.id}/status`, { gymKey, status: newStatus });
      toast.success(`Member marked as ${newStatus === 'Active' ? 'Paid' : 'Unpaid'}`);
      setMembers(members.map(m => m.id === member.id ? res.data.member : m));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Members</h1>
          <p className="text-slate-500 mt-2">Manage all your gym members and track payments.</p>
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
                <th className="py-3 px-4 font-semibold text-slate-600">Plan Option</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Payment Status</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Exp. Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" className="py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredMembers.length === 0 ? (
                 <tr><td colSpan="6" className="py-8 text-center text-slate-500">No members found.</td></tr>
              ) : (
                filteredMembers.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                       <span className="font-medium text-slate-800">{m.name}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{m.phone}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 capitalize">{m.subscriptionType}</td>
                    <td className="py-3 px-4">
                       <button
                         onClick={() => handleToggleStatus(m)}
                         title="Toggle between Paid and Unpaid"
                         className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm border ${
                           m.status === 'Active' 
                           ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' 
                           : 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600'
                         }`}
                       >
                         <RefreshCcw size={12} className={m.status === 'Active' ? 'opacity-80' : ''} />
                         {m.status === 'Active' ? 'PAID' : 'UNPAID'}
                       </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                       {m.subscriptionEndDate ? new Date(m.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 flex justify-end gap-2">
                       <button 
                         onClick={() => { setSelectedMember(m); setShowPayModal(true); }}
                         className="btn-secondary text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 py-1.5 px-3 text-xs"
                       >
                         <DollarSign size={14} /> Adv. Pay
                       </button>
                       <button 
                         onClick={() => handleDelete(m.id)}
                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                         title="Delete Member"
                       >
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} refresh={fetchMembers} gymKey={gymKey} />}
      
      {/* Payment Modal */}
      {showPayModal && selectedMember && (
         <PaymentModal 
           member={selectedMember} 
           gymKey={gymKey} 
           onClose={() => { setShowPayModal(false); setSelectedMember(null); }} 
           refresh={fetchMembers} 
         />
      )}
    </div>
  );
}

// Sub-component: Add Member Modal
function AddMemberModal({ onClose, refresh, gymKey }) {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', joiningDate: new Date().toISOString().split('T')[0], subscriptionType: 'monthly', amount: ''
  });
  const [makePayment, setMakePayment] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Add Member
      const memberRes = await api.post('/members', { gymKey, ...formData });
      const newMember = memberRes.data.member;
      
      // 2. Make Initial Payment if requested
      if (makePayment && formData.amount && formData.amount > 0) {
        const payRes = await api.post('/payments', { 
           gymKey, 
           memberId: newMember.id, 
           amount: formData.amount, 
           method: 'Cash', 
           monthsCovered: 1 
        });

        // 3. Print receipt if requested
        if (printReceipt) {
           const profileRes = await api.get(`/profile?gymKey=${gymKey}`);
           printReceiptHtml(payRes.data.payment, profileRes.data.profile || {}, newMember);
        }
        toast.success('Member added and payment recorded!');
      } else {
        toast.success('Member added successfully!');
      }

      refresh();
      onClose();
    } catch (err) {
      toast.error('Failed to complete member action');
      console.error(err);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
           <h2 className="text-xl font-bold text-slate-800">Add New Member</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
              <input required type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
                 <input type="date" className="input-field text-sm" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Cycle Option</label>
                 <select className="input-field text-sm" value={formData.subscriptionType} onChange={e => setFormData({...formData, subscriptionType: e.target.value})}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                 </select>
              </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Standard Fee Amount</label>
              <input type="number" className="input-field" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="e.g. 5000" />
           </div>

           {/* Initial Payment Options */}
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={makePayment} onChange={e => setMakePayment(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                 <span className="text-sm font-medium text-slate-800">Collect 1st Month Payment Now</span>
              </label>
              
              {makePayment && (
                <label className="flex items-center gap-2 cursor-pointer pl-6">
                   <input type="checkbox" checked={printReceipt} onChange={e => setPrintReceipt(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                   <span className="text-sm text-slate-600">Print Receipt on physical printer</span>
                </label>
              )}
           </div>

           <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                 {loading ? 'Saving...' : (makePayment && printReceipt ? 'Save, Pay & Print' : 'Save Member')}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Payment Modal
function PaymentModal({ member, gymKey, onClose, refresh }) {
   const [payment, setPayment] = useState({ amount: member.amount || '', method: 'Cash', monthsCovered: 1 });
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        await api.post('/payments', { gymKey, memberId: member.id, ...payment });
        toast.success(`Payment recorded! Member is now Active.`);
        refresh();
        onClose();
      } catch(err) {
         toast.error(err.response?.data?.error || 'Payment failed');
      } finally {
         setLoading(false);
      }
   };

   return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50 text-emerald-800">
           <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign /> Record Advance Payment</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           
           <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
              <span className="font-semibold block">{member.name}</span>
              Current Status: <span className={member.status === 'Active' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{member.status === 'Active' ? 'PAID' : 'UNPAID'}</span>
              <br/>
              Current Exp: {member.subscriptionEndDate ? new Date(member.subscriptionEndDate).toLocaleDateString() : 'N/A'}
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid</label>
              <input required type="number" className="input-field" value={payment.amount} onChange={e => setPayment({...payment, amount: e.target.value})} />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Months Covered</label>
                 <select className="input-field text-sm" value={payment.monthsCovered} onChange={e => setPayment({...payment, monthsCovered: parseInt(e.target.value)})}>
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months (Adv)</option>
                    <option value={3}>3 Months (Adv)</option>
                    <option value={6}>6 Months (Adv)</option>
                    <option value={12}>1 Year (Adv)</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                 <select className="input-field text-sm" value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank</option>
                    <option value="Card">Card</option>
                 </select>
              </div>
           </div>

           <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary text-sm bg-emerald-600 hover:bg-emerald-500">{loading ? 'Processing...' : 'Confirm Payment'}</button>
           </div>
        </form>
      </div>
    </div>
   );
}
