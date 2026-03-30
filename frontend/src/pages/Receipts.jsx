import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { FileText, Download, Printer, Search, Lock } from 'lucide-react';
import printReceiptHtml from '../utils/printReceipt';

export default function Receipts() {
  const { gymKey } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const pkg = profile?.package || 'starter';
  const canExport = pkg === 'pro' || pkg === 'pro_plus';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, memRes, profRes] = await Promise.all([
          api.get(`/payments?gymKey=${gymKey}`),
          api.get(`/members?gymKey=${gymKey}`),
          api.get(`/profile?gymKey=${gymKey}`)
        ]);
        setPayments(payRes.data.payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)));
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
      toast.error('CSV Export is available in Pro and Pro Plus packages only');
      return;
    }
    const csvRows = [['Receipt No', 'Date', 'Member Name', 'Member Phone', 'Amount', 'Method', 'Period']];
    filteredPayments.forEach(p => {
      const member = members.find(m => m.id === p.memberId);
      csvRows.push([p.receiptNumber, new Date(p.paymentDate).toLocaleDateString(), member?.name || 'Unknown', member?.phone || 'Unknown', p.amount, p.method, p.periodCovered]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "gymflow_payments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9' }}>
            Receipts & Payments
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '6px' }}>View payment history and generate official receipts.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary"
          style={{ opacity: canExport ? 1 : 0.5, position: 'relative' }}
          title={canExport ? 'Export to CSV' : 'Available in Pro & Pro Plus'}
        >
          {!canExport && <Lock size={14} />}
          <Download size={18} /> Export CSV
        </button>
      </div>

      {!canExport && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
          fontSize: '13px', color: '#fbbf24'
        }}>
          <Lock size={14} />
          CSV Export is available in <strong>Pro</strong> and <strong>Pro Plus</strong> packages.
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99,102,241,0.15)', padding: '10px', borderRadius: '12px' }}>
              <FileText size={22} color="#818cf8" />
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#f1f5f9' }}>
              Payment History
            </h2>
          </div>

          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} size={16} />
            <input
              type="text"
              placeholder="Search by receipt or name..."
              className="input-field"
              style={{ paddingLeft: '36px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13px', width: '260px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#080d14', borderBottom: '1px solid #1a2540' }}>
                {['Receipt No.', 'Date', 'Member', 'Amount', 'Method', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif',
                    fontWeight: 700, color: '#334155', textTransform: 'uppercase',
                    letterSpacing: '0.08em', textAlign: i === 5 ? 'right' : 'left'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#334155' }}>Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#334155' }}>No payments recorded yet.</td></tr>
              ) : (
                filteredPayments.map(p => {
                  const member = members.find(m => m.id === p.memberId);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #1a254020', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#00d4ff05'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>{p.receiptNumber}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{member?.name || 'Unknown'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#34d399' }}>Rs. {p.amount}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{p.method}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => handlePrintReceipt(p)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                          background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer',
                          transition: 'all 0.2s ease', fontFamily: 'Syne, sans-serif'
                        }}>
                          <Printer size={14} /> Print
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