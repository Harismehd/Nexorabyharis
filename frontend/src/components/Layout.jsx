import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, MessageSquare, UploadCloud, Send, Settings, History, LogOut, Dumbbell, Users, Menu, X, ShieldCheck } from 'lucide-react';

export default function Layout() {
  const { logout, gymKey } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Receipts', path: '/receipts', icon: UploadCloud },
    { name: 'Connect WhatsApp', path: '/connect', icon: MessageSquare },
    { name: 'Upload Data', path: '/upload', icon: UploadCloud },
    { name: 'Send Reminders', path: '/send', icon: Send },
    { name: 'Payment Verify', path: '/payment-verification', icon: ShieldCheck },
    { name: 'Logs', path: '/logs', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-surface text-white flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
             <div className="bg-primary-500 p-2 rounded-lg text-white">
               <Dumbbell size={24} />
             </div>
             <div>
               <h1 className="font-bold text-lg leading-tight">GymFlow</h1>
               <p className="text-xs text-slate-400">Fee Automation</p>
             </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={closeSidebar}>
             <X size={24} />
          </button>
        </div>
        
        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">
          Gym Key: {gymKey}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex justify-between lg:justify-end items-center sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
             <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
               {gymKey?.charAt(0).toUpperCase()}
             </div>
             <span className="font-medium text-slate-700">{gymKey}</span>
          </div>
        </header>
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
