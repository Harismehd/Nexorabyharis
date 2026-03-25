import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Smartphone, RefreshCw, XCircle, CheckCircle } from 'lucide-react';

export default function Connect() {
  const { gymKey } = useAuth();
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);

  // Poll status and QR
  useEffect(() => {
    let interval;
    const checkStatus = async () => {
      try {
        const res = await api.get(`/whatsapp/status?gymKey=${gymKey}`);
        setStatus(res.data.status);
        
        if (res.data.status !== 'connected') {
          const qrRes = await api.get(`/whatsapp/qr?gymKey=${gymKey}`);
          if (qrRes.data.qr) {
            setQr(qrRes.data.qr);
          } else {
            setQr(null);
          }
        } else {
          setQr(null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    checkStatus();
    interval = setInterval(checkStatus, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [gymKey]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect', { gymKey });
      toast.success('Initializing connection, please wait for QR...');
    } catch {
      toast.error('Failed to initialize connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/whatsapp/disconnect', { gymKey });
      setStatus('disconnected');
      setQr(null);
      toast.success('Disconnected successfully');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Connect WhatsApp</h1>
        <p className="text-slate-500 mt-2">Link your WhatsApp to send automated automated fee reminders.</p>
      </div>

      <div className="card text-center py-10">
        {status === 'connected' ? (
          <div className="flex flex-col items-center">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-4">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Connected</h2>
            <p className="text-slate-500 mt-2 mb-6">Your WhatsApp is successfully linked.</p>
            <button onClick={handleDisconnect} className="btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700">
              <XCircle size={18} /> Disconnect WhatsApp
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-slate-100 text-slate-400 p-4 rounded-full mb-4">
              <Smartphone size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Not Connected</h2>
            
            {qr ? (
              <div className="mt-6">
                <p className="text-slate-600 mb-4 font-medium">Scan the QR code below using your WhatsApp Business or standard app.</p>
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl inline-block bg-white shadow-sm">
                  <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                </div>
                <p className="text-xs text-slate-400 mt-4">QR automatically refeshes.</p>
              </div>
            ) : status === 'initializing' ? (
              <div className="mt-8 flex flex-col items-center">
                 <RefreshCw className="animate-spin text-primary-600 mb-4" size={32} />
                 <p className="text-slate-600 font-medium">Communicating with WhatsApp...</p>
                 <p className="text-xs text-slate-400 mt-2">This may take up to 10 seconds.</p>
              </div>
            ) : (
              <div className="mt-6">
                 <button 
                  onClick={handleConnect} 
                  disabled={loading}
                  className="btn-primary px-8"
                 >
                   {loading ? <><RefreshCw className="animate-spin" size={18} /> Initializing...</> : 'Generate QR Code'}
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
