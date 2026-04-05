import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { History, CheckCircle, XCircle } from 'lucide-react';

export default function Logs() {
  const { gymKey } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/logs?gymKey=${gymKey}`);
        setLogs(res.data.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    
    // Poll logs every 5 seconds just in case messages are sending in background
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [gymKey]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#f1f5f9' }}>Message Logs</h1>
        <p style={{ color: '#475569', fontSize: '14px', marginTop: '6px' }}>History of all WhatsApp reminders sent from your account.</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
           <div style={{ background: 'rgba(124, 58, 237, 0.15)', padding: '10px', borderRadius: '12px' }}>
             <History size={22} color="#a78bfa" />
           </div>
           <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#f1f5f9' }}>Delivery History</h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 italic text-sm">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center">
             <History size={48} className="text-slate-800 mb-4 opacity-20" />
             <p className="font-medium">No messages have been sent yet.</p>
          </div>
        ) : (
          <div className="custom-scrollbar pr-2" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: '#080d14', borderBottom: '1px solid #1a2540' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Member</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Detailed Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1a254020', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#00d4ff05'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                       {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{log.memberName}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{log.memberPhone}</td>
                    <td style={{ padding: '12px 16px' }}>
                       {log.status.includes('Sent') ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '99px', fontSize: '10px',
                            fontWeight: 800, background: 'rgba(52, 211, 153, 0.1)', color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.2)'
                          }}>
                             <CheckCircle size={12} /> SENT
                          </span>
                       ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '99px', fontSize: '10px',
                            fontWeight: 800, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.2)'
                          }} title={log.error}>
                             <XCircle size={12} /> FAILED
                          </span>
                       )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                       <p style={{ margin: 0, fontSize: '12px', color: '#475569', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                          {log.message}
                       </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
