import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { gymKey } = useAuth();
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memRes, payRes] = await Promise.all([
          api.get(`/members?gymKey=${gymKey}`),
          api.get(`/payments?gymKey=${gymKey}`)
        ]);
        setMembers(memRes.data.members || []);
        setPayments(payRes.data.payments || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gymKey]);

  // Derived Metrics
  const activeMembersCount = members.filter(m => {
    // Check if subscription is active
    if (m.subscriptionEndDate) {
      return new Date(m.subscriptionEndDate) > new Date()
    }
    return m.status === 'Active'
  }).length;
  
  const dueMembersCount = members.filter(m => {
    if (m.subscriptionEndDate) {
      return new Date(m.subscriptionEndDate) <= new Date()
    }
    return m.status === 'Dues'
  }).length;
  
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthRevenue = payments
     .filter(p => p.paymentDate?.startsWith(currentMonthStr))
     .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // Revenue trend data
  const revenueTrendData = useMemo(() => {
    const map = {};
    payments.forEach(p => {
       if (p.paymentDate) {
         const month = new Date(p.paymentDate).toLocaleString('default', { month: 'short' });
         map[month] = (map[month] || 0) + parseFloat(p.amount || 0);
       }
    });
    return Object.keys(map).map(k => ({ name: k, Revenue: map[k] })).slice(-6);
  }, [payments]);

  const pieData = [
    { name: 'Active', value: activeMembersCount },
    { name: 'Due', value: dueMembersCount }
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  if (loading) return <div className="p-8 text-center text-slate-500">Loading comprehensive dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Financial Reports & Insights</h1>
        <p className="text-slate-500 mt-2">Overview of your gym's financial health, collections, and member metrics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-slate-500 text-sm font-medium">Total Revenue (All Time)</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">Rs. {totalRevenue.toLocaleString()}</h3>
             </div>
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><DollarSign size={20} /></div>
          </div>
        </div>

        <div className="card border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-slate-500 text-sm font-medium">Current Month Revenue</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">Rs. {currentMonthRevenue.toLocaleString()}</h3>
             </div>
             <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-slate-500 text-sm font-medium">Active Subscriptions</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeMembersCount}</h3>
             </div>
             <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Activity size={20} /></div>
          </div>
        </div>

        <div className="card border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-slate-500 text-sm font-medium">Overdue Members</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{dueMembersCount}</h3>
             </div>
             <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><Users size={20} /></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="card lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Monthly Revenue Trend</h3>
            <div className="h-[300px]">
               {revenueTrendData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                     <YAxis tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val}`} />
                     <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     <Area type="monotone" dataKey="Revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-400">Not enough data to graph</div>
               )}
            </div>
         </div>

         <div className="card">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Member Distribution</h3>
            <div className="h-[300px] -mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#8884d8" paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

    </div>
  );
}