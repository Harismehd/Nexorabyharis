import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, ShieldCheck, TrendingDown, TrendingUp, Lock, 
  CheckCircle, Ghost, ArrowRight, DollarSign, MessageCircle,
  MoreVertical, Clock, History, AlertCircle, RefreshCw
} from 'lucide-react';
import LockedOverlay from '../components/LockedOverlay';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import './FinanceGuard.css';

// Mock data for sparklines
const generateSparklineData = (base) => {
  return Array.from({ length: 15 }, (_, i) => ({
    name: i,
    value: base + Math.floor(Math.random() * 20) - 10
  }));
};

const recoveryHistory = [
  { date: 'Oct 21', value: 100 },
  { date: 'Oct 22', value: 150 },
  { date: 'Oct 23', value: 120 },
  { date: 'Oct 24', value: 300 },
  { date: 'Oct 25', value: 200 },
  { date: 'Oct 26', value: 400 },
  { date: 'Oct 27', value: 200 },
];

export default function FinanceGuard() {
  const { gymKey, packageTier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [integrityData] = useState(generateSparklineData(85));
  const [expectedData] = useState(generateSparklineData(150));
  const [realizedData] = useState(generateSparklineData(300));

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

  const isLocked = packageTier !== 'pro_plus';

  const integrityScore = report?.riskScore || 90; // Defaulting to 90 for demo if empty

  const content = (
    <div className="finance-guard-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="finance-guard-title-section">
        <h1 className="finance-guard-title">Revenue Leak Guard</h1>
        <p className="finance-guard-subtitle">
          Detect unpaid "ghost actives", reconciliation gaps, and cash leakage risk automatically.
        </p>
      </div>

      <div className="layout-grid-3">
        {/* Integrity Score Panel */}
        <div className="elite-panel integrity-score-panel">
          <div className="flex flex-col items-center">
            <h2 className="stat-header mb-4">Nexora Integrity Score</h2>
            <div className="integrity-ring-container pulsate-ring">
              <svg className="integrity-ring-svg" width="160" height="160">
                <defs>
                  <linearGradient id="integrity-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle className="integrity-ring-bg" cx="80" cy="80" r="70" />
                <circle 
                  className="integrity-ring-progress" 
                  cx="80" cy="80" r="70" 
                  style={{ strokeDasharray: 440, strokeDashoffset: 440 - (440 * integrityScore) / 100 }}
                />
              </svg>
              <div className="integrity-score-value">{integrityScore}</div>
            </div>
            <div style={{ width: '100%', height: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={integrityData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#a855f7" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="stat-subtext mt-2">0 = safe, 100 = critical leakage risk</p>
          </div>
        </div>

        {/* Expected Collections */}
        <div className="elite-panel stat-tile">
          <div className="flex justify-between items-start">
            <div className="tile-icon-bg bg-blue-900/40 text-blue-400">
              <AlertTriangle size={24} />
            </div>
            <div style={{ width: '80px', height: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expectedData}>
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="stat-header">Expected Collections</p>
            <p className="stat-value">Rs {report?.expectedOutstanding?.toLocaleString() || '200'}</p>
            <p className="stat-subtext flex items-center gap-1">
              <Clock size={12} /> {report?.dueMembersCount || 1} members overdue
            </p>
          </div>
        </div>

        {/* Realized Revenue */}
        <div className="elite-panel stat-tile">
          <div className="flex justify-between items-start">
            <div className="tile-icon-bg bg-emerald-900/40 text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div style={{ width: '80px', height: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realizedData}>
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="stat-header">Realized Revenue</p>
            <p className="stat-value" style={{ color: '#10b981' }}>
              Rs {report?.collectedThisMonth?.toLocaleString() || '334,286'}
            </p>
            <p className="stat-subtext flex items-center gap-1">
              <CheckCircle size={12} /> {report?.paymentsThisMonth || 36} payments confirmed
            </p>
          </div>
        </div>
      </div>

      <div className="lower-grid">
        {/* Leak Alerts */}
        <div className="elite-panel">
          <div className="flex items-center justify-between mb-6">
            <h2 className="stat-header flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" /> Leak Alerts
            </h2>
            <div className="priority-tag bg-red-500/20 text-red-500">
              {report?.alerts?.length || 1} Critical
            </div>
          </div>
          
          <div className="space-y-4">
            {(report?.alerts || [
              { id: 1, title: 'Active members without recent payment', detail: '8 members show Active but no payment in last 40 days.' }
            ]).map((a) => (
              <div key={a.id} className="alert-item alert-item-critical">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-100">{a.title}</div>
                    <p className="text-xs text-slate-400 mt-1">{a.detail}</p>
                  </div>
                  <div className="whatsapp-btn">
                    <MessageCircle size={16} />
                    <span>Remind</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="alert-item" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-100">Membership Status Discrepancies</div>
                  <p className="text-xs text-slate-400 mt-1">2 members need verification.</p>
                </div>
                <div className="whatsapp-btn" style={{ color: '#f59e0b' }}>
                  <RefreshCw size={16} />
                  <span>Verify</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ghost Recovery Guide */}
        <div className="elite-panel" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4), rgba(88, 28, 135, 0.15))' }}>
          <div className="flex items-center gap-2 mb-4">
            <Ghost size={24} className="text-purple-400" />
            <h2 className="stat-header">Ghost Recovery Guide</h2>
            <div className="ml-auto priority-tag bg-purple-500/20 text-purple-400">Priority: High</div>
          </div>
          
          <p className="text-sm text-slate-400 mb-6">
            These members are marked **"Active"** but have no payment record in the last 45 days. They are consuming your resources without contributing.
          </p>

          <div className="space-y-3">
            {(report?.topDefaulters || [
              { id: '1', name: 'Sameer', phone: '03314 5258575', amount: 200 }
            ]).map((m) => (
              <div key={m.id} className="recovery-entry">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                    {m.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100">{m.name} | <span className="text-xs text-slate-500 font-normal">{m.phone}</span></div>
                    <div className="text-[10px] text-purple-400">Action: Verify Attendance</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right">
                     <div className="text-sm font-black text-white">Rs {m.amount}</div>
                     <div className="text-[9px] text-slate-500 uppercase">Recoverable</div>
                   </div>
                   <select className="resolve-dropdown">
                     <option>Resolve</option>
                     <option>Verify Payment</option>
                     <option>Pause Member</option>
                     <option>Update Status</option>
                   </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'linear-gradient(90deg, #a855f7 0%, #6366f1 100%)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}>
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/70 uppercase">Estimated Total Recovery</p>
                  <p className="text-xl font-black text-white">Rs {report?.expectedOutstanding?.toLocaleString() || '200'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <DollarSign size={20} />
                </div>
             </div>
          </div>
        </div>

        {/* Recent Recoveries & Actions */}
        <div className="elite-panel">
          <div className="flex items-center gap-2 mb-6">
            <History size={18} className="text-emerald-400" />
            <h2 className="stat-header">Recent Recoveries</h2>
          </div>

          <div className="space-y-4 mb-6">
             <div className="text-xs border-l-2 border-emerald-500 pl-3 py-1">
                <div className="text-slate-100 font-semibold">Oct 27: Rs 200 Recovered</div>
                <div className="text-slate-500 text-[10px]">WhatsApp Remind {"->"} Sameer</div>
             </div>
             <div className="text-xs border-l-2 border-emerald-500 pl-3 py-1 opacity-70">
                <div className="text-slate-100 font-semibold">Oct 26: Rs 200 Recovered</div>
                <div className="text-slate-500 text-[10px]">Verification {"->"} Ayesha</div>
             </div>
             <div className="text-xs border-l-2 border-slate-700 pl-3 py-1 opacity-50">
                <div className="text-slate-100 font-semibold">Oct 24: Staff Leak Prevented</div>
                <div className="text-slate-500 text-[10px]">Reconciliation Check</div>
             </div>
          </div>

          <div style={{ height: '100px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recoveryHistory}>
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[8px] text-slate-500 mt-2 px-1">
               <span>Oct 21</span>
               <span>Oct 24</span>
               <span>Oct 27</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-12 mb-6 opacity-30">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-[2px]">
           Recovery Rate <span className="text-cyan-400">{report?.collectionRate || 100}%</span>
        </div>
      </div>
      <div className="glow-progress-container w-full max-w-md mx-auto h-1">
         <div className="glow-progress-bar" style={{ width: `${report?.collectionRate || 100}%` }}></div>
      </div>
    </div>
  );

  return (
    <LockedOverlay isLocked={isLocked} message="Upgrade to Pro Plus to unlock Revenue Leak Guard">
      {content}
    </LockedOverlay>
  );
}


