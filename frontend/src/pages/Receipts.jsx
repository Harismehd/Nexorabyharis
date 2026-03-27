import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { FileText, Download, Printer, Search } from 'lucide-react';
import printReceiptHtml from '../utils/printReceipt';

export default function Receipts() {
  const { gymKey } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const gymPackage = profile?.package || 'starter';
  const canExport = gymPackage === 'growth' || gymPackage === 'pro' || gymPackage === 'pro_plus';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, memRes, profRes] = await Promise.all([
          api.get(`/payments?gymKey=${gymKey}`),
          api.get(`/members?gymKey=${gymKey}`),
          api.get(`/profile?gymKey=${gymKey}`)
        ]);
        // Sort by newest first
        const sortedPayments = payRes.data.payments.sort((a,b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        
        setPayments(sortedPayments);
        setMembers(memRes.data.members);
        if (profRes.data.profile) setProfile(profRes.data.profile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gymKey]);

  const handlePrintReceipt = (payment) => {
    const member = members.find(m => m.id === payment.memberId);
    if (!member) return toast.error('Member data missing for this receipt');
    printReceiptHtml(payment, profile, member);
  };

  const filteredPayments = payments.filter(p => {
     const member = members.find(m => m.id === p.memberId);
     const name = member ? member.name.toLowerCase() : '';
     return p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase());
  });

  const handleExportCSV = () => {
     if (!canExport) {
       toast.error('Export is available in Growth, Pro and Pro Plus packages');
       return;
     }
     const csvRows = [];
     csvRows.push(['Receipt No', 'Date', 'Member Name', 'Member Phone', 'Amount', 'Method', 'Period']);
     
     filteredPayments.forEach(p => {
        const member = members.find(m => m.id === p.memberId);
        csvRows.push([
           p.receiptNumber,
           new Date(p.paymentDate).toLocaleDateString(),
           member ? member.name : 'Unknown',
           member ? member.phone : 'Unknown',
           p.amount,
           p.method,
           p.periodCovered
        ]);
     });

     const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "financial_export.csv");
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Receipts & Payments</h1>
          <p className="text-slate-500 mt-2">View payment history and generate official receipts.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className={`btn-secondary ${canExport ? '' : 'opacity-60 cursor-not-allowed'}`}
          disabled={!canExport}
        >
           <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                 <FileText size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
           </div>
           
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by receipt or name..." 
                className="input-field pl-10 py-2 text-sm w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-600">Receipt No.</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Member</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Amount</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Method</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" className="py-8 text-center text-slate-500">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                 <tr><td colSpan="6" className="py-8 text-center text-slate-500">No payments recorded yet.</td></tr>
              ) : (
                 filteredPayments.map(p => {
                    const member = members.find(m => m.id === p.memberId);
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 min-h-[60px]">
                        <td className="py-3 px-4 font-mono text-sm text-slate-600">{p.receiptNumber}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-medium">{member ? member.name : 'Unknown'}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">Rs. {p.amount}</td>
                        <td className="py-3 px-4 text-slate-500 text-sm">{p.method}</td>
                        <td className="py-3 px-4 flex justify-end gap-2">
                           <button 
                             onClick={() => handlePrintReceipt(p)}
                             className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 flex items-center gap-2"
                             title="Print Layout"
                           >
                             <Printer size={16} /> 
                             <span className="text-sm font-medium pr-1">Print</span>
                           </button>
                        </td>
                      </tr>
                    );
                 })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
