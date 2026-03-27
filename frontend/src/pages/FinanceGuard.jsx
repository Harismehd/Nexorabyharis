import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { AlertTriangle, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

export default function FinanceGuard() {
  const { gymKey, packageTier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (packageTier !== 'pro_plus') {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/finance/guard?gymKey=${gymKey}`);
        setReport(res.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load finance guard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gymKey, packageTier]);

  if (loading) return <div className="py-8 text-center text-slate-500">Loading Revenue Leak Guard...</div>;

  if (packageTier !== 'pro_plus') {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
          <div>
            <div className="font-bold text-slate-800">Upgrade required</div>
            <div className="text-sm text-slate-600">
              Revenue Leak Guard is available in <b>Pro Plus</b> only.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const riskColor =
    report.riskScore >= 70 ? 'text-rose-700 bg-rose-50 border-rose-200' :
    report.riskScore >= 40 ? 'text-amber-800 bg-amber-50 border-amber-200' :
    'text-emerald-800 bg-emerald-50 border-emerald-200';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Revenue Leak Guard (Pro Plus)</h1>
        <p className="text-slate-500 mt-2">
          Detect unpaid “ghost actives”, reconciliation gaps, and cash leakage risk automatically.
        </p>
      </div>

      <div className={`card border ${riskColor}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} />
            <div>
              <div className="font-bold">Leak Risk Score</div>
              <div className="text-sm opacity-80">0 = safe, 100 = high risk</div>
            </div>
          </div>
          <div className="text-4xl font-extrabold tabular-nums">{report.riskScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-sm text-slate-500">Expected Outstanding (Due Members)</div>
          <div className="text-3xl font-extrabold text-slate-800 mt-2">Rs {report.expectedOutstanding.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">{report.dueMembersCount} due members</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Collected This Month</div>
          <div className="text-3xl font-extrabold text-slate-800 mt-2">Rs {report.collectedThisMonth.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">{report.paymentsThisMonth} payments</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Collection Rate</div>
          <div className="text-3xl font-extrabold text-slate-800 mt-2">{report.collectionRate}%</div>
          <div className="text-xs text-slate-500 mt-2">This month vs expected</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Leak Alerts</h2>
            {report.alerts.length ? (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {report.alerts.length} alerts
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                No alerts
              </span>
            )}
          </div>
          {report.alerts.length === 0 ? (
            <div className="text-sm text-slate-500">All good. No suspicious patterns detected.</div>
          ) : (
            <ul className="space-y-3">
              {report.alerts.map((a) => (
                <li key={a.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="font-bold text-slate-800">{a.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{a.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Top Due Members</h2>
          {report.topDefaulters.length === 0 ? (
            <div className="text-sm text-slate-500">No due members right now.</div>
          ) : (
            <div className="space-y-3">
              {report.topDefaulters.map((m) => (
                <div key={m.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3">
                  <div>
                    <div className="font-semibold text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.phone}</div>
                  </div>
                  <div className="font-extrabold text-slate-800">Rs {Number(m.amount || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2"><TrendingDown size={14} className="text-rose-600" /> Reduce leakage by verifying cash entries</div>
            <div className="flex items-center gap-2"><TrendingUp size={14} className="text-emerald-600" /> Use verified payments for clean receipts</div>
          </div>
        </div>
      </div>
    </div>
  );
}

