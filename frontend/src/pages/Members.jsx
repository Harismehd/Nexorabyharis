import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, UserPlus } from 'lucide-react';

export default function Members() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    amount: '',
    subscriptionType: 'monthly'
  });

  // Load members from Supabase
  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('payload')
      
      if (error) throw error
      
      const appData = data[0]?.payload || {}
      const allMembers = appData.members || []
      const gymMembers = allMembers.filter(m => m.gymKey === gymKey)
      
      setMembers(gymMembers)
    } catch (err) {
      console.error('Error loading members:', err)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  };

  // Save members back to Supabase
  const saveMembers = async (updatedMembers) => {
    try {
      // Get current full data
      const { data, error } = await supabase
        .from('app_state')
        .select('payload')
        .eq('id', 1)
        .single()
      
      if (error) throw error
      
      const currentPayload = data.payload
      const allMembers = currentPayload.members || []
      
      // Remove current gym's members and add updated ones
      const otherGymMembers = allMembers.filter(m => m.gymKey !== gymKey)
      const newAllMembers = [...otherGymMembers, ...updatedMembers]
      
      // Update in Supabase
      const { error: updateError } = await supabase
        .from('app_state')
        .update({ payload: { ...currentPayload, members: newAllMembers } })
        .eq('id', 1)
      
      if (updateError) throw updateError
      
      return true
    } catch (err) {
      console.error('Error saving members:', err)
      toast.error('Failed to save')
      return false
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.amount) {
      toast.error('Please fill all fields');
      return;
    }
    
    const newMember = {
      id: editingMember?.id || crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone,
      amount: formData.amount,
      gymKey: gymKey,
      joiningDate: editingMember?.joiningDate || new Date().toISOString().split('T')[0],
      subscriptionType: formData.subscriptionType,
      subscriptionEndDate: editingMember?.subscriptionEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    let updatedMembers;
    if (editingMember) {
      updatedMembers = members.map(m => m.id === editingMember.id ? newMember : m);
    } else {
      updatedMembers = [...members, newMember];
    }
    
    const success = await saveMembers(updatedMembers);
    if (success) {
      setMembers(updatedMembers);
      toast.success(editingMember ? 'Member updated' : 'Member added');
      setShowModal(false);
      setEditingMember(null);
      setFormData({ name: '', phone: '', amount: '', subscriptionType: 'monthly' });
    }
  };

  const handleDelete = async (member) => {
    if (confirm(`Delete ${member.name}?`)) {
      const updatedMembers = members.filter(m => m.id !== member.id);
      const success = await saveMembers(updatedMembers);
      if (success) {
        setMembers(updatedMembers);
        toast.success('Member deleted');
      }
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      amount: member.amount,
      subscriptionType: member.subscriptionType || 'monthly'
    });
    setShowModal(true);
  };

  if (loading) return <div className="p-8 text-center">Loading members...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <button
          onClick={() => {
            setEditingMember(null);
            setFormData({ name: '', phone: '', amount: '', subscriptionType: 'monthly' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={18} /> Add Member
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">End Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  No members yet. Click "Add Member" to get started.
                </td>
              </tr>
            ) : (
              members.map(member => (
                <tr key={member.id} className="border-t">
                  <td className="p-3">{member.name}</td>
                  <td className="p-3">{member.phone}</td>
                  <td className="p-3">Rs. {member.amount}</td>
                  <td className="p-3">{member.subscriptionType || 'monthly'}</td>
                  <td className="p-3">
                    {member.subscriptionEndDate 
                      ? new Date(member.subscriptionEndDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleEdit(member)} className="text-blue-600 mr-3">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(member)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingMember ? 'Edit Member' : 'Add New Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subscription Type</label>
                <select
                  className="input-field w-full"
                  value={formData.subscriptionType}
                  onChange={e => setFormData({ ...formData, subscriptionType: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="half-yearly">Half Yearly (6 months)</option>
                  <option value="yearly">Yearly (12 months)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2">
                  {editingMember ? 'Update' : 'Add'} Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}