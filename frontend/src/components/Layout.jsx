import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, MessageSquare, UploadCloud, Send,
  Settings, History, LogOut, Dumbbell, Users, Menu, X,
  ShieldCheck, BadgeDollarSign, ChevronRight, FileText
} from 'lucide-react';

export default function Layout() {
  const { logout, gymKey, packageTier } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Receipts', path: '/receipts', icon: FileText },
    { name: 'Connect WhatsApp', path: '/connect', icon: MessageSquare },
    { name: 'Upload Data', path: '/upload', icon: UploadCloud },
    { name: 'Send Reminders', path: '/send', icon: Send },
    { name: 'Payment Verify', path: '/payment-verification', icon: ShieldCheck },
    ...(packageTier === 'pro_plus' ? [{ name: 'Revenue Leak Guard', path: '/finance-guard', icon: BadgeDollarSign }] : []),
    { name: 'Logs', path: '/logs', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  const currentPage = navItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

  return (
    <div className="min-h-screen flex relative overflow-x-hidden" style={{ background: '#080d14' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          width: '260px',
          background: '#0a1018',
          borderRight: '1px solid #1a2540',
          minHeight: '100vh'
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #1a2540' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md" style={{ background: 'rgba(0,212,255,0.3)' }} />
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'linear-gradient(135deg, #0070c4, #00d4ff)' }}>
                <Dumbbell size={20} color="white" />
              </div>
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f1f5f9', lineHeight: 1 }}>
                GymFlow
              </h1>
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>
                Fee Automation
              </p>
            </div>
          </div>
          <button className="lg:hidden" onClick={closeSidebar} style={{ color: '#475569' }}>
            <X size={20} />
          </button>
        </div>

        {/* Gym Key Badge */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 700, color: '#00d4ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {gymKey}
            </span>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-5 pt-4 pb-2">
          <span style={{ fontSize: '10px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Navigation
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  animationDelay: `${index * 40}ms`,
                  position: 'relative',
                  overflow: 'hidden',
                  ...(isActive ? {
                    background: 'linear-gradient(135deg, rgba(0,112,196,0.3), rgba(0,212,255,0.1))',
                    border: '1px solid rgba(0,212,255,0.2)',
                    color: '#00d4ff',
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#64748b',
                  })
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0,212,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px', borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(to bottom, #00d4ff, #0070c4)'
                  }} />
                )}
                <Icon size={18} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: isActive ? 600 : 400, fontSize: '14px' }}>
                  {item.name}
                </span>
                {isActive && (
                  <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid #1a2540' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '12px',
              border: '1px solid transparent',
              background: 'transparent', width: '100%',
              color: '#475569', cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header */}
        <header style={{
          background: 'rgba(10,16,24,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1a2540',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{
                padding: '8px', borderRadius: '10px',
                border: '1px solid #1a2540', background: '#0e1622',
                color: '#64748b', cursor: 'pointer'
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '16px', color: '#f1f5f9', lineHeight: 1
              }}>
                {currentPage}
              </h2>
              <p style={{ fontSize: '12px', color: '#334155', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>
                GymFlow Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '99px',
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.12)'
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#00d4ff',
                boxShadow: '0 0 8px #00d4ff',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{
                fontFamily: 'Syne, sans-serif', fontSize: '12px',
                fontWeight: 700, color: '#00d4ff', letterSpacing: '0.05em'
              }}>
                {gymKey}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}
          className={mounted ? 'animate-in fade-in slide-in-from-bottom-4' : ''}
        >
          <Outlet />
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        select option { background: #0e1622; color: #e2e8f0; }
      `}</style>
    </div>
  );
}