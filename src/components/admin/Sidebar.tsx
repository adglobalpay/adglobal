import React, { useState, useEffect } from 'react';
import CapitalOperador from './CapitalOperador';
import { apiFetch } from '../../lib/auth';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  BellRing, 
  MessageCircle, 
  PartyPopper,
  Fingerprint,
  BadgeDollarSign,
  X,
  Menu,
  LogOut
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface InactiveClient {
  id: string;
  name: string;
  lastTx: string;
  days: number;
  phone?: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const getWhatsAppLink = (phone: string, name: string) => {
  const normalizedPhone = phone.replace(/\D/g, '');
  const message = encodeURIComponent(`Hola ${name}, ¿cómo estás? Te escribimos porque notamos que hace varios días no realizas envíos. ¿Necesitas ayuda con algo?`);
  return `https://wa.me/${normalizedPhone}?text=${message}`;
};

const formatLastTransactionDate = (value: string) => {
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function Sidebar() {
  const [currentPath, setCurrentPath] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [inactiveClients, setInactiveClients] = useState<InactiveClient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentPath(window.location.pathname);

    const loadInactiveClients = async () => {
      try {
        const data = await apiFetch('/api/clients/inactive-reminders');
        setInactiveClients(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading inactive clients:', e);
        setInactiveClients([]);
      }
    };

    void loadInactiveClients();

    // Load user from localStorage
    try {
      const raw = localStorage.getItem('adglobal_user');
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      console.error('Error parsing user:', e);
    }
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adglobal_token');
    localStorage.removeItem('adglobal_user');
    window.location.href = '/admin/login';
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Clientes', path: '/admin/clientes', icon: <Users size={20} />, badge: inactiveClients.length },
    { name: 'Transacciones', path: '/admin/transacciones', icon: <BadgeDollarSign size={20} /> },
    { name: 'KYC', path: '/admin/kyc', icon: <Fingerprint size={20} /> },
    { name: 'Reportes', path: '/admin/reportes', icon: <FileText size={20} /> },
    { name: 'Configuración', path: '/admin/config', icon: <Settings size={20} /> },
  ];

  const closeMobile = () => setIsMobileOpen(false);

  const userName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'AD Gomez';
  const userRole = user ? user.role : 'Administrador';

  return (
    <>
      {/* Mobile sticky topbar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2.5">
              <img src="/img/logo.webp" alt="AD Global Pay" className="w-7 h-7 rounded-lg shadow-md object-cover" />
              <span className="text-sm font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>AD Global Pay</span>
            </div>
          </div>
          <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">Panel Admin</span>
        </header>
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden anim-drawer-overlay"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          bg-slate-950 text-white flex flex-col h-[100dvh] fixed top-0 left-0 w-[280px]
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:w-64 lg:translate-x-0
          border-r border-slate-900/50 shadow-2xl z-40
          transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          overflow-visible
        `}
      >
        {/* Logo Area */}
        <div className="p-4 lg:p-6 border-b border-white/5 bg-slate-950 flex items-center gap-3 shrink-0">
          <img src="/img/logo.webp" alt="AD Global Pay" className="w-9 h-9 rounded-xl shadow-lg shadow-indigo-500/20 float-anim object-cover" />
          <div>
            <h2 className="text-[1.05rem] font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>AD Global Pay</h2>
            <span className="text-[0.65rem] uppercase tracking-widest text-slate-400 font-medium font-sans">Panel Admin</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="px-3 py-3 lg:py-6 space-y-1 shrink-0">
          {navItems.map((item, index) => {
            const isActive = currentPath === item.path || (currentPath !== '/admin' && item.path !== '/admin' && currentPath.startsWith(item.path));
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={closeMobile}
                className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_12px_rgba(99,102,241,0.05)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
                style={{ 
                  animationDelay: `${index * 60}ms`,
                  opacity: isLoaded ? 1 : 0,
                  transform: isLoaded ? 'translateX(0)' : 'translateX(-12px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms`
                }}
              >
                <div className="flex items-center gap-3">
                  <span className={`transition-all duration-300 ${isActive ? 'text-indigo-400 scale-110' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {item.badge ? (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNotifications(!showNotifications);
                    }}
                    className="relative focus:outline-none ml-2"
                    title="Clientes inactivos"
                  >
                    <span className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[0.65rem] font-bold rounded-full h-5 px-2 flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  </button>
                ) : null}
              </a>
            );
          })}
        </nav>

        {/* Capital Component */}
        <div className="px-3 pb-2 shrink-0">
          <CapitalOperador />
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div 
            className={`absolute bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-slate-200/60 z-50 overflow-hidden transform origin-bottom-left anim-modal ${
              isMobile ? 'left-4 right-4 bottom-20 w-auto' : 'left-64 bottom-24 ml-4 w-96'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-500 rounded-xl">
                <BellRing size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Clientes inactivos</h3>
                <p className="text-xs text-slate-500 font-medium">Más de 15 días sin girar</p>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {inactiveClients.length > 0 ? (
                inactiveClients.map((client, idx) => (
                  <div
                    key={client.id}
                    className="block p-5 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200 group"
                    style={{ 
                      animationDelay: `${idx * 80}ms`,
                      opacity: 0,
                      animation: `fadeInUp 0.4s ease-out ${idx * 80}ms forwards`
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{client.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-medium">Último giro</span>
                          <span className="text-xs text-slate-600 font-medium">{formatLastTransactionDate(client.lastTx)}</span>
                        </div>
                      </div>
                      <span className="bg-amber-100/50 text-amber-600 border border-amber-200/50 text-[0.65rem] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                        {client.days} días
                      </span>
                    </div>
                    
                    {client.phone && (
                      <a
                        href={getWhatsAppLink(client.phone, client.name.split(' ')[0])}
                        className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-500 mt-2 p-2.5 bg-emerald-50 rounded-xl transition-all duration-300 border border-emerald-100 w-full group/whatsapp"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(getWhatsAppLink(client.phone, client.name.split(' ')[0]), '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <MessageCircle size={14} className="group-hover/whatsapp:scale-110 transition-transform" />
                        <span>Contactar por WhatsApp</span>
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3 anim-fade-in">
                  <PartyPopper size={32} className="text-slate-300" />
                  <span className="text-sm font-medium">Todos los clientes están activos</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Profile */}
        <div 
          className="p-3 lg:p-4 border-t border-white/5 bg-slate-950/80 backdrop-blur-sm m-3 rounded-xl border transition-all duration-300 hover:border-white/10 hover:bg-slate-900/80 cursor-pointer group shrink-0"
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs shadow-inner group-hover:scale-105 transition-transform">
              <Fingerprint size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm font-semibold tracking-tight truncate">{userName}</p>
              <p className="text-[0.65rem] uppercase tracking-wider text-slate-500 font-medium">{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
