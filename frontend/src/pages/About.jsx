import { Flame, Shield, Zap, Target, Star, ArrowUpRight, Dumbbell, MessageSquare, Activity, ShieldCheck, Layers } from 'lucide-react';

export default function About() {
  const stats = [
    { label: 'Gyms Powered', value: '150+', icon: <Globe size={20} /> },
    { label: 'Messages Sent', value: '2.4M', icon: <Zap size={20} /> },
    { label: 'Collections Secure', value: 'Rs. 85M+', icon: <Shield size={20} /> },
    { label: 'Service Uptime', value: '99.9%', icon: <Rocket size={20} /> },
  ];

  const features = [
    { title: 'Fee Automation', desc: 'Eliminate manual tracking with smart WhatsApp triggers.', icon: <Zap color="#fbbf24" /> },
    { title: 'Digital Receipts', desc: 'Professional PDFs generated and sent in seconds.', icon: <Award color="#34d399" /> },
    { title: 'Finance Guard', desc: 'Predictive analytics to catch revenue leaks before they happen.', icon: <Shield color="#00d4ff" /> },
    { title: 'Multi-Node Architecture', desc: 'High-availability infrastructure for enterprise gym chains.', icon: <Target color="#a78bfa" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase">
          <ArrowUpRight size={14} /> The Future of Gym Management
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '48px', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          Empowering Fitness with <br />
          <span style={{ 
            background: 'linear-gradient(90deg, #0070c4, #00d4ff, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>Nexora Intelligence</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-400 text-lg leading-relaxed">
          Nexora is a premium gym automation suite designed to bridge the gap between human fitness and digital excellence. We turn complex operations into seamless experiences.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="card p-6 text-center space-y-2 group hover:border-blue-500/30 transition-all duration-300">
            <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              {s.label === 'Gyms Powered' ? <Dumbbell size={20} /> : s.label === 'Messages Sent' ? <Zap size={20} /> : s.label === 'Collections Secure' ? <Shield size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Founder Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-block p-2 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500">
            <div className="w-full h-full bg-slate-950 rounded-xl p-8 space-y-6">
               <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#fff' }}>Meet the Architect</h2>
               <p className="text-slate-400 leading-relaxed">
                 Developed by <b>Haris Mehmood</b>, Nexora was born from a vision to simplify gym administration through smart automation and predictive finance tools.
               </p>
               <div className="flex gap-4">
                 <button className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors">
                   <Zap size={20} />
                 </button>
                 <button className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors">
                   <Activity size={20} />
                 </button>
                 <button className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors">
                   <ShieldCheck size={20} />
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="space-y-4">
             <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#f1f5f9' }}>Our Philosophy</h3>
             <p className="text-slate-500 text-sm leading-relaxed">
               We believe that gym owners should spend more time on training and less on tracking. Nexora handles the "boring" stuff—fee collection, reminders, attendance, and analytics—so you can focus on building champions.
             </p>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
             {features.map((f, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="mt-1">{i === 0 ? <Zap color="#fbbf24" /> : i === 1 ? <Star color="#34d399" /> : i === 2 ? <Shield color="#00d4ff" /> : <Target color="#a78bfa" />}</div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
             ))}
           </div>
        </div>
      </div>

      {/* Trust Quote */}
      <div className="text-center py-12 border-t border-slate-800">
        <Flame className="mx-auto text-red-500 mb-6 animate-pulse" />
        <p className="text-slate-400 italic text-lg max-w-2xl mx-auto">
          "Architecture starts when you carefully put two bricks together. There it begins."
        </p>
        <div className="mt-4 text-[10px] font-black tracking-widest text-slate-600 uppercase">
          Crafted with Precision by Nexora Lab
        </div>
      </div>

    </div>
  );
}
