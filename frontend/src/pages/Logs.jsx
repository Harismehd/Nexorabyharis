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
        <h1 className="text-3xl font-bold text-slate-800">Message Logs</h1>
        <p className="text-slate-500 mt-2">History of all WhatsApp reminders sent from your account.</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-purple-100 p-3 rounded-full text-purple-600">
             <History size={24} />
           </div>
           <h2 className="text-xl font-bold text-slate-800">Delivery History</h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
             <History size={48} className="text-slate-300 mb-4" />
             <p>No messages have been sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold text-slate-600">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Member</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Phone</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Detailed Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-500">
                       {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{log.memberName}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{log.memberPhone}</td>
                    <td className="py-3 px-4">
                       {log.status.includes('Sent') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                             <CheckCircle size={14} /> Sent
                          </span>
                       ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={log.error}>
                             <XCircle size={14} /> Failed
                          </span>
                       )}
                    </td>
                    <td className="py-3 px-4">
                       <p className="text-xs text-slate-500 truncate max-w-xs" title={log.message}>
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
