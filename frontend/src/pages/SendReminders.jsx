import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Search } from 'lucide-react';

export default function SendReminders() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
         const [memRes, statRes] = await Promise.all([
           api.get(`/members?gymKey=${gymKey}`),
           api.get(`/whatsapp/status?gymKey=${gymKey}`)
         ]);
         setMembers(memRes.data.members);
         setStatus(statRes.data.status);
      } catch (err) {
         console.error(err);
      }
    };
    fetchData();
  }, [gymKey]);

  const handleSend = async () => {
    if (status !== 'connected') {
       return toast.error('Please connect WhatsApp first!');
    }
    
    if (!window.confirm(`Are you sure you want to start sending reminders to ${filteredMembers.length} members?`)) return;

    setLoading(true);
    try {
      const res = await api.post('/messages/send', { gymKey });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start sending');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.status === 'Dues' && 
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Send Reminders</h1>
          <p className="text-slate-500 mt-2">Review members and broadcast fee reminders.</p>
        </div>
        
        <button 
          onClick={handleSend}
          disabled={loading || filteredMembers.length === 0}
          className="btn-primary px-6"
        >
          <Send size={18} /> {loading ? 'Sending...' : `Send to ${filteredMembers.length} Members`}
        </button>
      </div>

      {status !== 'connected' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
          <div>
             <h3 className="text-amber-800 font-bold">WhatsApp is not connected</h3>
             <p className="text-amber-700 text-sm mt-1">You must connect your WhatsApp from the Connect page before sending messages.</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-bold text-slate-800">Member List</h3>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search members..." 
                className="input-field pl-10 py-1.5 text-sm w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-600">Name</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Phone</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Due Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600 justify-end flex">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                 <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500">No members found. Please upload data.</td>
                 </tr>
              ) : (
                filteredMembers.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{m.name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.phone}</td>
                    <td className="py-3 px-4 text-slate-600">{m.dueDate}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">Rs. {m.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
