import { MessageSquare, ShieldCheck, Clock, HelpCircle, AlertTriangle, CheckCircle2, ArrowUpRight, Mail } from 'lucide-react';

export default function Support() {
  const faqs = [
    { q: "How do I connect WhatsApp?", a: "Navigate to the 'Connect WhatsApp' tab. Scan the QR code using your WhatsApp Linked Devices. Keep your phone screen on for a stable connection." },
    { q: "What if my subscription expires?", a: "The system will automatically enter 'Grace Mode' for 48 hours. After that, dashboard access is locked until the Master Admin confirms your renewal payment." },
    { q: "How to add members in bulk?", a: "Go to the 'Upload Data' page. Download our CSV template, fill in your member details, and upload it. The system will process up to 1,000 members in seconds." },
    { q: "Can I use Nexora on mobile/desktop?", a: "Yes! Nexora is fully responsive. You can also install it as a PWA (web app) for a native experience on Windows, Android, and iOS." },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '40px', color: '#fff' }}>
          Nexora <span style={{ color: '#00d4ff' }}>Command Support</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-400">
          Need assistance or technical help? Our elite support team is ready to serve your gym's digital infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 space-y-6 border-blue-500/20 bg-blue-500/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowUpRight size={16} className="text-blue-400" /> Direct Contact
            </h3>
            
            <div className="space-y-4">
              <a href="https://wa.me/923125969155" target="_blank" rel="noopener noreferrer" 
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">WhatsApp Support</div>
                  <div className="text-sm font-bold text-white">0312 5969155</div>
                </div>
              </a>

              <a href="mailto:harismehmd1@gmail.com" 
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Email Inquiries</div>
                  <div className="text-sm font-bold text-white">harismehmd1@gmail.com</div>
                </div>
              </a>
            </div>

            <div className="pt-4 border-t border-slate-800/50">
              <div className="flex items-center gap-3 text-slate-400 text-xs">
                <Clock size={14} className="text-blue-400" />
                <span>Response Time: <b>Within 12 Hours</b></span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="card p-6 space-y-4 border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" /> Service Status
            </h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-400 uppercase">Core Systems</span>
              <span className="text-xs font-black text-white px-2 py-1 rounded bg-emerald-500/20">OPERATIONAL ✅</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              All automation nodes, WhatsApp gateways, and payment verification servers are running at 100% capacity.
            </p>
          </div>
        </div>

        {/* content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* FAQs */}
          <div className="space-y-6">
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: 800, color: '#fff' }} className="flex items-center gap-3">
              <HelpCircle size={24} className="text-blue-400" /> Quick Diagnostics (FAQs)
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {faqs.map((faq, i) => (
                <div key={i} className="card p-5 hover:bg-white/5 transition-all border-white/5">
                  <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                    <span className="text-blue-400 opacity-50">Q{i+1}:</span> {faq.q}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed pl-6 border-l-2 border-slate-800 ml-1">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bug Reporting */}
          <div className="card p-8 bg-amber-500/5 border-amber-500/20 space-y-6">
            <div className="flex items-start gap-4">
               <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                  <AlertTriangle size={24} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">Report a Bug</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Found a glitch in the matrix? Our engineering team resolves critical bugs within **48 hours**. 
                    Please email us at <a href="mailto:harismehmd1@gmail.com" className="text-amber-500 font-bold hover:underline">harismehmd1@gmail.com</a> with:
                  </p>
                  <ul className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-amber-500" /> Screen Recording</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-amber-500" /> Error Code</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-amber-500" /> Gym Key</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-amber-500" /> Step-by-step info</li>
                  </ul>
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
