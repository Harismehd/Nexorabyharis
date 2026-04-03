import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { AlertTriangle, ShieldCheck, TrendingDown, TrendingUp, Lock, CheckCircle, Ghost, ArrowRight, DollarSign } from 'lucide-react';
import LockedOverlay from '../components/LockedOverlay';

export default function FinanceGuard() {
  const { gymKey, packageTier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/finance/guard?gymKey=${gymKey}`);
        setReport(res.data);
      } catch (err) {
        if (packageTier === 'pro_plus') {
          toast.error(err.response?.data?.error || 'Failed to load finance guard');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gymKey, packageTier]);

  // Finance Guard is now accessible without a PIN
  const isLocked = packageTier !== 'pro_plus';

  const riskColor =
    report?.riskScore >= 70 ? 'rgba(244, 63, 94, 0.2)' :
    report?.riskScore >= 40 ? 'rgba(245, 158, 11, 0.2)' :
    'rgba(16, 185, 129, 0.2)';
  
  const riskBorder =
    report?.riskScore >= 70 ? 'rgba(244, 63, 94, 0.4)' :
    report?.riskScore >= 40 ? 'rgba(245, 158, 11, 0.4)' :
    'rgba(16, 185, 129, 0.4)';

  const riskText =
    report?.riskScore >= 70 ? '#f43f5e' :
    report?.riskScore >= 40 ? '#f59e0b' :
    '#10b981';

  const content = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: '#f1f5f9', margin: 0 }}>
          Revenue Leak Guard
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '6px' }}>
          Detect unpaid “ghost actives”, reconciliation gaps, and cash leakage risk automatically.
        </p>
      </div>

      <div className="card" style={{ 
        background: riskColor, 
        borderColor: riskBorder,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: riskText
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '18px' }}>Nexora Integrity Score</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>0 = safe, 100 = critical leakage risk</div>
            </div>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-2px' }}>
            {report?.riskScore || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Collections</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', margin: '8px 0' }}>Rs {report?.expectedOutstanding?.toLocaleString() || 0}</p>
          <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#94a3b8' }}>
            <TrendingDown size={14} color="#f87171" />
            <span>{report?.dueMembersCount || 0} members overdue</span>
          </div>
        </div>
        <div className="card">
          <p style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realized Revenue</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#34d399', margin: '8px 0' }}>Rs {report?.collectedThisMonth?.toLocaleString() || 0}</p>
          <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#94a3b8' }}>
            <TrendingUp size={14} color="#34d399" />
            <span>{report?.paymentsThisMonth || 0} payments confirmed</span>
          </div>
        </div>
        <div className="card">
          <p style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovery Rate</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#00d4ff', margin: '8px 0' }}>{report?.collectionRate || 0}%</p>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
             <div style={{ width: `${report?.collectionRate || 0}%`, height: '100%', background: '#00d4ff', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,212,255,0.5)' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f1f5f9', margin: 0 }}>Leak Alerts</h2>
            <div style={{ padding: '4px 12px', borderRadius: '99px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', fontSize: '11px', fontWeight: 700 }}>
              {report?.alerts?.length || 0} Critical
            </div>
          </div>
          {report?.alerts?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
               <CheckCircle size={40} color="#34d399" style={{ margin: '0 auto 16px', opacity: 0.2 }} />
               <p style={{ color: '#475569', fontSize: '14px' }}>All systems nominal. No leaks detected.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {report?.alerts.map((a) => (
                <li key={a.id} className="glass-pane" style={{ padding: '16px', borderRadius: '16px', borderLeft: '4px solid #f43f5e' }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{a.title}</div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{a.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Task 3.1: Mind Blowing Feature - Ghost Revenue Recovery Guide */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
          <div className="flex items-center gap-3 mb-6">
            <Ghost size={24} color="#a78bfa" />
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f1f5f9', margin: 0 }}>Ghost Recovery Guide</h2>
          </div>
          
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            These members are marked **Active** but have no payment record in the last 45 days. They are consuming your resources without contributing.
          </p>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="space-y-3 pr-2 custom-scrollbar">
            {report?.topDefaulters?.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '20px' }}>No ghost actives found.</p>
            ) : (
              report?.topDefaulters.map((m) => (
                <div key={m.id} className="glass-pane" style={{ padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '14px' }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>{m.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#f87171', fontSize: '14px' }}>Rs {Number(m.amount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>Recoverable</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
            <div className="flex items-start gap-3">
               <DollarSign size={18} color="#a78bfa" style={{ marginTop: '2px' }} />
               <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px 0' }}>Estimated Total Recovery</p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#a78bfa', margin: 0 }}>
                    Rs {(report?.expectedOutstanding || 0).toLocaleString()}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <LockedOverlay isLocked={isLocked} message="Upgrade to Pro Plus to unlock Revenue Leak Guard">
      {content}
    </LockedOverlay>
  );
}

